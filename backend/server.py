from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import db, client, UPLOADS_DIR
from routes.auth_routes import router as auth_router
from routes.users import router as users_router
from routes.demands import router as demands_router
from routes.messages import router as messages_router
from routes.reviews import router as reviews_router
from routes.uploads import router as uploads_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router
from routes.misc import router as misc_router
from models import ADMIN_EMAIL, UserRole
from auth import hash_password
from datetime import datetime, timezone, timedelta
import uuid
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

app.include_router(api_router)

# Static files for uploads
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


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
    
    logger.info("CraftBolt API started successfully")


@app.on_event("shutdown")
async def shutdown():
    client.close()
