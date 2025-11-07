# agent_tools.py
from sqlalchemy.orm import Session
from api.models import Task, CalendarEvent, EnergyProfile, BrainDump
from api.services.scheduler import schedule_study_sessions
from api.services.consts import (
    DEFAULT_DUE_DATE_DAYS,
    DEFAULT_ENERGY_LEVELS,
    DEFAULT_INSERT_BREAKS,
    DEFAULT_SHORT_BREAK_MIN,
    DEFAULT_LONG_BREAK_MIN,
    DEFAULT_LONG_STUDY_THRESHOLD_MIN,
    DEFAULT_MIN_GAP_FOR_BREAK_MIN,
)
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import json


# import timezone utilities
from api.utils.timezone import parse_iso_to_utc_naive as _parse_iso_to_utc_naive

def create_tasks(tasks: List[Dict], user_id: int, db: Session) -> Dict:
    """create new tasks from user input

    Args:
        tasks: list of dicts with topic, estimated_minutes, difficulty, due_date (ISO 8601 datetime string)
        user_id: user ID
        db: database session

    Returns:
        dict with created task names and count
    """
    from api.services.consts import DEFAULT_DUE_DATE_DAYS

    created = []
    for task_data in tasks:
        # parse due date - expect ISO 8601 format from AI
        due_date = task_data.get("due_date")
        if not due_date:
            # apply default due date
            due_date = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=DEFAULT_DUE_DATE_DAYS)
        elif isinstance(due_date, str):
            # parse ISO 8601 string directly
            try:
                due_date = _parse_iso_to_utc_naive(due_date)
            except ValueError as e:
                raise ValueError(f"Invalid ISO datetime format for due_date: {due_date}. Expected format: YYYY-MM-DDTHH:MM:SS. Error: {e}")

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

async def schedule_all_tasks(user_id: int, db: Session) -> Dict:
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

    # fetch unscheduled tasks
    from datetime import timedelta
    import json
    import numpy as np

    unscheduled_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "unscheduled"
    ).all()

    if not unscheduled_tasks:
        return {
            "message": "No unscheduled tasks to schedule",
            "scheduled_count": 0,
            "total_tasks": 0,
            "unscheduled_count": 0,
            "events": []
        }

    # get user's energy profile
    profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
    if not profile:
        profile = EnergyProfile(user_id=user_id)
        db.add(profile)
        db.commit()

    # prepare tasks for scheduler (add duration property)
    class TaskWrapper:
        def __init__(self, task):
            self.id = task.id
            self.due_date = task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
            self.difficulty = task.difficulty
            self.duration = task.estimated_minutes / 60.0  # convert to hours
            self.topic = task.topic

    wrapped_tasks = [TaskWrapper(t) for t in unscheduled_tasks]

    # prepare settings object
    class Settings:
        def __init__(self, profile):
            self.min_study_duration = (profile.min_study_duration or 30) / 60.0  # to hours
            self.max_study_duration = (profile.max_study_duration or 180) / 60.0  # to hours
            self.break_duration = (getattr(profile, 'short_break_min', 5) or 5) / 60.0  # to hours
            self.max_study_duration_before_break = (getattr(profile, 'long_study_threshold_min', 90) or 90) / 60.0  # to hours

            # parse energy levels
            if profile.energy_levels:
                energy_dict = json.loads(profile.energy_levels)
                # convert to array indexed by hour
                self.energy_plot = np.array([energy_dict.get(str(h), 5) for h in range(24)])
            else:
                # default energy plot
                self.energy_plot = np.array([5] * 24)

    settings = Settings(profile)

    # calculate date range
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    earliest_due = min(t.due_date for t in unscheduled_tasks)
    start_date = now
    end_date = earliest_due + timedelta(days=1)

    # call the new scheduler
    schedule = await schedule_study_sessions(wrapped_tasks, user_id, start_date, end_date, settings, db)

    # convert schedule to calendar events
    events = []
    for item in schedule:
        task_id = item.get("task_id")
        start_hour = item["start_time"]
        duration_hours = item["duration"]

        # convert hours to datetime
        start_dt = start_date + timedelta(hours=start_hour)
        end_dt = start_dt + timedelta(hours=duration_hours)

        if task_id:
            task = db.query(Task).filter(Task.id == task_id).first()
            event = CalendarEvent(
                user_id=user_id,
                title=f"Study: {task.topic}",
                description=task.description,
                start_time=start_dt,
                end_time=end_dt,
                event_type="study",
                source="system",
                task_id=task_id
            )
        else:
            # break event
            event = CalendarEvent(
                user_id=user_id,
                title="Break",
                start_time=start_dt,
                end_time=end_dt,
                event_type="break",
                source="system"
            )

        db.add(event)
        events.append(event)

    # update task statuses
    for task in unscheduled_tasks:
        task.status = "scheduled"

    db.commit()

    return {
        "message": "Schedule generated successfully",
        "scheduled_count": len([e for e in events if e.event_type == "study"]),
        "total_tasks": len(unscheduled_tasks),
        "unscheduled_count": 0,
        "events": events
    }

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
        "energy_levels": json.loads(profile.energy_levels) if profile.energy_levels else DEFAULT_ENERGY_LEVELS,
        "insert_breaks": getattr(profile, 'insert_breaks', DEFAULT_INSERT_BREAKS),
        "short_break_min": getattr(profile, 'short_break_min', DEFAULT_SHORT_BREAK_MIN),
        "long_break_min": getattr(profile, 'long_break_min', DEFAULT_LONG_BREAK_MIN),
        "long_study_threshold_min": getattr(profile, 'long_study_threshold_min', DEFAULT_LONG_STUDY_THRESHOLD_MIN),
        "min_gap_for_break_min": getattr(profile, 'min_gap_for_break_min', DEFAULT_MIN_GAP_FOR_BREAK_MIN),
    }

def update_energy_profile(
    user_id: int,
    due_date_days: Optional[int] = None,
    wake_time: Optional[int] = None,
    sleep_time: Optional[int] = None,
    max_study_duration: Optional[int] = None,
    min_study_duration: Optional[int] = None,
    insert_breaks: Optional[bool] = None,
    short_break_min: Optional[int] = None,
    long_break_min: Optional[int] = None,
    long_study_threshold_min: Optional[int] = None,
    min_gap_for_break_min: Optional[int] = None,
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
    # rest-aware fields
    if insert_breaks is not None:
        profile.insert_breaks = insert_breaks
    if short_break_min is not None:
        profile.short_break_min = short_break_min
    if long_break_min is not None:
        profile.long_break_min = long_break_min
    if long_study_threshold_min is not None:
        profile.long_study_threshold_min = long_study_threshold_min
    if min_gap_for_break_min is not None:
        profile.min_gap_for_break_min = min_gap_for_break_min

    db.commit()
    return {"success": True}


def tune_break_settings(
    user_id: int,
    insert_breaks: Optional[bool] = None,
    short_break_min: Optional[int] = None,
    long_break_min: Optional[int] = None,
    long_study_threshold_min: Optional[int] = None,
    min_gap_for_break_min: Optional[int] = None,
    db: Session = None
) -> Dict:
    """Tune rest/break parameters only (agent/chat tool)."""
    profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
    if not profile:
        profile = EnergyProfile(user_id=user_id)
        db.add(profile)

    if insert_breaks is not None:
        profile.insert_breaks = insert_breaks
    if short_break_min is not None:
        profile.short_break_min = short_break_min
    if long_break_min is not None:
        profile.long_break_min = long_break_min
    if long_study_threshold_min is not None:
        profile.long_study_threshold_min = long_study_threshold_min
    if min_gap_for_break_min is not None:
        profile.min_gap_for_break_min = min_gap_for_break_min

    db.commit()
    return {"success": True}
