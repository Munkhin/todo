# routes for task management
# allows users to manually create, update, and delete tasks

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import asyncio
import json
import numpy as np
from api.database import (
    supabase,
    create_task,
    get_tasks_by_user,
    update_task,
    delete_task,
    get_energy_profile,
    create_calendar_event
)
from api.business_logic.scheduler import schedule_tasks

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
    priority: Optional[ str] = "medium"  # low, medium, high
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

        # create the task in database
        task_id = create_task(task_data)
        if not task_id:
            raise HTTPException(status_code=500, detail="Failed to create task")

        return {
            "success": True,
            "task_id": str(task_id),
            "message": "Task created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")


@router.put("/tasks/{task_id}")
def update_existing_task(task_id: int, request: UpdateTaskRequest):
    """update existing task"""
    try:
        # validate due_date if provided
        if request.due_date:
            try:
                datetime.fromisoformat(request.due_date.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid due_date format")

        # build update data (only include non-None fields)
        task_data = {}
        if request.title is not None:
            task_data["title"] = request.title
        if request.description is not None:
            task_data["description"] = request.description
        if request.priority is not None:
            task_data["priority"] = request.priority
        if request.difficulty is not None:
            if request.difficulty < 1 or request.difficulty > 10:
                raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 10")
            task_data["difficulty"] = request.difficulty
        if request.status is not None:
            task_data["status"] = request.status
        if request.due_date is not None:
            task_data["due_date"] = request.due_date
        if request.estimated_duration is not None:
            task_data["estimated_duration"] = request.estimated_duration
        if request.scheduled_start is not None:
            task_data["scheduled_start"] = request.scheduled_start
        if request.scheduled_end is not None:
            task_data["scheduled_end"] = request.scheduled_end

        if not task_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        success = update_task(task_id, task_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update task")

        return {
            "success": True,
            "message": "Task updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")


@router.delete("/tasks/{task_id}")
def delete_existing_task(task_id: int):
    """delete task"""
    try:
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


@router.post("/tasks/{task_id}/schedule")
async def schedule_single_task(task_id: int):
    """schedule a single task using the AI scheduler"""
    try:
        # fetch the task from database
        task_response = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not task_response.data:
            raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")
        
        task = task_response.data[0]
        user_id = task.get("user_id")
        
        # validate required fields for scheduling
        if not task.get("estimated_duration"):
            raise HTTPException(
                status_code=400, 
                detail="Task must have an estimated_duration to be scheduled"
            )
        
        # fetch user energy profile for scheduling settings
        energy_profile = await asyncio.to_thread(get_energy_profile, user_id)
        
        if not energy_profile:
            raise HTTPException(
                status_code=400,
                detail="User must have an energy profile configured before scheduling tasks"
            )
        
        # prepare task data in scheduler format
        # scheduler expects duration in hours, database stores in minutes
        task_for_scheduler = {
            "user_id": user_id,
            "description": task.get("description") or task.get("title"),
            "title": task.get("title"),
            "duration": task.get("estimated_duration") / 60.0,  # convert minutes to hours
            "difficulty": task.get("difficulty") or 3,
            "priority": task.get("priority") or "medium",
            "task_id": task_id,
            "due_date": task.get("due_date")
        }
        
        # build scheduler settings from energy profile
        settings = type("obj", (object,), {
            "min_study_duration": energy_profile.get("min_study_duration", 30) / 60.0,  # convert to hours
            "max_study_duration": energy_profile.get("max_study_duration", 180) / 60.0,  # convert to hours
            "break_duration": energy_profile.get("short_break_min", 5) / 60.0,  # convert to hours
            "max_study_duration_before_break": energy_profile.get("long_study_threshold_min", 90) / 60.0,  # convert to hours
            "energy_plot": np.array(json.loads(energy_profile.get("energy_levels", "[]"))) if energy_profile.get("energy_levels") else np.ones(24)
        })()
        
        # set date range for scheduling
        start_date = datetime.now(timezone.utc)
        due_date_days = energy_profile.get("due_date_days", 7)
        end_date = start_date + timedelta(days=due_date_days)
        
        # call scheduler with single task
        schedule = await schedule_tasks([task_for_scheduler], user_id, start_date, end_date, settings, supabase)
        
        if not schedule:
            raise HTTPException(
                status_code=400,
                detail="No available time slots found for scheduling this task"
            )
        
        # create calendar events from schedule
        created_events = []
        for event in schedule:
            # sanitize event payload (remove fields not in calendar_events schema)
            sanitized_event = {
                "user_id": user_id,
                "title": event.get("title") or event.get("description") or "Study Session",
                "description": event.get("description"),
                "start_time": event.get("start_time"),
                "end_time": event.get("end_time"),
                "event_type": event.get("event_type", "study"),
                "priority": event.get("priority", "medium"),
                "source": event.get("source", "scheduler"),
                "task_id": task_id,
                "color_hex": event.get("color_hex", "#000000")
            }
            
            event_id = await asyncio.to_thread(create_calendar_event, sanitized_event)
            if event_id:
                created_events.append({
                    "id": event_id,
                    **sanitized_event
                })
        
        return {
            "success": True,
            "message": f"Successfully scheduled task with {len(created_events)} calendar events",
            "events": created_events,
            "count": len(created_events)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scheduling task: {str(e)}")
