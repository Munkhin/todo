"""
API routes for review submissions and SM2 tracking.
Handles user feedback on review sessions to update spaced repetition intervals.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from api.database import supabase
from api.business_logic.sm2_algorithm import sm2_next_review

router = APIRouter()


class ReviewFeedbackRequest(BaseModel):
    """Request model for submitting review feedback"""
    quality_rating: int  # 0-5 quality scale
    
    class Config:
        schema_extra = {
            "example": {
                "quality_rating": 4
            }
        }


@router.post("/tasks/{task_id}/review")
def submit_review_feedback(
    task_id: int,
    request: ReviewFeedbackRequest,
    user_id: int = Query(...)
):
    """
    Submit review feedback for a task to update SM2 spaced repetition.
    
    Quality ratings:
    - 5: Perfect response
    - 4: Correct response after hesitation  
    - 3: Correct response with difficulty
    - 2: Incorrect; correct answer remembered
    - 1: Incorrect; correct answer seemed familiar
    - 0: Complete blackout
    """
    try:
        # Validate quality rating
        if not 0 <= request.quality_rating <= 5:
            raise HTTPException(status_code=400, detail="Quality rating must be between 0 and 5")
        
        # Fetch current task data
        task_response = supabase.table("tasks")\
            .select("*")\
            .eq("id", task_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not task_response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = task_response.data[0]
        
        # Get current SM2 parameters (or defaults for first review)
        repetition_count = task.get("repetition_count", 0)
        easiness_factor = task.get("easiness_factor", 2.5)
        
        # Calculate interval since last review
        last_reviewed = task.get("last_reviewed_at")
        if last_reviewed:
            last_reviewed_dt = datetime.fromisoformat(last_reviewed.replace('Z', '+00:00'))
            previous_interval = (datetime.now(timezone.utc) - last_reviewed_dt).days
        else:
            previous_interval = 1  # First review
        
        # Calculate next review parameters using SM2
        sm2_result = sm2_next_review(
            quality_rating=request.quality_rating,
            repetition_count=repetition_count,
            easiness_factor=easiness_factor,
            previous_interval=previous_interval
        )
        
        # Update task with new SM2 parameters
        now = datetime.now(timezone.utc)
        update_data = {
            "last_reviewed_at": now.isoformat(),
            "next_review_date": sm2_result["next_review_date"].isoformat(),
            "easiness_factor": sm2_result["easiness_factor"],
            "repetition_count": sm2_result["repetition_count"]
        }
        
        supabase.table("tasks")\
            .update(update_data)\
            .eq("id", task_id)\
            .execute()
        
        # Record in learning history
        history_data = {
            "user_id": user_id,
            "task_id": task_id,
            "review_date": now.isoformat(),
            "quality_rating": request.quality_rating,
            "interval_days": sm2_result["interval_days"],
            "easiness_factor": sm2_result["easiness_factor"],
            "repetition_count": sm2_result["repetition_count"]
        }
        
        supabase.table("learning_history")\
            .insert(history_data)\
            .execute()
        
        return {
            "success": True,
            "message": "Review feedback recorded",
            "next_review_date": sm2_result["next_review_date"].isoformat(),
            "next_interval_days": sm2_result["interval_days"],
            "easiness_factor": sm2_result["easiness_factor"],
            "repetition_count": sm2_result["repetition_count"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process review: {str(e)}")


@router.get("/tasks/{task_id}/review-history")
def get_review_history(task_id: int, user_id: int = Query(...)):
    """
    Get review history for a task.
    Shows progression of spaced repetition over time.
    """
    try:
        response = supabase.table("learning_history")\
            .select("*")\
            .eq("task_id", task_id)\
            .eq("user_id", user_id)\
            .order("review_date", desc=True)\
            .execute()
        
        return {
            "task_id": task_id,
            "reviews": response.data,
            "total_reviews": len(response.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review history: {str(e)}")
