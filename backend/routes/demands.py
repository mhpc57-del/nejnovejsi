from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import DemandCreate, DemandResponse, UserRole
from notifications import notification_service
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/demands", response_model=DemandResponse)
async def create_demand(demand_data: DemandCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.CUSTOMER and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only customers can create demands")
    
    demand_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    demand = {
        "id": demand_id,
        "title": demand_data.title,
        "description": demand_data.description,
        "category": demand_data.category,
        "address": demand_data.address,
        "latitude": demand_data.latitude,
        "longitude": demand_data.longitude,
        "images": demand_data.images,
        "budget_min": demand_data.budget_min,
        "budget_max": demand_data.budget_max,
        "payment_method": demand_data.payment_method,
        "deadline": demand_data.deadline,
        "status": "open",
        "customer_id": current_user["id"],
        "customer_name": current_user.get("company_name") or current_user["email"],
        "assigned_supplier_id": None,
        "assigned_supplier_name": None,
        "created_at": now.isoformat(),
        "accepted_at": None,
        "completed_at": None,
        "supplier_arrived": False,
        "supplier_arrived_at": None
    }
    
    await db.demands.insert_one(demand)
    
    try:
        suppliers = await db.users.find({
            "role": "supplier",
            "categories": demand_data.category,
            "subscription_active": True
        }, {"_id": 0, "email": 1, "phone": 1}).to_list(100)
        
        if suppliers:
            await notification_service.notify_new_demand(
                suppliers=suppliers,
                demand_title=demand_data.title,
                demand_category=demand_data.category,
                demand_address=demand_data.address or "",
                customer_name=demand.get("customer_name", "")
            )
    except Exception as e:
        logger.error(f"Failed to send new demand notifications: {str(e)}")
    
    return DemandResponse(**demand)


@router.get("/demands", response_model=List[DemandResponse])
async def get_demands(status: Optional[str] = None, category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPPLIER:
        if status:
            if status == "open":
                query["status"] = "open"
            else:
                query["$or"] = [
                    {"status": status, "assigned_supplier_id": current_user["id"]},
                    {"status": "open"}
                ]
        else:
            query["$or"] = [
                {"assigned_supplier_id": current_user["id"]},
                {"status": "open"}
            ]
    
    if category:
        query["category"] = category
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]


@router.get("/demands/available", response_model=List[DemandResponse])
async def get_available_demands(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Only suppliers can view available demands")
    
    query = {"status": "open"}
    supplier_categories = current_user.get("categories", [])
    if supplier_categories:
        query["category"] = {"$in": supplier_categories}
    if category:
        query["category"] = category
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]


@router.get("/demands/my", response_model=List[DemandResponse])
async def get_my_demands(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPPLIER:
        query["assigned_supplier_id"] = current_user["id"]
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]


@router.get("/demands/{demand_id}", response_model=DemandResponse)
async def get_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    return DemandResponse(**demand)


@router.post("/demands/{demand_id}/accept")
async def accept_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Only suppliers can accept demands")
    
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    if demand["status"] != "open":
        raise HTTPException(status_code=400, detail="Demand is not available")
    
    now = datetime.now(timezone.utc)
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {
            "status": "in_progress",
            "assigned_supplier_id": current_user["id"],
            "assigned_supplier_name": current_user.get("company_name") or current_user["email"],
            "accepted_at": now.isoformat()
        }}
    )
    
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        if customer:
            await notification_service.notify_new_offer(
                customer_email=customer["email"],
                customer_phone=customer.get("phone"),
                supplier_name=current_user.get("company_name") or current_user["email"],
                demand_title=demand["title"]
            )
    except Exception as e:
        logger.error(f"Failed to send accept notification: {str(e)}")
    
    return {"message": "Demand accepted"}


@router.post("/demands/{demand_id}/arrive")
async def supplier_arrived(demand_id: str, current_user: dict = Depends(get_current_user)):
    """Mark that the supplier has arrived at the customer's location."""
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Pouze dodavatel může potvrdit příjezd")
    
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel")
    if demand["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Zakázka není v probíhajícím stavu")
    
    now = datetime.now(timezone.utc)
    accepted_at = demand.get("accepted_at")
    
    # Calculate arrival time in minutes
    arrival_minutes = None
    if accepted_at:
        accepted_dt = datetime.fromisoformat(accepted_at.replace('Z', '+00:00'))
        arrival_minutes = (now - accepted_dt).total_seconds() / 60
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {
            "supplier_arrived": True,
            "supplier_arrived_at": now.isoformat(),
            "arrival_minutes": arrival_minutes
        }}
    )
    
    # Calculate punctuality score for this arrival (0-100%)
    def calc_punctuality(minutes):
        if minutes is None:
            return 50
        if minutes <= 30:
            return 100
        if minutes <= 60:
            return 90
        if minutes <= 120:
            return 70
        if minutes <= 240:
            return 50
        return 30

    this_punctuality = calc_punctuality(arrival_minutes)

    # Update supplier's average arrival time and punctuality score
    supplier_demands = await db.demands.find({
        "assigned_supplier_id": current_user["id"],
        "supplier_arrived": True,
        "arrival_minutes": {"$exists": True}
    }, {"_id": 0, "arrival_minutes": 1}).to_list(500)
    
    if supplier_demands:
        avg_arrival = sum(d.get("arrival_minutes", 0) for d in supplier_demands) / len(supplier_demands)
        all_punctuality = [calc_punctuality(d.get("arrival_minutes")) for d in supplier_demands]
        avg_punctuality = sum(all_punctuality) / len(all_punctuality)
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {
                "avg_arrival_minutes": round(avg_arrival, 1),
                "punctuality_score": round(avg_punctuality, 1)
            }}
        )
    
    return {
        "message": "Příjezd potvrzen",
        "arrived_at": now.isoformat(),
        "arrival_minutes": round(arrival_minutes, 1) if arrival_minutes else None
    }


@router.post("/demands/{demand_id}/complete")
async def complete_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if current_user["id"] != demand["customer_id"] and current_user["id"] != demand.get("assigned_supplier_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc)
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"status": "completed", "completed_at": now.isoformat()}}
    )
    
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        supplier = await db.users.find_one({"id": demand.get("assigned_supplier_id")}, {"_id": 0, "email": 1, "phone": 1}) if demand.get("assigned_supplier_id") else None
        
        if customer:
            await notification_service.notify_status_change(
                user_email=customer["email"], user_phone=customer.get("phone"),
                demand_title=demand["title"], old_status="in_progress", new_status="completed"
            )
        if supplier:
            await notification_service.notify_status_change(
                user_email=supplier["email"], user_phone=supplier.get("phone"),
                demand_title=demand["title"], old_status="in_progress", new_status="completed"
            )
    except Exception as e:
        logger.error(f"Failed to send completion notification: {str(e)}")
    
    return {"message": "Demand completed"}


@router.post("/demands/{demand_id}/cancel")
async def cancel_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if current_user["id"] != demand["customer_id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.demands.update_one({"id": demand_id}, {"$set": {"status": "cancelled"}})
    
    try:
        if demand.get("assigned_supplier_id"):
            supplier = await db.users.find_one({"id": demand["assigned_supplier_id"]}, {"_id": 0, "email": 1, "phone": 1})
            if supplier:
                await notification_service.notify_status_change(
                    user_email=supplier["email"], user_phone=supplier.get("phone"),
                    demand_title=demand["title"], old_status=demand["status"], new_status="cancelled"
                )
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {str(e)}")
    
    return {"message": "Demand cancelled"}



@router.post("/demands/{demand_id}/progress-photo")
async def add_progress_photo(demand_id: str, photo_url: str, current_user: dict = Depends(get_current_user)):
    """Add a progress photo to an ongoing demand."""
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if current_user["id"] != demand.get("assigned_supplier_id") and current_user["id"] != demand.get("customer_id"):
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$push": {"progress_photos": photo_url}}
    )
    return {"message": "Foto přidáno"}


@router.post("/demands/{demand_id}/invoice")
async def set_invoice_amount(demand_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    """Set the invoiced amount for a demand."""
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Pouze dodavatel")
    
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"invoiced_amount": amount}}
    )
    return {"message": f"Částka {amount} Kč nastavena"}


@router.post("/demands/{demand_id}/cancel-reason")
async def set_cancellation_reason(demand_id: str, reason: str, current_user: dict = Depends(get_current_user)):
    """Set cancellation reason for a demand."""
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"cancellation_reason": reason, "status": "cancelled"}}
    )
    return {"message": "Důvod uložen"}


@router.get("/suppliers/{supplier_id}/finances")
async def get_supplier_finances(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Get financial summary for a supplier."""
    if current_user["id"] != supplier_id and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    
    completed = await db.demands.find({
        "assigned_supplier_id": supplier_id,
        "status": "completed",
        "invoiced_amount": {"$exists": True, "$ne": None}
    }, {"_id": 0, "invoiced_amount": 1, "completed_at": 1}).to_list(500)
    
    total_income = sum(d.get("invoiced_amount", 0) for d in completed)
    
    return {
        "total_income": total_income,
        "completed_jobs": len(completed),
        "transactions": completed
    }
