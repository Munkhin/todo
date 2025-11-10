"""
User routes for NextAuth integration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class UserMeRequest(BaseModel):
    email: str
    name: str | None = None


@router.post("/me")
async def get_or_create_user(request: UserMeRequest):
    """get or create user by email (for NextAuth integration)"""
    from api.database import create_or_update_user_by_email

    try:
        user_id = create_or_update_user_by_email(request.email, request.name)
        return {"user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting/creating user: {str(e)}")
