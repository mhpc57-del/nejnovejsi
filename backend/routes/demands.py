from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
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


@router.get("/demands/viewed")
async def get_viewed_demands(current_user: dict = Depends(get_current_user)):
    """Get list of demand IDs that supplier has already viewed"""
    record = await db.viewed_demands.find_one({"user_id": current_user["id"]}, {"_id": 0, "demand_ids": 1})
    return {"demand_ids": record.get("demand_ids", []) if record else []}


@router.post("/demands/viewed/{demand_id}")
async def mark_demand_viewed(demand_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a demand as viewed by the supplier"""
    await db.viewed_demands.update_one(
        {"user_id": current_user["id"]},
        {"$addToSet": {"demand_ids": demand_id}},
        upsert=True
    )
    return {"status": "ok"}


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
        "supplier_radius": demand_data.supplier_radius,
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
        # Find suppliers matching category — exclude the demand creator
        all_suppliers = await db.users.find({
            "role": {"$in": ["supplier", "customer_supplier"]},
            "categories": demand_data.category,
            "is_blocked": {"$ne": True},
            "id": {"$ne": current_user["id"]}
        }, {"_id": 0, "id": 1, "email": 1, "phone": 1, "push_token": 1, "service_areas": 1}).to_list(200)
        
        logger.info(f"New demand '{demand_data.title}' category='{demand_data.category}': found {len(all_suppliers)} matching suppliers")
        
        # Filter by distance if radius is set and demand has coordinates
        if demand_data.supplier_radius and demand_data.latitude and demand_data.longitude:
            from math import radians, sin, cos, sqrt, atan2
            
            def haversine(lat1, lon1, lat2, lon2):
                R = 6371
                dlat = radians(lat2 - lat1)
                dlon = radians(lon2 - lon1)
                a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
                return R * 2 * atan2(sqrt(a), sqrt(1-a))
            
            filtered = []
            for s in all_suppliers:
                areas = s.get("service_areas", [])
                if not areas:
                    # No service area defined — include them (they haven't restricted themselves)
                    logger.info(f"  Supplier {s.get('email')}: no service_areas -> INCLUDED")
                    filtered.append(s)
                    continue
                included = False
                for area in areas:
                    # Support both lat/lng and latitude/longitude formats
                    area_lat = area.get("lat") or area.get("latitude") or 0
                    area_lng = area.get("lng") or area.get("longitude") or area.get("lon") or 0
                    area_radius = area.get("radius_km") or area.get("radius") or 20
                    
                    if not area_lat or not area_lng:
                        logger.info(f"  Supplier {s.get('email')}: area has no coords {area} -> INCLUDED")
                        included = True
                        break
                    
                    dist = haversine(demand_data.latitude, demand_data.longitude, float(area_lat), float(area_lng))
                    logger.info(f"  Supplier {s.get('email')}: area({area_lat},{area_lng} r={area_radius}km) dist={dist:.1f}km, demand_radius={demand_data.supplier_radius}km, overlap={dist <= demand_data.supplier_radius + area_radius}")
                    
                    if dist <= demand_data.supplier_radius + float(area_radius):
                        included = True
                        break
                if included:
                    filtered.append(s)
                else:
                    logger.info(f"  Supplier {s.get('email')}: EXCLUDED by radius filter")
            
            logger.info(f"Radius filter ({demand_data.supplier_radius}km from {demand_data.latitude},{demand_data.longitude}): {len(all_suppliers)} -> {len(filtered)} suppliers")
            suppliers = filtered
        else:
            suppliers = all_suppliers
        
        logger.info(f"Notifying {len(suppliers)} suppliers: {[s.get('email','?') for s in suppliers[:10]]}")
        
        if suppliers:
            await notification_service.notify_new_demand(
                suppliers=suppliers,
                demand_title=demand_data.title,
                demand_category=demand_data.category,
                demand_address=demand_data.address or "",
                customer_name=demand.get("customer_name", "")
            )
        
        # Send confirmation SMS to customer
        customer_phone = current_user.get("phone")
        if customer_phone:
            notification_service.sms_service.send_sms(
                customer_phone,
                f"CraftBolt: Vase zakazka '{demand_data.title}' byla uspesne vytvorena. Oslovili jsme {len(suppliers)} dodavatelu ve vasi oblasti."
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


@router.post("/demands/{demand_id}/request-verification")
async def request_demand_verification(demand_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Supplier requests that customer verifies their demand (sends email+SMS with payment link)"""
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
        raise HTTPException(status_code=403, detail="Pouze dodavatel může vyžádat ověření")
    
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Poptávka nenalezena")
    if demand.get("verified"):
        raise HTTPException(status_code=400, detail="Poptávka je již ověřená")
    
    customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1, "first_name": 1})
    if not customer:
        raise HTTPException(status_code=404, detail="Zákazník nenalezen")
    
    supplier_name = current_user.get("company_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user["email"]
    
    # Build verification URL that takes customer directly to Stripe checkout
    origin = request.headers.get("origin", "https://craftbolt.cz")
    verification_url = f"{origin}/dashboard?verify_demand={demand_id}"
    
    try:
        await notification_service.notify_request_verification(
            customer_email=customer["email"],
            customer_phone=customer.get("phone"),
            supplier_name=supplier_name,
            demand_title=demand.get("title", ""),
            demand_id=demand_id,
            verification_url=verification_url
        )
    except Exception as e:
        logger.error(f"Failed to send verification request notification: {str(e)}")
    
    # Track the request in the demand
    await db.demands.update_one(
        {"id": demand_id},
        {"$push": {"verification_requests": {
            "supplier_id": current_user["id"],
            "supplier_name": supplier_name,
            "requested_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    
    return {"message": "Žádost o ověření byla odeslána zákazníkovi"}


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
        "final_price": data.get("final_price", 0),
        "invoiced_amount": data.get("final_price", 0),
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


@router.post("/demands/{demand_id}/confirm-price")
async def confirm_price(demand_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Supplier confirms or disputes the completion price."""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Zakázka není dokončená")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel")
    if demand.get("price_confirmed_by_supplier") is not None:
        raise HTTPException(status_code=400, detail="Cena již byla potvrzena nebo zamítnuta")
    
    confirmed = data.get("confirmed", False)
    now = datetime.now(timezone.utc).isoformat()
    
    update = {
        "price_confirmed_by_supplier": confirmed,
        "price_confirmed_at": now
    }
    
    if not confirmed:
        update["price_dispute_reason"] = data.get("reason", "")
    
    await db.demands.update_one({"id": demand_id}, {"$set": update})
    
    # Notify the customer
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1})
        if customer:
            supplier_name = current_user.get("company_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            if confirmed:
                subject = f"CraftBolt — Dodavatel potvrdil cenu: {demand['title']}"
                heading = "Dodavatel potvrdil konečnou cenu"
                final = demand.get('final_price') or demand.get('agreed_price', 0)
                body = f"Dodavatel <strong>{supplier_name}</strong> potvrdil konečnou cenu <strong>{final:,.0f} Kč</strong> za zakázku <strong>{demand['title']}</strong>."
            else:
                reason = data.get("reason", "")
                subject = f"CraftBolt — Dodavatel nesouhlasí s cenou: {demand['title']}"
                heading = "Dodavatel nesouhlasí s uvedenou cenou"
                body = f"Dodavatel <strong>{supplier_name}</strong> nesouhlasí s cenou za zakázku <strong>{demand['title']}</strong>."
                if reason:
                    body += f'<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0 0 4px 0; font-weight: 600;">Důvod:</p><p style="margin: 0;">{reason}</p></div>'
            
            await notification_service.email_service.send_email(
                customer["email"], subject,
                notification_service.templates.email_base(f"""
                    <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">{heading}</h2>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den,</p>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">{body}</p>
                """, subject)
            )
    except Exception as e:
        logger.error(f"Failed to send price confirmation notification: {e}")
    
    return {"message": "Cena potvrzena" if confirmed else "Nesouhlas s cenou odeslán"}


@router.get("/suppliers/{supplier_id}/finances")
async def get_supplier_finances(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Get financial summary for a supplier."""
    if current_user["id"] != supplier_id and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    
    # Only count confirmed prices
    confirmed = await db.demands.find({
        "assigned_supplier_id": supplier_id,
        "status": "completed",
        "price_confirmed_by_supplier": True
    }, {"_id": 0, "final_price": 1, "agreed_price": 1, "completed_at": 1, "title": 1, "category": 1}).to_list(500)
    
    # Also get pending (not yet confirmed)
    pending = await db.demands.find({
        "assigned_supplier_id": supplier_id,
        "status": "completed",
        "agreed_price": {"$exists": True, "$ne": None},
        "price_confirmed_by_supplier": None
    }, {"_id": 0, "final_price": 1, "agreed_price": 1, "title": 1}).to_list(500)
    
    total_confirmed = sum(d.get("final_price") or d.get("agreed_price", 0) for d in confirmed)
    total_pending = sum(d.get("final_price") or d.get("agreed_price", 0) for d in pending)
    
    return {
        "total_income": total_confirmed,
        "total_pending": total_pending,
        "confirmed_jobs": len(confirmed),
        "pending_jobs": len(pending),
        "transactions": [{
            "title": d.get("title", ""),
            "category": d.get("category", ""),
            "amount": d.get("final_price") or d.get("agreed_price", 0),
            "completed_at": d.get("completed_at", "")
        } for d in confirmed]
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


# ============ QUOTES / ROZPOČTY ============

ALLOWED_QUOTE_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"}


@router.post("/demands/{demand_id}/quotes")
async def submit_quote(demand_id: str, data: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Supplier submits a quote/budget for a demand."""
    if current_user["role"] not in ["supplier", "customer_supplier"]:
        raise HTTPException(status_code=403, detail="Pouze dodavatel může odeslat rozpočet")

    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel této zakázky")
    if demand["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Rozpočet lze odeslat pouze u probíhající zakázky")

    file_url = data.get("file_url", "")
    file_name = data.get("file_name", "")
    amount = data.get("amount")
    note = data.get("note", "")

    if not file_url:
        raise HTTPException(status_code=400, detail="Soubor rozpočtu je povinný")

    # Validate file extension
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in ALLOWED_QUOTE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Nepodporovaný formát. Povolené: {', '.join(ALLOWED_QUOTE_EXTENSIONS)}")

    now = datetime.now(timezone.utc)
    supplier_name = current_user.get("company_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user["email"]

    quote = {
        "id": str(uuid.uuid4()),
        "supplier_id": current_user["id"],
        "supplier_name": supplier_name,
        "file_url": file_url,
        "file_name": file_name,
        "amount": float(amount) if amount else None,
        "note": note,
        "status": "pending",  # pending / accepted / rejected
        "rejection_reason": None,
        "created_at": now.isoformat(),
        "responded_at": None,
    }

    await db.demands.update_one(
        {"id": demand_id},
        {"$push": {"quotes": quote}}
    )

    # Notify customer in background
    background_tasks.add_task(
        _notify_quote_submitted,
        demand=demand,
        supplier_name=supplier_name,
        amount=amount
    )

    return {"message": "Rozpočet byl odeslán zákazníkovi", "quote": quote}


async def _notify_quote_submitted(demand: dict, supplier_name: str, amount):
    """Send notification to customer about new quote."""
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        if not customer:
            return

        amount_text = f" ve vysi {amount:,.0f} Kc" if amount else ""
        demand_url = f"https://craftbolt.cz/zakazka/{demand['id']}"

        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Novy rozpocet k vasi zakazce</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobry den,</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> vam zaslal rozpocet{amount_text}
                k zakazce <strong>{demand['title']}</strong>.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Prohlednete si rozpocet a rozhodnete se, zda nabidku prijmete nebo odmitnete.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{demand_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Zobrazit rozpočet
                </a>
            </div>
        """
        subject = f"Nový rozpočet od {supplier_name} — {demand['title']}"
        html = notification_service.templates.email_base(content, subject)
        await notification_service.email_service.send_email(customer["email"], subject, html)

        # SMS
        if customer.get("phone"):
            sms_enabled = await db.users.find_one({"email": customer["email"]}, {"_id": 0, "sms_notifications": 1})
            if sms_enabled and sms_enabled.get("sms_notifications"):
                notification_service.sms_service.send_sms(
                    customer["phone"],
                    f"CraftBolt: {supplier_name} zaslal rozpocet{amount_text} k zakazce '{demand['title'][:25]}'. Prihlas se pro detail."
                )
    except Exception as e:
        logger.error(f"Failed to send quote notification: {e}")


@router.put("/demands/{demand_id}/quotes/{quote_id}/accept")
async def accept_quote(demand_id: str, quote_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Customer accepts a quote."""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Pouze zákazník může přijmout rozpočet")

    quotes = demand.get("quotes", [])
    quote = next((q for q in quotes if q["id"] == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Rozpočet nenalezen")
    if quote["status"] != "pending":
        raise HTTPException(status_code=400, detail="Tento rozpočet již byl vyřízen")

    now = datetime.now(timezone.utc).isoformat()

    # Update the accepted quote
    await db.demands.update_one(
        {"id": demand_id, "quotes.id": quote_id},
        {"$set": {
            "quotes.$.status": "accepted",
            "quotes.$.responded_at": now,
            "agreed_price": quote.get("amount"),
        }}
    )

    # Reject all other pending quotes
    for q in quotes:
        if q["id"] != quote_id and q["status"] == "pending":
            await db.demands.update_one(
                {"id": demand_id, "quotes.id": q["id"]},
                {"$set": {
                    "quotes.$.status": "rejected",
                    "quotes.$.rejection_reason": "Byl přijat jiný rozpočet",
                    "quotes.$.responded_at": now,
                }}
            )

    # Notify supplier
    background_tasks.add_task(
        _notify_quote_response,
        demand=demand,
        quote=quote,
        accepted=True,
        reason=""
    )

    return {"message": "Rozpočet byl přijat"}


@router.put("/demands/{demand_id}/quotes/{quote_id}/reject")
async def reject_quote(demand_id: str, quote_id: str, data: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Customer rejects a quote with a reason."""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Pouze zákazník může odmítnout rozpočet")

    reason = data.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Důvod odmítnutí je povinný")

    quotes = demand.get("quotes", [])
    quote = next((q for q in quotes if q["id"] == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Rozpočet nenalezen")
    if quote["status"] != "pending":
        raise HTTPException(status_code=400, detail="Tento rozpočet již byl vyřízen")

    now = datetime.now(timezone.utc).isoformat()

    await db.demands.update_one(
        {"id": demand_id, "quotes.id": quote_id},
        {"$set": {
            "quotes.$.status": "rejected",
            "quotes.$.rejection_reason": reason,
            "quotes.$.responded_at": now,
        }}
    )

    # Notify supplier
    background_tasks.add_task(
        _notify_quote_response,
        demand=demand,
        quote=quote,
        accepted=False,
        reason=reason
    )

    return {"message": "Rozpočet byl odmítnut"}


async def _notify_quote_response(demand: dict, quote: dict, accepted: bool, reason: str):
    """Notify supplier about quote acceptance/rejection."""
    try:
        supplier = await db.users.find_one({"id": quote["supplier_id"]}, {"_id": 0, "email": 1, "phone": 1})
        if not supplier:
            return

        customer_name = demand.get("customer_name", "Zákazník")

        if accepted:
            amount_text = f" ve vysi {quote['amount']:,.0f} Kc" if quote.get('amount') else ""
            heading = "Zakaznik prijal vas rozpocet!"
            body = (
                f"Zakaznik <strong>{customer_name}</strong> prijal vas rozpocet{amount_text}"
                f" k zakazce <strong>{demand['title']}</strong>."
            )
            color = "#22c55e"
        else:
            heading = "Zakaznik odmitl vas rozpocet"
            body = (
                f"Zakaznik <strong>{customer_name}</strong> odmitl vas rozpocet"
                f" k zakazce <strong>{demand['title']}</strong>."
            )
            color = "#ef4444"

        reason_block = ""
        if reason:
            reason_block = f"""
                <div style="background-color: {'#fef2f2' if not accepted else '#f0fdf4'}; border-left: 4px solid {color}; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 4px 0; font-weight: 600;">{'Důvod odmítnutí:' if not accepted else 'Poznámka:'}</p>
                    <p style="margin: 0;">{reason}</p>
                </div>
            """

        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">{heading}</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den,</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">{body}</p>
            {reason_block}
            <a href="https://craftbolt.cz/zakazka/{demand['id']}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Zobrazit zakázku
            </a>
        """
        subject = f"CraftBolt — Rozpočet {'přijat' if accepted else 'odmítnut'}: {demand['title']}"
        html = notification_service.templates.email_base(content, subject)
        await notification_service.email_service.send_email(supplier["email"], subject, html)

        # SMS
        if supplier.get("phone"):
            sms_enabled = await db.users.find_one({"email": supplier["email"]}, {"_id": 0, "sms_notifications": 1})
            if sms_enabled and sms_enabled.get("sms_notifications"):
                sms_text = f"CraftBolt: Zakaznik {'prijal' if accepted else 'odmitl'} vas rozpocet k zakazce '{demand['title'][:25]}'."
                if not accepted and reason:
                    sms_text += f" Duvod: {reason[:60]}"
                notification_service.sms_service.send_sms(supplier["phone"], sms_text)
    except Exception as e:
        logger.error(f"Failed to send quote response notification: {e}")
