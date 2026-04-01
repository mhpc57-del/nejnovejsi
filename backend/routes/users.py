from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import UserResponse, ProfileUpdate, LocationUpdate, CertificationUpload, TrustScoreUpdate, UserRole
from helpers import user_to_response
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

PROFILE_FIELDS = [
    "company_name", "first_name", "last_name", "phone", "ico", "dic", "address", "branch_address",
    "permanent_address", "actual_address", "date_of_birth", "profile_image",
    "bio", "website", "categories", "custom_categories", "reference_photos",
    "service_areas", "account_type"
]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_response(user)


@router.put("/users/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    for field in PROFILE_FIELDS:
        val = getattr(data, field, None)
        if val is not None:
            update_data[field] = val
    
    if "account_type" in update_data:
        update_data["supplier_type"] = update_data["account_type"]
    
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated


@router.post("/users/location")
async def update_location(location: LocationUpdate, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"location": {"lat": location.latitude, "lng": location.longitude, "updated_at": datetime.now(timezone.utc).isoformat()}}}
    )
    return {"message": "Location updated"}


@router.get("/suppliers", response_model=List[UserResponse])
async def get_suppliers(category: str = None):
    query = {"role": UserRole.SUPPLIER, "is_verified": True}
    if category:
        query["categories"] = category
    suppliers = await db.users.find(query, {"_id": 0, "password": 0}).sort("rating", -1).to_list(100)
    return [user_to_response(s) for s in suppliers]


# ============ CERTIFICATIONS ============

@router.post("/users/certifications")
async def upload_certification(data: CertificationUpload, current_user: dict = Depends(get_current_user)):
    """Upload a certification/document for supplier profile."""
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Pouze dodavatelé mohou nahrávat certifikace")
    
    cert = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "file_url": data.file_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$push": {"certifications": cert}}
    )
    return {"message": "Certifikace nahrána", "certification": cert}


@router.delete("/users/certifications/{cert_id}")
async def delete_certification(cert_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a certification from supplier profile."""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"certifications": {"id": cert_id}}}
    )
    return {"message": "Certifikace odstraněna"}


@router.get("/users/{user_id}/certifications")
async def get_certifications(user_id: str):
    """Get certifications for a user."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "certifications": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"certifications": user.get("certifications", [])}


# ============ TRUST SCORE (Admin only) ============

@router.put("/admin/users/{user_id}/trust-score")
async def update_trust_score(user_id: str, data: TrustScoreUpdate, current_user: dict = Depends(get_current_user)):
    """Admin sets trust score (1-5 stars) for a supplier based on certifications."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Pouze admin")
    
    if data.trust_score < 0 or data.trust_score > 5:
        raise HTTPException(status_code=400, detail="Hodnocení musí být 0-5")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"trust_score": data.trust_score, "trust_score_updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    return {"message": f"Hodnocení důvěryhodnosti nastaveno na {data.trust_score}/5"}
