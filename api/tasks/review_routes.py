from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from api.database import supabase

router = APIRouter()

class ReviewFeedback(BaseModel):
    task_id: int
    quality_rating: int # 0-5

@router.post("/reviews")
async def submit_review_feedback(feedback: ReviewFeedback):
    """
    Submit feedback for a review session.
    In the fixed 5-session system, this just marks the current review as complete.
    """
    try:
        # Find the earliest pending review session for this task
        response = supabase.table("review_sessions")\
            .select("*")\
            .eq("task_id", feedback.task_id)\
            .eq("status", "pending")\
            .order("scheduled_date")\
            .limit(1)\
            .execute()
            
        if not response.data:
            return {"message": "No pending review session found for this task", "success": False}
            
        session = response.data[0]
        
        # Mark as completed
        supabase.table("review_sessions").update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", session["id"]).execute()
        
        return {"success": True, "message": "Review recorded"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
