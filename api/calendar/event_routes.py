# routes for calendar event management
# allows users to manually create, update, and delete calendar events

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from api.database import (
    supabase,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event
)

router = APIRouter()

# request models for calendar events
class CreateCalendarEventRequest(BaseModel):
    user_id: int
    title: str
    description: Optional[str] = None
    start_time: str  # ISO format datetime string
    end_time: str  # ISO format datetime string
    event_type: str = "study"  # study, rest, break
    priority: str = "medium"  # low, medium, high
    source: str = "user"  # user or system
    task_id: Optional[int] = None

class UpdateCalendarEventRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    event_type: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    task_id: Optional[int] = None

# ============ CALENDAR EVENT ROUTES ============

@router.get("/events")
async def get_calendar_events(
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """get calendar events for user, optionally filtered by date range (overlap logic)"""
    if user_id is None:
        raise HTTPException(status_code=400, detail="user_id query parameter is required")

    try:
        # build query
        query = supabase.table("calendar_events").select("*").eq("user_id", user_id)

        # filter by date range with overlap logic: event overlaps if it starts before range ends AND ends after range starts
        if start_date and end_date:
            query = query.lt("start_time", end_date).gt("end_time", start_date)
        elif start_date:
            query = query.gte("end_time", start_date)
        elif end_date:
            query = query.lte("start_time", end_date)

        # execute query
        response = query.order("start_time").execute()

        return {
            "success": True,
            "events": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching calendar events: {str(e)}")

@router.post("/events")
async def create_event(request: CreateCalendarEventRequest):
    """create new calendar event"""
    try:
        # validate datetime strings
        try:
            datetime.fromisoformat(request.start_time.replace("Z", "+00:00"))
            datetime.fromisoformat(request.end_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format (e.g., 2024-01-01T10:00:00Z)")

        # validate end_time is after start_time
        if request.start_time >= request.end_time:
            raise HTTPException(status_code=400, detail="end_time must be after start_time")

        # create event data
        event_data = {
            "user_id": request.user_id,
            "title": request.title,
            "description": request.description,
            "start_time": request.start_time,
            "end_time": request.end_time,
            "event_type": request.event_type,
            "priority": request.priority,
            "source": request.source,
            "task_id": request.task_id
        }

        event_id = create_calendar_event(event_data)
        if not event_id:
            raise HTTPException(status_code=500, detail="Failed to create calendar event")

        # fetch created event
        response = supabase.table("calendar_events").select("*").eq("id", event_id).execute()

        return {
            "success": True,
            "message": "Calendar event created successfully",
            "event": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating calendar event: {str(e)}")

@router.put("/events/{event_id}")
async def update_event(event_id: int, request: UpdateCalendarEventRequest):
    """update existing calendar event"""
    try:
        # check if event exists
        existing = supabase.table("calendar_events").select("*").eq("id", event_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Calendar event not found")

        # build update data (only include fields that are provided)
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.start_time is not None:
            # validate datetime format
            try:
                datetime.fromisoformat(request.start_time.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO format")
            update_data["start_time"] = request.start_time
        if request.end_time is not None:
            # validate datetime format
            try:
                datetime.fromisoformat(request.end_time.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_time format. Use ISO format")
            update_data["end_time"] = request.end_time
        if request.event_type is not None:
            update_data["event_type"] = request.event_type
        if request.priority is not None:
            update_data["priority"] = request.priority
        if request.source is not None:
            update_data["source"] = request.source
        if request.task_id is not None:
            update_data["task_id"] = request.task_id

        # validate times if both are being updated
        if "start_time" in update_data and "end_time" in update_data:
            if update_data["start_time"] >= update_data["end_time"]:
                raise HTTPException(status_code=400, detail="end_time must be after start_time")

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        success = update_calendar_event(event_id, update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update calendar event")

        # fetch updated event
        response = supabase.table("calendar_events").select("*").eq("id", event_id).execute()

        return {
            "success": True,
            "message": "Calendar event updated successfully",
            "event": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating calendar event: {str(e)}")

@router.delete("/events/{event_id}")
async def delete_event(event_id: int):
    """delete calendar event"""
    try:
        # check if event exists
        existing = supabase.table("calendar_events").select("id").eq("id", event_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Calendar event not found")

        success = delete_calendar_event(event_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete calendar event")

        return {
            "success": True,
            "message": "Calendar event deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting calendar event: {str(e)}")

