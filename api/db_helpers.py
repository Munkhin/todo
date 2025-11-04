from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from api.database import SessionLocal
from api.models import User


def create_or_update_user(google_user_id: str, email: str, name: Optional[str], timezone: Optional[str] = None) -> int:
    """Create or update a user, linking Google ID to our numeric user id.

    Args:
        google_user_id: Google account ID
        email: User email
        name: User display name
        timezone: User's IANA timezone (e.g. "America/Los_Angeles", "Europe/London")

    Returns the numeric user id.
    """
    db: Session = SessionLocal()
    try:
        user: Optional[User] = None
        if google_user_id:
            user = db.query(User).filter(User.google_user_id == google_user_id).first()
        if not user and email:
            user = db.query(User).filter(User.email == email).first()

        if user:
            # Update link and profile details
            if google_user_id and not user.google_user_id:
                user.google_user_id = google_user_id
            if email and user.email != email:
                user.email = email
            if name and user.name != name:
                user.name = name
            # Update timezone if provided and different
            if timezone and user.timezone != timezone:
                user.timezone = timezone
        else:
            user = User(
                email=email or f"unknown-{google_user_id}@example.com",
                name=name,
                google_user_id=google_user_id,
                created_at=datetime.utcnow(),
                timezone=timezone or "UTC"  # use provided timezone or default to UTC
            )
            db.add(user)

        db.commit()
        db.refresh(user)
        return int(user.id)
    finally:
        db.close()


def get_user_credits(google_user_id: str) -> Optional[Dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.google_user_id == google_user_id).first()
        if not user:
            return None

        credit_limits = {"free": 10, "pro": 500, "unlimited": None}
        limit = credit_limits.get(user.subscription_plan)
        renews_at = (user.subscription_start_date or datetime.utcnow()) + timedelta(days=30)
        return {
            "subscription_plan": user.subscription_plan,
            "credits_used": user.credits_used,
            "credits_limit": limit,
            "subscription_status": user.subscription_status,
            "subscription_start_date": user.subscription_start_date,
            "subscription_end_date": user.subscription_end_date,
            "renews_at": renews_at,
            "user_id": int(user.id),
        }
    finally:
        db.close()


def update_user_plan(google_user_id: str, plan_type: str) -> bool:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.google_user_id == google_user_id).first()
        if not user:
            return False
        if plan_type not in ["free", "pro", "unlimited"]:
            return False
        user.subscription_plan = plan_type
        user.subscription_status = "active"
        user.subscription_start_date = datetime.utcnow()
        user.subscription_end_date = None
        user.credits_used = 0
        db.commit()
        return True
    finally:
        db.close()

