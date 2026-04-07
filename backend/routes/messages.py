from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import MessageCreate, MessageResponse, UserRole
from notifications import notification_service
from typing import List
from datetime import datetime, timezone
import uuid
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://craftbolt.cz")


@router.post("/messages", response_model=MessageResponse)
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": message_data.demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    is_quick = demand.get("is_quick", False)
    
    if not is_quick:
        if current_user["id"] != demand["customer_id"] and current_user["id"] != demand.get("assigned_supplier_id"):
            if demand["status"] != "open" or current_user["role"] != UserRole.SUPPLIER:
                raise HTTPException(status_code=403, detail="Not authorized to send messages")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    sender_display = current_user.get("company_name") or ""
    if not sender_display or sender_display == "None":
        fn = current_user.get("first_name") or ""
        ln = current_user.get("last_name") or ""
        sender_display = f"{fn} {ln}".strip() or current_user["email"]
    
    message = {
        "id": message_id,
        "demand_id": message_data.demand_id,
        "sender_id": current_user["id"],
        "sender_name": sender_display,
        "sender_role": current_user["role"],
        "content": message_data.content,
        "created_at": now.isoformat()
    }
    
    await db.messages.insert_one(message)
    
    try:
        if is_quick and current_user["role"] == UserRole.SUPPLIER:
            # Quick demand: notify the unregistered customer via their stored contact info
            customer_email = demand.get("customer_email", "")
            customer_phone = demand.get("customer_phone", "")
            customer_name = demand.get("customer_name", "Zákazník")
            if customer_email:
                await notification_service.notify_quick_demand_supplier_reply(
                    email=customer_email,
                    phone=customer_phone,
                    customer_name=customer_name,
                    supplier_name=sender_display,
                    demand_title=demand["title"],
                    demand_id=demand["id"]
                )
        else:
            # Regular demand: notify the other party
            if current_user["id"] == demand["customer_id"]:
                recipient_id = demand.get("assigned_supplier_id")
            else:
                recipient_id = demand["customer_id"]
            
            if recipient_id:
                recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0, "email": 1, "phone": 1})
                if recipient:
                    await notification_service.notify_new_message(
                        recipient_email=recipient["email"],
                        recipient_phone=recipient.get("phone"),
                        sender_name=sender_display,
                        demand_title=demand["title"],
                        message=message_data.content
                    )
    except Exception as e:
        logger.error(f"Failed to send message notification: {str(e)}")
    
    return MessageResponse(**message)


@router.get("/messages/unread-summary")
async def get_unread_summary(current_user: dict = Depends(get_current_user)):
    """Get demands with unread messages for the current user (last message not from them)"""
    user_id = current_user["id"]
    
    # Get all demand IDs relevant to this user
    if current_user["role"] in [UserRole.CUSTOMER, UserRole.CUSTOMER_SUPPLIER]:
        user_demands = await db.demands.find(
            {"customer_id": user_id}, {"_id": 0, "id": 1, "title": 1, "status": 1}
        ).to_list(200)
        if current_user["role"] == UserRole.CUSTOMER_SUPPLIER:
            supplier_demands = await db.demands.find(
                {"$or": [
                    {"assigned_supplier_id": user_id},
                    {"status": "open"}
                ]}, {"_id": 0, "id": 1, "title": 1, "status": 1}
            ).to_list(200)
            existing_ids = {d["id"] for d in user_demands}
            for d in supplier_demands:
                if d["id"] not in existing_ids:
                    user_demands.append(d)
    elif current_user["role"] == UserRole.SUPPLIER:
        user_demands = await db.demands.find(
            {"$or": [
                {"assigned_supplier_id": user_id},
                {"status": "open"}
            ]}, {"_id": 0, "id": 1, "title": 1, "status": 1}
        ).to_list(200)
    else:
        user_demands = []
    
    demand_ids = [d["id"] for d in user_demands]
    if not demand_ids:
        return {"unread_demands": [], "total_unread": 0}
    
    # For each demand, check the latest message against last read time
    unread = []
    
    # Batch fetch all read timestamps for this user
    read_records = await db.message_reads.find(
        {"user_id": user_id, "demand_id": {"$in": demand_ids}}, {"_id": 0}
    ).to_list(500)
    read_map = {r["demand_id"]: r.get("last_read_at", "") for r in read_records}
    
    for demand in user_demands:
        last_msg = await db.messages.find_one(
            {"demand_id": demand["id"]},
            {"_id": 0, "sender_id": 1, "sender_name": 1, "content": 1, "created_at": 1},
            sort=[("created_at", -1)]
        )
        if last_msg and last_msg["sender_id"] != user_id:
            last_read = read_map.get(demand["id"], "")
            if not last_read or last_msg["created_at"] > last_read:
                unread.append({
                    "demand_id": demand["id"],
                    "demand_title": demand.get("title", ""),
                    "demand_status": demand.get("status", ""),
                    "last_sender": last_msg["sender_name"],
                    "last_message": last_msg["content"][:80],
                    "last_message_at": last_msg["created_at"]
                })
    
    return {"unread_demands": unread, "total_unread": len(unread)}


@router.get("/messages/{demand_id}", response_model=List[MessageResponse])
async def get_messages(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    messages = await db.messages.find({"demand_id": demand_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Mark messages as read for this user
    now = datetime.now(timezone.utc).isoformat()
    await db.message_reads.update_one(
        {"user_id": current_user["id"], "demand_id": demand_id},
        {"$set": {"user_id": current_user["id"], "demand_id": demand_id, "last_read_at": now}},
        upsert=True
    )
    
    return [MessageResponse(**m) for m in messages]
