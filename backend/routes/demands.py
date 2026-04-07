from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from database import db
from auth import get_current_user
from models import DemandCreate, DemandResponse, UserRole
from notifications import notification_service
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class QuickDemandCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    description: Optional[str] = ""


@router.post("/demands/quick")
async def create_quick_demand(data: QuickDemandCreate, background_tasks: BackgroundTasks):
    """Create a quick demand without registration - minimal info only"""
    demand_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    quick_demand = {
        "id": demand_id,
        "title": f"Rychlá poptávka od {data.first_name} {data.last_name}",
        "description": data.description or "Rychlá poptávka bez registrace",
        "category": "Ostatní",
        "address": "",
        "latitude": None,
        "longitude": None,
        "images": [],
        "budget_min": None,
        "budget_max": None,
        "deadline": None,
        "customer_id": f"quick_{demand_id}",
        "customer_name": f"{data.first_name} {data.last_name}",
        "customer_email": data.email,
        "customer_phone": data.phone,
        "status": "open",
        "is_quick": True,
        "assigned_supplier_id": None,
        "assigned_supplier_name": None,
        "soft_accepts": [],
        "cancellations": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "progress_photos": [],
        "reviews": [],
    }
    
    await db.demands.insert_one(quick_demand)
    
    # Send confirmation SMS + email in background
    background_tasks.add_task(
        _notify_quick_demand,
        data.email,
        data.phone,
        f"{data.first_name} {data.last_name}"
    )
    
    return {"message": "Poptávka byla úspěšně odeslána", "demand_id": demand_id}


async def _notify_quick_demand(email: str, phone: str, name: str):
    try:
        await notification_service.notify_quick_demand_confirmation(
            email=email, phone=phone, name=name
        )
    except Exception as e:
        logger.error(f"Failed to send quick demand notification: {e}")


@router.post("/demands/claim")
async def claim_quick_demand(current_user: dict = Depends(get_current_user)):
    """Claim all quick demands matching the user's email after registration"""
    user_email = current_user["email"]
    user_id = current_user["id"]
    user_name = current_user.get("company_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or user_email
    
    result = await db.demands.update_many(
        {"is_quick": True, "customer_email": user_email},
        {"$set": {
            "customer_id": user_id,
            "customer_name": user_name,
        }}
    )
    
    return {"claimed": result.modified_count}


@router.post("/demands", response_model=DemandResponse)
async def create_demand(demand_data: DemandCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.CUSTOMER, UserRole.CUSTOMER_SUPPLIER, UserRole.ADMIN]:
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
        "customer_name": current_user.get("company_name") or f'{current_user.get("first_name", "")} {current_user.get("last_name", "")}'.strip() or current_user["email"],
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
        }, {"_id": 0, "email": 1, "phone": 1, "push_token": 1}).to_list(100)
        
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
    
    if current_user["role"] in [UserRole.CUSTOMER, UserRole.CUSTOMER_SUPPLIER]:
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
    return [DemandResponse(**_fix_demand_data(d)) for d in demands]


@router.get("/demands/available", response_model=List[DemandResponse])
async def get_available_demands(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
        raise HTTPException(status_code=403, detail="Only suppliers can view available demands")
    
    query = {"status": "open"}
    supplier_categories = current_user.get("categories", [])
    
    if category:
        # Explicit filter from UI
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    elif supplier_categories:
        # Match supplier's categories (case-insensitive)
        category_regex = [{"category": {"$regex": f"^{cat}$", "$options": "i"}} for cat in supplier_categories]
        if len(category_regex) == 1:
            query.update(category_regex[0])
        else:
            query["$or"] = category_regex
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**_fix_demand_data(d)) for d in demands]


@router.get("/demands/my", response_model=List[DemandResponse])
async def get_my_demands(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPPLIER:
        query["assigned_supplier_id"] = current_user["id"]
    elif current_user["role"] == UserRole.CUSTOMER_SUPPLIER:
        query["$or"] = [
            {"customer_id": current_user["id"]},
            {"assigned_supplier_id": current_user["id"]}
        ]
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**_fix_demand_data(d)) for d in demands]


@router.get("/demands/{demand_id}", response_model=DemandResponse)
async def get_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    fixed_demand = _fix_demand_data(demand)
    return DemandResponse(**fixed_demand)


@router.put("/demands/{demand_id}", response_model=DemandResponse)
async def update_demand(demand_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Allow customer to edit their own demand"""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    if demand["customer_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Nemáte oprávnění upravovat tuto poptávku")
    if demand["status"] not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Zakázku v tomto stavu nelze upravovat")
    
    allowed_fields = {"title", "description", "address", "latitude", "longitude", "images", "budget_min", "budget_max", "deadline"}
    updates = {}
    for k, v in update_data.items():
        if k not in allowed_fields:
            continue
        # Convert empty strings to None for numeric fields
        if k in ("budget_min", "budget_max", "latitude", "longitude"):
            if v == "" or v is None:
                updates[k] = None
            else:
                try:
                    updates[k] = float(v)
                except (ValueError, TypeError):
                    updates[k] = None
        elif v is not None:
            updates[k] = v
    
    if not updates:
        # Fix any existing corrupted data in the demand before returning
        fixed_demand = _fix_demand_data(demand)
        return DemandResponse(**fixed_demand)
    
    await db.demands.update_one({"id": demand_id}, {"$set": updates})
    updated = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    fixed_updated = _fix_demand_data(updated)
    return DemandResponse(**fixed_updated)


def _fix_demand_data(demand: dict) -> dict:
    """Fix corrupted data in demand (empty strings to None for numeric fields)"""
    for field in ("budget_min", "budget_max", "latitude", "longitude"):
        if field in demand and demand[field] == "":
            demand[field] = None
    return demand


@router.post("/demands/{demand_id}/accept")
async def accept_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
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
                demand_title=demand["title"],
                demand_id=demand_id
            )
    except Exception as e:
        logger.error(f"Failed to send accept notification: {str(e)}")
    
    return {"message": "Demand accepted"}


@router.post("/demands/{demand_id}/cannot-complete")
async def cannot_complete_demand(demand_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Supplier marks that they cannot complete the demand, with a reason"""
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
        raise HTTPException(status_code=403, detail="Pouze dodavatel může tuto akci provést")
    
    reason = data.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Důvod je povinný")
    
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel")
    if demand["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Zakázka není v probíhajícím stavu")
    
    now = datetime.now(timezone.utc)
    supplier_name = current_user.get("company_name") or current_user.get("first_name") or current_user["email"]
    
    cancellation = {
        "supplier_id": current_user["id"],
        "supplier_name": supplier_name,
        "reason": reason,
        "created_at": now.isoformat()
    }
    
    # Re-open the demand so other suppliers can take it
    await db.demands.update_one(
        {"id": demand_id},
        {
            "$set": {
                "status": "open",
                "assigned_supplier_id": None,
                "assigned_supplier_name": None,
                "supplier_arrived": False,
                "supplier_arrived_at": None,
            },
            "$push": {"cancellations": cancellation}
        }
    )
    
    # Notify customer
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        if customer:
            await notification_service.notify_cannot_complete(
                customer_email=customer["email"],
                customer_phone=customer.get("phone"),
                supplier_name=supplier_name,
                demand_title=demand["title"],
                reason=reason,
                demand_id=demand_id
            )
    except Exception as e:
        logger.error(f"Failed to send cannot-complete notification: {str(e)}")
    
    return {"message": "Zakázka byla vrácena mezi otevřené poptávky"}


@router.post("/demands/{demand_id}/arrive")
async def supplier_arrived(demand_id: str, current_user: dict = Depends(get_current_user)):
    """Mark that the supplier has arrived at the customer's location."""
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
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
async def complete_demand(demand_id: str, data: dict = {}, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if current_user["id"] != demand["customer_id"] and current_user["id"] != demand.get("assigned_supplier_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc)
    completion_type = data.get("completion_type", "standard")
    
    update_fields = {
        "status": "completed",
        "completed_at": now.isoformat(),
        "completion_type": completion_type,
        "agreed_price": data.get("agreed_price", 0),
        "final_price": data.get("final_price", 0)
    }
    
    # Handle price increase
    if completion_type == "price_increase":
        price_increase = data.get("price_increase", 0)
        update_fields["price_increase"] = price_increase
        # Add to supplier's total earnings
        if demand.get("assigned_supplier_id"):
            await db.users.update_one(
                {"id": demand["assigned_supplier_id"]},
                {"$inc": {"total_earnings_extra": price_increase}}
            )
    
    # Handle blacklist
    if completion_type == "blacklist":
        blacklist_reason = data.get("blacklist_reason", "")
        update_fields["blacklist_reason"] = blacklist_reason
        # Add customer to supplier's blacklist
        if demand.get("assigned_supplier_id") and demand.get("customer_id"):
            await db.users.update_one(
                {"id": demand["assigned_supplier_id"]},
                {"$addToSet": {"blacklisted_customers": {
                    "customer_id": demand["customer_id"],
                    "reason": blacklist_reason,
                    "demand_id": demand_id,
                    "created_at": now.isoformat()
                }}}
            )
    
    # Handle completion photos from the modal
    completion_photos = data.get("completion_photos", [])
    if completion_photos:
        photo_entries = [{
            "url": p.get("url") if isinstance(p, dict) else p,
            "uploaded_by": current_user["id"],
            "uploaded_by_name": current_user.get("company_name") or f'{current_user.get("first_name", "")} {current_user.get("last_name", "")}'.strip(),
            "uploaded_by_role": current_user["role"],
            "uploaded_at": now.isoformat()
        } for p in completion_photos]
        update_fields["completion_photos"] = photo_entries
    
    await db.demands.update_one({"id": demand_id}, {"$set": update_fields})
    
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


@router.post("/demands/{demand_id}/completion-photos")
async def add_completion_photo(demand_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Add completion photos to a completed demand (max 20 total)."""
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Fotky lze přidat pouze k dokončeným zakázkám")
    if current_user["id"] != demand.get("assigned_supplier_id") and current_user["id"] != demand.get("customer_id") and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    
    existing = demand.get("completion_photos", [])
    if len(existing) >= 20:
        raise HTTPException(status_code=400, detail="Maximální počet fotek (20) byl dosažen")
    
    now = datetime.now(timezone.utc)
    photo_url = data.get("url", "")
    if not photo_url:
        raise HTTPException(status_code=400, detail="URL fotky je povinné")
    
    photo_entry = {
        "url": photo_url,
        "uploaded_by": current_user["id"],
        "uploaded_by_name": current_user.get("company_name") or f'{current_user.get("first_name", "")} {current_user.get("last_name", "")}'.strip(),
        "uploaded_by_role": current_user["role"],
        "uploaded_at": now.isoformat()
    }
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$push": {"completion_photos": photo_entry}}
    )
    return {"message": "Foto přidáno", "photo": photo_entry}


@router.delete("/demands/{demand_id}/completion-photos")
async def remove_completion_photo(demand_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Remove a completion photo (only by the person who uploaded it or admin)."""
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    
    photo_url = data.get("url", "")
    existing = demand.get("completion_photos", [])
    photo = next((p for p in existing if p.get("url") == photo_url), None)
    if not photo:
        raise HTTPException(status_code=404, detail="Fotka nenalezena")
    
    if current_user["id"] != photo.get("uploaded_by") and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Můžete mazat pouze vlastní fotky")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$pull": {"completion_photos": {"url": photo_url}}}
    )
    return {"message": "Fotka odstraněna"}


@router.post("/demands/{demand_id}/invoice")
async def set_invoice_amount(demand_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    """Set the invoiced amount for a demand."""
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
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



@router.post("/demands/{demand_id}/soft-accept")
async def soft_accept_demand(demand_id: str, reason: str = "", current_user: dict = Depends(get_current_user)):
    """Supplier conditionally accepts a demand with a predefined reason"""
    if current_user["role"] not in ["supplier", "customer_supplier"]:
        raise HTTPException(status_code=403, detail="Pouze dodavatelé mohou nezávazně přijmout zakázku")
    
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Poptávka nenalezena")
    if demand["status"] != "open":
        raise HTTPException(status_code=400, detail="Pouze otevřené poptávky lze nezávazně přijmout")
    
    supplier_name = current_user.get("company_name") or f"{current_user.get('first_name', '') or ''} {current_user.get('last_name', '') or ''}".strip() or "Dodavatel"
    
    soft_accept = {
        "supplier_id": current_user["id"],
        "supplier_name": supplier_name.strip(),
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$push": {"soft_accepts": soft_accept}}
    )
    
    # Notify customer
    try:
        is_quick = demand.get("is_quick", False)
        if is_quick:
            # Notify quick demand customer directly via stored contacts
            customer_email = demand.get("customer_email", "")
            customer_phone = demand.get("customer_phone", "")
            customer_name = demand.get("customer_name", "Zákazník")
            if customer_email:
                await notification_service.notify_quick_demand_supplier_reply(
                    email=customer_email,
                    phone=customer_phone,
                    customer_name=customer_name,
                    supplier_name=supplier_name.strip(),
                    demand_title=demand["title"],
                    demand_id=demand_id
                )
        else:
            customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
            if customer:
                await notification_service.notify_soft_accept(
                    customer_email=customer["email"],
                    customer_phone=customer.get("phone"),
                    supplier_name=supplier_name.strip(),
                    demand_title=demand["title"],
                    reason=reason,
                    demand_id=demand_id
                )
    except Exception as e:
        logger.error(f"Failed to send soft-accept notification: {str(e)}")
    
    return {"message": "Nezávazné přijetí odesláno zákazníkovi"}