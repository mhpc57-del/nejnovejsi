from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import hash_password, verify_password, create_token, get_current_user
from models import UserCreate, UserLogin, UserResponse, TokenResponse, UserRole
from helpers import user_to_response
from notifications import notification_service
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    account_type = user_data.account_type or user_data.supplier_type
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "phone": user_data.phone,
        "role": user_data.role,
        "account_type": account_type,
        "supplier_type": account_type,
        "company_name": user_data.company_name,
        "ico": user_data.ico,
        "dic": user_data.dic,
        "address": user_data.address,
        "branch_address": user_data.branch_address,
        "permanent_address": user_data.permanent_address,
        "actual_address": user_data.actual_address,
        "date_of_birth": user_data.date_of_birth,
        "profile_image": user_data.profile_image,
        "bio": user_data.bio,
        "website": user_data.website,
        "categories": user_data.categories or [],
        "custom_categories": user_data.custom_categories or [],
        "reference_photos": user_data.reference_photos or [],
        "service_areas": user_data.service_areas or [],
        "is_verified": False,
        "trial_ends_at": trial_end.isoformat(),
        "subscription_active": True,
        "created_at": now.isoformat(),
        "rating": 0.0,
        "rating_percentage": 0.0,
        "reviews_count": 0,
        "location": None,
        "certifications": [],
        "trust_score": 0
    }
    
    await db.users.insert_one(user)
    
    try:
        await notification_service.notify_registration(
            user_email=user_data.email,
            user_name=user_data.company_name or user_data.email.split('@')[0],
            user_role=user_data.role,
            user_phone=user_data.phone
        )
    except Exception as e:
        logger.error(f"Failed to send registration notification: {str(e)}")
    
    token = create_token(user_id, user_data.email, user_data.role)
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)
