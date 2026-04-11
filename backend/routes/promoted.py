from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import db
from auth import get_current_user
from models import UserRole
from datetime import datetime, timezone, timedelta
import uuid
import random
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class PromotedSupplierCreate(BaseModel):
    company_name: str
    bio: str
    phone: str
    website: Optional[str] = ""
    logo_url: Optional[str] = ""
    duration: Optional[str] = "day"  # "day" or "month"

class PromotedSupplierResponse(BaseModel):
    id: str
    company_name: str
    bio: str
    phone: str
    website: str
    logo_url: str

@router.get("/promoted-suppliers")
async def get_promoted_suppliers():
    """Get 6 random active promoted suppliers for homepage display"""
    now = datetime.now(timezone.utc)
    
    # Find all active (paid, not expired) promoted suppliers
    active = await db.promoted_suppliers.find({
        "active": True,
        "paid_until": {"$gte": now.isoformat()}
    }, {"_id": 0}).to_list(200)
    
    # Randomly pick 6
    if len(active) > 6:
        selected = random.sample(active, 6)
    else:
        selected = active
    
    # Shuffle for variety
    random.shuffle(selected)
    
    return {"suppliers": selected, "total_active": len(active)}

@router.post("/promoted-suppliers")
async def create_promoted_supplier(data: PromotedSupplierCreate):
    """Create a promoted supplier entry (pending payment)"""
    supplier_id = str(uuid.uuid4())[:8]
    
    entry = {
        "id": supplier_id,
        "company_name": data.company_name,
        "bio": data.bio,
        "phone": data.phone,
        "website": data.website or "",
        "logo_url": data.logo_url or "",
        "duration": data.duration or "day",
        "active": False,
        "paid_until": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.promoted_suppliers.insert_one(entry)
    logger.info(f"Promoted supplier created: {data.company_name} (ID: {supplier_id})")
    
    return {"id": supplier_id, "message": "Vytvořeno. Pokračujte k platbě."}

@router.post("/promoted-suppliers/{supplier_id}/create-checkout")
async def create_promo_checkout(supplier_id: str):
    """Create Stripe checkout for promoted supplier"""
    import os
    import stripe
    
    stripe.api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    supplier = await db.promoted_suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    duration = supplier.get("duration", "day")
    if duration == "month":
        price_czk = 990
        price_label = "990 Kč/měsíc"
        duration_days = 30
        desc = "Reklamní banner na hlavní stránce CraftBolt na 1 měsíc"
    else:
        price_czk = 39
        price_label = "39 Kč/den"
        duration_days = 1
        desc = "Reklamní banner na hlavní stránce CraftBolt na 1 den"
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://craftbolt.cz")
    success_url = frontend_url + f"/?promo_success={supplier_id}"
    cancel_url = frontend_url + "/?promo_cancel=1"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "czk",
                    "product_data": {
                        "name": f"CraftBolt Reklamní banner — {supplier['company_name']}",
                        "description": desc,
                    },
                    "unit_amount": price_czk * 100,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"promoted_supplier_id": supplier_id, "duration": duration, "duration_days": str(duration_days)},
        )
        
        await db.promoted_suppliers.update_one(
            {"id": supplier_id},
            {"$set": {"stripe_session_id": session.id, "price_paid": price_czk}}
        )
        
        return {"checkout_url": session.url}
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Nepodařilo se vytvořit platbu")

@router.post("/promoted-suppliers/{supplier_id}/activate")
async def activate_promoted_supplier(supplier_id: str):
    """Activate promoted supplier after successful payment (called from success redirect)"""
    supplier = await db.promoted_suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    now = datetime.now(timezone.utc)
    duration = supplier.get("duration", "day")
    if duration == "month":
        paid_until = (now + timedelta(days=30)).replace(hour=23, minute=59, second=59)
    else:
        paid_until = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
    
    await db.promoted_suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"active": True, "paid_until": paid_until.isoformat(), "activated_at": now.isoformat()}}
    )
    
    logger.info(f"Promoted supplier activated: {supplier.get('company_name')} until {paid_until.isoformat()}")
    return {"status": "active", "paid_until": paid_until.isoformat()}


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/promoted-stats")
async def get_promoted_stats(current_user: dict = Depends(get_current_user)):
    """Get admin statistics for promoted suppliers"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    all_promos = await db.promoted_suppliers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    active_count = 0
    expired_count = 0
    pending_count = 0
    total_revenue = 0
    month_revenue = 0
    today_revenue = 0
    
    for p in all_promos:
        if p.get("active") and p.get("paid_until") and p["paid_until"] >= now.isoformat():
            active_count += 1
        elif p.get("activated_at"):
            expired_count += 1
        else:
            pending_count += 1
        
        if p.get("activated_at"):
            revenue = p.get("price_paid", 39)
            total_revenue += revenue
            if p["activated_at"] >= month_start:
                month_revenue += revenue
            if p["activated_at"] >= today_start:
                today_revenue += revenue
    
    return {
        "active": active_count,
        "expired": expired_count,
        "pending": pending_count,
        "total_count": len(all_promos),
        "revenue_total": total_revenue,
        "revenue_month": month_revenue,
        "revenue_today": today_revenue,
        "suppliers": all_promos
    }


@router.delete("/admin/promoted/{supplier_id}")
async def admin_delete_promoted(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: delete a promoted supplier entry"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.promoted_suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    return {"message": "Banner smazán"}


@router.put("/admin/promoted/{supplier_id}/deactivate")
async def admin_deactivate_promoted(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: deactivate a promoted supplier"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.promoted_suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    return {"message": "Banner deaktivován"}


@router.put("/admin/promoted/{supplier_id}/extend")
async def admin_extend_promoted(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: extend a promoted supplier by 1 year"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    supplier = await db.promoted_suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    now = datetime.now(timezone.utc)
    current_until = supplier.get("paid_until", now.isoformat())
    
    try:
        base = datetime.fromisoformat(current_until.replace("Z", "+00:00"))
        if base < now:
            base = now
    except (ValueError, AttributeError):
        base = now
    
    new_until = (base + timedelta(days=365)).replace(hour=23, minute=59, second=59)
    
    await db.promoted_suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"active": True, "paid_until": new_until.isoformat()}}
    )
    
    return {"message": f"Banner prodloužen do {new_until.isoformat()}", "paid_until": new_until.isoformat()}
