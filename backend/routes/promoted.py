from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db
from datetime import datetime, timezone
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
        "active": False,
        "paid_until": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.promoted_suppliers.insert_one(entry)
    logger.info(f"Promoted supplier created: {data.company_name} (ID: {supplier_id})")
    
    return {"id": supplier_id, "message": "Vytvořeno. Pokračujte k platbě."}

@router.post("/promoted-suppliers/{supplier_id}/create-checkout")
async def create_promo_checkout(supplier_id: str):
    """Create Stripe checkout for promoted supplier (300 CZK + 21% DPH = 363 CZK)"""
    import os
    import stripe
    
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    supplier = await db.promoted_suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Reklamní banner nenalezen")
    
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", os.environ.get("BACKEND_URL", ""))
    success_url = backend_url.replace("/api", "") + f"/?promo_success={supplier_id}"
    cancel_url = backend_url.replace("/api", "") + "/?promo_cancel=1"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "czk",
                    "product_data": {
                        "name": f"CraftBolt Reklamní banner — {supplier['company_name']}",
                        "description": "Reklamní banner na hlavní stránce CraftBolt na 1 den",
                    },
                    "unit_amount": 36300,  # 363 CZK (300 + 21% DPH) in hellers
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"promoted_supplier_id": supplier_id},
        )
        
        # Store checkout session
        await db.promoted_suppliers.update_one(
            {"id": supplier_id},
            {"$set": {"stripe_session_id": session.id}}
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
    # Set paid_until to end of tomorrow (gives full day)
    from datetime import timedelta
    paid_until = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59)
    
    await db.promoted_suppliers.update_one(
        {"id": supplier_id},
        {"$set": {"active": True, "paid_until": paid_until.isoformat(), "activated_at": now.isoformat()}}
    )
    
    logger.info(f"Promoted supplier activated: {supplier.get('company_name')} until {paid_until.isoformat()}")
    return {"status": "active", "paid_until": paid_until.isoformat()}
