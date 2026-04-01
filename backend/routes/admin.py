from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import UserRole, UserResponse, DemandResponse
from helpers import user_to_response
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    customers = await db.users.count_documents({"role": UserRole.CUSTOMER})
    suppliers = await db.users.count_documents({"role": UserRole.SUPPLIER})
    total_demands = await db.demands.count_documents({})
    open_demands = await db.demands.count_documents({"status": "open"})
    completed_demands = await db.demands.count_documents({"status": "completed"})
    
    return {
        "total_users": total_users,
        "customers": customers,
        "suppliers": suppliers,
        "total_demands": total_demands,
        "open_demands": open_demands,
        "completed_demands": completed_demands
    }


@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [user_to_response(u) for u in users]


@router.get("/admin/demands", response_model=List[DemandResponse])
async def get_all_demands(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    demands = await db.demands.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [DemandResponse(**d) for d in demands]


@router.put("/admin/users/{user_id}/reactivate")
async def reactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Admin reactivates a deactivated user account."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_deactivated": False}, "$unset": {"deactivated_at": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"message": "Účet byl obnoven"}
