from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from database import db
from auth import hash_password, verify_password, create_token, get_current_user
from models import UserCreate, UserLogin, UserResponse, TokenResponse, UserRole
from helpers import user_to_response
from notifications import notification_service
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://craftbolt.cz")


@router.post("/auth/register")
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
    # Normalize email to lowercase
    user_data.email = user_data.email.strip().lower()
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        if existing.get("is_deactivated"):
            # Allow re-registration: remove the deactivated account
            await db.users.delete_one({"email": user_data.email})
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    account_type = user_data.account_type or user_data.supplier_type
    verification_token = secrets.token_urlsafe(32)
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "phone": user_data.phone,
        "role": user_data.role,
        "account_type": account_type,
        "supplier_type": account_type,
        "company_name": user_data.company_name,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
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
        "preferred_languages": user_data.preferred_languages or [],
        "branch_addresses": user_data.branch_addresses or [],
        "is_verified": False,
        "verification_token": verification_token,
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
    
    # Send verification email in background
    background_tasks.add_task(
        _send_verification_email,
        user_data.email,
        user_data.company_name or user_data.first_name or user_data.email.split('@')[0],
        user_data.role,
        user_data.phone,
        verification_token
    )
    
    return {
        "message": "Registrace proběhla úspěšně. Na váš email byl odeslán ověřovací odkaz.",
        "email": user_data.email,
        "requires_verification": True
    }


async def _send_verification_email(email: str, name: str, role: str, phone: str, token: str):
    try:
        await notification_service.notify_registration_verification(
            user_email=email, user_name=name, user_role=role, 
            user_phone=phone, verification_token=token
        )
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")


@router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    """Verify user email with token - atomic and idempotent"""
    # Atomic: find + verify + remove token in one operation
    result = await db.users.find_one_and_update(
        {"verification_token": token},
        {"$set": {"is_verified": True}, "$unset": {"verification_token": ""}},
        return_document=False  # return the document BEFORE update
    )
    
    if not result:
        # Token not found - either expired, or already used (React double-render)
        raise HTTPException(
            status_code=400, 
            detail="Neplatný nebo expirovaný ověřovací odkaz. Pokud jste email již ověřili, můžete se rovnou přihlásit."
        )
    
    return {"message": "Email byl úspěšně ověřen. Nyní se můžete přihlásit.", "verified": True}


@router.post("/auth/resend-verification")
async def resend_verification(data: dict, background_tasks: BackgroundTasks):
    """Resend verification email"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email je povinný")
    email = email.strip().lower()
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    if user.get("is_verified"):
        return {"message": "Email je již ověřen"}
    
    # Generate new token
    new_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"verification_token": new_token}}
    )
    
    background_tasks.add_task(
        _send_verification_email,
        email,
        user.get("company_name") or user.get("first_name") or email.split('@')[0],
        user.get("role", "customer"),
        user.get("phone"),
        new_token
    )
    
    return {"message": "Ověřovací email byl znovu odeslán"}


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Normalize email to lowercase
    email = credentials.email.strip().lower()
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed - user not found: {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(credentials.password, user["password"]):
        logger.warning(f"Login failed - wrong password for: {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_deactivated"):
        raise HTTPException(status_code=403, detail="Váš účet byl deaktivován. Pro obnovení kontaktujte administrátora na info@craftbolt.cz.")
    if not user.get("is_verified") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")
    
    token = create_token(user["id"], user["email"], user["role"])
    return TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)


@router.post("/auth/deactivate")
async def deactivate_account(current_user: dict = Depends(get_current_user), password: str = ""):
    """Deactivate (soft-delete) user account. Requires password confirmation."""
    full_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    if not verify_password(password, full_user["password"]):
        raise HTTPException(status_code=401, detail="Nesprávné heslo")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "is_deactivated": True,
            "deactivated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Účet byl deaktivován"}



@router.post("/auth/forgot-password")
async def forgot_password(data: dict, background_tasks: BackgroundTasks):
    """Send password reset email"""
    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email je povinný")
    
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if user exists or not
        return {"message": "Pokud je email registrován, odeslali jsme vám odkaz pro obnovení hesla."}
    
    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.users.update_one(
        {"email": email},
        {"$set": {"reset_token": reset_token, "reset_token_expires": expires.isoformat()}}
    )
    
    reset_link = f"{FRONTEND_URL}/obnoveni-hesla?token={reset_token}"
    user_name = user.get("company_name") or user.get("first_name") or email.split('@')[0]
    
    html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1a1a1a; padding: 24px; text-align: center;">
            <span style="font-size: 28px; font-weight: 800; color: #ffffff;">Craft</span>
            <span style="font-size: 28px; font-weight: 800; color: #f97316;">Bolt</span>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="color: #1a1a1a; margin: 0 0 16px;">Obnovení hesla</h2>
            <p style="color: #4b5563;">Dobrý den, {user_name}.</p>
            <p style="color: #4b5563;">Obdrželi jsme žádost o obnovení hesla k vašemu účtu na CraftBolt.cz.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_link}" style="background: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                    Nastavit nové heslo
                </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px;">Odkaz je platný 1 hodinu. Pokud jste o obnovení hesla nežádali, tento email ignorujte.</p>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <span style="color: #9ca3af; font-size: 12px;">CraftBolt.cz — Vaše řemeslnická platforma</span>
        </div>
    </div>
    """
    
    background_tasks.add_task(
        notification_service.email_service.send_email,
        email,
        "CraftBolt - Obnovení hesla",
        html
    )
    
    logger.info(f"Password reset requested for: {email}")
    return {"message": "Pokud je email registrován, odeslali jsme vám odkaz pro obnovení hesla."}


@router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Reset password with token"""
    token = data.get("token", "")
    new_password = data.get("password", "")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token a nové heslo jsou povinné")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Heslo musí mít alespoň 8 znaků")
    
    # Find user with this reset token atomically
    user = await db.users.find_one_and_update(
        {
            "reset_token": token,
            "reset_token_expires": {"$gt": datetime.now(timezone.utc).isoformat()}
        },
        {
            "$set": {
                "password": hash_password(new_password),
                "is_verified": True  # Also verify email if not done
            },
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        },
        return_document=False
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Neplatný nebo expirovaný odkaz pro obnovení hesla.")
    
    logger.info(f"Password reset successful for: {user.get('email')}")
    return {"message": "Heslo bylo úspěšně změněno. Nyní se můžete přihlásit."}
