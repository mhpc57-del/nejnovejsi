from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import db, client
from routes.auth_routes import router as auth_router
from routes.users import router as users_router
from routes.demands import router as demands_router
from routes.messages import router as messages_router
from routes.reviews import router as reviews_router
from routes.uploads import router as uploads_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router
from routes.misc import router as misc_router
from routes.promoted import router as promoted_router
from routes.disputes import router as disputes_router
from routes.ai_chat import router as ai_chat_router
from routes.invoices import router as invoices_router
from models import ADMIN_EMAIL, UserRole, CATEGORIES
from auth import hash_password
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CraftBolt API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(demands_router)
api_router.include_router(messages_router)
api_router.include_router(reviews_router)
api_router.include_router(uploads_router)
api_router.include_router(payments_router)
api_router.include_router(admin_router)
api_router.include_router(misc_router)
api_router.include_router(ai_chat_router)
api_router.include_router(invoices_router)
api_router.include_router(promoted_router)
api_router.include_router(disputes_router)

app.include_router(api_router)


@app.get("/api/debug/sms-test")
async def debug_sms_test():
    """Diagnostic endpoint — tests BulkGate SMS config without sending"""
    import os
    from notifications import notification_service
    
    sms = notification_service.sms_service
    token_masked = f"{sms.app_token[:6]}...{sms.app_token[-4:]}" if len(sms.app_token) > 10 else "TOO_SHORT"
    
    result = {
        "app_id": sms.app_id,
        "token_masked": token_masked,
        "token_length": len(sms.app_token),
        "sender_id": sms.sender_id,
        "sender_value": sms.sender_id_value,
        "env_loaded": bool(sms.app_id and sms.app_token),
    }
    
    # Test auth with dummy number
    try:
        import http.client, json as jjson
        payload = jjson.dumps({
            "application_id": sms.app_id,
            "application_token": sms.app_token,
            "number": "420000000000",
            "text": "diag",
            "sender_id": sms.sender_id or "gSystem",
            "sender_id_value": sms.sender_id_value or "",
        })
        conn = http.client.HTTPSConnection("portal.bulkgate.com", timeout=10)
        conn.request("POST", "/api/1.0/simple/transactional", body=payload, headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        resp = conn.getresponse()
        result["bulkgate_status"] = resp.status
        result["bulkgate_response"] = resp.read().decode("utf-8")[:300]
        conn.close()
    except Exception as e:
        result["bulkgate_error"] = str(e)
    
    return result


@app.get("/api/debug/db-check")
async def debug_db_check():
    """Diagnostic endpoint — check database counts"""
    import os
    db_name = os.environ.get('DB_NAME', 'UNKNOWN')
    
    result = {"db_name": db_name}
    
    try:
        result["users_count"] = await db.users.count_documents({})
        result["demands_count"] = await db.demands.count_documents({})
        result["customers"] = await db.users.count_documents({"role": "customer"})
        result["suppliers"] = await db.users.count_documents({"role": "supplier"})
        
        # Demand statuses
        statuses = {}
        for s in ["open", "in_progress", "pending_completion", "completed", "cancelled", "dispute"]:
            statuses[s] = await db.demands.count_documents({"status": s})
        result["demand_statuses"] = statuses
    except Exception as e:
        result["error"] = str(e)
    
    return result


@app.on_event("startup")
async def startup():
    logger.info("Starting CraftBolt API v2.0.0...")
    
    # Create indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.demands.create_index("id", unique=True)
    await db.demands.create_index("status")
    await db.demands.create_index("customer_id")
    await db.demands.create_index("assigned_supplier_id")
    await db.messages.create_index("demand_id")
    await db.reviews.create_index("reviewed_user_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.online_users.create_index("user_id", unique=True)
    # Clean stale online users on startup
    await db.online_users.delete_many({})

    # Fix invalid service_areas entries (migration)
    try:
        async for user in db.users.find({"service_areas": {"$ne": []}}, {"_id": 0, "id": 1, "service_areas": 1}):
            areas = user.get("service_areas", [])
            cleaned = []
            for a in areas:
                if isinstance(a, dict) and a.get("lat") and a.get("lng"):
                    if not a.get("name") or a["name"].startswith("Bod "):
                        a["name"] = f"{a['lat']:.2f}, {a['lng']:.2f}"
                    cleaned.append(a)
                elif isinstance(a, str) and a.strip():
                    cleaned.append({"name": a, "lat": None, "lng": None, "radius": 25})
            if cleaned != areas:
                await db.users.update_one({"id": user["id"]}, {"$set": {"service_areas": cleaned}})
                logger.info(f"Migrated service_areas for user {user['id']}")
    except Exception as e:
        logger.error(f"Service areas migration error: {e}")

    # Migrate renamed categories
    CATEGORY_RENAMES = {
        "Elektrikáři – silnoproud": "Elektromontážní práce – silnoproud",
        "Elektrikáři – slaboproud": "Elektromontážní práce – slaboproud",
        "Elektrikářské práce": "Elektromontážní práce – silnoproud",
    }
    try:
        for old_name, new_name in CATEGORY_RENAMES.items():
            # Update supplier/customer categories
            res_users = await db.users.update_many(
                {"categories": old_name},
                {"$set": {"categories.$[elem]": new_name}},
                array_filters=[{"elem": old_name}]
            )
            if res_users.modified_count:
                logger.info(f"Migrated category '{old_name}' -> '{new_name}' in {res_users.modified_count} user(s)")
            # Update demand categories
            res_demands = await db.demands.update_many(
                {"category": old_name},
                {"$set": {"category": new_name}}
            )
            if res_demands.modified_count:
                logger.info(f"Migrated category '{old_name}' -> '{new_name}' in {res_demands.modified_count} demand(s)")
    except Exception as e:
        logger.error(f"Category migration error: {e}")

    # Background task: clean stale online users every 60s
    async def cleanup_stale_online():
        while True:
            await asyncio.sleep(60)
            try:
                cutoff = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
                await db.online_users.delete_many({"last_seen": {"$lt": cutoff}})
            except Exception:
                pass
    asyncio.create_task(cleanup_stale_online())
    
    # Seed admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password": hash_password("CraftBolt2026!"),
            "phone": "+420733183681",
            "role": UserRole.ADMIN,
            "account_type": "admin",
            "supplier_type": None,
            "company_name": "CraftBolt Admin",
            "ico": None, "dic": None,
            "address": "Sportovní 7, 789 63 Ruda nad Moravou",
            "branch_address": None,
            "permanent_address": None,
            "actual_address": None,
            "date_of_birth": None,
            "profile_image": None,
            "bio": "Správce platformy CraftBolt",
            "website": "https://craftbolt.cz",
            "categories": [],
            "custom_categories": [],
            "reference_photos": [],
            "service_areas": [],
            "is_verified": True,
            "trial_ends_at": None,
            "subscription_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "rating": 0.0,
            "rating_percentage": 0.0,
            "reviews_count": 0,
            "location": None,
            "certifications": [],
            "trust_score": 5
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user seeded: {ADMIN_EMAIL}")
    
    # Migrate old category names to new ones
    CATEGORY_MIGRATION = {
        "Autoservis": "Autoservis",
        "Bezpečnostní služby, zabezpečení objektů": "Elektronické zabezpečení majetku",
        "Čalounictví": "Čalouníci",
        "Fotografické služby": "Focení, natáčení videí",
        "Geodetické služby": "Geodetické práce",
        "Hlídání dětí a zvířat": "Hlídání dětí",
        "Instalatérství": "Instalatéři",
        "IT služby, Webdesign": "IT, software",
        "Izolatérství": "Izolatéři",
        "Klimatizace, vzduchotechnika": "Klimatizace, vzduchotechnika",
        "Kominictví": "Kominíci",
        "Kosmetické služby": "Kosmetika",
        "Krejčovství": "Švadleny",
        "Lesnictví, myslivectví": "Lesnictví",
        "Malířství, natěračství": "Malíři, natěrači",
        "Masérské služby": "Masáže",
        "Montáže oken/dveří": "Montáže konstrukcí",
        "Pečovatelské služby": "Péče o zdravotně nezpůsobilé",
        "Pískování materiálů": "Tryskání",
        "Plynaři, topenáři": "Plynaři",
        "Pojišťovnictví": "Pojišťovnictví",
        "Požárně bezpečnostní služby": "Elektronické požární systémy",
        "Právnické služby": "Právo a legislativa",
        "Projektování staveb": "Projektování staveb",
        "Půjčky, hypotéky": "Půjčky, úvěry",
        "Půjčovny": "Pronájem nářadí",
        "Realitní služby": "Reality",
        "Reklamní služby": "Reklama, marketing",
        "Revize": "Revize elektroinstalace",
        "Sádrokartonářské práce": "Sádrokartonáři",
        "Sanace zdiva": "Sanace zdiva",
        "Servis elektrospotřebičů": "Opravy domácích spotřebičů",
        "Elektromontáže - silnoproud": "Elektrikáři – silnoproud",
        "Sklenáři": "Sklenáři",
        "Elektromontáže - slaboproud": "Elektrikáři – slaboproud",
        "Služby pro zvířata": "Hlídání zvířat",
        "Stavební práce, rekonstrukce": "Stavební práce",
        "Stěhování, doprava": "Stěhování, vyklízení",
        "Strojní a ruční výkopové práce": "Výkopové práce",
        "Tesaři, pokrývači": "Tesaři",
        "Truhláři, stolaři, výroba nábytku": "Truhláři, stolaři",
        "Účetnictví, správa firem": "Účetnictví, daně, zpracování mezd",
        "Údržba zeleně": "Údržba zahrad a zeleně",
        "Úklidové služby": "Úklidové práce",
        "Veřejné osvětlení": "Projektování veřejného osvětlení",
        "Výroba z kovu": "Obráběči kovů",
        "Výškové práce": "Výškové práce",
        "Výuka": "Doučování, vzdělávání",
        "Zahradní architektura": "Zahradní architektura",
        "Zámečnictví, svářeči": "Zámečníci, nástrojaři",
        "Zednictví, obkladačství, dlaždičství": "Zedníci",
        "Zemnění, hromosvody": "Hromosvody",
        "Ostatní": "Hodinový manžel",
    }
    
    migrated_users = 0
    migrated_demands = 0
    async for user in db.users.find({"categories": {"$exists": True, "$ne": []}}):
        old_cats = user.get("categories", [])
        new_cats = []
        changed = False
        for cat in old_cats:
            if cat in CATEGORY_MIGRATION and cat != CATEGORY_MIGRATION[cat]:
                new_cats.append(CATEGORY_MIGRATION[cat])
                changed = True
            elif cat in CATEGORIES:
                new_cats.append(cat)
            else:
                # Old category not in migration map — try to keep if it's valid
                mapped = CATEGORY_MIGRATION.get(cat, cat)
                new_cats.append(mapped)
                if mapped != cat:
                    changed = True
        if changed:
            await db.users.update_one({"id": user["id"]}, {"$set": {"categories": new_cats}})
            migrated_users += 1
            logger.info(f"Migrated categories for user {user.get('email')}: {old_cats} -> {new_cats}")
    
    # Also migrate demand categories
    async for demand in db.demands.find({"category": {"$exists": True}}):
        old_cat = demand.get("category", "")
        if old_cat in CATEGORY_MIGRATION and old_cat != CATEGORY_MIGRATION[old_cat]:
            new_cat = CATEGORY_MIGRATION[old_cat]
            await db.demands.update_one({"id": demand["id"]}, {"$set": {"category": new_cat}})
            migrated_demands += 1
            logger.info(f"Migrated demand '{demand.get('title')}' category: {old_cat} -> {new_cat}")
    
    if migrated_users or migrated_demands:
        logger.info(f"Category migration complete: {migrated_users} users, {migrated_demands} demands updated")
    
    logger.info("CraftBolt API started successfully")


@app.on_event("shutdown")
async def shutdown():
    client.close()
