import asyncio
from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from api.database import SessionLocal, Base, engine, run_light_migrations
from api.models import User
from api.db_helpers import create_or_update_user
from api.routes.subscription_routes import cancel_subscription, CancelSubscriptionRequest


def setup_module(module):
    # Ensure tables and migrations are applied for tests
    Base.metadata.create_all(bind=engine)
    run_light_migrations()


def _make_user(**overrides) -> User:
    db: Session = SessionLocal()
    try:
        u = User(
            email=overrides.get("email", f"test-{datetime.utcnow().timestamp()}@example.com"),
            name=overrides.get("name", "Test User"),
            google_user_id=overrides.get("google_user_id", f"gid-{datetime.utcnow().timestamp()}"),
            subscription_plan=overrides.get("subscription_plan", "pro"),
            subscription_status=overrides.get("subscription_status", "active"),
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    finally:
        db.close()


def test_create_or_update_user_creates_and_updates():
    gid = f"gid-{datetime.utcnow().timestamp()}"
    email1 = f"{gid}@example.com"
    uid = create_or_update_user(gid, email1, "Name A")
    assert isinstance(uid, int)

    # Update email and name
    email2 = f"{gid}-2@example.com"
    uid2 = create_or_update_user(gid, email2, "Name B")
    assert uid2 == uid

    # Check persisted changes
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == uid).first()
        assert u is not None
        assert u.email == email2
        assert u.name == "Name B"
        assert u.google_user_id == gid
    finally:
        db.close()


@pytest.mark.asyncio
async def test_cancel_subscription_sets_end_date(monkeypatch):
    # Create a user with a stripe subscription id
    u = _make_user(stripe_subscription_id="sub_123")

    class FakeStripeSub:
        def __init__(self):
            self.id = "sub_123"
            self.current_period_end = int(datetime(2099, 1, 1).timestamp())

    class FakeStripeClient:
        def cancel_at_period_end(self, subscription_id: str):
            assert subscription_id == "sub_123"
            return FakeStripeSub()

        def get_subscription(self, subscription_id: str):
            return FakeStripeSub()

    # Patch get_stripe in the subscription routes module
    from api import routes as _routes  # noqa: F401
    import api.routes.subscription_routes as submod
    monkeypatch.setattr(submod, "get_stripe", lambda: FakeStripeClient())

    # Call the route function directly with our own DB session
    req = CancelSubscriptionRequest(user_id=u.id)
    db: Session = SessionLocal()
    try:
        resp = await cancel_subscription(req, db)  # type: ignore[arg-type]
        assert resp["subscription_status"] == "cancelled"
        assert isinstance(resp["subscription_end_date"], datetime)
        # end date should align with fake current_period_end (year 2099)
        assert resp["subscription_end_date"].year == 2099
    finally:
        db.close()

