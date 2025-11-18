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
        tasks = get_tasks_by_user(user_id)
        return {
            "success": True,
            "tasks": tasks,
            "count": len(tasks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tasks: {str(e)}")

@router.post("/tasks")
async def create_new_task(request: CreateTaskRequest):
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

        task_id = create_task(task_data)
        if not task_id:
            raise HTTPException(status_code=500, detail="Failed to create task")

        # fetch created task
        response = supabase.table("tasks").select("*").eq("id", task_id).execute()

        return {
            "success": True,
            "message": "Task created successfully",
            "task": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.put("/tasks/{task_id}")
async def update_existing_task(task_id: int, request: UpdateTaskRequest):
    """update existing task"""
    try:
        # check if task exists
        existing = supabase.table("tasks").select("*").eq("id", task_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Task not found")

        # build update data (only include fields that are provided)
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.priority is not None:
            update_data["priority"] = request.priority
        if request.difficulty is not None:
            if request.difficulty < 1 or request.difficulty > 10:
                raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 10")
            update_data["difficulty"] = request.difficulty
        if request.status is not None:
            update_data["status"] = request.status
        if request.due_date is not None:
            # validate datetime format
            try:
                datetime.fromisoformat(request.due_date.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid due_date format. Use ISO format")
            update_data["due_date"] = request.due_date
        if request.estimated_duration is not None:
            update_data["estimated_duration"] = request.estimated_duration
        if request.scheduled_start is not None:
            try:
                datetime.fromisoformat(request.scheduled_start.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_start format. Use ISO format")
            update_data["scheduled_start"] = request.scheduled_start
        if request.scheduled_end is not None:
            try:
                datetime.fromisoformat(request.scheduled_end.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_end format. Use ISO format")
            update_data["scheduled_end"] = request.scheduled_end

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        success = update_task(task_id, update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update task")

        # fetch updated task
        response = supabase.table("tasks").select("*").eq("id", task_id).execute()

        return {
            "success": True,
            "message": "Task updated successfully",
            "task": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")

@router.delete("/tasks/{task_id}")
async def delete_existing_task(task_id: int):
    """delete task"""
    try:
        # check if task exists
        existing = supabase.table("tasks").select("id").eq("id", task_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Task not found")

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
