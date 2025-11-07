"""
subscription routes for managing user subscriptions and credits
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta

from api.database import get_db
from api.services.stripe_service import get_stripe
from api.models import User

router = APIRouter()

# credit limits by plan
CREDIT_LIMITS = {
    "free": 10,
    "pro": 500,
    "unlimited": None  # no limit
}

# request/response models
class SubscriptionResponse(BaseModel):
    subscription_plan: str
    credits_used: int
    credits_limit: Optional[int]
    subscription_status: str
    subscription_start_date: datetime
    subscription_end_date: Optional[datetime]

class ChangePlanRequest(BaseModel):
    user_id: int
    new_plan: str  # "free", "pro", "unlimited"

class CancelSubscriptionRequest(BaseModel):
    user_id: int

@router.get("/")
async def get_subscription(user_id: int, db: Session = Depends(get_db)):
    """get current subscription info and credit usage"""
    if user_id <= 0:
        raise HTTPException(status_code=401, detail="Invalid or missing user authentication")

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        credit_limit = CREDIT_LIMITS.get(user.subscription_plan)

        # Compute renews_at: prefer Stripe period end if available
        renews_at = None
        if user.stripe_subscription_id:
            client = get_stripe()
            try:
                if client:
                    sub = client.get_subscription(user.stripe_subscription_id)
                    if sub.current_period_end:
                        renews_at = datetime.utcfromtimestamp(sub.current_period_end)
            except Exception:
                pass
        # fallback naive: monthly cycle from start date
        base = user.subscription_start_date or datetime.utcnow()
        renews_at = (base + relativedelta(months=1))

        # Compatibility + new shape
        return {
            # legacy keys
            "subscription_plan": user.subscription_plan,
            "credits_used": user.credits_used,
            "credits_limit": credit_limit,
            "subscription_status": user.subscription_status,
            "subscription_start_date": user.subscription_start_date,
            "subscription_end_date": user.subscription_end_date,
            # new keys for frontend
            "plan": user.subscription_plan,
            "renews_at": renews_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in /subscription: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching subscription: {str(e)}")

@router.post("/change")
async def change_subscription(request: ChangePlanRequest, db: Session = Depends(get_db)):
    """change subscription plan and reset credits"""
    try:
        # validate plan
        if request.new_plan not in CREDIT_LIMITS:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")

        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # update plan and reset credits
        user.subscription_plan = request.new_plan
        user.credits_used = 0
        user.subscription_status = "active"
        user.subscription_start_date = datetime.utcnow()
        user.subscription_end_date = None

        db.commit()
        db.refresh(user)

        credit_limit = CREDIT_LIMITS.get(user.subscription_plan)

        return {
            "message": "Subscription plan changed successfully",
            "subscription_plan": user.subscription_plan,
            "credits_used": user.credits_used,
            "credits_limit": credit_limit,
            "subscription_status": user.subscription_status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ERROR in /subscription/change: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error changing subscription: {str(e)}")

@router.post("/cancel")
async def cancel_subscription(request: CancelSubscriptionRequest, db: Session = Depends(get_db)):
    """cancel subscription"""
    try:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # If stripe subscription is present and stripe configured, set cancel_at_period_end
        end_date = datetime.utcnow()
        client = get_stripe()
        if user.stripe_subscription_id and client:
            try:
                sub = client.cancel_at_period_end(user.stripe_subscription_id)
                if sub.current_period_end:
                    end_date = datetime.utcfromtimestamp(sub.current_period_end)
            except Exception:
                # fall back silently to immediate cancel end date
                pass

        user.subscription_status = "cancelled"
        user.subscription_end_date = end_date

        db.commit()
        db.refresh(user)

        return {
            "message": "Subscription cancelled successfully",
            "subscription_status": user.subscription_status,
            "subscription_end_date": user.subscription_end_date,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"ERROR in /subscription/cancel: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error cancelling subscription: {str(e)}")
