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
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.timezone = request.timezone
        db.commit()

        return {"success": True, "timezone": request.timezone}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating timezone: {str(e)}")
