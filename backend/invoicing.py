"""
CraftBolt Invoice Generator
Generates PDF invoices and ISDOC XML for POHODA import.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from lxml import etree
from datetime import datetime, timezone, timedelta
from io import BytesIO
import os

# Company details
COMPANY = {
    "name": "AC/DC MONT s.r.o.",
    "ico": "09744550",
    "dic": "CZ09744550",
    "address": "Sportovn\u00ed 7",
    "city": "Ruda nad Moravou",
    "zip": "789 63",
    "bank_account": "2182797004/5500",
    "iban": "CZ0755000000002182797004",
    "bic": "RZBCCZPP",
    "email": "info@craftbolt.cz",
    "web": "www.craftbolt.cz"
}

_fonts_registered = False

def _register_fonts():
    """Register FreeSans font for Czech diacritics support."""
    global _fonts_registered
    if _fonts_registered:
        return
    # Try bundled fonts first, then system fonts
    font_dirs = [
        os.path.join(os.path.dirname(__file__), 'fonts'),
        '/usr/share/fonts/truetype/freefont',
    ]
    for font_dir in font_dirs:
        regular = os.path.join(font_dir, 'FreeSans.ttf')
        bold = os.path.join(font_dir, 'FreeSansBold.ttf')
        if os.path.exists(regular) and os.path.exists(bold):
            try:
                pdfmetrics.registerFont(TTFont('FreeSans', regular))
                pdfmetrics.registerFont(TTFont('FreeSans-Bold', bold))
                _fonts_registered = True
                return
            except Exception:
                pass


def generate_invoice_number(sequence: int, year: int = None) -> str:
    """Generate invoice number in format FV2600001."""
    if year is None:
        year = datetime.now(timezone.utc).year
    year_short = str(year)[2:]
    return f"FV{year_short}{sequence:05d}"


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate a PDF invoice with Czech diacritics."""
    _register_fonts()

    font = 'FreeSans' if _fonts_registered else 'Helvetica'
    font_bold = 'FreeSans-Bold' if _fonts_registered else 'Helvetica-Bold'

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='InvoiceTitle', fontSize=20, spaceAfter=10, textColor=colors.HexColor('#1a1a1a'), fontName=font_bold))
    styles.add(ParagraphStyle(name='InvoiceSubtitle', fontSize=10, textColor=colors.HexColor('#6b7280'), fontName=font))
    styles.add(ParagraphStyle(name='InvoiceNormal', fontSize=9, leading=14, textColor=colors.HexColor('#374151'), fontName=font))
    styles.add(ParagraphStyle(name='InvoiceBold', fontSize=9, leading=14, textColor=colors.HexColor('#1a1a1a'), fontName=font_bold))
    styles.add(ParagraphStyle(name='InvoiceSmall', fontSize=8, textColor=colors.HexColor('#9ca3af'), fontName=font))

    elements = []

    # Header
    elements.append(Paragraph("FAKTURA", styles['InvoiceTitle']))
    elements.append(Paragraph(f"Číslo: {invoice_data['invoice_number']}", styles['InvoiceSubtitle']))
    elements.append(Spacer(1, 8*mm))

    # Supplier and Customer side by side
    supplier_text = f"""<b>Dodavatel:</b><br/>
    {COMPANY['name']}<br/>
    {COMPANY['address']}<br/>
    {COMPANY['zip']} {COMPANY['city']}<br/>
    IČ: {COMPANY['ico']}<br/>
    DIČ: {COMPANY['dic']}<br/>
    Účet: {COMPANY['bank_account']}<br/>
    IBAN: {COMPANY['iban']}"""

    customer = invoice_data.get('customer', {})
    cust_name = customer.get('name', '-')
    cust_addr = customer.get('address', '-')
    cust_email = customer.get('email', '-')
    cust_ico = customer.get('ico', '')
    cust_dic = customer.get('dic', '')
    ico_line = f"IČ: {cust_ico}" if cust_ico else ''
    dic_line = f"DIČ: {cust_dic}" if cust_dic else ''
    customer_text = f"""<b>Odběratel:</b><br/>
    {cust_name}<br/>
    {cust_addr}<br/>
    {ico_line}<br/>
    {dic_line}<br/>
    E-mail: {cust_email}"""

    header_data = [[Paragraph(supplier_text, styles['InvoiceNormal']), Paragraph(customer_text, styles['InvoiceNormal'])]]
    header_table = Table(header_data, colWidths=[85*mm, 85*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8*mm))

    # Dates
    dates_data = [
        [Paragraph('<b>Datum vystavení:</b>', styles['InvoiceBold']), Paragraph(invoice_data.get('issue_date', '-'), styles['InvoiceNormal']), Paragraph('<b>Datum splatnosti:</b>', styles['InvoiceBold']), Paragraph(invoice_data.get('due_date', '-'), styles['InvoiceNormal'])],
        [Paragraph('<b>Datum zdanitelného plnění:</b>', styles['InvoiceBold']), Paragraph(invoice_data.get('tax_date', '-'), styles['InvoiceNormal']), Paragraph('<b>Forma úhrady:</b>', styles['InvoiceBold']), Paragraph(invoice_data.get('payment_method', 'Platební karta'), styles['InvoiceNormal'])],
        [Paragraph('<b>Variabilní symbol:</b>', styles['InvoiceBold']), Paragraph(invoice_data.get('variable_symbol', '-'), styles['InvoiceNormal']), '', ''],
    ]
    dates_table = Table(dates_data, colWidths=[50*mm, 40*mm, 45*mm, 35*mm])
    dates_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), font_bold),
        ('FONTNAME', (2, 0), (2, -1), font_bold),
        ('FONTNAME', (1, 0), (1, -1), font),
        ('FONTNAME', (3, 0), (3, -1), font),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(dates_table)
    elements.append(Spacer(1, 8*mm))

    # Items table
    items_header = [
        Paragraph('<b>Popis</b>', styles['InvoiceBold']),
        Paragraph('<b>Množství</b>', styles['InvoiceBold']),
        Paragraph('<b>Cena/ks</b>', styles['InvoiceBold']),
        Paragraph('<b>DPH %</b>', styles['InvoiceBold']),
        Paragraph('<b>Celkem</b>', styles['InvoiceBold']),
    ]
    items_data = [items_header]

    for item in invoice_data.get('items', []):
        items_data.append([
            Paragraph(item.get('description', '-'), styles['InvoiceNormal']),
            Paragraph(str(item.get('quantity', 1)), styles['InvoiceNormal']),
            Paragraph(f"{item.get('unit_price', 0):,.2f} Kč", styles['InvoiceNormal']),
            Paragraph(f"{item.get('vat_rate', 21)}%", styles['InvoiceNormal']),
            Paragraph(f"{item.get('total', 0):,.2f} Kč", styles['InvoiceNormal']),
        ])

    items_table = Table(items_data, colWidths=[75*mm, 20*mm, 30*mm, 20*mm, 25*mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f97316')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), font_bold),
        ('FONTNAME', (0, 1), (-1, -1), font),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 6*mm))

    # Totals
    subtotal = invoice_data.get('subtotal', 0)
    vat_amount = invoice_data.get('vat_amount', 0)
    total = invoice_data.get('total', 0)

    totals_data = [
        ['', '', Paragraph('<b>Základ daně:</b>', styles['InvoiceBold']), Paragraph(f"{subtotal:,.2f} Kč", styles['InvoiceNormal'])],
        ['', '', Paragraph(f"<b>DPH {invoice_data.get('vat_rate', 21)}%:</b>", styles['InvoiceBold']), Paragraph(f"{vat_amount:,.2f} Kč", styles['InvoiceNormal'])],
        ['', '', Paragraph('<b>Celkem k úhradě:</b>', styles['InvoiceBold']), Paragraph(f"<b>{total:,.2f} Kč</b>", styles['InvoiceBold'])],
    ]
    totals_table = Table(totals_data, colWidths=[75*mm, 20*mm, 45*mm, 30*mm])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (2, 0), (2, -1), font_bold),
        ('FONTNAME', (3, 0), (3, -1), font),
        ('FONTNAME', (2, -1), (-1, -1), font_bold),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (2, -1), (-1, -1), 1, colors.HexColor('#1a1a1a')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 10*mm))

    # Payment info
    if invoice_data.get('payment_status') == 'paid':
        elements.append(Paragraph("<b>Stav: UHRAZENO</b>", ParagraphStyle('Paid', fontSize=12, textColor=colors.HexColor('#16a34a'), fontName=font_bold)))

    elements.append(Spacer(1, 10*mm))

    elements.append(Paragraph(f"{COMPANY['name']} | IČ: {COMPANY['ico']} | DIČ: {COMPANY['dic']} | {COMPANY['web']}", styles['InvoiceSmall']))

    doc.build(elements)
    return buffer.getvalue()


def generate_isdoc_xml(invoice_data: dict) -> bytes:
    """Generate ISDOC XML for import into POHODA."""
    nsmap = {
        None: "http://isdoc.cz/namespace/2013",
    }

    root = etree.Element("Invoice", nsmap=nsmap)
    root.set("version", "6.0.1")

    etree.SubElement(root, "DocumentType").text = "1"
    etree.SubElement(root, "ID").text = invoice_data['invoice_number']
    etree.SubElement(root, "UUID").text = invoice_data.get('id', '')
    etree.SubElement(root, "IssuingSystem").text = "CraftBolt"
    etree.SubElement(root, "IssueDate").text = invoice_data.get('issue_date', '')
    etree.SubElement(root, "TaxPointDate").text = invoice_data.get('tax_date', '')

    due_date_str = invoice_data.get('due_date', '')
    if due_date_str:
        payment_means = etree.SubElement(root, "PaymentMeans")
        payment = etree.SubElement(payment_means, "Payment")
        etree.SubElement(payment, "PaidAmount").text = str(invoice_data.get('total', 0))
        etree.SubElement(payment, "PaymentMeansCode").text = "48"
        details = etree.SubElement(payment, "Details")
        etree.SubElement(details, "PaymentDueDate").text = due_date_str
        bank_account = etree.SubElement(details, "BankAccount")
        etree.SubElement(bank_account, "ID").text = COMPANY['bank_account']
        etree.SubElement(bank_account, "BankCode").text = "5500"
        etree.SubElement(bank_account, "IBAN").text = COMPANY['iban']
        etree.SubElement(bank_account, "BIC").text = COMPANY['bic']

    # Supplier
    supplier_party = etree.SubElement(root, "AccountingSupplierParty")
    supplier = etree.SubElement(supplier_party, "Party")
    supplier_id = etree.SubElement(supplier, "PartyIdentification")
    etree.SubElement(supplier_id, "ID").text = COMPANY['ico']
    supplier_name = etree.SubElement(supplier, "PartyName")
    etree.SubElement(supplier_name, "Name").text = COMPANY['name']
    supplier_addr = etree.SubElement(supplier, "PostalAddress")
    etree.SubElement(supplier_addr, "StreetName").text = COMPANY['address']
    etree.SubElement(supplier_addr, "CityName").text = COMPANY['city']
    etree.SubElement(supplier_addr, "PostalZone").text = COMPANY['zip'].replace(' ', '')
    country = etree.SubElement(supplier_addr, "Country")
    etree.SubElement(country, "IdentificationCode").text = "CZ"
    supplier_tax = etree.SubElement(supplier, "PartyTaxScheme")
    etree.SubElement(supplier_tax, "CompanyID").text = COMPANY['dic']

    # Customer
    customer = invoice_data.get('customer', {})
    customer_party = etree.SubElement(root, "AccountingCustomerParty")
    cust = etree.SubElement(customer_party, "Party")
    if customer.get('ico'):
        cust_id = etree.SubElement(cust, "PartyIdentification")
        etree.SubElement(cust_id, "ID").text = customer['ico']
    cust_name = etree.SubElement(cust, "PartyName")
    etree.SubElement(cust_name, "Name").text = customer.get('name', '')
    cust_addr = etree.SubElement(cust, "PostalAddress")
    etree.SubElement(cust_addr, "StreetName").text = customer.get('address', '')
    if customer.get('dic'):
        cust_tax = etree.SubElement(cust, "PartyTaxScheme")
        etree.SubElement(cust_tax, "CompanyID").text = customer['dic']

    # Invoice lines
    lines = etree.SubElement(root, "InvoiceLines")
    for idx, item in enumerate(invoice_data.get('items', []), 1):
        line = etree.SubElement(lines, "InvoiceLine")
        etree.SubElement(line, "ID").text = str(idx)
        etree.SubElement(line, "InvoicedQuantity").text = str(item.get('quantity', 1))
        etree.SubElement(line, "LineExtensionAmount").text = str(item.get('total', 0))
        etree.SubElement(line, "LineExtensionAmountTaxInclusive").text = str(item.get('total_with_vat', item.get('total', 0)))
        item_elem = etree.SubElement(line, "Item")
        etree.SubElement(item_elem, "Description").text = item.get('description', '')

    # Tax total
    tax_total = etree.SubElement(root, "TaxTotal")
    tax_sub = etree.SubElement(tax_total, "TaxSubTotal")
    etree.SubElement(tax_sub, "TaxableAmount").text = str(invoice_data.get('subtotal', 0))
    etree.SubElement(tax_sub, "TaxAmount").text = str(invoice_data.get('vat_amount', 0))
    etree.SubElement(tax_sub, "TaxInclusiveAmount").text = str(invoice_data.get('total', 0))
    etree.SubElement(tax_sub, "Percent").text = str(invoice_data.get('vat_rate', 21))

    # Legal monetary total
    total_elem = etree.SubElement(root, "LegalMonetaryTotal")
    etree.SubElement(total_elem, "TaxExclusiveAmount").text = str(invoice_data.get('subtotal', 0))
    etree.SubElement(total_elem, "TaxInclusiveAmount").text = str(invoice_data.get('total', 0))
    etree.SubElement(total_elem, "PayableAmount").text = str(invoice_data.get('total', 0))

    return etree.tostring(root, pretty_print=True, xml_declaration=True, encoding='UTF-8')
