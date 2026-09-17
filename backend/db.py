import json
import os
import re
import uuid
from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine, event
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(__file__)
DB_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "armour.db")
DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False))
Base = declarative_base()


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.close()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(128), unique=True, nullable=False, index=True)
    display_name = Column(String(256), nullable=False)
    email = Column(String(256), unique=True, nullable=True, index=True)
    password_hash = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)
    username = Column(String(128), unique=True, nullable=False, index=True)
    company_name = Column(String(256), default="", nullable=False)
    role = Column(String(128), default="", nullable=False)
    default_currency = Column(String(8), default="INR", nullable=False)
    default_advance_percent = Column(Float, default=30.0, nullable=False)
    notes = Column(Text, default="", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True)
    deal_id = Column(String(64), unique=True, nullable=False, index=True)
    username = Column(String(128), nullable=False, index=True)
    deal_name = Column(String(256), default="Untitled Deal", nullable=False)
    status = Column(String(32), default="completed", nullable=False)
    transcript = Column(Text, default="", nullable=False)
    extracted = Column(Text, default="{}", nullable=False)  # JSON blob
    agreement = Column(Text, default="{}", nullable=False)  # JSON blob
    email = Column(Text, default="{}", nullable=False)  # JSON blob
    generation_mode = Column(String(32), default="ai", nullable=False)  # ai | fallback
    # ── Counterparty confirmation workflow ─────────────────────────────
    # draft -> awaiting_counterparty -> confirmed | changes_requested
    confirmation_status = Column(String(32), default="draft", nullable=False)
    counterparty_email = Column(String(256), default="", nullable=False)
    shared_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    change_request = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True)
    username = Column(String(128), nullable=False, index=True)
    deal_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False)
    message = Column(String(512), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def init_db():
    Base.metadata.create_all(engine)
    _migrate_sqlite_columns()


def _migrate_sqlite_columns():
    """Lightweight migration for existing armour.db files created before the
    confirmation-workflow columns existed. create_all() only creates missing
    *tables*, not new columns on an existing table, so we add them here with
    plain ALTER TABLE statements (safe/no-op if already present)."""
    with engine.connect() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(deals)").fetchall()}
        additions = {
            "confirmation_status": "VARCHAR(32) DEFAULT 'draft' NOT NULL",
            "counterparty_email": "VARCHAR(256) DEFAULT '' NOT NULL",
            "shared_at": "DATETIME",
            "confirmed_at": "DATETIME",
            "change_request": "TEXT DEFAULT '' NOT NULL",
        }
        for col, ddl in additions.items():
            if col not in existing:
                conn.exec_driver_sql(f"ALTER TABLE deals ADD COLUMN {col} {ddl}")
        conn.commit()


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def normalize_username(username: str) -> str:
    username = str(username or "").strip().lower()
    username = re.sub(r"[^a-z0-9_\-.]", "_", username)
    return username or "guest"


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
