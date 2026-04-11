from fastapi import APIRouter, HTTPException, Depends, Request
from database import db
from auth import get_current_user
from models import CreateCheckoutRequest, SUBSCRIPTION_PLANS, UserRole
from notifications import notification_service
from routes.invoices import create_invoice_for_payment
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subscription/plans")
async def get_subscription_plans():
    return {"plans": SUBSCRIPTION_PLANS}


@router.post("/subscription/checkout")
async def create_subscription_checkout(request: Request, data: CreateCheckoutRequest, current_user: dict = Depends(get_current_user)):
    import stripe
    
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Neplatný tarif")
    
    if data.billing_period not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="Neplatné fakturační období")
    
    if data.payment_mode not in ("one_time", "subscription"):
        raise HTTPException(status_code=400, detail="Neplatný typ platby")
    
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
        if data.payment_mode == "subscription":
            # Recurring subscription via Stripe
            interval = "year" if data.billing_period == "annual" else "month"
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                customer_email=current_user["email"],
                line_items=[{
                    "price_data": {
                        "currency": "czk",
                        "product_data": {
                            "name": f"CraftBolt — {plan['name']} ({period_label} předplatné)",
                        },
                        "unit_amount": int(price * 100),
                        "recurring": {"interval": interval},
                    },
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": current_user["id"],
                    "user_email": current_user["email"],
                    "plan_id": data.plan_id,
                    "plan_name": f"{plan['name']} ({period_label})",
                    "billing_period": data.billing_period,
                    "period_days": str(period_days),
                    "payment_mode": "subscription",
                },
            )
            checkout_url = session.url
            session_id = session.id
        else:
            # One-time payment via emergentintegrations
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/webhook/stripe"
            stripe_checkout = StripeCheckout(api_key=stripe.api_key, webhook_url=webhook_url)
            
            checkout_request = CheckoutSessionRequest(
                amount=price, currency="czk",
                success_url=success_url, cancel_url=cancel_url,
                metadata={
                    "user_id": current_user["id"],
                    "user_email": current_user["email"],
                    "plan_id": data.plan_id,
                    "plan_name": f"{plan['name']} ({period_label})",
                    "billing_period": data.billing_period,
                    "period_days": str(period_days),
                    "payment_mode": "one_time",
                    "trial_days": str(plan["trial_days"])
                }
            )
            
            session_resp: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
            checkout_url = session_resp.url
            session_id = session_resp.session_id
        
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "plan_id": data.plan_id,
            "plan_name": f"{plan['name']} ({period_label})",
            "billing_period": data.billing_period,
            "period_days": period_days,
            "payment_mode": data.payment_mode,
            "amount": price,
            "currency": "CZK",
            "payment_status": "pending",
            "subscription_type": f"{data.billing_period}_{data.payment_mode}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Checkout created for {current_user['email']}, plan: {data.plan_id}, period: {data.billing_period}, mode: {data.payment_mode}")
        return {"url": checkout_url, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při vytváření platby: {str(e)}")


@router.get("/subscription/status/{session_id}")
async def get_subscription_status(request: Request, session_id: str, current_user: dict = Depends(get_current_user)):
    stripe_api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transakce nenalezena")
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            period_days = transaction.get("period_days", 30)
            next_billing = datetime.now(timezone.utc) + timedelta(days=period_days)
            await db.users.update_one(
                {"id": transaction["user_id"]},
                {"$set": {
                    "subscription_active": True,
                    "subscription_plan": transaction["plan_id"],
                    "subscription_billing_period": transaction.get("billing_period", "monthly"),
                    "subscription_status": "active",
                    "subscription_current_period_end": next_billing.isoformat(),
                    "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                    "trial_ends_at": None
                }}
            )
            
            try:
                await notification_service.notify_payment_success(
                    user_email=transaction["user_email"],
                    plan_name=transaction["plan_name"],
                    amount=transaction["amount"]
                )
            except Exception as e:
                logger.error(f"Failed to send payment notification: {str(e)}")
            
            # Generate invoice
            try:
                await create_invoice_for_payment(transaction)
            except Exception as e:
                logger.error(f"Failed to create invoice: {str(e)}")
            
            logger.info(f"Subscription activated for {transaction['user_email']}")
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100 if status.amount_total else transaction["amount"],
            "currency": "CZK",
            "plan_id": transaction.get("plan_id"),
            "plan_name": transaction.get("plan_name")
        }
        
    except Exception as e:
        logger.error(f"Stripe status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při ověřování platby: {str(e)}")


@router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user.get("subscription_active"):
        raise HTTPException(status_code=400, detail="Nemáte aktivní předplatné")
    
    cancel_at = user.get("subscription_current_period_end")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"subscription_status": "canceling", "subscription_cancel_at": cancel_at}}
    )
    
    logger.info(f"Subscription cancellation requested for {current_user['email']}")
    return {"message": "Předplatné bude zrušeno na konci aktuálního období", "cancel_at": cancel_at}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    import stripe
    stripe.api_key = os.environ.get('STRIPE_LIVE_KEY') or os.environ.get('STRIPE_API_KEY')
    if not stripe.api_key:
        return {"status": "error", "message": "Stripe not configured"}
    
    try:
        body = await request.body()
        # Parse the event directly (no signature verification in dev)
        import json
        event = json.loads(body)
        event_type = event.get("type", "")
        
        logger.info(f"Stripe webhook received: {event_type}")
        
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            session_id = session.get("id")
            metadata = session.get("metadata", {})
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "stripe_subscription_id": session.get("subscription"),
                        "stripe_customer_id": session.get("customer"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                next_billing = datetime.now(timezone.utc) + timedelta(days=transaction.get("period_days", 30))
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {
                        "subscription_active": True,
                        "subscription_plan": transaction["plan_id"],
                        "subscription_status": "active",
                        "subscription_current_period_end": next_billing.isoformat(),
                        "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                        "stripe_subscription_id": session.get("subscription"),
                        "stripe_customer_id": session.get("customer"),
                        "trial_ends_at": None
                    }}
                )
                logger.info(f"Subscription activated via webhook: {transaction['user_email']}")
        
        elif event_type == "invoice.payment_failed":
            # Payment failed — notify and mark as past_due
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")
            subscription_id = invoice.get("subscription")
            
            user = await db.users.find_one(
                {"$or": [
                    {"stripe_customer_id": customer_id},
                    {"stripe_subscription_id": subscription_id}
                ]}
            )
            if user:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "subscription_status": "past_due",
                        "subscription_payment_failed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.warning(f"Payment failed for user {user.get('email')}, subscription {subscription_id}")
                
                # Send notification about failed payment
                try:
                    await notification_service.send_email(
                        to_email=user["email"],
                        subject="CraftBolt — Platba se nezdařila",
                        body=f"Dobrý den,\n\nvaše měsíční platba za předplatné CraftBolt se nezdařila. Prosím aktualizujte platební údaje, jinak bude přístup k zakázkám omezen.\n\nS pozdravem,\nTým CraftBolt"
                    )
                except Exception as e:
                    logger.error(f"Failed to send payment failed email: {e}")
        
        elif event_type in ("customer.subscription.deleted", "customer.subscription.canceled"):
            # Subscription cancelled or deleted — deactivate access
            subscription = event["data"]["object"]
            customer_id = subscription.get("customer")
            subscription_id = subscription.get("id")
            
            user = await db.users.find_one(
                {"$or": [
                    {"stripe_customer_id": customer_id},
                    {"stripe_subscription_id": subscription_id}
                ]}
            )
            if user:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "subscription_active": False,
                        "subscription_status": "cancelled",
                        "subscription_cancelled_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Subscription cancelled for user {user.get('email')}")
        
        elif event_type == "invoice.paid":
            # Recurring payment successful — extend subscription
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")
            subscription_id = invoice.get("subscription")
            
            user = await db.users.find_one(
                {"$or": [
                    {"stripe_customer_id": customer_id},
                    {"stripe_subscription_id": subscription_id}
                ]}
            )
            if user:
                next_billing = datetime.now(timezone.utc) + timedelta(days=30)
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "subscription_active": True,
                        "subscription_status": "active",
                        "subscription_current_period_end": next_billing.isoformat(),
                        "subscription_payment_failed_at": None
                    }}
                )
                logger.info(f"Recurring payment successful for user {user.get('email')}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/subscription/my")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    trial_active = False
    if user.get("trial_ends_at"):
        trial_end = datetime.fromisoformat(user["trial_ends_at"].replace('Z', '+00:00'))
        trial_active = trial_end > datetime.now(timezone.utc)
    
    subscription_active = user.get("subscription_active", False)
    if user.get("subscription_ends_at"):
        sub_end = datetime.fromisoformat(user["subscription_ends_at"].replace('Z', '+00:00'))
        if sub_end < datetime.now(timezone.utc):
            subscription_active = False
    
    return {
        "subscription_active": subscription_active,
        "subscription_plan": user.get("subscription_plan"),
        "subscription_ends_at": user.get("subscription_ends_at"),
        "trial_active": trial_active,
        "trial_ends_at": user.get("trial_ends_at")
    }
