# routes for credit usage information

from fastapi import APIRouter, HTTPException
from api.database import get_user_credits

router = APIRouter()

# credit limits per plan (in tokens or credits)
CREDIT_LIMITS = {
    "free": 10000,
    "pro": 100000,
    "enterprise": 1000000
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
