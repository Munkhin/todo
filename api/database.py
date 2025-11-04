# database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Optional
from datetime import datetime

DATABASE_URL = "sqlite:///./tasks.db"

# Create the engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}  # needed for SQLite
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _column_exists(table: str, column: str) -> bool:
    """Check if a column exists on a table (SQLite)."""
    with engine.connect() as conn:
        res = conn.execute(text(f"PRAGMA table_info({table})"))
        cols = [row[1] for row in res.fetchall()]
        return column in cols


def run_light_migrations() -> None:
    """Lightweight migrations to add newly introduced columns if missing.

    This is safe for SQLite and avoids full Alembic setup for this project.
    """
    with engine.begin() as conn:
        # users.google_user_id
        if _column_exists("users", "id"):  # table exists
            if not _column_exists("users", "google_user_id"):
                conn.execute(text("ALTER TABLE users ADD COLUMN google_user_id VARCHAR"))
            if not _column_exists("users", "timezone"):
                conn.execute(text("ALTER TABLE users ADD COLUMN timezone VARCHAR DEFAULT 'UTC'"))
            if not _column_exists("users", "stripe_customer_id"):
                conn.execute(text("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR"))
            if not _column_exists("users", "stripe_subscription_id"):
                conn.execute(text("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR"))

        # energy_profiles: add rest-aware columns if missing
        if _column_exists("energy_profiles", "id"):
            if not _column_exists("energy_profiles", "insert_breaks"):
                conn.execute(text("ALTER TABLE energy_profiles ADD COLUMN insert_breaks BOOLEAN DEFAULT 0"))
            if not _column_exists("energy_profiles", "short_break_min"):
                conn.execute(text("ALTER TABLE energy_profiles ADD COLUMN short_break_min INTEGER DEFAULT 5"))
            if not _column_exists("energy_profiles", "long_break_min"):
                conn.execute(text("ALTER TABLE energy_profiles ADD COLUMN long_break_min INTEGER DEFAULT 15"))
            if not _column_exists("energy_profiles", "long_study_threshold_min"):
                conn.execute(text("ALTER TABLE energy_profiles ADD COLUMN long_study_threshold_min INTEGER DEFAULT 90"))
            if not _column_exists("energy_profiles", "min_gap_for_break_min"):
                conn.execute(text("ALTER TABLE energy_profiles ADD COLUMN min_gap_for_break_min INTEGER DEFAULT 3"))


# moved app-specific helpers to api/db_helpers.py to avoid circular imports
