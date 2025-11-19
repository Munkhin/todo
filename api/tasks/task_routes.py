# routes for task management
# allows users to manually create, update, and delete tasks

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from api.database import (
    supabase,
    create_task,
    get_tasks_by_user,
    update_task,
    delete_task
)

router = APIRouter()

# request models for tasks
class CreateTaskRequest(BaseModel):
    user_id: int
    description: str
    title: Optional[str] = None
    estimated_duration: Optional[int] = None  # minutes
    difficulty: Optional[int] = None  # 1-10 scale
    due_date: Optional[str] = None  # ISO format datetime string
    status: str = "pending"  # pending, in_progress, completed
    priority: Optional[str] = "medium"  # low, medium, high
    scheduled_start: Optional[str] = None  # ISO format datetime string
    scheduled_end: Optional[str] = None  # ISO format datetime string

class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    difficulty: Optional[int] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    estimated_duration: Optional[int] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None


# ============ TASK ROUTES ============

@router.get("/tasks")
async def get_tasks(user_id: Optional[int] = None):
    """get all tasks for user"""
    if user_id is None:
        raise HTTPException(status_code=400, detail="user_id query parameter is required")

    try:
        # import asyncio
        # tasks = await asyncio.to_thread(get_tasks_by_user, user_id)
        tasks = [{"id": 1, "title": "Dummy Task"}]
        return {
            "success": True,
            "tasks": tasks,
            "count": len(tasks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")

@router.post("/tasks")
def create_new_task(request: CreateTaskRequest):
    """create new task"""
    try:
        # validate due_date if provided
        if request.due_date:
            try:
                datetime.fromisoformat(request.due_date.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid due_date format. Use ISO format (e.g., 2024-01-01T10:00:00Z)")

        # validate scheduled times if provided
        if request.scheduled_start:
            try:
                datetime.fromisoformat(request.scheduled_start.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_start format. Use ISO format")
        if request.scheduled_end:
            try:
                datetime.fromisoformat(request.scheduled_end.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_end format. Use ISO format")

        # validate difficulty if provided
        if request.difficulty is not None and (request.difficulty < 1 or request.difficulty > 10):
            raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 10")

        # create task data
        title_value = request.title or request.description
        task_data = {
            "user_id": request.user_id,
            "title": title_value,
            "description": request.description,
            "priority": request.priority,
            "difficulty": request.difficulty,
            "status": request.status,
            "due_date": request.due_date,
            "estimated_duration": request.estimated_duration,
            "scheduled_start": request.scheduled_start,
            "scheduled_end": request.scheduled_end
        }

        success = delete_task(task_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete task")

        return {
            "success": True,
            "message": "Task deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")
