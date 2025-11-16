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

async def schedule_tasks(tasks, user_id, start_date, end_date, settings, db):

    empty_slots = await get_empty_slots(user_id, start_date, end_date, settings.min_study_duration, settings.max_study_duration, settings.break_duration, db)
    energy_values = get_energy_values(settings.energy_plot, empty_slots)
    sorted_empty_slots  = sort_by_energy_values(empty_slots, energy_values)
    schedule = schedule_tasks_with_energy_ranking(tasks, sorted_empty_slots, 
                                                  settings.min_study_duration,
                                                  settings.max_study_duration_before_break,
                                                  settings.break_duration)

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

    # get calendar events using existing route function
    result = await get_calendar_events(
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
