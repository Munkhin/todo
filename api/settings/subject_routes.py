"""
API Routes for Subject Management

Handles CRUD operations for user subjects, which are used for:
- Task categorization
- Interleaving scheduling
- Subject-based filtering
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from api.database import supabase

router = APIRouter()


class SubjectRequest(BaseModel):
    subject_name: str


class SubjectResponse(BaseModel):
    id: int
    user_id: int
    subject_name: str
    created_at: str


@router.get("/subjects")
def get_user_subjects(user_id: int = Query(...)) -> List[SubjectResponse]:
    """
    Get all subjects for a user.
    Used to populate dropdowns in task forms and settings UI.
    """
    try:
        response = supabase.table("user_subjects")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("subject_name")\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subjects: {str(e)}")


@router.post("/subjects")
def create_subject(request: SubjectRequest, user_id: int = Query(...)) -> SubjectResponse:
    """
    Add a new subject for the user.
    Prevents duplicate subjects (case-insensitive).
    """
    try:
        # Check for existing subject (case-insensitive)
        existing = supabase.table("user_subjects")\
            .select("id")\
            .eq("user_id", user_id)\
            .ilike("subject_name", request.subject_name)\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Subject already exists")
        
        # Insert new subject
        response = supabase.table("user_subjects")\
            .insert({
                "user_id": user_id,
                "subject_name": request.subject_name.strip()
            })\
            .execute()
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subject: {str(e)}")


@router.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int, 
    request: SubjectRequest, 
    user_id: int = Query(...)
) -> SubjectResponse:
    """
    Update a subject name.
    Also updates all tasks that reference this subject.
    """
    try:
        # Verify ownership
        existing = supabase.table("user_subjects")\
            .select("subject_name")\
            .eq("id", subject_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        old_subject_name = existing.data[0]["subject_name"]
        new_subject_name = request.subject_name.strip()
        
        # Update subject
        response = supabase.table("user_subjects")\
            .update({"subject_name": new_subject_name})\
            .eq("id", subject_id)\
            .execute()
        
        # Update all tasks with this subject
        supabase.table("tasks")\
            .update({"subject": new_subject_name})\
            .eq("user_id", user_id)\
            .eq("subject", old_subject_name)\
            .execute()
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update subject: {str(e)}")


@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, user_id: int = Query(...)):
    """
    Delete a subject.
    Prevents deletion if any tasks reference this subject.
    """
    try:
        # Get subject name
        subject_response = supabase.table("user_subjects")\
            .select("subject_name")\
            .eq("id", subject_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not subject_response.data:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_name = subject_response.data[0]["subject_name"]
        
        # Check for dependent tasks
        tasks = supabase.table("tasks")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("subject", subject_name)\
            .execute()
        
        if tasks.data:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete subject: {len(tasks.data)} task(s) still reference it. Please reassign or delete those tasks first."
            )
        
        # Delete subject
        supabase.table("user_subjects")\
            .delete()\
            .eq("id", subject_id)\
            .execute()
        
        return {"success": True, "message": "Subject deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete subject: {str(e)}")


@router.get("/subjects/stats")
def get_subject_stats(user_id: int = Query(...)):
    """
    Get statistics about subjects (number of tasks per subject).
    Useful for analytics and UI displays.
    """
    try:
        # This would be more efficient with a database view or aggregation
        # For now, we'll fetch and count in Python
        tasks = supabase.table("tasks")\
            .select("subject")\
            .eq("user_id", user_id)\
            .execute()
        
        # Count tasks by subject
        subject_counts = {}
        for task in tasks.data:
            subject = task.get("subject") or "Uncategorized"
            subject_counts[subject] = subject_counts.get(subject, 0) + 1
        
        return {
            "total_subjects": len(subject_counts),
            "counts": subject_counts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subject stats: {str(e)}")
