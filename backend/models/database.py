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
DB_DIR = os.path.join(BASE_DIR, "..", "data")
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
    # ── Counterparty confirmation & signature workflow ─────────────────
    # draft -> awaiting_counterparty -> confirmed | changes_requested
    confirmation_status = Column(String(32), default="draft", nullable=False)
    counterparty_email = Column(String(256), default="", nullable=False)
    shared_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    change_request = Column(Text, default="", nullable=False)
    # E-Signature workflow: draft | awaiting_signature | signed | declined
    signature_status = Column(String(32), default="draft", nullable=False)
    signature_token = Column(String(128), nullable=True)
    signed_at = Column(DateTime, nullable=True)
    signer_email = Column(String(256), nullable=True)
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
    confirmation-workflow and signature columns existed. create_all() only creates missing
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
            "signature_status": "VARCHAR(32) DEFAULT 'draft' NOT NULL",
            "signature_token": "VARCHAR(128)",
            "signed_at": "DATETIME",
            "signer_email": "VARCHAR(256)",
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
