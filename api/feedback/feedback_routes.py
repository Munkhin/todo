from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.database import save_feedback

router = APIRouter()


class FeedbackRequest(BaseModel):
    message: str
    email: Optional[str] = None
    user_id: Optional[int] = None


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    success = save_feedback(message, request.email, request.user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Unable to store feedback")

    return {"success": True, "message": "Feedback received"}
