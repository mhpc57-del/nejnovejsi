from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import MessageCreate, MessageResponse, UserRole
from notifications import notification_service
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/messages", response_model=MessageResponse)
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": message_data.demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
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
        # Determine recipient - customer or supplier
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


@router.get("/messages/{demand_id}", response_model=List[MessageResponse])
async def get_messages(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    messages = await db.messages.find({"demand_id": demand_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [MessageResponse(**m) for m in messages]
