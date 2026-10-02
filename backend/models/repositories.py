import json
import uuid
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

from .database import (
    ActivityEvent,
    Deal,
    Profile,
    User,
    get_session,
    normalize_username,
)


def _deal_to_dict(deal: Deal, include_transcript=True):
    return {
        "id": deal.deal_id,
        "username": deal.username,
        "deal_name": deal.deal_name,
        "status": deal.status,
        "transcript": deal.transcript if include_transcript else None,
        "extracted": json.loads(deal.extracted or "{}"),
        "agreement": json.loads(deal.agreement or "{}"),
        "email": json.loads(deal.email or "{}"),
        "generation_mode": deal.generation_mode,
        "confirmation_status": deal.confirmation_status,
        "counterparty_email": deal.counterparty_email,
        "shared_at": deal.shared_at.isoformat() if deal.shared_at else None,
        "confirmed_at": deal.confirmed_at.isoformat() if deal.confirmed_at else None,
        "change_request": deal.change_request,
        "created_at": deal.created_at.isoformat() if deal.created_at else None,
        "updated_at": deal.updated_at.isoformat() if deal.updated_at else None,
    }


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
        return _deal_to_dict(deal)


def delete_deal(deal_id):
    with get_session() as session:
        deal = session.query(Deal).filter_by(deal_id=deal_id).first()
        if not deal:
            return False
        username, deal_name = deal.username, deal.deal_name
        session.delete(deal)
        session.add(ActivityEvent(username=username, deal_id=deal_id, event_type="deal_deleted", message=f"Deal '{deal_name}' was deleted"))
        return True
