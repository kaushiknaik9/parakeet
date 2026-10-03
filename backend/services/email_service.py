from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
import logging
import os
import site
import smtplib
import sys

# Ensure user site-packages are accessible even inside Conda environments
try:
    user_site = site.getusersitepackages()
    if user_site and user_site not in sys.path:
        sys.path.insert(0, user_site)
except Exception:
    pass

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def _clean_currency(val: str) -> str:
    """Replaces Unicode Rupee symbols (₹ / \u20B9) with standard ASCII 'INR ' to avoid ReportLab Helvetica square boxes."""
    if not val:
        return ""
    return str(val).replace("₹", "INR ").replace("\u20b9", "INR ")


def generate_agreement_pdf(deal: dict) -> bytes:
    """
    Renders a 1-page executive B2B Commercial Electronics Purchase Agreement PDF.
    Normalizes all currency symbols to 'INR' to prevent Helvetica Unicode rendering glitches.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    styles = getSampleStyleSheet()

    # Custom Typographic Hierarchy
    hdr_sub = ParagraphStyle('HdrSub', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#2563EB'), fontName='Helvetica-Bold')
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0F172A'), fontName='Helvetica-Bold')
    h2_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=10, leading=13, textColor=colors.HexColor('#0F172A'), fontName='Helvetica-Bold', spaceBefore=6, spaceAfter=3)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=8.5, leading=11.5, textColor=colors.HexColor('#334155'))
    table_hdr_style = ParagraphStyle('TblHdr', parent=styles['Normal'], fontSize=8.5, leading=10, textColor=colors.white, fontName='Helvetica-Bold')
    table_cell_style = ParagraphStyle('TblCell', parent=styles['Normal'], fontSize=8.5, leading=11, textColor=colors.HexColor('#1E293B'))

    elements = []

    deal_id = str(deal.get("id", "ARMOR-DEAL")).upper()
    deal_name = str(deal.get("deal_name") or "Electronics Purchase Agreement")
    extracted = deal.get("extracted") or {}
    created_date = str(deal.get("created_at", ""))[:10] or "2026-10-03"

    # Header & Status Badge
    elements.append(Paragraph("ARMOR B2B ELECTRONICS PROCUREMENT ENGINE", hdr_sub))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph(f"Purchase Order: {deal_name}", title_style))
    elements.append(Spacer(1, 3))
    
    status_str = "PENDING EXECUTION" if deal.get("signature_status") != "signed" else f"LEGALLY SIGNED ({str(deal.get('signed_at', ''))[:10]})"
    elements.append(Paragraph(f"<b>Agreement Ref ID:</b> {deal_id} &nbsp;|&nbsp; <b>Date:</b> {created_date} &nbsp;|&nbsp;", body_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    # Section 1: Contracting Entities
    elements.append(Paragraph("1. Contracting Entities", h2_style))
    parties = extracted.get("parties") or []
    buyer = parties[0].get("name", "Buyer / Procurement Agency") if len(parties) > 0 else "Buyer Agency"
    seller = parties[1].get("name", "Supplier / Manufacturer") if len(parties) > 1 else "Supplier Corp"

    p_data = [
        [Paragraph("<b>Buyer Signatory:</b>", body_style), Paragraph(buyer, body_style), Paragraph("<b>Supplier Signatory:</b>", body_style), Paragraph(seller, body_style)]
    ]
    p_table = Table(p_data, colWidths=[100, 170, 100, 170])
    p_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(p_table)
    elements.append(Spacer(1, 6))

    # Section 2: Electronics Bill of Materials (BOM)
    elements.append(Paragraph("2. Electronics Bill of Materials (BOM)", h2_style))
    items = extracted.get("items") or []
    currency = _clean_currency(extracted.get("currency", "INR"))
    if not currency or currency.strip() in ["₹", "$", "€"]:
        currency = "INR"

    bom_table_data = [[
        Paragraph("Component / MPN", table_hdr_style),
        Paragraph("Category", table_hdr_style),
        Paragraph("Qty", table_hdr_style),
        Paragraph("Unit Price", table_hdr_style),
        Paragraph("Total Price", table_hdr_style),
    ]]

    grand_total_numeric = 0.0

    if items:
        for idx, it in enumerate(items):
            qty = it.get("quantity", 0)
            u_price = it.get("unit_price", 0.0)
            tot = it.get("total_price", 0.0)
            if not tot and qty and u_price:
                tot = qty * u_price
            grand_total_numeric += float(tot or 0.0)

            bom_table_data.append([
                Paragraph(str(it.get("part_name", "—")), table_cell_style),
                Paragraph(str(it.get("category", "Component")), table_cell_style),
                Paragraph(f"{qty:,}" if isinstance(qty, int) else str(qty), table_cell_style),
                Paragraph(f"{currency} {u_price:,.2f}" if u_price else "—", table_cell_style),
                Paragraph(f"{currency} {tot:,.2f}" if tot else "—", table_cell_style),
            ])
    else:
        prod = str(extracted.get("product_or_service", "B2B Hardware Batch"))
        tot_val = _clean_currency(extracted.get("total_value", "—"))
        bom_table_data.append([
            Paragraph(prod, table_cell_style),
            Paragraph("Hardware Batch", table_cell_style),
            Paragraph(str(extracted.get("quantity", "1")), table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph(tot_val, table_cell_style),
        ])

    # Summary Total Row
    tot_str = f"{currency} {grand_total_numeric:,.2f}" if grand_total_numeric > 0 else _clean_currency(extracted.get("total_value", "—"))
    bom_table_data.append([
        Paragraph("<b>GRAND TOTAL</b>", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph(f"<b>{tot_str}</b>", table_cell_style),
    ])

    bom_table = Table(bom_table_data, colWidths=[150, 110, 70, 105, 105])
    
    # Alternating Zebra Styling
    table_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E2E8F0')),
    ]
    for r_idx in range(1, len(bom_table_data) - 1):
        if r_idx % 2 == 0:
            table_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#F8FAFC')))

    bom_table.setStyle(TableStyle(table_styles))
    elements.append(bom_table)
    elements.append(Spacer(1, 6))

    # Section 3: Commercial & Technical Terms
    elements.append(Paragraph("3. Commercial & Technical Terms", h2_style))
    supply = extracted.get("supply_terms") or {}
    lead_time = supply.get("lead_time") or extracted.get("delivery_terms") or "4 weeks, 2 staggered batches"
    rma = supply.get("rma_warranty") or "12-Month Component Warranty / RMA Replacement"
    compliance = ", ".join(supply.get("compliance") or ["RoHS Compliant", "CE Certified", "ESD Packaging"])
    payment = extracted.get("payment_terms") or "30% Advance, 70% Post-Inspection Commercial Invoice"

    terms_data = [
        [Paragraph("<b>Total Consideration:</b>", body_style), Paragraph(tot_str, body_style), Paragraph("<b>Lead Time & Delivery:</b>", body_style), Paragraph(lead_time, body_style)],
        [Paragraph("<b>Payment Milestones:</b>", body_style), Paragraph(payment, body_style), Paragraph("<b>Warranty & RMA:</b>", body_style), Paragraph(rma, body_style)],
        [Paragraph("<b>Quality Compliance:</b>", body_style), Paragraph(compliance, body_style), Paragraph("<b>Inspection Policy:</b>", body_style), Paragraph("Standard 7-Day Acceptance Window", body_style)],
    ]
    terms_table = Table(terms_data, colWidths=[105, 165, 105, 165])
    terms_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(terms_table)
    elements.append(Spacer(1, 10))

    # Section 4: Signature & Audit Block
    elements.append(Paragraph("4. Authorization & Digital Signature Audit", h2_style))
    sig_token = deal.get("signature_token") or f"TOK-{deal_id[:8].upper()}-STAMP"
    created_ts = deal.get("created_at") or deal.get("shared_at") or "Pre-Authorized"

    buyer_stamp = (
        f"<b>Authorized Buyer Signatory</b><br/>"
        f"<font color='#059669'><b>[🛡️ DIGITALLY CERTIFIED &amp; AUTHORIZED]</b></font><br/>"
        f"<b>Signatory:</b> {buyer}<br/>"
        f"<b>Status:</b> Pre-Authorized via Armor Engine<br/>"
        f"<b>Dispatched:</b> {created_ts}<br/>"
        f"<b>Security Ref:</b> #{deal_id[:8].upper()}"
    )

    supplier_stamp = (
        f"<b>Authorized Supplier Signatory</b><br/><br/>"
        f"{{{{Supplier Signature;type=signature;role=Signer;width=180;height=45}}}}<br/>"
        f"___________________________________<br/>"
        f"Name: {seller}<br/>"
        f"Role: Counterparty Signatory"
    )

    sig_data = [
        [
            Paragraph(buyer_stamp, body_style),
            Paragraph(supplier_stamp, body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 8))

    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=4))
    elements.append(Paragraph("Official Purchase Order document generated by Armor Procurement Engine. Authenticated via secure digital token verification.", ParagraphStyle('Foot', parent=styles['Normal'], fontSize=7.5, leading=9, textColor=colors.HexColor('#64748B'))))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def send_email(to_address: str, subject: str, body: str, html_body: str = None, pdf_attachment: tuple = None) -> dict:
    """Returns {"sent": bool, "reason": str}. Never raises — a failed send
    should not break requests, since deal states update regardless."""
    if not to_address:
        return {"sent": False, "reason": "No counterparty email address was provided."}
    if not is_configured():
        return {"sent": False, "reason": "SMTP is not configured on the server (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)."}

    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    sender = os.environ.get("SMTP_FROM", user)
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"

    try:
        msg = MIMEMultipart("mixed" if pdf_attachment else "alternative")
        msg["Subject"] = subject or "Deal Agreement"
        msg["From"] = sender
        msg["To"] = to_address

        if html_body:
            body_part = MIMEMultipart("alternative")
            body_part.attach(MIMEText(body or "", "plain", "utf-8"))
            body_part.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(body_part)
        else:
            msg.attach(MIMEText(body or "", "plain", "utf-8"))

        if pdf_attachment:
            filename, pdf_bytes = pdf_attachment
            part = MIMEApplication(pdf_bytes, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)

        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(sender, [to_address], msg.as_string())
        return {"sent": True, "reason": ""}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Email send failed: %s", exc)
        return {"sent": False, "reason": f"Email send failed: {exc}"}


def send_signature_email(
    to_address: str,
    deal_id: str,
    deal_name: str,
    signature_token: str,
    subject: str = None,
    body: str = None,
    deal: dict = None
) -> dict:
    accept_link = f"http://localhost:5000/api/deals/{deal_id}/sign?token={signature_token}&action=accept"
    decline_link = f"http://localhost:5000/api/deals/{deal_id}/sign?token={signature_token}&action=decline"

    email_subject = subject or f"Action Required: Review & Accept Purchase Order {deal_name}"
    extracted = (deal.get("extracted") if deal else {}) or {}
    items = extracted.get("items") or []
    supply = extracted.get("supply_terms") or {}
    parties = extracted.get("parties") or []

    buyer_name = parties[0].get("name", "Buyer") if len(parties) > 0 else "Buyer Agency"
    seller_name = parties[1].get("name", "Supplier") if len(parties) > 1 else "Supplier Corp"

    currency = _clean_currency(extracted.get("currency", "INR"))
    if not currency or currency.strip() in ["₹", "$", "€"]:
        currency = "INR"

    # Build BOM Rows HTML
    bom_rows_html = ""
    grand_total = 0.0

    if items:
        for it in items:
            p_name = it.get("part_name", "Component")
            q = it.get("quantity", 0)
            u_p = it.get("unit_price", 0.0)
            tot = it.get("total_price", 0.0) or (q * u_p if q and u_p else 0.0)
            grand_total += float(tot or 0.0)
            
            u_p_str = f"{currency} {u_p:,.2f}" if u_p else "—"
            tot_str = f"{currency} {tot:,.2f}" if tot else "—"
            q_str = f"{q:,}" if isinstance(q, int) else str(q)

            bom_rows_html += f"""
            <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">{p_name}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #334155;">{q_str}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #334155;">{u_p_str}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #0F172A;">{tot_str}</td>
            </tr>
            """
    else:
        p_name = extracted.get("product_or_service", "Electronics Batch")
        q_str = str(extracted.get("quantity", "1"))
        tot_str = _clean_currency(extracted.get("total_value", "Specified in Agreement"))
        bom_rows_html = f"""
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">{p_name}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #334155;">{q_str}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #334155;">—</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #0F172A;">{tot_str}</td>
        </tr>
        """

    grand_total_str = f"{currency} {grand_total:,.2f}" if grand_total > 0 else _clean_currency(extracted.get("total_value", "Specified in Agreement"))

    lead_time = supply.get("lead_time") or extracted.get("delivery_terms") or "4 weeks, 2 staggered batches"
    rma_warranty = supply.get("rma_warranty") or "12-Month RMA Replacement"
    payment_terms = extracted.get("payment_terms") or "30% Advance / 70% Post-Inspection"

    plain_body = (
        body or f"ARMOR ELECTRONICS PROCUREMENT | Ref: #{deal_id.upper()}\n"
        f"Purchase Order & Supply Agreement Review\n\n"
        f"Deal Name: {deal_name}\n"
        f"Buyer: {buyer_name} | Supplier: {seller_name}\n"
        f"Grand Total: {grand_total_str}\n"
        f"Lead Time: {lead_time}\n"
        f"Payment & Warranty: {payment_terms}, {rma_warranty}\n\n"
        f"Review & Accept: {accept_link}\n"
        f"Request Revisions: {decline_link}\n\n"
        f"Official agreement PDF is attached to this email. Click accept to digitally stamp and execute the terms."
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{email_subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #1E293B; margin: 0; padding: 32px 12px;">
    <div style="max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 36px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
        
        <!-- Corporate Light Header -->
        <div style="border-bottom: 2px solid #0F172A; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #1E40AF; text-transform: uppercase;">ARMOR ELECTRONICS PROCUREMENT</span>
                <span style="font-size: 11px; font-weight: 700; color: #64748B; font-family: monospace;">Ref: #{deal_id.upper()[:8]}</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 2px 0;">Purchase Order &amp; Supply Agreement Review</h2>
            <div style="font-size: 13px; color: #475569;">Agreement Title: <strong>{deal_name}</strong></div>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
            Please review the structured Bill of Materials and supply terms below. Click <strong>Review &amp; Accept Agreement</strong> to digitally execute the agreement.
        </p>

        <!-- Bill of Materials (BOM) Table -->
        <div style="margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0F172A; margin-bottom: 8px;">ELECTRONICS BILL OF MATERIALS (BOM)</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background: #0F172A; color: #FFFFFF; font-size: 10px; text-transform: uppercase;">
                        <th style="padding: 10px 14px; text-align: left;">Component / MPN</th>
                        <th style="padding: 10px 14px; text-align: center;">Qty</th>
                        <th style="padding: 10px 14px; text-align: right;">Unit Price</th>
                        <th style="padding: 10px 14px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {bom_rows_html}
                    <tr style="background: #F8FAFC; font-weight: 700;">
                        <td colspan="3" style="padding: 12px 14px; text-align: right; color: #0F172A; border-top: 2px solid #CBD5E1;">GRAND TOTAL:</td>
                        <td style="padding: 12px 14px; text-align: right; color: #1E40AF; font-size: 14px; border-top: 2px solid #CBD5E1;">{grand_total_str}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Terms Grid (2-Column Key/Value) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin-bottom: 28px; font-size: 12px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0F172A; margin-bottom: 12px;">COMMERCIAL &amp; SUPPLY TERMS</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding: 4px 8px 4px 0; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Buyer Entity</div>
                        <div style="color: #0F172A; font-weight: 700;">{buyer_name}</div>
                    </td>
                    <td style="width: 50%; padding: 4px 0 4px 8px; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Supplier Entity</div>
                        <div style="color: #0F172A; font-weight: 700;">{seller_name}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 8px 4px 0; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Delivery Lead Time</div>
                        <div style="color: #0F172A; font-weight: 600;">{lead_time}</div>
                    </td>
                    <td style="padding: 10px 0 4px 8px; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Payment &amp; Warranty</div>
                        <div style="color: #0F172A; font-weight: 600;">{payment_terms}</div>
                        <div style="color: #475569; font-size: 11px;">{rma_warranty}</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- High-Contrast Centered Actions -->
        <div style="text-align: center; margin-bottom: 28px;">
            <a href="{accept_link}" style="background: #1E40AF; color: #FFFFFF !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.25);">Review &amp; Accept Agreement</a>
            <div style="margin-top: 14px;">
                <a href="{decline_link}" style="color: #64748B; font-size: 12px; text-decoration: underline; font-weight: 500;">Request Revisions / Decline Terms</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #64748B; text-align: center; line-height: 1.5;">
            Official agreement PDF is attached to this email. Click accept to digitally stamp and execute the terms.
        </div>

    </div>
</body>
</html>"""

    # Generate PDF attachment if deal object is present
    pdf_attachment = None
    if deal:
        try:
            pdf_bytes = generate_agreement_pdf(deal)
            pdf_attachment = (f"Armor_Agreement_{deal_id}.pdf", pdf_bytes)
        except Exception as e:
            logger.warning("PDF generation warning: %s", e)

    return send_email(to_address, email_subject, plain_body, html_body, pdf_attachment)


def build_sign_url(deal_id: str, token: str, action: str = "accept") -> str:
    base_url = os.environ.get("ARMOR_BASE_URL", "http://localhost:5000")
    return f"{base_url}/api/deals/{deal_id}/sign?token={token}&action={action}"


def render_executive_email_html(deal_data: dict, accept_link: str, decline_link: str = None) -> str:
    deal_id = str(deal_data.get("id") or "").upper()
    deal_name = str(deal_data.get("deal_name") or "Electronics Purchase Agreement")
    extracted = (deal_data.get("extracted") if deal_data else {}) or {}
    items = extracted.get("items") or []
    supply = extracted.get("supply_terms") or {}
    parties = extracted.get("parties") or []

    buyer_name = parties[0].get("name", "Buyer Agency") if len(parties) > 0 else "Buyer Agency"
    seller_name = parties[1].get("name", "Supplier Corp") if len(parties) > 1 else "Supplier Corp"

    if not decline_link:
        decline_link = accept_link.replace("action=accept", "action=decline")

    currency = _clean_currency(extracted.get("currency", "INR"))
    if not currency or currency.strip() in ["₹", "$", "€"]:
        currency = "INR"

    bom_rows_html = ""
    grand_total = 0.0

    if items:
        for it in items:
            p_name = it.get("part_name", "Component")
            q = it.get("quantity", 0)
            u_p = it.get("unit_price", 0.0)
            tot = it.get("total_price", 0.0) or (q * u_p if q and u_p else 0.0)
            grand_total += float(tot or 0.0)

            u_p_str = f"{currency} {u_p:,.2f}" if u_p else "—"
            tot_str = f"{currency} {tot:,.2f}" if tot else "—"
            q_str = f"{q:,}" if isinstance(q, int) else str(q)

            bom_rows_html += f"""
            <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">{p_name}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #334155;">{q_str}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #334155;">{u_p_str}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #0F172A;">{tot_str}</td>
            </tr>
            """
    else:
        p_name = extracted.get("product_or_service", "Electronics Batch")
        q_str = str(extracted.get("quantity", "1"))
        tot_str = _clean_currency(extracted.get("total_value", "Specified in Agreement"))
        bom_rows_html = f"""
        <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">{p_name}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #334155;">{q_str}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #334155;">—</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #0F172A;">{tot_str}</td>
        </tr>
        """

    grand_total_str = f"{currency} {grand_total:,.2f}" if grand_total > 0 else _clean_currency(extracted.get("total_value", "Specified in Agreement"))
    lead_time = supply.get("lead_time") or extracted.get("delivery_terms") or "4 weeks, 2 staggered batches"
    rma_warranty = supply.get("rma_warranty") or "12-Month RMA Replacement"
    payment_terms = extracted.get("payment_terms") or "30% Advance / 70% Post-Inspection"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order &amp; Supply Agreement: {deal_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #1E293B; margin: 0; padding: 32px 12px;">
    <div style="max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 36px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
        <div style="border-bottom: 2px solid #0F172A; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #1E40AF; text-transform: uppercase;">ARMOR ELECTRONICS PROCUREMENT</span>
                <span style="font-size: 11px; font-weight: 700; color: #64748B; font-family: monospace;">Ref: #{deal_id[:8]}</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 8px 0 2px 0;">Purchase Order &amp; Supply Agreement Review</h2>
            <div style="font-size: 13px; color: #475569;">Agreement Title: <strong>{deal_name}</strong></div>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
            Please review the structured Bill of Materials and supply terms below. Click <strong>Review &amp; Accept Agreement</strong> to digitally execute the agreement.
        </p>

        <div style="margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0F172A; margin-bottom: 8px;">ELECTRONICS BILL OF MATERIALS (BOM)</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background: #0F172A; color: #FFFFFF; font-size: 10px; text-transform: uppercase;">
                        <th style="padding: 10px 14px; text-align: left;">Component / MPN</th>
                        <th style="padding: 10px 14px; text-align: center;">Qty</th>
                        <th style="padding: 10px 14px; text-align: right;">Unit Price</th>
                        <th style="padding: 10px 14px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {bom_rows_html}
                    <tr style="background: #F8FAFC; font-weight: 700;">
                        <td colspan="3" style="padding: 12px 14px; text-align: right; color: #0F172A; border-top: 2px solid #CBD5E1;">GRAND TOTAL:</td>
                        <td style="padding: 12px 14px; text-align: right; color: #1E40AF; font-size: 14px; border-top: 2px solid #CBD5E1;">{grand_total_str}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin-bottom: 28px; font-size: 12px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0F172A; margin-bottom: 12px;">COMMERCIAL &amp; SUPPLY TERMS</div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding: 4px 8px 4px 0; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Buyer Entity</div>
                        <div style="color: #0F172A; font-weight: 700;">{buyer_name}</div>
                    </td>
                    <td style="width: 50%; padding: 4px 0 4px 8px; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Supplier Entity</div>
                        <div style="color: #0F172A; font-weight: 700;">{seller_name}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 8px 4px 0; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Delivery Lead Time</div>
                        <div style="color: #0F172A; font-weight: 600;">{lead_time}</div>
                    </td>
                    <td style="padding: 10px 0 4px 8px; vertical-align: top;">
                        <div style="color: #64748B; font-size: 10px; text-transform: uppercase; font-weight: 700;">Payment &amp; Warranty</div>
                        <div style="color: #0F172A; font-weight: 600;">{payment_terms}</div>
                        <div style="color: #475569; font-size: 11px;">{rma_warranty}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin-bottom: 28px;">
            <a href="{accept_link}" style="background: #1E40AF; color: #FFFFFF !important; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.25);">Review &amp; Accept Agreement</a>
            <div style="margin-top: 14px;">
                <a href="{decline_link}" style="color: #64748B; font-size: 12px; text-decoration: underline; font-weight: 500;">Request Revisions / Decline Terms</a>
            </div>
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #64748B; text-align: center; line-height: 1.5;">
            Official agreement PDF is attached to this email. Click accept to digitally stamp and execute the terms.
        </div>
    </div>
</body>
</html>"""


def send_inhouse_signature_email(
    deal_data: dict,
    recipient_email: str,
    pdf_bytes: bytes,
    token: str,
    subject: str = None,
    body: str = None
) -> dict:
    deal_id = str(deal_data.get("id") or "")
    deal_name = str(deal_data.get("deal_name") or "Agreement")

    res = send_signature_email(
        to_address=recipient_email,
        deal_id=deal_id,
        deal_name=deal_name,
        signature_token=token,
        subject=subject,
        body=body,
        deal=deal_data
    )

    sent_ok = res.get("sent", False)
    if not sent_ok:
        reason_str = res.get("reason") or "SMTP email delivery failed."
        logger.warning(f"[email] In-House engine failed for '{recipient_email}': {reason_str}")
        return {
            "success": False,
            "provider": "in_house",
            "sent": False,
            "error": reason_str,
            "message": f"In-House Engine Error: {reason_str}"
        }

    return {
        "success": True,
        "provider": "in_house",
        "sent": True,
        "reason": "",
        "message": f"Dispatched via In-House Direct Engine to {recipient_email}"
    }


def dispatch_agreement_signature_package(
    deal_data: dict,
    recipient_email: str,
    pdf_bytes: bytes,
    token: str,
    provider: str = "auto",
    subject: str = None,
    body: str = None
) -> dict:
    """
    Dispatches the commercial agreement package using either Resend API or in-house SMTP/token engine.
    provider can be: 'in_house' | 'resend' | 'auto'
    """
    recipient_email = str(recipient_email or "").strip()
    logger.info(f"[email] Attempting to dispatch e-sign email to: '{recipient_email}'")
    print(f"[email] Attempting to dispatch e-sign email to: '{recipient_email}'")

    # Recipient email validation & dummy detection
    is_invalid_email = (
        not recipient_email
        or "@" not in recipient_email
        or recipient_email.lower() in ["none", "null", "undefined", "unknown", "supplier representative", "buyer representative", "supplier", "buyer"]
        or "example.com" in recipient_email.lower()
    )

    if is_invalid_email:
        err_msg = f"No valid recipient email address configured for this deal. Given: '{recipient_email or 'empty'}'"
        logger.warning(f"[email] {err_msg}")
        return {
            "success": False,
            "provider": provider,
            "error": "No valid recipient email address configured for this deal.",
            "message": err_msg
        }

    deal_id = str(deal_data.get("id") or "")
    accept_link = build_sign_url(deal_id, token, action="accept")
    decline_link = build_sign_url(deal_id, token, action="decline")

    resend_api_key = os.environ.get("RESEND_API_KEY")
    resend_from = os.environ.get("RESEND_FROM_EMAIL", "Armor Deals <onboarding@resend.dev>")
    resend_owner_email = (
        os.environ.get("RESEND_TEST_EMAIL")
        or os.environ.get("SMTP_USER")
        or "24bec028@iiitdwd.ac.in"
    ).strip().lower()

    is_resend_sandbox = "onboarding@resend.dev" in resend_from.lower()
    is_external_recipient = recipient_email.lower() != resend_owner_email

    # Rule: If provider is 'auto' and Resend is in unverified Sandbox mode, route external counterparties via in-house SMTP
    # so that the real counterparty receives the email directly in their inbox!
    if provider == "auto" and is_resend_sandbox and is_external_recipient and is_configured():
        msg = f"[email] Resend sandbox restriction active. Routing via in-house SMTP to reach {recipient_email} directly."
        logger.info(msg)
        print(msg)
        return send_inhouse_signature_email(
            deal_data, recipient_email, pdf_bytes, token, subject=subject, body=body
        )

    if (provider == "resend" or provider == "auto") and resend_api_key:
        try:
            import resend
            resend.api_key = resend_api_key

            email_subject = subject or f"Commercial Agreement for E-Signature: {deal_data.get('deal_name') or deal_data.get('title') or deal_id}"
            html_body = render_executive_email_html(deal_data, accept_link, decline_link)

            params = {
                "from": resend_from,
                "to": [recipient_email],
                "subject": email_subject,
                "html": html_body,
                "attachments": [
                    {
                        "filename": f"Armor_Agreement_{deal_id}.pdf",
                        "content": list(pdf_bytes) if isinstance(pdf_bytes, bytes) else pdf_bytes,
                    }
                ],
            }
            try:
                res = resend.Emails.send(params)
                receipt_id = res.get("id") if isinstance(res, dict) else (getattr(res, "id", None) or str(res))
                logger.info(f"[esign] Successfully dispatched via Resend API: {receipt_id}")
                return {
                    "success": True,
                    "provider": "resend",
                    "receipt_id": receipt_id,
                    "message": f"Dispatched via Resend Transactional API to {recipient_email}"
                }
            except Exception as exc:
                exc_str = str(exc)
                if "testing emails to your own email address" in exc_str.lower() and is_configured():
                    msg = f"[email] Resend sandbox restriction active. Routing via in-house SMTP to reach {recipient_email} directly."
                    logger.info(msg)
                    print(msg)
                    return send_inhouse_signature_email(
                        deal_data, recipient_email, pdf_bytes, token, subject=subject, body=body
                    )
                logger.warning(f"[esign] Resend dispatch failed ({exc_str}), falling back to in-house engine.")
                if provider == "resend":
                    return {
                        "success": False,
                        "provider": "resend",
                        "error": exc_str,
                        "message": f"Resend API dispatch failed: {exc_str}"
                    }
        except Exception as exc:
            logger.warning(f"[esign] Resend initialization failed ({exc}), falling back to in-house engine.")
            if provider == "resend":
                return {
                    "success": False,
                    "provider": "resend",
                    "error": str(exc),
                    "message": f"Resend API initialization failed: {exc}"
                }

    # Fallback / In-House Engine (Local token + standard SMTP / local verification loop)
    return send_inhouse_signature_email(
        deal_data, recipient_email, pdf_bytes, token, subject=subject, body=body
    )
