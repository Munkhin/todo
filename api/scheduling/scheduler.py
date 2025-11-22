"""
# determines "how" to schedule/reschedule

Event-Based Scheduling Algorithm with Learning Science Enhancements

This module implements the refined scheduling algorithm that:
- Operates on calendar_events instead of tasks
- Treats all existing calendar events as blocking time
- Implements 6-hour same-subject spacing
- Adds 10-minute context-switching buffers
- Tracks cumulative study time for smart break insertion
"""

import math
import logging
from collections import deque
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple, Optional

from api.database import supabase
from api.scheduling.event_decomposition import decompose_tasks_to_events

logger = logging.getLogger(__name__)

# Priority-based urgency calculation (hours)
PRIORITY_TIME_HOURS = {
    "high": 24,
    "medium": 72,
    "low": 168,
}


def schedule_events(
    user_id: int,
    tasks: list[Dict],
    start_date: datetime,
    end_date: datetime,
    settings: dict,
    db = None
) -> List[dict]:
    """
    Main scheduling function - assigns start/end times to tasks by creating calendar events.
    
    Args:
        user_id: User ID
        tasks: List of task dictionaries to schedule
        start_date: Start of scheduling window (UTC)
        end_date: End of scheduling window (UTC)
        settings: User settings including energy_levels, wake_time, sleep_time
        db: Database connection (defaults to supabase)
    
    Returns:
        List of scheduled events with start_time and end_time set
    """
    if db is None:
        db = supabase
    
    try:
        # PHASE 1: Find empty time slots around existing events
        empty_slots = get_empty_time_slots(user_id, start_date, end_date, settings, db)
        energy_sorted_slots = assign_energy_and_sort(empty_slots, settings.get("energy_levels", {}))
        
        # PHASE 2: Decompose tasks into events with complete schema
        events = decompose_tasks_to_events(tasks, settings)
        
        if not events:
            logger.warning(f"No valid events created from {len(tasks)} tasks")
            return []
        
        # Batch fetch all task data to avoid N+1 queries
        task_ids = list(set(e.get("task_id") for e in events if e.get("task_id")))
        tasks_map = {}
        if task_ids:
            try:
                tasks_response = db.table("tasks").select("*").in_("id", task_ids).execute()
                tasks_map = {t["id"]: t for t in (tasks_response.data or [])}
            except Exception as e:
                logger.error(f"Failed to batch fetch tasks: {e}")
        
        # Group by subject and calculate importance
        subject_buckets = group_events_by_subject(events, tasks_map)
        calculate_importance_for_all_events(subject_buckets, tasks_map, db)
        sort_events_within_each_bucket(subject_buckets)
        
        # PHASE 3: Assign events to slots with interleaving
        scheduled_events = assign_events_to_slots(subject_buckets, energy_sorted_slots, settings, db)
        
        # Return scheduled events (to be inserted by caller)
        return scheduled_events
        
    except Exception as e:
        logger.error(f"Error in schedule_events: {e}")
        raise


def get_empty_time_slots(
    user_id: int,
    start_date: datetime,
    end_date: datetime,
    settings: dict,
    db
) -> List[Tuple[datetime, float]]:
    """
    Find empty time slots by treating all existing calendar events as blocked time.
    Only considers events that start after 'now'.
    
    Returns:
        List of (slot_start_time, duration_hours) tuples
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Get all calendar events that start after now (all events are treated as blocking time)
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
            wake_time_str = settings.get("wake_time", "07:00")
            sleep_time_str = settings.get("sleep_time", "23:00")
            wake_hour, wake_min = map(int, wake_time_str.split(":"))
            sleep_hour, sleep_min = map(int, sleep_time_str.split(":"))
        except (ValueError, AttributeError) as e:
            logger.warning(f"Invalid wake/sleep time format: {e}, using defaults")
            wake_hour, wake_min = 7, 0
            sleep_hour, sleep_min = 23, 0
        
        min_study_minutes = settings.get("min_study_duration", 15)
        
        # Generate daily slots for the entire date range
        current_date = max(now, start_date).date()
        end_date_only = end_date.date()
        
        while current_date <= end_date_only:
            # Daily wake and sleep times
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
                first_event = day_events[0]
                if day_start < first_event["start_time"]:
                    gap_minutes = (first_event["start_time"] - day_start).total_seconds() / 60
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
                last_event = day_events[-1]
                if last_event["end_time"] < day_end:
                    gap_minutes = (day_end - last_event["end_time"]).total_seconds() / 60
                    if gap_minutes >= min_study_minutes:
                        empty_slots.append((last_event["end_time"], gap_minutes / 60))
            
            current_date += timedelta(days=1)
        
        return empty_slots
        
    except Exception as e:
        logger.error(f"Error in get_empty_time_slots: {e}")
        return []


def assign_energy_and_sort(
    empty_slots: List[Tuple[datetime, float]],
    energy_levels: dict
) -> List[Tuple[datetime, float, float]]:
    """
    Calculate average energy for each slot and sort by energy descending.
    
    Args:
        empty_slots: List of (start_time, duration_hours)
        energy_levels: JSONB like {"8": 0.3, "9": 0.5, ..., "23": 0.8}
    
    Returns:
        List of (start_time, duration_hours, avg_energy) sorted by energy
    """
    slots_with_energy = []
    
    for start_time, duration_hours in empty_slots:
        hour_of_day = start_time.hour
        end_hour = (start_time + timedelta(hours=duration_hours)).hour
        
        # Average energy during this slot
        energy_sum = 0
        hour_count = 0
        
        for h in range(hour_of_day, end_hour + 1):
            hour_key = str(h)
            if hour_key in energy_levels:
                energy_sum += energy_levels[hour_key]
                hour_count += 1
        
        avg_energy = energy_sum / hour_count if hour_count > 0 else 0.5
        slots_with_energy.append((start_time, duration_hours, avg_energy))
    
    # Sort by energy descending (best slots first)
    return sorted(slots_with_energy, key=lambda x: x[2], reverse=True)


def group_events_by_subject(events: List[dict], tasks_map: dict) -> Dict[str, List[dict]]:
    """
    Group events by subject for interleaving.
    Uses pre-fetched tasks_map to avoid N+1 queries.
    
    Returns:
        dict of {subject: [events]}
    """
    buckets = {}
    
    for event in events:
        subject = event.get("subject") or "uncategorized"
        
        if subject not in buckets:
            buckets[subject] = []
        
        # Duration already set in event_decomposition (in minutes)
        duration_minutes = event.get("duration_minutes", 45)
        event["duration_minutes"] = duration_minutes
        
        buckets[subject].append(event)
    
    return buckets


def calculate_importance_for_all_events(subject_buckets: Dict[str, List[dict]], tasks_map: dict, db):
    """Calculate importance score for all events (modifies in-place). Uses tasks_map to avoid N+1 queries."""
    for subject, events in subject_buckets.items():
        for event in events:
            event["importance"] = calculate_event_importance(event, tasks_map, db)


def calculate_event_importance(event: dict, tasks_map: dict, db) -> float:
    """
    Calculate importance score with implicit review boost.
    Uses pre-fetched tasks_map to avoid database queries.
    
    Returns:
        Importance score (higher = more important)
    """
    # Base urgency from priority
    priority = event.get("priority", "medium")
    hours = PRIORITY_TIME_HOURS.get(priority, 72)
    urgency = (1 / hours) * 1000
    
    # Difficulty from parent task (use cached tasks_map)
    difficulty = 5
    task_id = event.get("task_id")
    if task_id and task_id in tasks_map:
        difficulty = tasks_map[task_id].get("difficulty", 5)
    
    difficulty_score = math.log(1 + difficulty) * 20
    
    # IMPLICIT REVIEW BOOST
    review_boost = 0
    if event.get("event_type") == "review" and task_id:
        try:
            review_response = db.table("review_sessions") \
                .select("scheduled_date") \
                .eq("task_id", task_id) \
                .order("scheduled_date", desc=True) \
                .limit(1) \
                .execute()
            
            if review_response.data:
                scheduled_date = datetime.fromisoformat(review_response.data[0]["scheduled_date"].replace("Z", "+00:00"))
                days_overdue = max(0, (datetime.now(timezone.utc) - scheduled_date).days)
                review_boost = days_overdue * 100
        except Exception as e:
            logger.warning(f"Failed to fetch review session for task {task_id}: {e}")
    
    return urgency + difficulty_score + review_boost


def sort_events_within_each_bucket(subject_buckets: Dict[str, List[dict]]):
    """Sort events within each subject by importance (modifies in-place)."""
    for subject, events in subject_buckets.items():
        events.sort(key=lambda e: e.get("importance", 0), reverse=True)


def assign_events_to_slots(
    subject_buckets: Dict[str, List[dict]],
    energy_sorted_slots: List[Tuple[datetime, float, float]],
    settings: dict,
    db
) -> List[dict]:
    """
    Core interleaving algorithm with spacing and break logic.
    
    Returns:
        List of scheduled events (including breaks) with start_time and end_time
    """
    scheduled_events = []
    
    # Convert to queues
    subject_queues = {subject: deque(events) for subject, events in subject_buckets.items()}
    subject_names = list(subject_queues.keys())
    
    if not subject_names:
        return []
    
    # Tracking
    subject_last_time = {}
    current_subject_idx = 0
    previous_subject = None
    cumulative_study_time = 0  # Track for break logic
    
    # Settings with defaults
    max_study_duration = settings.get("max_study_duration", 90)
    short_break = settings.get("short_break", 5)
    long_break = settings.get("long_break", 25)
    long_study_threshold = settings.get("long_study_threshold", 120)
    
    # Iterate through slots (best energy first)
    for slot_start_time, slot_duration_hours, energy in energy_sorted_slots:
        remaining_minutes = slot_duration_hours * 60
        current_time = slot_start_time
        
        while remaining_minutes > 0 and any(len(q) > 0 for q in subject_queues.values()):
            scheduled_this_round = False
            attempts = 0
            
            # Round-robin through subjects
            while attempts < len(subject_names) and not scheduled_this_round:
                subject = subject_names[current_subject_idx]
                
                # Skip if no events for this subject
                if not subject_queues[subject]:
                    current_subject_idx = (current_subject_idx + 1) % len(subject_names)
                    attempts += 1
                    continue
                
                # Check 6-hour spacing constraint
                if subject in subject_last_time:
                    hours_since = (current_time - subject_last_time[subject]).total_seconds() / 3600
                    
                    if hours_since < 6:
                        # Too soon! Try next subject
                        current_subject_idx = (current_subject_idx + 1) % len(subject_names)
                        attempts += 1
                        continue
                
                # Can schedule this subject!
                event = subject_queues[subject][0]
                
                # Context switching buffer (10 minutes)
                if previous_subject is not None and previous_subject != subject and remaining_minutes >= 10:
                    # Add break event to return array (not DB)
                    scheduled_events.append({
                        "user_id": event["user_id"],
                        "title": "Context Switch",
                        "event_type": "break",
                        "source": "scheduler",
                        "start_time": current_time,
                        "end_time": current_time + timedelta(minutes=10),
                        "color_hex": "#95A5A6"  # Neutral gray for breaks
                    })
                    
                    current_time += timedelta(minutes=10)
                    remaining_minutes -= 10
                
                # Schedule the event
                duration_to_schedule = min(
                    event["duration_minutes"],
                    remaining_minutes,
                    max_study_duration
                )
                
                # Create event payload matching schema
                scheduled_events.append({
                    "user_id": event["user_id"],
                    "task_id": event.get("task_id"),
                    "title": event.get("title", "Study Session"),
                    "description": event.get("description"),
                    "start_time": current_time,
                    "end_time": current_time + timedelta(minutes=duration_to_schedule),
                    "event_type": event.get("event_type", "study"),
                    "source": "scheduler",
                    "priority": event.get("priority"),
                    "subject": event.get("subject"),
                    "color_hex": event.get("color_hex")
                })
                
                # Update state
                event["duration_minutes"] -= duration_to_schedule
                current_time += timedelta(minutes=duration_to_schedule)
                remaining_minutes -= duration_to_schedule
                
                # Remove if fully scheduled
                if event["duration_minutes"] <= 0:
                    subject_queues[subject].popleft()
                
                # Update tracking
                subject_last_time[subject] = current_time
                previous_subject = subject
                current_subject_idx = (current_subject_idx + 1) % len(subject_names)
                scheduled_this_round = True
                
                # Track cumulative study time for break logic
                cumulative_study_time += duration_to_schedule
                
                # Insert appropriate break based on cumulative study time
                should_insert_break = remaining_minutes >= short_break
                
                if should_insert_break:
                    # Long break after extended study (threshold exceeded)
                    if cumulative_study_time >= long_study_threshold:
                        if remaining_minutes >= long_break:
                            scheduled_events.append({
                                "user_id": event["user_id"],
                                "title": "Long Break",
                                "event_type": "break",
                                "source": "scheduler",
                                "start_time": current_time,
                                "end_time": current_time + timedelta(minutes=long_break),
                                "color_hex": "#95A5A6"  # Neutral gray for breaks
                            })
                            
                            current_time += timedelta(minutes=long_break)
                            remaining_minutes -= long_break
                            cumulative_study_time = 0  # Reset after long break
                    
                    # Short break for regular study sessions
                    else:
                        scheduled_events.append({
                            "user_id": event["user_id"],
                            "title": "Short Break",
                            "event_type": "break",
                            "source": "scheduler",
                            "start_time": current_time,
                            "end_time": current_time + timedelta(minutes=short_break),
                            "color_hex": "#95A5A6"  # Neutral gray for breaks
                        })
                        
                        current_time += timedelta(minutes=short_break)
                        remaining_minutes -= short_break
            
            # Couldn't schedule anything this round, move to next slot
            if not scheduled_this_round:
                break
    
    return scheduled_events
