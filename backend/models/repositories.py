import json
import os
import secrets
import uuid
from datetime import datetime, timezone
from werkzeug.security import check_password_hash, generate_password_hash

from .database import (
    ActivityEvent,
    Deal,
    Profile,
    User,
    get_session,
    normalize_username,
)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def _iso_utc(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def sync_data_json_files(session):
    """Syncs database records to backend/data/deals.json and backend/data/activity.json."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        deals = session.query(Deal).order_by(Deal.created_at.desc()).all()
        deals_list = [_deal_to_dict(d) for d in deals]
        with open(os.path.join(DATA_DIR, "deals.json"), "w", encoding="utf-8") as f:
            json.dump(deals_list, f, indent=2)

        events = session.query(ActivityEvent).order_by(ActivityEvent.created_at.desc()).all()
        events_list = [
            {
                "id": e.id,
                "username": e.username,
                "deal_id": e.deal_id,
                "event_type": e.event_type,
                "message": e.message,
                "created_at": _iso_utc(e.created_at),
            }
            for e in events
        ]
        with open(os.path.join(DATA_DIR, "activity.json"), "w", encoding="utf-8") as f:
            json.dump(events_list, f, indent=2)
    except Exception as exc:
        print(f"[sync_data_json_files] Warning: {exc}")


def _deal_to_dict(deal: Deal, include_transcript=True):
    agreement_obj = json.loads(deal.agreement or "{}")
    docuseal_id = agreement_obj.get("docuseal_submission_id") or agreement_obj.get("docuseal_id")
    return {
        "id": deal.deal_id,
        "username": deal.username,
        "deal_name": deal.deal_name,
        "status": deal.status,
        "transcript": deal.transcript if include_transcript else None,
        "extracted": json.loads(deal.extracted or "{}"),
        "agreement": agreement_obj,
        "email": json.loads(deal.email or "{}"),
        "generation_mode": deal.generation_mode,
        "confirmation_status": deal.confirmation_status,
        "counterparty_email": deal.counterparty_email,
        "shared_at": _iso_utc(deal.shared_at),
        "confirmed_at": _iso_utc(deal.confirmed_at),
        "change_request": deal.change_request,
        "signature_status": getattr(deal, "signature_status", "draft") or "draft",
        "signature_token": getattr(deal, "signature_token", None),
        "signed_at": _iso_utc(getattr(deal, "signed_at", None)),
        "signer_email": getattr(deal, "signer_email", None),
        "docuseal_id": docuseal_id,
        "created_at": _iso_utc(deal.created_at),
        "updated_at": _iso_utc(deal.updated_at),
    }


def find_deal_by_docuseal_id(submission_id: str | int):
    if not submission_id:
        return None
    sub_str = str(submission_id).strip()
    with get_session() as session:
        deals = session.query(Deal).all()
        for d in deals:
            try:
                ag = json.loads(d.agreement or "{}")
                if str(ag.get("docuseal_submission_id")) == sub_str or str(ag.get("docuseal_id")) == sub_str:
                    return _deal_to_dict(d)
            except Exception:
                continue
    return None



# ── Users / Auth ──────────────────────────────────────────────────────────
def get_or_create_user(username: str, display_name: str = None):
    username = normalize_username(username)
    with get_session() as session:
        user = session.query(User).filter_by(username=username).first()
        if not user:
            user = User(username=username, display_name=display_name or username)
            session.add(user)
            session.flush()
            profile = Profile(username=username)
            session.add(profile)
        else:
            user.last_seen = datetime.utcnow()
        session.flush()
        return {"username": user.username, "display_name": user.display_name}


def create_user_auth(email, password, name, company_name="", role=""):
    email = str(email or "").strip().lower()
    username = normalize_username(email.split("@")[0] if email else "")
    with get_session() as session:
        existing = session.query(User).filter_by(email=email).first()
        if existing:
            return {"error": "An account with this email already exists"}
        user = User(
            username=username,
            display_name=name or username,
            email=email,
            password_hash=generate_password_hash(password),
        )
        session.add(user)
        session.flush()
        profile = Profile(username=username, company_name=company_name or "", role=role or "")
        session.add(profile)
        session.flush()
        return {
            "username": user.username,
            "name": user.display_name,
            "email": user.email,
            "company_name": profile.company_name,
            "role": profile.role,
        }


def verify_user_auth(email, password):
    email = str(email or "").strip().lower()
    with get_session() as session:
        user = session.query(User).filter_by(email=email).first()
        if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
            return {"error": "Invalid email or password"}
        user.last_seen = datetime.utcnow()
        profile = session.query(Profile).filter_by(username=user.username).first()
        return {
            "username": user.username,
            "name": user.display_name,
            "email": user.email,
            "company_name": profile.company_name if profile else "",
            "role": profile.role if profile else "",
        }


# ── Profiles ──────────────────────────────────────────────────────────────
def get_profile(username: str):
    username = normalize_username(username)
    with get_session() as session:
        profile = session.query(Profile).filter_by(username=username).first()
        if not profile:
            profile = Profile(username=username)
            session.add(profile)
            session.flush()
        return {
            "username": profile.username,
            "company_name": profile.company_name,
            "role": profile.role,
            "default_currency": profile.default_currency,
            "default_advance_percent": profile.default_advance_percent,
            "notes": profile.notes,
        }


def update_profile(username: str, data: dict):
    username = normalize_username(username)
    with get_session() as session:
        profile = session.query(Profile).filter_by(username=username).first()
        if not profile:
            profile = Profile(username=username)
            session.add(profile)
            session.flush()
        for key in ["company_name", "role", "notes"]:
            if key in data:
                setattr(profile, key, str(data.get(key) or ""))
        if "default_currency" in data:
            profile.default_currency = str(data.get("default_currency") or "INR")
        if "default_advance_percent" in data:
            try:
                profile.default_advance_percent = float(data.get("default_advance_percent"))
            except (TypeError, ValueError):
                pass
        profile.updated_at = datetime.utcnow()
        session.flush()
        return {
            "username": profile.username,
            "company_name": profile.company_name,
            "role": profile.role,
            "default_currency": profile.default_currency,
            "default_advance_percent": profile.default_advance_percent,
            "notes": profile.notes,
        }


# ── Activity log ────────────────────────────────────────────────────────
def list_activity(username, limit=50):
    username = normalize_username(username)
    with get_session() as session:
        events = (
            session.query(ActivityEvent)
            .filter_by(username=username)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": e.id,
                "deal_id": e.deal_id,
                "event_type": e.event_type,
                "message": e.message,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]


# ── Deals ─────────────────────────────────────────────────────────────────
def create_deal(username, deal_name, transcript, extracted, agreement, email, generation_mode="ai"):
    username = normalize_username(username)
    deal_id = uuid.uuid4().hex[:12]
    with get_session() as session:
        deal = Deal(
            deal_id=deal_id,
            username=username,
            deal_name=deal_name or "Untitled Deal",
            status="completed",
            transcript=transcript or "",
            extracted=json.dumps(extracted or {}),
            agreement=json.dumps(agreement or {}),
            email=json.dumps(email or {}),
            generation_mode=generation_mode,
        )
        session.add(deal)
        session.flush()
        session.add(ActivityEvent(username=username, deal_id=deal_id, event_type="deal_analyzed", message=f"Deal '{deal.deal_name}' was analyzed"))
        return _deal_to_dict(deal)


def get_deal(deal_id):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        return _deal_to_dict(deal) if deal else None


def list_deals(username, limit=100, offset=0):
    username = normalize_username(username)
    with get_session() as session:
        deals = (
            session.query(Deal)
            .filter_by(username=username)
            .order_by(Deal.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return [_deal_to_dict(d, include_transcript=False) for d in deals]


def update_deal(deal_id, data: dict):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None
        if "deal_name" in data:
            deal.deal_name = str(data.get("deal_name") or deal.deal_name)
        if "extracted" in data:
            deal.extracted = json.dumps(data.get("extracted") or {})
        if "agreement" in data:
            deal.agreement = json.dumps(data.get("agreement") or {})
        if "email" in data:
            deal.email = json.dumps(data.get("email") or {})
        if "generation_mode" in data:
            deal.generation_mode = str(data.get("generation_mode") or deal.generation_mode)
        deal.updated_at = datetime.utcnow()
        session.flush()
        session.add(ActivityEvent(username=deal.username, deal_id=deal.deal_id, event_type="deal_updated", message=f"Deal '{deal.deal_name}' was updated"))
        return _deal_to_dict(deal)


def share_deal(deal_id, counterparty_email):
    """Marks a deal as sent to the counterparty. Called by the /share
    endpoint regardless of whether the actual email send succeeds, so the
    workflow state always reflects "we sent this out for confirmation"."""
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None
        deal.confirmation_status = "awaiting_counterparty"
        deal.counterparty_email = str(counterparty_email or deal.counterparty_email or "")
        deal.shared_at = datetime.utcnow()
        deal.change_request = ""
        deal.updated_at = datetime.utcnow()
        session.flush()
        session.add(ActivityEvent(username=deal.username, deal_id=deal.deal_id, event_type="deal_shared", message=f"Agreement for '{deal.deal_name}' was shared with {deal.counterparty_email or 'the counterparty'}"))
        return _deal_to_dict(deal)


def confirm_deal(deal_id):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None
        deal.confirmation_status = "confirmed"
        deal.confirmed_at = datetime.utcnow()
        deal.change_request = ""
        deal.updated_at = datetime.utcnow()
        session.flush()
        session.add(ActivityEvent(username=deal.username, deal_id=deal.deal_id, event_type="deal_confirmed", message=f"Terms for '{deal.deal_name}' were confirmed"))
        session.flush()
        sync_data_json_files(session)
        return _deal_to_dict(deal)


def request_deal_changes(deal_id, change_request):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None
        deal.confirmation_status = "changes_requested"
        deal.change_request = str(change_request or "")
        deal.updated_at = datetime.utcnow()
        session.flush()
        session.add(ActivityEvent(username=deal.username, deal_id=deal.deal_id, event_type="changes_requested", message=f"Changes requested on '{deal.deal_name}': {deal.change_request[:120]}"))
        session.flush()
        sync_data_json_files(session)
        return _deal_to_dict(deal)


def request_signature(deal_id: str, counterparty_email: str):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None
        if not getattr(deal, "signature_token", None):
            deal.signature_token = secrets.token_urlsafe(16)
        deal.signature_status = "awaiting_signature"
        deal.confirmation_status = "awaiting_counterparty"
        if counterparty_email:
            deal.counterparty_email = counterparty_email
        deal.shared_at = datetime.utcnow()
        deal.updated_at = datetime.utcnow()
        
        email_target = deal.counterparty_email or "counterparty"
        session.flush()
        session.add(ActivityEvent(
            username=deal.username,
            deal_id=deal.deal_id,
            event_type="signature_requested",
            message=f"Signature requested from {email_target}"
        ))
        session.flush()
        sync_data_json_files(session)
        return _deal_to_dict(deal)


def sign_deal(deal_id: str, token: str, action: str):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return None, "Deal not found"
        if not token or getattr(deal, "signature_token", None) != token:
            return None, "Invalid or expired signature token"

        action = (action or "").lower()
        if action == "accept":
            deal.signature_status = "signed"
            deal.signed_at = datetime.utcnow()
            deal.signer_email = deal.counterparty_email or "Counterparty"
            deal.confirmation_status = "confirmed"
            deal.confirmed_at = datetime.utcnow()
            event_msg = f"Agreement signed by counterparty ({deal.signer_email})"
            event_type = "deal_signed"
        elif action == "decline":
            deal.signature_status = "declined"
            deal.confirmation_status = "changes_requested"
            event_msg = "Agreement signature declined by counterparty"
            event_type = "signature_declined"
        else:
            return None, "Invalid action specified"

        deal.updated_at = datetime.utcnow()
        session.flush()
        session.add(ActivityEvent(
            username=deal.username,
            deal_id=deal.deal_id,
            event_type=event_type,
            message=event_msg
        ))
        session.flush()
        sync_data_json_files(session)
        return _deal_to_dict(deal), None


def delete_deal(deal_id):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return False
        username, deal_name = deal.username, deal.deal_name
        session.delete(deal)
        session.add(ActivityEvent(username=username, deal_id=deal_id, event_type="deal_deleted", message=f"Deal '{deal_name}' was deleted"))
        session.flush()
        sync_data_json_files(session)
        return True
