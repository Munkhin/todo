"""
SM2 (SuperMemo 2) Integration Hooks

Handles creating spaced repetition review sessions when tasks are completed.
Review events are created as fixed calendar events immediately upon task completion.
"""

from datetime import datetime, timezone, timedelta
from typing import List


def on_task_completed(task_id: int, user_id: int, db) -> List[dict]:
    """
    Hook called when a task is completed. Creates SM2 review sessions.
    
    Creates 5 review sessions with fixed calendar events at:
    - 1, 6, 15, 37, 93 days (hardcoded EF=2.5)
    
    Args:
        task_id: ID of completed task
        user_id: User ID
        db: Supabase database client
    
    Returns:
        List of created review session IDs
    """
    # Get task details
    task_response = db.table("tasks").select("*").eq("id", task_id).single().execute()
    
    if not task_response.data:
        return []
    
    task = task_response.data
    
    # Only create reviews for tasks with subjects
    if not task.get("subject"):
        return []
    
    # Check if reviews already exist
    existing_response = db.table("review_sessions").select("id").eq("task_id", task_id).execute()
    
    if existing_response.data:
        print(f"Reviews already exist for task {task_id}")
        return []
    
    # SM2 intervals with hardcoded EF=2.5
    intervals_days = [1, 6, 15, 37, 93]
    review_sessions_created = []
    
    # Create 5 review sessions
    for i in range(5):
        interval = intervals_days[i]
        
        scheduled_date = datetime.now(timezone.utc) + timedelta(days=interval)
        
        # Create review_session record
        session_response = db.table("review_sessions").insert({
            "user_id": user_id,
            "task_id": task_id,
            "scheduled_date": scheduled_date.isoformat(),
            "status": "pending"
        }).execute()
        
        session_id = session_response.data[0]["id"] if session_response.data else None
        if session_id:
            review_sessions_created.append(session_id)
        
        # IMMEDIATELY create FIXED calendar event
        review_duration = int(task.get("estimated_duration", 60) * 0.5)  # 50% of original
        
        db.table("calendar_events").insert({
            "user_id": user_id,
            "task_id": task_id,
            "title": f"Review: {task['title']}",
            "description": "SM2 spaced repetition review",
            "event_type": "review",
            "source": "scheduler",
            "subject": task["subject"],
            "priority": "high",
            "fixed": True,  # ← KEY: Review timing is fixed!
            "start_time": scheduled_date.isoformat(),
            "end_time": (scheduled_date + timedelta(minutes=review_duration)).isoformat()
        }).execute()
    
    print(f"Created {len(review_sessions_created)} review sessions for task {task_id}")
    return review_sessions_created


def update_review_on_completion(review_session_id: int, quality: int, db) -> dict:
    """
    Update review session after user completes it (optional future enhancement).
    
    Args:
        review_session_id: ID of review session
        quality: User's self-reported quality (0-5, SM2 scale)
        db: Database client
    
    Returns:
        Updated review session
    """
    # Update status
    response = db.table("review_sessions").update({
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", review_session_id).execute()
    
    return response.data[0] if response.data else None
