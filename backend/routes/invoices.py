from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response, StreamingResponse
from database import db
from auth import get_current_user
from models import UserRole
from invoicing import generate_invoice_pdf, generate_isdoc_xml, generate_invoice_number, COMPANY
from notifications import NotificationService
from datetime import datetime, timezone, timedelta
from io import BytesIO
import uuid
import zipfile
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
notification_service = NotificationService()


async def _get_next_invoice_sequence() -> int:
    """Get next invoice sequence number for current year."""
    year = datetime.now(timezone.utc).year
    counter = await db.invoice_counters.find_one_and_update(
        {"year": year},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=True
    )
    return counter["sequence"]


async def create_invoice_for_payment(transaction: dict) -> dict:
    """Create an invoice record after successful payment."""
    user = await db.users.find_one({"id": transaction["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        logger.error(f"User not found for invoice: {transaction['user_id']}")
        return None
    
    now = datetime.now(timezone.utc)
    sequence = await _get_next_invoice_sequence()
    invoice_number = generate_invoice_number(sequence)
    
    amount = transaction.get("amount", 0)
    vat_rate = 21
    subtotal = round(amount / (1 + vat_rate / 100), 2)
    vat_amount = round(amount - subtotal, 2)
    
    customer_name = user.get("company_name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get("email", "")
    customer_address = user.get("address") or user.get("permanent_address") or ""
    
    plan_name = transaction.get('plan_name', 'Měsíční')
    item_desc = 'Předplatné CraftBolt — ' + plan_name
    
    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "user_id": transaction["user_id"],
        "user_email": transaction["user_email"],
        "transaction_id": transaction.get("id", ""),
        "session_id": transaction.get("session_id", ""),
        "issue_date": now.strftime("%Y-%m-%d"),
        "tax_date": now.strftime("%Y-%m-%d"),
        "due_date": now.strftime("%Y-%m-%d"),
        "variable_symbol": invoice_number.replace("FV", ""),
        "payment_method": 'Platební karta (Stripe)',
        "customer": {
            "name": customer_name,
            "email": user.get("email", ""),
            "address": customer_address,
            "ico": user.get("ico", ""),
            "dic": user.get("dic", ""),
        },
        "items": [{
            "description": item_desc,
            "quantity": 1,
            "unit_price": amount,
            "vat_rate": vat_rate,
            "total": subtotal,
            "total_with_vat": amount,
        }],
        "subtotal": subtotal,
        "vat_rate": vat_rate,
        "vat_amount": vat_amount,
        "total": amount,
        "currency": "CZK",
        "payment_status": "paid",
        "plan_id": transaction.get("plan_id", ""),
        "plan_name": transaction.get("plan_name", ""),
        "created_at": now.isoformat(),
    }
    
    result = await db.invoices.insert_one({k: v for k, v in invoice.items()})
    
    logger.info(f"Invoice created: {invoice_number} for {transaction['user_email']}")
    
    # Send invoice email with PDF attachment
    try:
        pdf_bytes = generate_invoice_pdf(invoice)
        await notification_service.email_service.send_email(
            transaction["user_email"],
            f"CraftBolt \u2014 Faktura {invoice_number}",
            notification_service.templates.email_base(f"""
                <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Faktura za p\u0159edplatn\u00e9 CraftBolt</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobr\u00fd den,</p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    D\u011bkujeme za Va\u0161i platbu. V p\u0159\u00edloze najdete fakturu \u010d\u00edslo <strong>{invoice_number}</strong>.
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">\u010c\u00e1stka: {amount:,.0f} K\u010d</p>
                    <p style="margin: 0; color: #4b5563;">Tarif: {transaction.get('plan_name', '-')}</p>
                </div>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    Fakturu si m\u016f\u017eete tak\u00e9 st\u00e1hnout ve sv\u00e9m \u00fa\u010dtu na platform\u011b CraftBolt.
                </p>
            """, f"Faktura {invoice_number}"),
            attachments=[{
                'data': pdf_bytes,
                'filename': f'{invoice_number}.pdf'
            }]
        )
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")
    
    return invoice


# ============ USER ENDPOINTS ============

@router.get("/invoices/my")
async def get_my_invoices(current_user: dict = Depends(get_current_user)):
    """Get current user's invoices."""
    invoices = await db.invoices.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return invoices


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Download invoice as PDF."""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura nenalezena")
    if invoice["user_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nemate opravneni")
    
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice["invoice_number"]}.pdf"'}
    )


@router.get("/invoices/{invoice_id}/xml")
async def download_invoice_xml(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Download invoice as ISDOC XML for POHODA."""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura nenalezena")
    if invoice["user_id"] != current_user["id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nemate opravneni")
    
    xml_bytes = generate_isdoc_xml(invoice)
    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{invoice["invoice_number"]}.isdoc.xml"'}
    )


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/invoices")
async def get_all_invoices(month: str = None, current_user: dict = Depends(get_current_user)):
    """Get all invoices (admin). Optional filter by month (YYYY-MM)."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    query = {}
    if month:
        query["issue_date"] = {"$regex": f"^{month}"}
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return invoices


@router.get("/admin/invoices/download-zip")
async def download_invoices_zip(month: str, current_user: dict = Depends(get_current_user)):
    """Download all invoices for a month as ZIP (PDF + XML)."""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    invoices = await db.invoices.find(
        {"issue_date": {"$regex": f"^{month}"}},
        {"_id": 0}
    ).to_list(2000)
    
    if not invoices:
        raise HTTPException(status_code=404, detail="Zadne faktury za toto obdobi")
    
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for inv in invoices:
            pdf_bytes = generate_invoice_pdf(inv)
            xml_bytes = generate_isdoc_xml(inv)
            zf.writestr(f"PDF/{inv['invoice_number']}.pdf", pdf_bytes)
            zf.writestr(f"XML/{inv['invoice_number']}.isdoc.xml", xml_bytes)
    
    buffer.seek(0)
    filename = f"CraftBolt_Faktury_{month}.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
