"""Optional real email delivery for the agreement-sharing workflow.

If SMTP_HOST / SMTP_USER / SMTP_PASSWORD are set in the environment (see
.env), /api/deals/<id>/share will actually send the confirmation email via
SMTP. If they're not set, share_deal() in db.py still records that the deal
was shared, and the caller falls back to letting the user send the email
themselves (e.g. via a mailto: link) — nothing here is required for the
app to work.
"""
import os
import smtplib
from email.mime.text import MIMEText


def is_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD"))


def send_email(to_address: str, subject: str, body: str) -> dict:
    """Returns {"sent": bool, "reason": str}. Never raises — a failed send
    should not break the /share request, since the deal is still marked as
    shared either way."""
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
