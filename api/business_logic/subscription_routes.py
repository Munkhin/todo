# routes for subscription and credit usage information

from fastapi import APIRouter, HTTPException
from api.database import get_user_credits, get_user_by_id

router = APIRouter()

# credit limits per plan (in tokens or credits)
CREDIT_LIMITS = {
    "free": 10,
    "pro": 500,
    "unlimited": None  # unlimited has no limit
}

@router.get("/users/{user_id}/subscription")
async def get_subscription_status(user_id: int):
    """get user's subscription status and details"""
    from datetime import datetime, timedelta

    user_data = get_user_by_id(user_id)

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    plan = user_data.get("subscription_plan", "free")

    # default renewal date is 30 days from now
    # in production, this should come from stripe or database
    renews_at = (datetime.now() + timedelta(days=30)).isoformat()

    return {
        "plan": plan,
        "credits_used": user_data.get("credits_used", 0),
        "credits_limit": CREDIT_LIMITS.get(plan, CREDIT_LIMITS["free"]),
        "renews_at": renews_at
    }

@router.get("/users/{user_id}/credits")
async def get_credits(user_id: int):
    """get user's credit usage and limit"""
    user_data = get_user_credits(user_id)

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    plan = user_data.get("subscription_plan", "free")
    credits_used = user_data.get("credits_used", 0)
    limit = CREDIT_LIMITS.get(plan, CREDIT_LIMITS["free"])

    return {
        "used": credits_used,
        "limit": limit
    }
