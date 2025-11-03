# agent_tools.py
from sqlalchemy.orm import Session
from api.models import Task, CalendarEvent, EnergyProfile, BrainDump
from api.services.scheduler import schedule_tasks as run_scheduler
from api.services.consts import DEFAULT_DUE_DATE_DAYS, DEFAULT_ENERGY_LEVELS
from api.services.date_parser import parse_natural_date
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import json


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

def create_tasks(tasks: List[Dict], user_id: int, db: Session) -> Dict:
    """create new tasks from user input

    Args:
        tasks: list of dicts with topic, estimated_minutes, difficulty, due_date (string or natural language)
        user_id: user ID
        db: database session

    Returns:
        dict with created task names and count
    """
    from api.services.consts import DEFAULT_DUE_DATE_DAYS

    created = []
    for task_data in tasks:
        # parse due date if string, apply default if missing
        due_date = task_data.get("due_date")
        if not due_date:
            # apply default due date
            due_date = datetime.now() + timedelta(days=DEFAULT_DUE_DATE_DAYS)
        elif isinstance(due_date, str):
            due_date = parse_natural_date(due_date)

        task = Task(
            topic=task_data["topic"],
            estimated_minutes=task_data["estimated_minutes"],
            difficulty=task_data.get("difficulty", 3),
            due_date=due_date,
            description=task_data.get("description"),
            user_id=user_id,
            status="unscheduled"
        )
        db.add(task)
        created.append(task.topic)

    db.commit()
    return {"created_tasks": created, "count": len(created)}

def schedule_all_tasks(user_id: int, db: Session) -> Dict:
    """generate schedule for all unscheduled tasks with credit checking

    Args:
        user_id: user ID
        db: database session

    Returns:
        dict with scheduling results (scheduled_count, total_tasks, unscheduled_count, events, message)
        events: list of CalendarEvent objects that were created/returned
    """
    from api.models import User

    # get user subscription info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    # skip credit check for unlimited plan
    if user.subscription_plan != "unlimited":
        # check if this is a reschedule (tasks already scheduled exist)
        scheduled_tasks = db.query(Task).filter(
            Task.user_id == user_id,
            Task.scheduled_start != None
        ).count()

        is_reschedule = scheduled_tasks > 0
        credits_needed = 10 if is_reschedule else 1

        # define credit limits
        credit_limits = {
            "free": 10,
            "pro": 500
        }

        credit_limit = credit_limits.get(user.subscription_plan, 10)

        # check if user has enough credits
        if user.credits_used + credits_needed > credit_limit:
            return {
                "error": "Insufficient credits",
                "credits_used": user.credits_used,
                "credits_limit": credit_limit,
                "credits_needed": credits_needed
            }

        # deduct credits
        user.credits_used += credits_needed
        db.commit()

    result = run_scheduler(user_id, db)
    return result

def get_user_tasks(
    user_id: int,
    scheduled: Optional[bool] = None,
    completed: Optional[bool] = None,
    db: Session = None
) -> Dict:
    """get tasks with optional filters

    Args:
        user_id: user ID
        scheduled: if True, only scheduled; if False, only unscheduled; if None, all
        completed: if True, only completed; if False, only incomplete; if None, all
        db: database session

    Returns:
        dict with tasks array and count
    """
    query = db.query(Task).filter(Task.user_id == user_id)

    if scheduled is not None:
        if scheduled:
            query = query.filter(Task.scheduled_start != None)
        else:
            query = query.filter(Task.scheduled_start == None)

    if completed is not None:
        if completed:
            query = query.filter(Task.review_count > 0)
        else:
            query = query.filter(Task.review_count == 0)

    tasks = query.all()
    return {
        "tasks": [
            {
                "id": t.id,
                "topic": t.topic,
                "estimated_minutes": t.estimated_minutes,
                "difficulty": t.difficulty,
                "due_date": t.due_date.isoformat(),
                "status": t.status,
                "scheduled_start": t.scheduled_start.isoformat() if t.scheduled_start else None,
                "scheduled_end": t.scheduled_end.isoformat() if t.scheduled_end else None
            }
            for t in tasks
        ],
        "count": len(tasks)
    }

def update_task(task_id: int, updates: Dict, user_id: int, db: Session) -> Dict:
    """update an existing task

    Args:
        task_id: ID of task to update
        updates: dict of fields to update
        user_id: user ID for authorization
        db: database session

    Returns:
        dict with success status
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        return {"error": "Task not found"}

    for key, value in updates.items():
        if hasattr(task, key):
            setattr(task, key, value)

    db.commit()
    return {"success": True, "task_id": task_id}

def delete_task(task_id: int, user_id: int, db: Session) -> Dict:
    """delete a task

    Args:
        task_id: ID of task to delete
        user_id: user ID for authorization
        db: database session

    Returns:
        dict with success status
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        return {"error": "Task not found"}

    db.delete(task)
    db.commit()
    return {"success": True, "deleted_task_id": task_id}

def get_calendar_events(
    user_id: int,
    start_date: str,
    end_date: str,
    db: Session
) -> Dict:
    """get calendar events in date range

    Args:
        user_id: user ID
        start_date: ISO format date string
        end_date: ISO format date string
        db: database session

    Returns:
        dict with events array
    """
    start = _parse_iso_to_utc_naive(start_date)
    end = _parse_iso_to_utc_naive(end_date)

    events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.start_time >= start,
        CalendarEvent.end_time <= end
    ).all()

    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "start_time": e.start_time.isoformat(),
                "end_time": e.end_time.isoformat(),
                "event_type": e.event_type,
                "source": e.source
            }
            for e in events
        ]
    }

def create_calendar_event(
    user_id: int,
    title: str,
    start_time: str,
    end_time: str,
    event_type: str,
    description: Optional[str] = None,
    task_id: Optional[int] = None,
    db: Session = None
) -> Dict:
    """create a user calendar event (blocks time from scheduling)

    Args:
        user_id: user ID
        title: event title
        start_time: ISO format datetime string
        end_time: ISO format datetime string
        event_type: study, rest, or break
        description: optional description
        task_id: optional task ID to link event to task
        db: database session

    Returns:
        dict with success status and event_id
    """
    from api.models import Task

    # auto-create task for study events if no task_id provided
    if event_type == "study" and not task_id:
        start_dt = _parse_iso_to_utc_naive(start_time)
        end_dt = _parse_iso_to_utc_naive(end_time)
        duration_minutes = int((end_dt - start_dt).total_seconds() / 60)

        task = Task(
            user_id=user_id,
            topic=title,
            estimated_minutes=duration_minutes,
            difficulty=3,
            due_date=end_dt,
            description=description,
            status="scheduled",
            scheduled_start=start_dt,
            scheduled_end=end_dt
        )
        db.add(task)
        db.flush()  # get task.id
        task_id = task.id

    event = CalendarEvent(
        user_id=user_id,
        title=title,
        description=description,
        start_time=_parse_iso_to_utc_naive(start_time),
        end_time=_parse_iso_to_utc_naive(end_time),
        event_type=event_type,
        source="user",
        task_id=task_id  # link to task if provided or auto-created
    )
    db.add(event)
    db.commit()
    return {"success": True, "event_id": event.id, "task_id": task_id}

def get_energy_profile(user_id: int, db: Session) -> Dict:
    """get user's energy profile and schedule preferences

    Args:
        user_id: user ID
        db: database session

    Returns:
        dict with profile settings
    """
    profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
    if not profile:
        return {"error": "No energy profile found"}

    return {
        "due_date_days": profile.due_date_days if profile.due_date_days is not None else DEFAULT_DUE_DATE_DAYS,
        "wake_time": profile.wake_time,
        "sleep_time": profile.sleep_time,
        "max_study_duration": profile.max_study_duration,
        "min_study_duration": profile.min_study_duration,
        "energy_levels": json.loads(profile.energy_levels) if profile.energy_levels else DEFAULT_ENERGY_LEVELS
    }

def update_energy_profile(
    user_id: int,
    due_date_days: Optional[int] = None,
    wake_time: Optional[int] = None,
    sleep_time: Optional[int] = None,
    max_study_duration: Optional[int] = None,
    min_study_duration: Optional[int] = None,
    db: Session = None
) -> Dict:
    """update user's energy profile

    Args:
        user_id: user ID
        due_date_days: default due date offset in days
        wake_time: hour (0-23)
        sleep_time: hour (0-23)
        max_study_duration: minutes
        min_study_duration: minutes
        db: database session

    Returns:
        dict with success status
    """
    profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
    if not profile:
        profile = EnergyProfile(user_id=user_id)
        db.add(profile)

    if due_date_days is not None:
        profile.due_date_days = due_date_days
    if wake_time is not None:
        profile.wake_time = wake_time
    if sleep_time is not None:
        profile.sleep_time = sleep_time
    if max_study_duration is not None:
        profile.max_study_duration = max_study_duration
    if min_study_duration is not None:
        profile.min_study_duration = min_study_duration

    db.commit()
    return {"success": True}
