"""
User profile and settings routes
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from api.database import get_db
from api.models import User

router = APIRouter()


class UpdateTimezoneRequest(BaseModel):
    user_id: int
    timezone: str  # IANA timezone like "America/Los_Angeles"


@router.post("/timezone")
async def update_user_timezone(request: UpdateTimezoneRequest, db: Session = Depends(get_db)):
    """Update user's timezone setting"""
    try:
        print(f"[update_user_timezone] Received user_id={request.user_id}, timezone={request.timezone}")
        user = db.query(User).filter(User.id == request.user_id).first()
        print(f"[update_user_timezone] User query result: {user}")
        if not user:
            print(f"[update_user_timezone] User {request.user_id} not found in database")
            raise HTTPException(status_code=404, detail=f"User not found: {request.user_id}")

        user.timezone = request.timezone
        db.commit()
        print(f"[update_user_timezone] Successfully updated user {request.user_id} timezone to {request.timezone}")

        return {"success": True, "timezone": request.timezone}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[update_user_timezone] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error updating timezone: {str(e)}")
