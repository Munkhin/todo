"""
Active Recall Session Generator

Automatically creates quiz/review sessions for recently studied material.
Based on learning science: active recall is most effective 1-2 days after initial study.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict
import asyncio


async def generate_active_recall_sessions(user_id: int, db, lookback_days: int = 2) -> List[Dict]:
    """
    Generate active recall/quiz sessions for material studied recently.
    
    Active recall principle: Testing yourself shortly after learning improves retention.
    This creates review sessions for tasks completed 1-2 days ago.
    
    Args:
        user_id: User ID
        db: Database connection
        lookback_days: How many days back to look for completed tasks
    
    Returns:
        List of review session dictionaries to be scheduled
    """
    # Calculate date range
    now = datetime.now(timezone.utc)
    lookback_start = now - timedelta(days=lookback_days + 1)
    lookback_end = now - timedelta(days=1)
    
    # Fetch tasks completed in the lookback window
    result = await asyncio.to_thread(
        lambda: db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .gte("updated_at", lookback_start.isoformat())
        .lte("updated_at", lookback_end.isoformat())
        .execute()
    )
    
    completed_tasks = result.data if result.data else []
    
    # Group by subject for batch reviews
    subject_task_map = {}
    for task in completed_tasks:
        subject = task.get("subject") or "General"
        if subject not in subject_task_map:
            subject_task_map[subject] = []
        subject_task_map[subject].append(task)
    
    # Create review sessions (one per subject)
    review_sessions = []
    for subject, tasks in subject_task_map.items():
        # Schedule for tomorrow at a reasonable time (10 AM)
        tomorrow = now + timedelta(days=1)
        scheduled_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        session = {
            "user_id": user_id,
            "task_id": tasks[0]["id"],  # Link to first task in group
            "scheduled_date": scheduled_time.isoformat(),
            "review_type": "active_recall",
            "status": "pending",
            "source_task_ids": [t["id"] for t in tasks],  # All related tasks
            "title": f"Review: {subject}",
            "description": f"Active recall session for {len(tasks)} recent {subject} task(s)"
        }
        
        review_sessions.append(session)
    
    return review_sessions


async def schedule_active_recall_sessions(user_id: int, db) -> Dict:
    """
    Generate and save active recall sessions to the database.
    
    Returns:
        Summary of created sessions
    """
    try:
        # Generate sessions
        sessions = await generate_active_recall_sessions(user_id, db)
        
        if not sessions:
            return {
                "success": True,
                "message": "No recent completions found for active recall",
                "sessions_created": 0
            }
        
        # Save to review_sessions table
        result = await asyncio.to_thread(
            lambda: db.table("review_sessions")
            .insert(sessions)
            .execute()
        )
        
        return {
            "success": True,
            "message": f"Created {len(sessions)} active recall session(s)",
            "sessions_created": len(sessions),
            "sessions": result.data
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to create active recall sessions: {str(e)}",
            "sessions_created": 0
        }


def should_trigger_active_recall_generation(task) -> bool:
    """
    Determine if completing this task should trigger active recall generation.
    
    Triggers when:
    - Task is being marked as completed
    - Task has a subject assigned (for grouping)
    - Task was not already a review task
    
    Args:
        task: Task dictionary
    
    Returns:
        Boolean indicating if active recall should be triggered
    """
    return (
        task.get("status") == "completed" and
        task.get("subject") is not None and
        not task.get("is_review", False)
    )
