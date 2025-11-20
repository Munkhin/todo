# schedules the tasks for maximum studying efficiency
# usage:
# when there is a conflict, reschedule everything
# when theres many tasks

import numpy as np
import math
from collections import deque
from datetime import datetime, timezone, timedelta

PRIORITY_TIME_HOURS = {
    "high": 24,      # roughly 1 day horizon
    "medium": 72,    # roughly 3 days
    "low": 168,      # roughly 1 week
}

DEFAULT_PRIORITY = "medium"


def normalize_priority(value):
    if not value:
        return DEFAULT_PRIORITY
    value = value.lower()
    return value if value in PRIORITY_TIME_HOURS else DEFAULT_PRIORITY


async def schedule_tasks(tasks, user_id, start_date, end_date, settings, db, enable_interleaving=False, enable_spaced_repetition=False):
    """
    Main scheduling function with learning science enhancements.
    
    Args:
        tasks: List of tasks to schedule
        user_id: User ID
        start_date, end_date: Scheduling window
        settings: User settings/energy profile
        db: Database connection
        enable_interleaving: If True, alternate between subjects (ABCABC pattern)
        enable_spaced_repetition: If True, include review tasks from SM2 algorithm
    
    Returns:
        List of scheduled events
    """
    # Get empty time slots
    empty_slots = await get_empty_slots(user_id, start_date, end_date, 
                                        settings.min_study_duration, 
                                        settings.max_study_duration, 
                                        settings.break_duration, db)
    
    # Calculate energy values and sort slots
    energy_values = get_energy_values(settings.energy_plot, empty_slots)
    sorted_empty_slots = sort_by_energy_values(empty_slots, energy_values)
    
    # === LEARNING SCIENCE INTEGRATION ===
    
    # 1. Fetch review tasks if spaced repetition is enabled
    all_tasks = tasks.copy()
    if enable_spaced_repetition:
        review_tasks = await get_tasks_due_for_review(user_id, start_date, end_date, db)
        if review_tasks:
            # Add priority boost to overdue reviews
            add_review_priority_boost(review_tasks, datetime.now(timezone.utc))
            all_tasks.extend(review_tasks)
    
    # 2. Apply interleaving if enabled
    if enable_interleaving and all_tasks:
        # Group tasks by subject
        task_groups = group_tasks_by_subject(all_tasks)
        
        # If we have multiple subjects, use interleaving
        if len(task_groups) > 1:
            # Need to add importance first for proper scheduling
            for task in all_tasks:
                if "importance" not in task:
                    add_importance_to_tasks(all_tasks)
                    break
            
            # Apply interleaving pattern
            schedule = apply_interleaving_to_schedule(
                task_groups, 
                sorted_empty_slots,
                settings.min_study_duration,
                settings.max_study_duration_before_break,
                settings.break_duration
            )
        else:
            # Only one subject, use regular scheduling
            schedule = schedule_tasks_with_energy_ranking(
                all_tasks, sorted_empty_slots,
                settings.min_study_duration,
                settings.max_study_duration_before_break,
                settings.break_duration
            )
    else:
        # Standard scheduling without interleaving
        schedule = schedule_tasks_with_energy_ranking(
            all_tasks, sorted_empty_slots,
            settings.min_study_duration,
            settings.max_study_duration_before_break,
            settings.break_duration
        )

    return schedule

# gets [(start, duration) ... ] eg: [(8.0, 2.0), (13.5, 1.5), (19.0, 3.0)]
async def get_empty_slots(user_id, start_date, end_date, min_study_duration, max_study_duration, break_duration, db) -> list[tuple[float, float]]:
    
    # --------------- caching ------------------ #
    if not hasattr(get_empty_slots, "_cache"):
        get_empty_slots._cache = {}

    cache_key = (user_id, start_date, end_date, min_study_duration, max_study_duration, break_duration)
    if cache_key in get_empty_slots._cache:
        return get_empty_slots._cache[cache_key]
    # ---------------------------------------------------------- #

    from api.calendar.event_routes import get_calendar_events
    import asyncio

    # get calendar events using existing route function
    # run in threadpool since get_calendar_events is now sync
    result = await asyncio.to_thread(
        get_calendar_events,
        user_id=user_id,
        start_date=start_date.isoformat() if start_date else None,
        end_date=end_date.isoformat() if end_date else None,
        db=db
    )

    events = result.get("events", [])

    # determine the effective range if not provided
    effective_start = start_date or (datetime.fromisoformat(events[0]["start_time"].replace("Z", "+00:00")) if events else datetime.now())
    effective_end = end_date
    if events:
        last_event_end = datetime.fromisoformat(events[-1]["end_time"].replace("Z", "+00:00"))
        effective_end = max(end_date, last_event_end) if end_date else last_event_end
    else:
        # no events, assume default end of day per day in the range
        effective_end = effective_start + timedelta(days=1) if not end_date else end_date

    empty_slots = []

    # calculate max slot duration in hours
    max_slot_duration = math.ceil((max_study_duration + break_duration) / 60.0)

    # if no events, create empty slots spanning the entire range of days
    if not events:
        total_hours = (effective_end - effective_start).total_seconds() / 3600
        slot_start = effective_start.hour + effective_start.minute / 60.0
        remaining_gap = total_hours
        while remaining_gap >= min_study_duration:
            slot_size = min(max_slot_duration, remaining_gap)
            empty_slots.append((slot_start, slot_size))
            slot_start += slot_size
            remaining_gap -= slot_size
    else:
        # find gaps between events
        for i in range(len(events) - 1):
            current_end = datetime.fromisoformat(events[i]["end_time"].replace("Z", "+00:00"))
            next_start = datetime.fromisoformat(events[i + 1]["start_time"].replace("Z", "+00:00"))

            gap_duration = (next_start - current_end).total_seconds() / 3600
            if gap_duration >= min_study_duration:
                slot_start = current_end.hour + current_end.minute / 60.0
                remaining_gap = gap_duration
                while remaining_gap >= min_study_duration:
                    slot_size = min(max_slot_duration, remaining_gap)
                    empty_slots.append((slot_start, slot_size))
                    slot_start += slot_size
                    remaining_gap -= slot_size

    # save result to cache
    get_empty_slots._cache[cache_key] = empty_slots

    return empty_slots


def get_energy_values(energy_plot: np.array, empty_slots: list[tuple[float, float]]) -> np.array:

    # ---------------  caching ------------------ #
    if not hasattr(get_energy_values, "_cache"):
        get_energy_values._cache = {}

    # convert empty_slots to a tuple of tuples for hashing
    slots_tuple = tuple(empty_slots)
    cache_key = (tuple(energy_plot), slots_tuple)

    # return cached value if found
    if cache_key in get_energy_values._cache:
        return get_energy_values._cache[cache_key]

    # -------------------------------------------- #

    # initialize empty array
    energy_values = []

    for (start_hour, duration) in empty_slots:
        # find the first hourly interval the slot is in
        first_slot = math.floor(start_hour)

        # find the last hourly interval the slot is in
        last_slot = math.ceil(start_hour + duration)

        # average the energy level in this zone
        average_energy = np.mean(energy_plot[first_slot:last_slot])

        energy_values.append(average_energy)
    
    # save result to cache
    get_energy_values._cache[cache_key] = np.array(energy_values)

    return np.array(energy_values)


def sort_by_energy_values(empty_slots: list[tuple[float, float]], energy_values: np.array) -> np.array:
    
    # -> [(slot, energy), ...]
    combined = list(zip(empty_slots, energy_values)) 

    # sort by energy_values in descending order
    combined.sort(key=lambda x: x[1], reverse=True) 

    # return the sorted array of slots
    return [slot for (slot, _) in combined]


def schedule_tasks_with_energy_ranking(tasks, sorted_empty_slots, min_duration, max_duration, break_duration):
    # greedy sorting algorithm 
    # has breaks 
    # has due date sorting then importance sorting
    # maximizes time spent studying 

    # sort tasks by importance(due date(dominant) and difficulty)
    add_importance_to_tasks(tasks)
    sorted_tasks = sorted(tasks, key=lambda t: (t["importance"]), reverse=False)
    
    # turn it into a deque to reduce time complexity 
    sorted_tasks = deque(sorted_tasks)

    schedule = []

    # mapping best empty slot -> best task
    for slot_start, slot_duration in sorted_empty_slots:
        
        # define new variables so slot_start and slot_duration are not altered
        remaining_time = slot_duration
        current_time = slot_start

        while remaining_time > 0 and sorted_tasks:

            # get next most important task
            task = sorted_tasks[0]
            current_time, remaining_time = schedule_task(schedule, task, min_duration, max_duration, current_time, remaining_time)
        

            # if task is finished, remove it
            if task["duration"] == 0:
                sorted_tasks.pop(0)

            # if theres time for a break, insert break
            if remaining_time >= break_duration:
                current_time, remaining_time = insert_break(schedule, min_duration, break_duration, current_time, remaining_time)
    
    return schedule


# ============== Learning Science Enhancements ==============

def group_tasks_by_subject(tasks):
    """
    Group tasks by their subject for interleaving.
    Tasks without subjects are grouped under 'uncategorized'.
    
    Returns: dict of {subject: [tasks]}
    """
    subject_groups = {}
    
    for task in tasks:
        subject = task.get("subject") or "uncategorized"
        if subject not in subject_groups:
            subject_groups[subject] = []
        subject_groups[subject].append(task)
    
    return subject_groups


def apply_interleaving_to_schedule(task_groups, sorted_empty_slots, min_duration, max_duration, break_duration):
    """
    Apply interleaving pattern (ABCABC) across subjects.
    Alternates between different subjects to improve discrimination learning.
    
    Args:
        task_groups: dict of {subject: [tasks]}
        sorted_empty_slots: Available time slots sorted by energy
        min_duration, max_duration, break_duration: Study session parameters
    
    Returns:
        List of scheduled events with interleaved subjects
    """
    # Convert groups to deques for efficient popping
    subject_queues = {subject: deque(tasks) for subject, tasks in task_groups.items()}
    subject_names = list(subject_queues.keys())
    
    if not subject_names:
        return []
    
    schedule = []
    current_subject_index = 0
    
    for slot_start, slot_duration in sorted_empty_slots:
        remaining_time = slot_duration
        current_time = slot_start
        
        while remaining_time > 0 and any(subject_queues.values()):
            # Round-robin through subjects
            attempts = 0
            while attempts < len(subject_names):
                subject = subject_names[current_subject_index]
                
                if subject_queues[subject]:
                    task = subject_queues[subject][0]
                    current_time, remaining_time = schedule_task(
                        schedule, task, min_duration, max_duration, current_time, remaining_time
                    )
                    
                    # Remove task if completed
                    if task["duration"] == 0:
                        subject_queues[subject].popleft()
                    
                    # Move to next subject for interleaving
                    current_subject_index = (current_subject_index + 1) % len(subject_names)
                    
                    # Insert break if there's time
                    if remaining_time >= break_duration:
                        current_time, remaining_time = insert_break(
                            schedule, min_duration, break_duration, current_time, remaining_time
                        )
                    
                    break  # Scheduled a task, exit attempts loop
                else:
                    # This subject has no more tasks, try next subject
                    current_subject_index = (current_subject_index + 1) % len(subject_names)
                    attempts += 1
            
            # If we couldn't schedule anything, break out
            if attempts >= len(subject_names):
                break
    
    return schedule


async def get_tasks_due_for_review(user_id, start_date, end_date, db):
    """
    Fetch tasks that are due for review based on their next_review_date.
    Uses SM2 spaced repetition to determine when reviews should occur.
    
    Args:
        user_id: User ID
        start_date: Start of scheduling window
        end_date: End of scheduling window  
        db: Database connection
    
    Returns:
        List of tasks needing review in the given timeframe
    """
    import asyncio
    
    # Query tasks with next_review_date in the scheduling window
    result = await asyncio.to_thread(
        lambda: db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .gte("next_review_date", start_date.isoformat())
        .lte("next_review_date", end_date.isoformat())
        .execute()
    )
    
    return result.data if result.data else []


def add_review_priority_boost(tasks, current_date):
    """
    Boost the importance of overdue reviews.
    Tasks past their next_review_date get higher priority.
    
    Modifies tasks in-place by adjusting their importance score.
    """
    for task in tasks:
        next_review = task.get("next_review_date")
        
        if next_review:
            # Parse review date
            if isinstance(next_review, str):
                from dateutil import parser
                next_review = parser.parse(next_review)
            
            # Calculate days overdue
            days_overdue = (current_date - next_review).days
            
            if days_overdue > 0:
                # Add urgency boost: 100 points per day overdue
                if "importance" not in task:
                    task["importance"] = 0
                
                task["importance"] += days_overdue * 100
                task["is_review"] = True  # Mark as review task

# ============== End Learning Science Enhancements ==============


def add_importance_to_tasks(tasks):
    for task in tasks:
        priority = normalize_priority(task.get("priority"))
        task["priority"] = priority
        time_left = PRIORITY_TIME_HOURS[priority]

        difficulty = task.get("difficulty", 3)

        task["importance"] = (1 / time_left) * 1000 + math.log1p(difficulty)


def schedule_task(schedule, task, min_duration, max_duration, current_time, remaining_time):
    task_duration = task["duration"]

    # cap by max study duration (for breaks)
    effective_duration = min(task_duration, max_duration, remaining_time)

    # to avoid splits like 1h45min | 15 min:
    leftover = task_duration - effective_duration
    if 0 < leftover < min_duration:

        # enforce leftover >= min_duration
        leftover = min_duration

        effective_duration = task_duration - leftover

    priority = normalize_priority(task.get("priority"))

    # concordant with EVENT_SCHEMA from consts.py
    schedule.append({
            "user_id": task.get("user_id"),
            "title": task.get("description", "Study Session"),
            "description": task.get("description"),
            "start_time": datetime.now(timezone.utc).replace(hour=int(current_time), minute=int((current_time % 1) * 60)).isoformat(),
            "end_time": datetime.now(timezone.utc).replace(hour=int(current_time + effective_duration), minute=int(((current_time + effective_duration) % 1) * 60)).isoformat(),
            "event_type": "study",
            "priority": priority,
            "source": "scheduler",
            "task_id": task.get("task_id")
        })

    # remaining amounts of time after task subsession
    current_time += effective_duration
    remaining_time -= effective_duration
    task["duration"] -= effective_duration

    return current_time, remaining_time


def insert_break(schedule, min_duration, break_duration, current_time, remaining_time):
    # if the remaining time is not enough for a study session,
    if remaining_time <= min_duration:
        break_time = remaining_time # take all remaining time

    else:
        break_time = break_duration # standard break duration

        # concordant with EVENT_SCHEMA from consts.py
        schedule.append({
            "user_id": None,
            "title": "Break",
            "description": None,
            "start_time": datetime.now(timezone.utc).replace(hour=int(current_time), minute=int((current_time % 1) * 60)).isoformat(),
            "end_time": datetime.now(timezone.utc).replace(hour=int(current_time + break_time), minute=int(((current_time + break_time) % 1) * 60)).isoformat(),
            "event_type": "break",
            "priority": "low",  # breaks are low priority
            "source": "scheduler",
            "task_id": None
        })

    # remaining time after the break addition
    current_time += break_time
    remaining_time -= break_time

    return current_time, remaining_time
