from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import UserRole, UserResponse, DemandResponse, CATEGORIES, ADMIN_EMAIL
from helpers import user_to_response
from notifications import NotificationService
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()
notification_service = NotificationService()


# ============ MODELS ============

class AdminMessage(BaseModel):
    subject: str
    message: str

class AdminDemandNotify(BaseModel):
    notify_type: str  # "wrong_category", "improve_description", "vulgar_language", "custom"
    message: Optional[str] = ""
    flagged_words: Optional[str] = ""

class AdminCancelDemand(BaseModel):
    reason: str

class AdminEditUser(BaseModel):
    email: Optional[str] = None
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    address: Optional[str] = None
    branch_address: Optional[str] = None
    permanent_address: Optional[str] = None
    actual_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    categories: Optional[List[str]] = None
    custom_categories: Optional[List[str]] = None
    role: Optional[str] = None
    account_type: Optional[str] = None


# ============ STATS ============

@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    customers = await db.users.count_documents({"role": {"$in": [UserRole.CUSTOMER, "customer_supplier"]}})
    suppliers = await db.users.count_documents({"role": {"$in": [UserRole.SUPPLIER, "customer_supplier"]}})
    total_demands = await db.demands.count_documents({})
    open_demands = await db.demands.count_documents({"status": "open"})
    completed_demands = await db.demands.count_documents({"status": "completed"})
    pending_suggestions = await db.category_suggestions.count_documents({"status": "pending"})
    blocked_users = await db.users.count_documents({"is_blocked": True})
    
    return {
        "total_users": total_users,
        "customers": customers,
        "suppliers": suppliers,
        "total_demands": total_demands,
        "open_demands": open_demands,
        "completed_demands": completed_demands,
        "pending_suggestions": pending_suggestions,
        "blocked_users": blocked_users
    }


# ============ USERS ============

@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [user_to_response(u) for u in users]


@router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    if user["role"] == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Nelze zablokovat admina")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": True, "blocked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    try:
        await notification_service.email_service.send_email(
            user["email"],
            "CraftBolt — Váš účet byl zablokován",
            notification_service.templates.email_base(f"""
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Váš účet byl zablokován</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Dobrý den,
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Váš účet na platformě CraftBolt byl administrátorem zablokován z důvodu porušení podmínek používání.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Pokud si myslíte, že se jedná o omyl, kontaktujte nás na <a href="mailto:info@craftbolt.cz" style="color: #f97316;">info@craftbolt.cz</a>.
                </p>
            """, "Váš účet byl zablokován")
        )
    except Exception as e:
        logger.error(f"Failed to send block notification: {e}")
    
    return {"message": "Uživatel byl zablokován"}


@router.put("/admin/users/{user_id}/unblock")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": False}, "$unset": {"blocked_at": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    return {"message": "Uživatel byl odblokován"}


@router.put("/admin/users/{user_id}/reactivate")
async def reactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_deactivated": False}, "$unset": {"deactivated_at": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"message": "Účet byl obnoven"}


@router.post("/admin/users/{user_id}/send-verification-reminder")
async def send_verification_reminder(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Uživatel je již ověřen")
    
    try:
        await notification_service.email_service.send_email(
            user["email"],
            "CraftBolt — Připomínka: Ověřte svůj email",
            notification_service.templates.email_base(f"""
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Ověřte svůj email pro plné využití CraftBolt</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den,</p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Všimli jsme si, že váš účet na CraftBolt stále není ověřen. 
                    Ověřením emailu získáte:
                </p>
                <ul style="color: #4b5563; line-height: 2; margin: 0 0 16px 16px;">
                    <li>Plný přístup ke všem funkcím platformy</li>
                    <li>Lepší hodnocení důvěryhodnosti</li>
                    <li>Možnost přijímat a reagovat na zakázky</li>
                </ul>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                    Zkontrolujte prosím svou emailovou schránku (včetně spamu) a klikněte na ověřovací odkaz, 
                    který jsme vám zaslali při registraci.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Pokud jste odkaz nenašli nebo vypršel, kontaktujte nás na 
                    <a href="mailto:info@craftbolt.cz" style="color: #f97316;">info@craftbolt.cz</a> a my vám pošleme nový.
                </p>
            """, "Připomínka ověření emailu")
        )
    except Exception as e:
        logger.error(f"Failed to send verification reminder: {e}")
        raise HTTPException(status_code=500, detail="Nepodařilo se odeslat email")
    
    return {"message": "Připomínka ověření byla odeslána"}


@router.put("/admin/users/{user_id}/edit")
async def admin_edit_user(user_id: str, data: AdminEditUser, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Žádné změny")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"message": "Profil uživatele byl upraven"}


@router.post("/admin/users/{user_id}/message")
async def admin_send_message(user_id: str, data: AdminMessage, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    try:
        await notification_service.email_service.send_email(
            user["email"],
            f"CraftBolt — {data.subject}",
            notification_service.templates.email_base(f"""
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">{data.subject}</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Dobrý den,
                </p>
                <div style="color: #4b5563; line-height: 1.8; margin: 0 0 24px 0; white-space: pre-line;">
                    {data.message}
                </div>
                <p style="color: #9ca3af; line-height: 1.6; margin: 24px 0 0 0; font-size: 12px;">
                    Tato zpráva byla odeslána administrátorem platformy CraftBolt.
                </p>
            """, data.subject)
        )
    except Exception as e:
        logger.error(f"Failed to send admin message: {e}")
        raise HTTPException(status_code=500, detail="Nepodařilo se odeslat email")
    
    return {"message": "Zpráva byla odeslána"}


# ============ DEMANDS ============

@router.get("/admin/demands", response_model=List[DemandResponse])
async def get_all_demands(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    demands = await db.demands.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    from routes.demands import _fix_demand_data
    return [DemandResponse(**_fix_demand_data(d)) for d in demands]


@router.put("/admin/demands/{demand_id}/cancel")
async def admin_cancel_demand(demand_id: str, data: AdminCancelDemand, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Zakázku v tomto stavu nelze zrušit")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": "admin",
            "cancel_reason": data.reason
        }}
    )
    
    # Notify customer
    customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
    if customer:
        try:
            await notification_service.email_service.send_email(
                customer["email"],
                f"CraftBolt — Zakázka zrušena: {demand['title']}",
                notification_service.templates.email_base(f"""
                    <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Vaše zakázka byla zrušena administrátorem</h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        Dobrý den,
                    </p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        Vaše poptávka „<strong>{demand['title']}</strong>" byla zrušena administrátorem platformy.
                    </p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">Důvod:</p>
                        <p style="margin: 4px 0 0 0; color: #4b5563;">{data.reason}</p>
                    </div>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        Pokud máte dotazy, kontaktujte nás na <a href="mailto:info@craftbolt.cz" style="color: #f97316;">info@craftbolt.cz</a>.
                    </p>
                """, "Zakázka zrušena")
            )
        except Exception as e:
            logger.error(f"Failed to send cancel notification: {e}")
    
    return {"message": "Zakázka byla zrušena"}


@router.post("/admin/demands/{demand_id}/notify")
async def admin_notify_demand(demand_id: str, data: AdminDemandNotify, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    
    customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1})
    if not customer:
        raise HTTPException(status_code=404, detail="Zákazník nenalezen")
    
    demand_url = f"https://craftbolt.cz/zakazka/{demand_id}"
    
    templates = {
        "wrong_category": {
            "subject": f"CraftBolt — Poptávka ve špatné kategorii: {demand['title']}",
            "heading": "Vaše poptávka je zařazena ve špatné kategorii",
            "body": f"""
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Všimli jsme si, že vaše poptávka „<strong>{demand['title']}</strong>" je zařazena v kategorii 
                    „<strong>{demand.get('category', '-')}</strong>", která neodpovídá obsahu poptávky.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Prosíme, upravte kategorii vaší poptávky, aby ji mohli najít správní dodavatelé.
                </p>
                {f'<div style="background-color: #fef3e6; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #4b5563;">{data.message}</p></div>' if data.message else ''}
            """
        },
        "improve_description": {
            "subject": f"CraftBolt — Vylepšete popis poptávky: {demand['title']}",
            "heading": "Doporučení k vylepšení popisu poptávky",
            "body": f"""
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Vaše poptávka „<strong>{demand['title']}</strong>" by mohla mít podrobnější popis, 
                    aby dodavatelé lépe pochopili, co přesně potřebujete.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Doporučujeme doplnit detaily jako: rozsah práce, termín, specifické požadavky apod.
                </p>
                {f'<div style="background-color: #fef3e6; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #4b5563;">{data.message}</p></div>' if data.message else ''}
            """
        },
        "vulgar_language": {
            "subject": f"CraftBolt — Nevhodný obsah v poptávce: {demand['title']}",
            "heading": "Vaše poptávka obsahuje nevhodná slova",
            "body": f"""
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    V popisu vaší poptávky „<strong>{demand['title']}</strong>" jsme zaznamenali nevhodná nebo vulgární slova.
                </p>
                {f'<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 16px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0 0 4px 0; color: #1a1a1a; font-weight: 600;">Nevhodná slova:</p><p style="margin: 0; color: #dc2626;">{data.flagged_words}</p></div>' if data.flagged_words else ''}
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    <strong>Vyzýváme vás k okamžité úpravě popisu poptávky.</strong> Pokud tak neučiníte, 
                    bude poptávka zrušena a váš účet může být zablokován.
                </p>
                {f'<div style="background-color: #fef3e6; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #4b5563;">{data.message}</p></div>' if data.message else ''}
            """
        },
        "custom": {
            "subject": f"CraftBolt — Oznámení k poptávce: {demand['title']}",
            "heading": f"Oznámení k poptávce: {demand['title']}",
            "body": f"""
                <div style="color: #4b5563; line-height: 1.8; margin: 0 0 24px 0; white-space: pre-line;">
                    {data.message}
                </div>
            """
        }
    }
    
    tmpl = templates.get(data.notify_type, templates["custom"])
    
    html_content = f"""
        <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">{tmpl['heading']}</h2>
        <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den,</p>
        {tmpl['body']}
        <div style="text-align: center; margin: 32px 0;">
            <a href="{demand_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Upravit poptávku
            </a>
        </div>
    """
    
    try:
        await notification_service.email_service.send_email(
            customer["email"], tmpl["subject"],
            notification_service.templates.email_base(html_content, tmpl["subject"])
        )
    except Exception as e:
        logger.error(f"Failed to send demand notification: {e}")
        raise HTTPException(status_code=500, detail="Nepodařilo se odeslat email")
    
    # Log the admin action
    await db.admin_actions.insert_one({
        "id": str(uuid.uuid4()),
        "type": f"demand_notify_{data.notify_type}",
        "demand_id": demand_id,
        "demand_title": demand["title"],
        "admin_id": current_user["id"],
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Oznámení bylo odesláno zákazníkovi"}


# ============ CATEGORY SUGGESTIONS ============

@router.get("/admin/category-suggestions")
async def get_category_suggestions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    suggestions = await db.category_suggestions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return suggestions


@router.put("/admin/category-suggestions/{suggestion_id}/approve")
async def approve_category(suggestion_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id}, {"_id": 0})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Návrh nenalezen")
    
    await db.category_suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Add to approved categories collection
    await db.approved_categories.insert_one({
        "name": suggestion["category_name"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Kategorie '{suggestion['category_name']}' byla schválena"}


@router.put("/admin/category-suggestions/{suggestion_id}/reject")
async def reject_category(suggestion_id: str, data: dict = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    if data is None:
        data = {}
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id}, {"_id": 0})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Návrh nenalezen")
    
    reason = data.get("reason", "")
    
    await db.category_suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat(), "reject_reason": reason}}
    )
    
    # Notify the user who suggested the category
    suggester = await db.users.find_one({"id": suggestion["suggested_by"]}, {"_id": 0, "email": 1})
    if suggester:
        reason_block = ""
        if reason:
            reason_block = f"""
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 4px 0; color: #1a1a1a; font-weight: 600;">Důvod zamítnutí:</p>
                    <p style="margin: 0; color: #4b5563;">{reason}</p>
                </div>
            """
        try:
            await notification_service.email_service.send_email(
                suggester["email"],
                f"CraftBolt — Návrh kategorie zamítnut: {suggestion['category_name']}",
                notification_service.templates.email_base(f"""
                    <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Váš návrh kategorie byl zamítnut</h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den,</p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        Váš návrh nové kategorie „<strong>{suggestion['category_name']}</strong>" byl administrátorem zamítnut.
                    </p>
                    {reason_block}
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                        Pokud máte dotazy, kontaktujte nás na <a href="mailto:info@craftbolt.cz" style="color: #f97316;">info@craftbolt.cz</a>.
                    </p>
                """, "Návrh kategorie zamítnut")
            )
        except Exception as e:
            logger.error(f"Failed to send category rejection email: {e}")
    
    return {"message": f"Kategorie '{suggestion['category_name']}' byla zamítnuta"}
