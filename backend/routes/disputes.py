from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import UserRole
from notifications import notification_service
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DISPUTE_REASONS = {
    "a": "Zakázku dodělám, ale zákazník musí potvrdit rozpočet na více práce.",
    "b": "Přijel jsem na určené místo, ale zákazník neotevřel dveře, nebo jsem se nemohl dostat přes uzamčený plot.",
    "c": "Místo práce je nedostupné, nebo jsou na staveništi překážky, které brání k zahájení nebo pokračování mojí práce.",
    "d": "Nemohl jsem se dostavit z náhlého důvodu (porucha vozidla, nemoc, výluka autobusu).",
}


class CreateDisputeRequest(BaseModel):
    reason_type: str  # a, b, c, d
    description: str
    photos: List[str] = []
    budget_files: List[str] = []  # For type "a" - uploaded budget docs


class CustomerDisputeResponse(BaseModel):
    action: str  # confirm_budget, reject_budget, cancel, reopen
    reject_reason: Optional[str] = None


@router.post("/demands/{demand_id}/dispute")
async def create_dispute(demand_id: str, data: CreateDisputeRequest, current_user: dict = Depends(get_current_user)):
    """Supplier creates a dispute / cannot-complete report"""
    if current_user["role"] not in [UserRole.SUPPLIER, UserRole.CUSTOMER_SUPPLIER]:
        raise HTTPException(status_code=403, detail="Pouze dodavatel může vytvořit spor")

    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("assigned_supplier_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nejste přiřazený dodavatel")
    if demand["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Zakázka není v probíhajícím stavu")
    if data.reason_type not in DISPUTE_REASONS:
        raise HTTPException(status_code=400, detail="Neplatný typ důvodu")

    now = datetime.now(timezone.utc).isoformat()
    supplier_name = current_user.get("company_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user["email"]

    dispute = {
        "id": str(uuid.uuid4()),
        "demand_id": demand_id,
        "supplier_id": current_user["id"],
        "supplier_name": supplier_name,
        "reason_type": data.reason_type,
        "reason_label": DISPUTE_REASONS[data.reason_type],
        "description": data.description,
        "photos": data.photos,
        "budget_files": data.budget_files,
        "customer_id": demand["customer_id"],
        "customer_response": None,
        "customer_response_at": None,
        "customer_reject_reason": None,
        "status": "pending",  # pending, resolved, cancelled, reopened
        "created_at": now,
        "history": [{
            "action": "created",
            "by": current_user["id"],
            "by_name": supplier_name,
            "by_role": "supplier",
            "reason_type": data.reason_type,
            "description": data.description,
            "at": now
        }]
    }

    await db.disputes.insert_one(dispute)

    # Update demand status to "dispute"
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {
            "dispute_status": "pending",
            "dispute_id": dispute["id"],
            "status": "dispute",
        }}
    )

    # Notify customer
    customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
    if customer:
        try:
            reason_text = DISPUTE_REASONS[data.reason_type]
            subject = f"Dodavatel nahlásil problém se zakázkou: {demand.get('title', '')}"
            content = f"""
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel nahlásil problém</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Dodavatel <strong>{supplier_name}</strong> nahlásil problém u zakázky „<strong>{demand.get('title', '')}</strong>".
                </p>
                <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0; padding: 16px; margin: 0 0 16px 0;">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">Důvod:</p>
                    <p style="margin: 0; color: #4b5563;">{reason_text}</p>
                </div>
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">Popis od dodavatele:</p>
                    <p style="margin: 0; color: #4b5563;">{data.description}</p>
                </div>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                    Přihlaste se do svého profilu a zvolte, jak chcete pokračovat.
                </p>
                <a href="https://craftbolt.cz/zakaznik" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700;">
                    Zobrazit detail
                </a>
            """
            from notifications import NotificationTemplates
            html = NotificationTemplates.email_base(content, subject)
            await notification_service.email_service.send_email(customer["email"], subject, html)

            if customer.get("phone"):
                notification_service.sms_service.send_sms(
                    customer["phone"],
                    f"CraftBolt: Dodavatel {supplier_name} nahlasil problem u zakazky '{demand.get('title', '')[:30]}'. Prihlas se pro vice info."
                )
        except Exception as e:
            logger.error(f"Failed to notify customer about dispute: {e}")

    logger.info(f"Dispute created: {dispute['id']} for demand {demand_id} by {supplier_name}")
    return {"message": "Spor byl vytvořen a zákazník byl informován", "dispute_id": dispute["id"]}


@router.post("/demands/{demand_id}/dispute/respond")
async def respond_to_dispute(demand_id: str, data: CustomerDisputeResponse, current_user: dict = Depends(get_current_user)):
    """Customer responds to a dispute"""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")
    if demand.get("customer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění k této zakázce")

    dispute_id = demand.get("dispute_id")
    if not dispute_id:
        raise HTTPException(status_code=400, detail="K zakázce neexistuje spor")

    dispute = await db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    if not dispute or dispute.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Spor již byl vyřešen")

    now = datetime.now(timezone.utc).isoformat()
    customer_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user["email"]

    history_entry = {
        "action": data.action,
        "by": current_user["id"],
        "by_name": customer_name,
        "by_role": "customer",
        "at": now
    }

    if data.action == "confirm_budget":
        # Customer confirms the extra budget — demand goes back to in_progress
        await db.disputes.update_one(
            {"id": dispute_id},
            {"$set": {"status": "resolved", "customer_response": "confirm_budget", "customer_response_at": now},
             "$push": {"history": {**history_entry, "description": "Zákazník potvrdil rozpočet na více práce"}}}
        )
        await db.demands.update_one(
            {"id": demand_id},
            {"$set": {"status": "in_progress", "dispute_status": "resolved"}}
        )
        return {"message": "Rozpočet potvrzen. Zakázka pokračuje."}

    elif data.action == "reject_budget":
        if not data.reject_reason or not data.reject_reason.strip():
            raise HTTPException(status_code=400, detail="Uveďte důvod zamítnutí rozpočtu")
        await db.disputes.update_one(
            {"id": dispute_id},
            {"$set": {"status": "resolved", "customer_response": "reject_budget", "customer_response_at": now, "customer_reject_reason": data.reject_reason},
             "$push": {"history": {**history_entry, "description": f"Zákazník zamítl rozpočet. Důvod: {data.reject_reason}"}}}
        )
        # Demand stays in dispute status
        return {"message": "Rozpočet zamítnut. Zakázka zůstává v řešení."}

    elif data.action == "cancel":
        # Customer cancels — doesn't want to continue with this supplier
        await db.disputes.update_one(
            {"id": dispute_id},
            {"$set": {"status": "cancelled", "customer_response": "cancel", "customer_response_at": now},
             "$push": {"history": {**history_entry, "description": "Zákazník odmítl pokračovat s dodavatelem"}}}
        )
        await db.demands.update_one(
            {"id": demand_id},
            {"$set": {"status": "cancelled", "dispute_status": "cancelled", "cancelled_at": now}}
        )
        return {"message": "Zakázka byla zrušena."}

    elif data.action == "reopen":
        # Customer wants to reopen the demand as new
        await db.disputes.update_one(
            {"id": dispute_id},
            {"$set": {"status": "reopened", "customer_response": "reopen", "customer_response_at": now},
             "$push": {"history": {**history_entry, "description": "Zákazník znovu vystavil poptávku"}}}
        )
        await db.demands.update_one(
            {"id": demand_id},
            {"$set": {
                "status": "open",
                "dispute_status": "reopened",
                "assigned_supplier_id": None,
                "assigned_supplier_name": None,
                "accepted_at": None,
                "reopened_at": now,
            }}
        )
        return {"message": "Poptávka byla znovu vystavena."}

    else:
        raise HTTPException(status_code=400, detail="Neplatná akce")


@router.get("/disputes")
async def get_disputes(current_user: dict = Depends(get_current_user)):
    """Get disputes for current user (supplier or customer)"""
    query = {"$or": [
        {"supplier_id": current_user["id"]},
        {"customer_id": current_user["id"]}
    ]}
    disputes = await db.disputes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return disputes


@router.get("/admin/disputes")
async def get_all_disputes(current_user: dict = Depends(get_current_user)):
    """Admin: get all disputes"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Pouze admin")
    disputes = await db.disputes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return disputes


@router.get("/demands/{demand_id}/dispute")
async def get_demand_dispute(demand_id: str, current_user: dict = Depends(get_current_user)):
    """Get dispute details for a specific demand"""
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Zakázka nenalezena")

    dispute_id = demand.get("dispute_id")
    if not dispute_id:
        return {"dispute": None}

    dispute = await db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    return {"dispute": dispute}
