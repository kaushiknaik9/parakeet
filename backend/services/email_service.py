from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import smtplib


def is_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def send_email(to_address: str, subject: str, body: str, html_body: str = None) -> dict:
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
        if html_body:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject or "Deal Agreement"
            msg["From"] = sender
            msg["To"] = to_address
            msg.attach(MIMEText(body or "", "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))
        else:
            msg = MIMEText(body or "", "plain", "utf-8")
            msg["Subject"] = subject or "Deal Agreement"
            msg["From"] = sender
            msg["To"] = to_address

        with smtplib.SMTP(host, port, timeout=15) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(sender, [to_address], msg.as_string())
        return {"sent": True, "reason": ""}
    except Exception as exc:  # noqa: BLE001 — surfaced as a message, not a 500
        return {"sent": False, "reason": f"Email send failed: {exc}"}


def send_signature_email(to_address: str, deal_id: str, deal_name: str, signature_token: str, subject: str = None, body: str = None) -> dict:
    accept_link = f"http://localhost:5000/api/deals/{deal_id}/sign?token={signature_token}&action=accept"
    decline_link = f"http://localhost:5000/api/deals/{deal_id}/sign?token={signature_token}&action=decline"

    email_subject = subject or f"Action Required: E-Sign Agreement for {deal_name}"
    
    plain_body = (
        body or f"You have been requested to review and e-sign the commercial agreement for '{deal_name}'.\n\n"
        f"Accept & Sign: {accept_link}\n"
        f"Decline: {decline_link}\n\n"
        f"If the buttons do not work, copy and paste either link above into your web browser."
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0D1117; color: #F0F6FC; padding: 24px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #161B22; border: 1px solid #30363D; border-radius: 12px; padding: 32px; }}
        .logo {{ color: #2F81F7; font-weight: 800; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 20px; }}
        h2 {{ font-size: 20px; font-weight: 700; color: #F0F6FC; margin-bottom: 12px; }}
        p {{ font-size: 14px; color: #8B949E; line-height: 1.6; margin-bottom: 24px; }}
        .actions {{ display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }}
        .btn-accept {{ background: #238636; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
        .btn-decline {{ background: #21262D; color: #F85149; border: 1px solid #30363D; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
        .links-box {{ background: #0D1117; border: 1px solid #30363D; border-radius: 8px; padding: 14px; font-size: 12px; word-break: break-all; color: #8B949E; }}
        .links-box a {{ color: #2F81F7; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">ARMOR LOCAL E-SIGNATURE</div>
        <h2>Commercial Agreement Signature Request</h2>
        <p>You have been requested to review and e-sign the commercial terms for <strong>{deal_name}</strong> (Deal ID: <code>{deal_id}</code>).</p>
        <div class="actions">
            <a href="{accept_link}" class="btn-accept">Accept & Sign Deal</a>
            <a href="{decline_link}" class="btn-decline">Decline Agreement</a>
        </div>
        <div class="links-box">
            <strong>Direct Links:</strong><br>
            • Accept: <a href="{accept_link}">{accept_link}</a><br>
            • Decline: <a href="{decline_link}">{decline_link}</a>
        </div>
    </div>
</body>
</html>"""

    return send_email(to_address, email_subject, plain_body, html_body)
