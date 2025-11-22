# determines "what" to schedule/reschedule

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, List, Tuple

import numpy as np

from api.database import (
    get_tasks_by_user,
    get_settings,
    create_tasks_batch,
    create_calendar_events_batch,
    delete_future_calendar_events,
    delete_events_for_tasks,
    get_supabase_client,
)
from api.data_types.consts import GET_TASKS_DEV_PROMPT, TASK_SCHEMA
from api.scheduling.scheduler import schedule_events
from api.timezone.conversions import resolve_user_timezone, now_in_timezone
from api.scheduling.agent_actions.utils import build_task_payload, standardize_existing_task, sanitize_event_payload

logger = logging.getLogger(__name__)

# main scheduling action for agent
async def schedule_tasks_into_calendar(user_input, chatgpt_call):
    
    # 1. get infered tasks, can be more than one
    infered_tasks = await infer_tasks(user_input, chatgpt_call)

    # basic error handling
    if not infered_tasks:
        raise ValueError("No tasks inferred")

    # 2. insert new tasks into db efficiently
    await asyncio.to_thread(create_tasks_batch, infered_tasks)

    # 3. Get existing tasks and determine surgical scheduling strategy
    all_tasks = await asyncio.to_thread(get_tasks_by_user, user_input["user_id"])
    existing_tasks = [t for t in all_tasks if t.get("status") != "completed"] 

    # Determine minimal rescheduling strategy
    strategy, tasks_to_reschedule = calculate_scheduling_strategy(existing_tasks, infered_tasks)

    # Get settings for scheduling
    settings = await asyncio.to_thread(get_settings, user_input["user_id"])
    if not settings:
        raise ValueError("User settings not found")
    
    # Determine scheduling window (now to latest deadline + 1 week buffer)
    now = datetime.now(timezone.utc)
    latest_deadline = now + timedelta(days=7)  # Default 1 week window
    
    for task in infered_tasks + existing_tasks:
        deadline = task.get("end_time")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if deadline > latest_deadline:
                latest_deadline = deadline

    if strategy == "new_only":
        # Best case: just schedule new tasks in gaps
        logger.info(f"Scheduling strategy: new_only - scheduling {len(infered_tasks)} new tasks")
        schedule = await schedule_events(
            user_input["user_id"],
            infered_tasks,
            now,
            latest_deadline,
            settings
        )
        
    elif strategy == "partial":
        # Surgical reschedule: only specific tasks
        logger.info(f"Scheduling strategy: partial - rescheduling {len(tasks_to_reschedule)} tasks + {len(infered_tasks)} new tasks")
        
        # Delete events for tasks being rescheduled
        task_ids_to_reschedule = [t["id"] for t in tasks_to_reschedule if "id" in t]
        if task_ids_to_reschedule:
            await asyncio.to_thread(delete_events_for_tasks, user_input["user_id"], task_ids_to_reschedule)
        
        # Reschedule only those tasks + new tasks
        schedule = await schedule_events(
            user_input["user_id"],
            tasks_to_reschedule + infered_tasks,
            now,
            latest_deadline,
            settings
        )
        
    else:  # strategy == "full"
        # Worst case: reschedule everything (unavoidable)
        logger.warning(f"Scheduling strategy: full - rescheduling all {len(existing_tasks)} existing + {len(infered_tasks)} new tasks")
        await asyncio.to_thread(delete_future_calendar_events, user_input["user_id"])
        schedule = await schedule_events(
            user_input["user_id"],
            existing_tasks + infered_tasks,
            now,
            latest_deadline,
            settings
        )

    # 4. insert calendar events efficiently
    await asyncio.to_thread(create_calendar_events_batch, schedule)

    # 5. natural language return
    descriptions = [event.get("description") or event.get("title", "task") for event in schedule]

    return {
        "text": "Scheduled " + ", ".join(descriptions)
    }



async def infer_tasks(user_input, chatgpt_call):
    return await chatgpt_call(user_input, GET_TASKS_DEV_PROMPT, "task", TASK_SCHEMA)


def get_overdue_tasks(existing_tasks: List[dict], now: datetime) -> List[dict]:
    """
    Returns list of tasks past their deadline.
    
    Args:
        existing_tasks: List of task dictionaries
        now: Current datetime
        
    Returns:
        List of overdue tasks
    """
    overdue = []
    for task in existing_tasks:
        deadline = task.get("end_time")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if deadline < now:
                overdue.append(task)
    return overdue


def identify_blocking_tasks_by_importance(
    existing_tasks: List[dict],
    additional_hours_needed: float,
    now: datetime
) -> List[dict]:
    """
    Identify minimal set of existing tasks to reschedule using hybrid importance scoring.
    
    Task importance combines priority and deadline urgency:
    - task_importance = (priority_weight × 0.6) + (deadline_urgency × 0.4)
    - Lower importance = more likely to be rescheduled
    
    Args:
        existing_tasks: Currently scheduled tasks
        additional_hours_needed: How many more hours we need to free up
        now: Current datetime for urgency calculation
        
    Returns:
        List of tasks to reschedule (lowest importance first)
    """
    priority_scores = {"low": 1, "medium": 2, "high": 3}
    
    # Calculate importance score for each task
    scored_tasks = []
    for task in existing_tasks:
        # Priority component (1-3)
        priority_score = priority_scores.get(task.get("priority", "medium"), 2)
        
        # Deadline urgency component (0-3)
        deadline = task.get("end_time")
        if not deadline:
            urgency_score = 0  # No deadline = not urgent
        else:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            
            hours_until = (deadline - now).total_seconds() / 3600
            if hours_until < 24:
                urgency_score = 3  # Very urgent
            elif hours_until < 72:
                urgency_score = 2  # Moderately urgent
            elif hours_until < 168:
                urgency_score = 1  # Somewhat urgent
            else:
                urgency_score = 0  # Not urgent
        
        # Combined importance score (lower = less important = more likely to move)
        task_importance = (priority_score * 0.6) + (urgency_score * 0.4)
        
        scored_tasks.append((task_importance, task))
    
    # Sort by importance (lowest first), then by duration (longest first for efficiency)
    scored_tasks.sort(key=lambda x: (x[0], -x[1].get("estimated_duration", 0)))
    
    # Select tasks until we've freed enough hours
    blocking_tasks = []
    hours_freed = 0.0
    
    for task_importance, task in scored_tasks:
        if hours_freed >= additional_hours_needed:
            break
        
        blocking_tasks.append(task)
        hours_freed += task.get("estimated_duration", 0) / 60.0  # Convert minutes to hours
    
    return blocking_tasks


def calculate_scheduling_strategy(existing_tasks: List[dict], new_tasks: List[dict]) -> Tuple[str, List[dict]]:
    """
    Determines the minimal set of tasks that need rescheduling.
    
    This implements the "surgical scheduling" approach to minimize calendar changes.
    
    Args:
        existing_tasks: Currently scheduled tasks (non-completed)
        new_tasks: Newly inferred tasks to be scheduled
        
    Returns:
        (strategy, tasks_needing_reschedule) where:
        - strategy: "new_only" | "partial" | "full"
        - tasks_needing_reschedule: list of task dicts that need rescheduling
    """

    # early return if nothing to reschedule
    if not existing_tasks:
        return "new_only", []
    
    # Get user settings and current time
    user_id = existing_tasks[0].get("user_id")
    settings = get_settings(user_id)
    db = get_supabase_client()
    now = datetime.now(timezone.utc)
    
    # STEP 1: Check for overdue tasks
    overdue = get_overdue_tasks(existing_tasks, now)
    
    # STEP 2: Find latest deadline among new tasks
    latest_deadline = None
    for task in new_tasks:
        deadline = task.get("end_time")
        if deadline:
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if not latest_deadline or deadline > latest_deadline:
                latest_deadline = deadline
    
    # early return if no deadlines on new tasks, just schedule them
    if not latest_deadline:
        return "partial" if overdue else "new_only", overdue # reschedule overdue
    
    # STEP 3: Get available empty slots for the whole time range
    empty_slots = get_empty_time_slots(user_id, now, latest_deadline, settings, db)
    total_available = sum(dur for _, dur in empty_slots)
    
    # STEP 4: Check if new tasks fit in total available time
    total_new_duration = sum(t.get("estimated_duration", 0) for t in new_tasks) / 60.0  # Convert minutes to hours
    
    if total_new_duration > total_available:
        # Not enough space even for new tasks alone
        if overdue:
            return "full", existing_tasks  # Need to reschedule everything
        else:
            # Identify specific blocking tasks to make room
            additional_hours_needed = total_new_duration - total_available  # Both in hours now
            blocking_tasks = identify_blocking_tasks_by_importance(
                existing_tasks,
                additional_hours_needed,
                now
            )
            return "partial", blocking_tasks
    
    # STEP 5: Check each new task individually against its deadline
    cannot_fit = []
    for task in new_tasks:
        deadline = task.get("end_time")
        if not deadline:
            continue
        
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        
        # Calculate available time before this task's deadline
        available_before = sum(
            dur for start, dur in empty_slots
            if start < deadline
        )
        
        if task.get("estimated_duration", 0) / 60.0 > available_before:  # Convert minutes to hours
            cannot_fit.append(task)
    
    # STEP 6: Determine final strategy
    if overdue or cannot_fit:
        tasks_to_reschedule = overdue + cannot_fit
        return "partial", tasks_to_reschedule
    else:
        return "new_only", []


def get_empty_time_slots(
    user_id: int,
    start_date: datetime,
    end_date: datetime,
    settings: dict,
    db
) -> List[Tuple[datetime, float]]:
    """
    Find empty time slots by treating all calendar events as blocked time.
    
    Returns:
        List of (slot_start_time, duration_hours) tuples
    """
    # Get all calendar events (all events are treated as blocking time)
    now = datetime.now(timezone.utc)
    response = db.table("calendar_events") \
        .select("start_time, end_time") \
        .eq("user_id", user_id) \
        .gte("start_time", max(now, start_date).isoformat()) \
        .lte("end_time", end_date.isoformat()) \
        .order("start_time") \
        .execute()
    
    existing_events = response.data if response.data else []
    
    # Convert to datetime objects
    for event in existing_events:
        event["start_time"] = datetime.fromisoformat(event["start_time"].replace("Z", "+00:00"))
        event["end_time"] = datetime.fromisoformat(event["end_time"].replace("Z", "+00:00"))
    
    empty_slots = []
    
    # Get wake/sleep times with error handling  
    try:
        wake_hour, wake_min = map(int, settings.get("wake_time", "07:00").split(":"))
        sleep_hour, sleep_min = map(int, settings.get("sleep_time", "23:00").split(":"))
    except (ValueError, AttributeError):
        wake_hour, wake_min = 7, 0
        sleep_hour, sleep_min = 23, 0
        
    min_study_minutes = settings.get("min_study_duration", 15)
    
    # Generate daily slots
    current_date = max(now, start_date).date()
    end_date_only = end_date.date()
    
    while current_date <= end_date_only:
        day_start = datetime.combine(current_date, datetime.min.time()).replace(
            hour=wake_hour, minute=wake_min, tzinfo=timezone.utc
        )
        day_end = datetime.combine(current_date, datetime.min.time()).replace(
            hour=sleep_hour, minute=sleep_min, tzinfo=timezone.utc
        )
        
        # Find gaps for this day
        day_events = [e for e in existing_events if e["start_time"].date() == current_date]
        
        if not day_events:
            # Entire day available
            duration_hours = (day_end - day_start).total_seconds() / 3600
            if duration_hours * 60 >= min_study_minutes:
                empty_slots.append((day_start, duration_hours))
        else:
            # Gap before first event
            if day_start < day_events[0]["start_time"]:
                gap_minutes = (day_events[0]["start_time"] - day_start).total_seconds() / 60
                if gap_minutes >= min_study_minutes:
                    empty_slots.append((day_start, gap_minutes / 60))
            
            # Gaps between consecutive events
            for i in range(len(day_events) - 1):
                gap_start = day_events[i]["end_time"]
                gap_end = day_events[i + 1]["start_time"]
                gap_minutes = (gap_end - gap_start).total_seconds() / 60
                
                if gap_minutes >= min_study_minutes:
                    empty_slots.append((gap_start, gap_minutes / 60))
            
            # Gap after last event
            if day_events[-1]["end_time"] < day_end:
                gap_minutes = (day_end - day_events[-1]["end_time"]).total_seconds() / 60
                if gap_minutes >= min_study_minutes:
                    empty_slots.append((day_events[-1]["end_time"], gap_minutes / 60))
        
        current_date += timedelta(days=1)
    
    return empty_slots