"""
calendar routes for managing calendar events
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from api.database import get_db
from api.models import CalendarEvent, User, Task
from api.schemas import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventOut,
    ManualEventCreate,
    ManualEventUpdate,
    TaskOut,
)
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter()

# helper to get user_id from session
def get_user_id_from_session(session_id: str) -> int:
    """get user_id from session"""
    from .auth_routes import sessions

    if session_id not in sessions or 'credentials' not in sessions[session_id]:
        raise HTTPException(status_code=401, detail="Not authenticated")

    credentials = Credentials(**sessions[session_id]['credentials'])
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()
    return user_info.get('id')


def _ensure_user(db: Session, user_id: int) -> User:
    """Ensure user exists and return the user instance."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _validate_time_range(start_time: datetime, end_time: datetime) -> None:
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")


def _resolve_estimated_minutes(start_time: datetime, end_time: datetime, fallback: Optional[int] = None) -> int:
    if fallback and fallback > 0:
        return fallback
    duration_minutes = max(1, int((end_time - start_time).total_seconds() // 60))
    return duration_minutes


def _parse_iso_to_utc_naive(iso_string: str) -> datetime:
    """Parse ISO datetime string to naive UTC datetime for database storage.
    Handles timezone-aware and naive ISO strings.
    """
    dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        # convert to UTC and make naive
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    # if naive, assume it's already UTC (for backwards compatibility)
    return dt


def _to_utc_iso(dt: datetime) -> str:
    """Convert a datetime to an ISO8601 UTC string with 'Z'.
    Database stores naive UTC datetimes, so we just add UTC timezone info.
    """
    if dt.tzinfo is None:
        # Database stores naive UTC datetimes
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def _serialize_event_utc(ev: CalendarEvent) -> dict:
    return {
        "id": ev.id,
        "user_id": ev.user_id,
        "title": ev.title,
        "description": ev.description,
        "start_time": _to_utc_iso(ev.start_time),
        "end_time": _to_utc_iso(ev.end_time),
        "start_ts": int(ev.start_time.timestamp() * 1000),
        "end_ts": int(ev.end_time.timestamp() * 1000),
        "event_type": ev.event_type,
        "source": getattr(ev, 'source', 'user'),
        "task_id": ev.task_id,
    }

@router.get("/events")
async def get_calendar_events(
    session_id: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch user's calendar events (to avoid conflicts)"""
    try:
        print(f"[get_calendar_events] user_id={user_id} session_id={session_id} start_date={start_date} end_date={end_date}")
        # Determine user_id: prefer explicit user_id, else derive from session
        if user_id is None:
            if not session_id:
                raise HTTPException(status_code=400, detail="Either session_id or user_id must be provided")
            user_id = get_user_id_from_session(session_id)

        # query calendar events for user
        query = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id)

        # filter by date range if provided
        if start_date:
            start_dt = _parse_iso_to_utc_naive(start_date)
            query = query.filter(CalendarEvent.start_time >= start_dt)

        if end_date:
            end_dt = _parse_iso_to_utc_naive(end_date)
            query = query.filter(CalendarEvent.end_time <= end_dt)

        events = query.order_by(CalendarEvent.start_time).all()
        print(f"[get_calendar_events] returning count={len(events)} for user_id={user_id}")

        serialized = [_serialize_event_utc(e) for e in events]
        return {
            "events": serialized,
            "count": len(serialized)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching calendar events: {str(e)}")


@router.post("/manual-event", status_code=201)
async def create_manual_calendar_event(
    manual_event: ManualEventCreate,
    db: Session = Depends(get_db)
):
    """Create a calendar event initiated by the user (manual scheduling)."""
    try:
        print(f"[manual-event:create] payload user_id={manual_event.user_id} title={manual_event.title} start={manual_event.start_time} end={manual_event.end_time} difficulty={manual_event.difficulty} est={manual_event.estimated_minutes} task_id={manual_event.task_id}")
        _ensure_user(db, manual_event.user_id)
        start_time = manual_event.start_time
        end_time = manual_event.end_time
        _validate_time_range(start_time, end_time)
        estimated_minutes = _resolve_estimated_minutes(start_time, end_time, manual_event.estimated_minutes)

        task: Optional[Task] = None
        if manual_event.task_id:
            task = db.query(Task).filter(
                Task.id == manual_event.task_id,
                Task.user_id == manual_event.user_id
            ).first()
            if not task:
                raise HTTPException(status_code=404, detail="Task not found for manual event creation")
            task.topic = manual_event.title
            task.description = manual_event.description
            task.difficulty = manual_event.difficulty or task.difficulty
            task.estimated_minutes = estimated_minutes
            task.due_date = end_time
            task.scheduled_start = start_time
            task.scheduled_end = end_time
            task.status = "scheduled"
        else:
            task = Task(
                user_id=manual_event.user_id,
                topic=manual_event.title,
                description=manual_event.description,
                difficulty=manual_event.difficulty or 3,
                estimated_minutes=estimated_minutes,
                due_date=end_time,
                status="scheduled",
                scheduled_start=start_time,
                scheduled_end=end_time
            )
            db.add(task)
            db.flush()  # ensure task.id populated
            print(f"[manual-event:create] created new Task id={task.id}")

        calendar_event = CalendarEvent(
            user_id=manual_event.user_id,
            title=manual_event.title,
            description=manual_event.description,
            start_time=start_time,
            end_time=end_time,
            event_type=manual_event.event_type,
            source="user",
            task_id=task.id
        )
        db.add(calendar_event)

        db.commit()
        db.refresh(task)
        db.refresh(calendar_event)

        print(f"[manual-event:create] created CalendarEvent id={calendar_event.id} linked task_id={task.id}")

        return {
            "event": _serialize_event_utc(calendar_event),
            "task": TaskOut.from_orm(task).model_dump()
        }

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating manual calendar event: {str(exc)}")


@router.put("/manual-event/{event_id}")
async def update_manual_calendar_event(
    event_id: int,
    manual_update: ManualEventUpdate,
    db: Session = Depends(get_db)
):
    """Update a user-created calendar event and its linked task."""
    try:
        print(f"[manual-event:update] event_id={event_id} user_id={manual_update.user_id} title={manual_update.title} start={manual_update.start_time} end={manual_update.end_time} difficulty={manual_update.difficulty} est={manual_update.estimated_minutes} task_id={manual_update.task_id}")
        _ensure_user(db, manual_update.user_id)
        db_event = db.query(CalendarEvent).filter(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == manual_update.user_id
        ).first()

        if not db_event:
            raise HTTPException(status_code=404, detail="Calendar event not found")

        if db_event.source != "user":
            raise HTTPException(
                status_code=403,
                detail="Only user-created events can be updated via this endpoint"
            )

        new_start = manual_update.start_time or db_event.start_time
        new_end = manual_update.end_time or db_event.end_time
        _validate_time_range(new_start, new_end)
        estimated_minutes = _resolve_estimated_minutes(new_start, new_end, manual_update.estimated_minutes)

        if manual_update.title is not None:
            db_event.title = manual_update.title
        if manual_update.description is not None:
            db_event.description = manual_update.description
        if manual_update.event_type is not None:
            db_event.event_type = manual_update.event_type

        db_event.start_time = new_start
        db_event.end_time = new_end

        task: Optional[Task] = None
        if db_event.task_id:
            task = db.query(Task).filter(
                Task.id == db_event.task_id,
                Task.user_id == manual_update.user_id
            ).first()
        elif manual_update.task_id:
            task = db.query(Task).filter(
                Task.id == manual_update.task_id,
                Task.user_id == manual_update.user_id
            ).first()
            if task:
                db_event.task_id = task.id

        if not task:
            task = Task(
                user_id=manual_update.user_id,
                topic=db_event.title,
                description=db_event.description,
                difficulty=manual_update.difficulty or 3,
                estimated_minutes=estimated_minutes,
                due_date=new_end,
                status="scheduled",
                scheduled_start=new_start,
                scheduled_end=new_end
            )
            db.add(task)
            db.flush()
            db_event.task_id = task.id
        else:
            if manual_update.title is not None:
                task.topic = manual_update.title
            if manual_update.description is not None:
                task.description = manual_update.description
            if manual_update.difficulty is not None:
                task.difficulty = manual_update.difficulty
            task.estimated_minutes = estimated_minutes
            task.due_date = new_end
            task.scheduled_start = new_start
            task.scheduled_end = new_end
            task.status = "scheduled"

        db.commit()
        db.refresh(db_event)
        db.refresh(task)

        print(f"[manual-event:update] updated CalendarEvent id={db_event.id} task_id={task.id}")

        return {
            "event": _serialize_event_utc(db_event),
            "task": TaskOut.from_orm(task).model_dump()
        }

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating manual calendar event: {str(exc)}")

@router.post("/events", status_code=201)
async def create_calendar_event(
    session_id: str,
    event: CalendarEventCreate,
    db: Session = Depends(get_db)
):
    """Create a new calendar event (study session or rest)"""
    try:
        user_id = get_user_id_from_session(session_id)

        # create new event
        db_event = CalendarEvent(
            user_id=user_id,
            title=event.title,
            description=event.description,
            start_time=event.start_time,
            end_time=event.end_time,
            event_type=event.event_type,
            task_id=event.task_id
        )

        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        return {
            "message": "Calendar event created successfully",
            "event": db_event
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating calendar event: {str(e)}")

@router.put("/events/{event_id}")
async def update_calendar_event(
    event_id: int,
    session_id: str,
    event_update: CalendarEventUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing calendar event (user-created only)"""
    try:
        user_id = get_user_id_from_session(session_id)

        # get event
        db_event = db.query(CalendarEvent).filter(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == user_id
        ).first()

        if not db_event:
            raise HTTPException(status_code=404, detail="Calendar event not found")

        # prevent updating system-generated events
        if db_event.source == "system":
            raise HTTPException(
                status_code=403,
                detail="Cannot update system-generated events. Use reschedule instead."
            )

        # update fields
        for field, value in event_update.dict(exclude_unset=True).items():
            setattr(db_event, field, value)

        db_event.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        db.commit()
        db.refresh(db_event)

        return {
            "message": "Calendar event updated successfully",
            "event": db_event
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating calendar event: {str(e)}")

@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: int,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete a calendar event"""
    try:
        user_id = get_user_id_from_session(session_id)

        # get event
        db_event = db.query(CalendarEvent).filter(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == user_id
        ).first()

        if not db_event:
            raise HTTPException(status_code=404, detail="Calendar event not found")

        db.delete(db_event)
        db.commit()

        return {
            "message": "Calendar event deleted successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting calendar event: {str(e)}")
