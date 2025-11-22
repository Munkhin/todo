# routes for subscription and credit usage information

from fastapi import APIRouter, HTTPException
from api.database import get_user_credits, get_user_by_id

router = APIRouter()

# credit limits per plan (in tokens or credits)
CREDIT_LIMITS = {
    "free": 10,
    "pro": None,
    "unlimited": None  # unlimited has no limit
}

@router.get("/users/{user_id}/subscription")
async def get_subscription_status(user_id: int):
    """get user's subscription status and details"""
    user_data = get_user_by_id(user_id)

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "success": True,
        "subscription_plan": user_data.get("subscription_plan", "free"),
        "subscription_status": user_data.get("subscription_status", "active"),
        "credits_used": user_data.get("credits_used", 0),
        "credit_limit": CREDIT_LIMITS.get(user_data.get("subscription_plan", "free"), CREDIT_LIMITS["free"])
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
