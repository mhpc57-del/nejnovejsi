from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from auth import get_current_user
from models import CreateCheckoutRequest, SUBSCRIPTION_PLANS, DEMAND_VERIFICATION_PRICE, UserRole
from notifications import notification_service
from routes.invoices import create_invoice_for_payment
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging
import stripe

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subscription/plans")
async def get_subscription_plans():
    return {"plans": SUBSCRIPTION_PLANS}


@router.post("/subscription/checkout")
async def create_subscription_checkout(request: Request, data: CreateCheckoutRequest, current_user: dict = Depends(get_current_user)):
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Neplatný tarif")
    
    if data.billing_period not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="Neplatné fakturační období")
    
    plan = SUBSCRIPTION_PLANS[data.plan_id]
    price = plan["price_annual"] if data.billing_period == "annual" else plan["price_monthly"]
    period_label = "roční" if data.billing_period == "annual" else "měsíční"
    period_days = 365 if data.billing_period == "annual" else 30
    
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    success_url = f"{data.origin_url}/platba/uspech?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/platba/zruseno"
    
    try:
        # One-time payment only
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer_email=current_user["email"],
            line_items=[{
                "price_data": {
                    "currency": "czk",
                    "product_data": {
                        "name": f"CraftBolt — {plan['name']} ({period_label} přístup)",
                    },
                    "unit_amount": int(price * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user["id"],
                "user_email": current_user["email"],
                "plan_id": data.plan_id,
                "plan_name": f"{plan['name']} ({period_label})",
                "billing_period": data.billing_period,
                "period_days": str(period_days),
                "payment_type": "supplier_access",
            },
        )
        
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.id,
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "plan_id": data.plan_id,
            "plan_name": f"{plan['name']} ({period_label})",
            "billing_period": data.billing_period,
            "period_days": period_days,
            "payment_type": "supplier_access",
            "amount": price,
            "currency": "CZK",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Checkout created for {current_user['email']}, plan: {data.plan_id}, period: {data.billing_period}")
        return {"url": session.url, "session_id": session.id}
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při vytváření platby: {str(e)}")


@router.get("/subscription/status/{session_id}")
async def get_subscription_status(session_id: str, current_user: dict = Depends(get_current_user)):
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transakce nenalezena")
        
        payment_status = "paid" if session.payment_status == "paid" else session.payment_status
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": payment_status, "status": session.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if payment_status == "paid" and transaction.get("payment_status") != "paid":
            payment_type = transaction.get("payment_type", "supplier_access")
            
            if payment_type == "supplier_access":
                period_days = transaction.get("period_days", 30)
                access_until = datetime.now(timezone.utc) + timedelta(days=period_days)
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {
                        "subscription_active": True,
                        "subscription_plan": transaction["plan_id"],
                        "subscription_billing_period": transaction.get("billing_period", "monthly"),
                        "subscription_status": "active",
                        "subscription_current_period_end": access_until.isoformat(),
                        "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logger.info(f"Access activated for {transaction['user_email']} until {access_until.isoformat()}")
            
            elif payment_type == "demand_verification":
                demand_id = transaction.get("demand_id")
                if demand_id:
                    await db.demands.update_one(
                        {"id": demand_id},
                        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info(f"Demand {demand_id} verified after payment")
            
            try:
                await notification_service.notify_payment_success(
                    user_email=transaction["user_email"],
                    plan_name=transaction.get("plan_name", "Platba CraftBolt"),
                    amount=transaction["amount"]
                )
            except Exception as e:
                logger.error(f"Failed to send payment notification: {str(e)}")
            
            try:
                await create_invoice_for_payment(transaction)
            except Exception as e:
                logger.error(f"Failed to create invoice: {str(e)}")
        
        return {
            "status": session.status,
            "payment_status": payment_status,
            "amount": session.amount_total / 100 if session.amount_total else transaction["amount"],
            "currency": "CZK",
            "plan_id": transaction.get("plan_id"),
            "plan_name": transaction.get("plan_name"),
            "payment_type": transaction.get("payment_type")
        }
        
    except Exception as e:
        logger.error(f"Stripe status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při ověřování platby: {str(e)}")


@router.post("/demands/{demand_id}/verify-checkout")
async def create_demand_verification_checkout(demand_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a Stripe checkout for demand verification (49 Kč)"""
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Poptávka nenalezena")
    if demand.get("customer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění k této poptávce")
    if demand.get("verified"):
        raise HTTPException(status_code=400, detail="Poptávka je již ověřena")
    
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    origin = request.headers.get("origin", "")
    success_url = f"{origin}/platba/uspech?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/dashboard"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer_email=current_user["email"],
            line_items=[{
                "price_data": {
                    "currency": "czk",
                    "product_data": {
                        "name": f"CraftBolt — Ověření poptávky",
                        "description": f"Ověření poptávky: {demand.get('title', '')}",
                    },
                    "unit_amount": int(DEMAND_VERIFICATION_PRICE * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user["id"],
                "user_email": current_user["email"],
                "demand_id": demand_id,
                "payment_type": "demand_verification",
            },
        )
        
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.id,
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "demand_id": demand_id,
            "plan_name": "Ověření poptávky",
            "payment_type": "demand_verification",
            "amount": DEMAND_VERIFICATION_PRICE,
            "currency": "CZK",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Demand verification checkout created for {current_user['email']}, demand: {demand_id}")
        return {"url": session.url, "session_id": session.id}
        
    except Exception as e:
        logger.error(f"Stripe demand verification checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při vytváření platby: {str(e)}")


@router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user.get("subscription_active"):
        raise HTTPException(status_code=400, detail="Nemáte aktivní přístup")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"subscription_active": False, "subscription_status": "cancelled"}}
    )
    
    logger.info(f"Access cancelled for {current_user['email']}")
    return {"message": "Přístup byl zrušen"}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        return {"status": "error", "message": "Stripe not configured"}
    
    try:
        body = await request.body()
        import json
        event = json.loads(body)
        event_type = event.get("type", "")
        
        logger.info(f"Stripe webhook received: {event_type}")
        
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            session_id = session.get("id")
            metadata = session.get("metadata", {})
            
            # Handle promoted supplier activation
            promoted_supplier_id = metadata.get("promoted_supplier_id")
            if promoted_supplier_id:
                supplier = await db.promoted_suppliers.find_one({"id": promoted_supplier_id}, {"_id": 0})
                if supplier and not supplier.get("active"):
                    duration = metadata.get("duration", supplier.get("duration", "day"))
                    duration_days = int(metadata.get("duration_days", 1))
                    now = datetime.now(timezone.utc)
                    paid_until = (now + timedelta(days=duration_days)).replace(hour=23, minute=59, second=59)
                    await db.promoted_suppliers.update_one(
                        {"id": promoted_supplier_id},
                        {"$set": {"active": True, "paid_until": paid_until.isoformat(), "activated_at": now.isoformat()}}
                    )
                    logger.info(f"Promoted supplier activated via webhook: {supplier.get('company_name')} until {paid_until.isoformat()}")
            
            # Handle payment transactions
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                payment_type = transaction.get("payment_type", "supplier_access")
                
                if payment_type == "supplier_access":
                    period_days = transaction.get("period_days", 30)
                    access_until = datetime.now(timezone.utc) + timedelta(days=period_days)
                    await db.users.update_one(
                        {"id": transaction["user_id"]},
                        {"$set": {
                            "subscription_active": True,
                            "subscription_plan": transaction.get("plan_id"),
                            "subscription_status": "active",
                            "subscription_current_period_end": access_until.isoformat(),
                            "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                        }}
                    )
                    logger.info(f"Access activated via webhook: {transaction['user_email']}")
                
                elif payment_type == "demand_verification":
                    demand_id = transaction.get("demand_id")
                    if demand_id:
                        await db.demands.update_one(
                            {"id": demand_id},
                            {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        logger.info(f"Demand {demand_id} verified via webhook")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/subscription/my")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    subscription_active = user.get("subscription_active", False)
    if user.get("subscription_current_period_end"):
        period_end = datetime.fromisoformat(user["subscription_current_period_end"].replace('Z', '+00:00'))
        if period_end < datetime.now(timezone.utc):
            subscription_active = False
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$set": {"subscription_active": False, "subscription_status": "expired"}}
            )
    
    return {
        "subscription_active": subscription_active,
        "subscription_plan": user.get("subscription_plan"),
        "subscription_current_period_end": user.get("subscription_current_period_end"),
        "subscription_status": user.get("subscription_status"),
    }


@router.post("/payments/sync-pending")
async def sync_pending_payments(current_user: dict = Depends(get_current_user)):
    """Check and process any pending payments for the current user"""
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    pending = await db.payment_transactions.find(
        {"user_id": current_user["id"], "payment_status": "pending"}
    ).to_list(50)
    
    synced = 0
    for tx in pending:
        try:
            session = stripe.checkout.Session.retrieve(tx["session_id"])
            if session.payment_status == "paid":
                await db.payment_transactions.update_one(
                    {"session_id": tx["session_id"]},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                if tx.get("payment_type") == "demand_verification":
                    demand_id = tx.get("demand_id")
                    if demand_id:
                        await db.demands.update_one(
                            {"id": demand_id},
                            {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        logger.info(f"Demand {demand_id} verified via sync")
                
                elif tx.get("payment_type") == "supplier_access":
                    period_days = tx.get("period_days", 30)
                    access_until = datetime.now(timezone.utc) + timedelta(days=period_days)
                    await db.users.update_one(
                        {"id": tx["user_id"]},
                        {"$set": {
                            "subscription_active": True,
                            "subscription_plan": tx.get("plan_id"),
                            "subscription_status": "active",
                            "subscription_current_period_end": access_until.isoformat(),
                        }}
                    )
                    logger.info(f"Access activated via sync: {tx['user_email']}")
                
                synced += 1
        except Exception as e:
            logger.error(f"Sync error for {tx.get('session_id')}: {e}")
    
    return {"synced": synced, "total_pending": len(pending)}

