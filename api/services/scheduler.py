from datetime import datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from api.models import Task, CalendarEvent
from api.schemas import CalendarEventCreate
from api.services.consts import get_user_constants
import math
from functools import lru_cache
import hashlib
import json

def schedule_tasks(user_id: int, db: Session):
    """schedule tasks for a user based on their energy profile and available time"""

    # get user-specific constants from database
    consts = get_user_constants(user_id, db)

    # get the unscheduled tasks
    from api.routes.task_routes import get_tasks
    unscheduled_tasks = get_tasks(scheduled=False, db=db)

    # split if too long
    for task in unscheduled_tasks[:]:  # iterate over copy
        if task.estimated_minutes > consts['MAX_STUDY_DURATION']:
            new_tasks = split_tasks(task, consts, db)
            unscheduled_tasks.remove(task)  # remove original
            unscheduled_tasks.extend(new_tasks)  # add split tasks

    # get the old scheduled tasks
    scheduled_tasks = get_tasks(scheduled=True, db=db)

    # case 1: no new tasks and no conflicts - do nothing
    if not unscheduled_tasks and not detect_conflicts(user_id, scheduled_tasks, db):
        # fetch existing scheduled events to return
        existing_events = db.query(CalendarEvent).filter(
            CalendarEvent.user_id == user_id,
            CalendarEvent.source == "system"
        ).order_by(CalendarEvent.start_time).all()

        return {
            "scheduled_count": 0,
            "total_tasks": len(scheduled_tasks),
            "unscheduled_count": 0,
            "message": "No new tasks and no conflicts, schedule is valid",
            "events": existing_events
        }

    # case 2: new tasks but no conflicts - incremental scheduling (optimistic)
    if unscheduled_tasks and not detect_conflicts(user_id, scheduled_tasks, db):
        # get time blocks considering all existing events
        time_blocks = get_time_blocks(user_id, unscheduled_tasks, consts, db)

        # schedule only new tasks with optimistic update
        result = reschedule_optimistic(unscheduled_tasks, time_blocks, user_id, consts, db)
        result["message"] = "Incremental scheduling: new tasks added without rescheduling existing"
        return result

    # case 3: conflicts detected - full reschedule needed (optimistic)
    # unschedule all old events first
    unschedule_old_events(db)

    # combine all tasks for rescheduling
    all_tasks = unscheduled_tasks + scheduled_tasks

    # get time blocks for full reschedule
    time_blocks = get_time_blocks(user_id, all_tasks, consts, db)

    # reschedule all tasks with optimistic update
    result = reschedule_optimistic(all_tasks, time_blocks, user_id, consts, db)
    result["message"] = "Full reschedule: conflicts detected"

    return result


def detect_conflicts(user_id: int, scheduled_tasks: List[Task], db: Session) -> bool:
    """
    detect if existing scheduled tasks have conflicts requiring full reschedule

    returns True if conflicts exist (full reschedule needed), False otherwise

    conflict scenarios:
    - user-created calendar events overlap with system events
    - tasks scheduled in the past (missed deadlines)
    - scheduled tasks have due dates that passed
    """
    if not scheduled_tasks:
        return False

    now = datetime.now()

    # get all user-created events in the scheduling window
    earliest_scheduled = min(task.scheduled_start for task in scheduled_tasks if task.scheduled_start)
    latest_scheduled = max(task.scheduled_end for task in scheduled_tasks if task.scheduled_end)

    user_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.source == "user",
        CalendarEvent.start_time >= earliest_scheduled,
        CalendarEvent.end_time <= latest_scheduled
    ).all()

    # check for overlaps between user events and scheduled tasks
    for task in scheduled_tasks:
        if not task.scheduled_start or not task.scheduled_end:
            continue

        for user_event in user_events:
            # check if intervals overlap
            if (task.scheduled_start < user_event.end_time and
                task.scheduled_end > user_event.start_time):
                return True

    # check for tasks scheduled in the past
    for task in scheduled_tasks:
        if task.scheduled_start and task.scheduled_start < now:
            return True

    # check for tasks with due dates that passed
    for task in scheduled_tasks:
        if task.due_date < now:
            return True

    return False


def split_tasks(original_task: Task, consts: Dict, db: Session) -> List[Task]:
    """split large task into smaller subtasks with batched operations"""

    num_new_tasks = math.ceil(original_task.estimated_minutes / consts['MIN_STUDY_DURATION'])
    subtask_duration = original_task.estimated_minutes // num_new_tasks

    new_tasks = []
    for i in range(num_new_tasks):
        # create subtask object (not yet committed)
        new_task = Task(
            topic=f"{original_task.topic} - Part {i+1}",
            estimated_minutes=subtask_duration,
            difficulty=original_task.difficulty,
            due_date=original_task.due_date,
            user_id=original_task.user_id
        )
        db.add(new_task)
        new_tasks.append(new_task)

    # delete original task
    db.delete(original_task)

    # batch commit all operations at once
    db.flush()  # flush to get IDs without full commit

    return new_tasks


def get_time_blocks(user_id: int, tasks: List[Task], consts: Dict, db: Session) -> List[Dict]:
    """
    generate available time blocks up to the last task due date
    optimized: batch query all events upfront, O(n) processing
    """
    WAKE_TIME = consts['WAKE_TIME']
    SLEEP_TIME = consts['SLEEP_TIME']
    ENERGY_LEVELS = consts['ENERGY_LEVELS']
    MIN_DURATION = consts['MIN_STUDY_DURATION']

    time_blocks = []
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    if not tasks:
        return []

    latest_due_date = max(task.due_date for task in tasks)
    lookahead_days = max(1, (latest_due_date - start_date).days + 1)

    # batch fetch all events in date range (single query instead of per-day)
    range_start = start_date.replace(hour=WAKE_TIME, minute=0)
    range_end = (start_date + timedelta(days=lookahead_days)).replace(hour=SLEEP_TIME, minute=0)

    all_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user_id,
        CalendarEvent.start_time >= range_start,
        CalendarEvent.end_time <= range_end
    ).order_by(CalendarEvent.start_time).all()

    # group events by day for O(1) lookup
    events_by_day = {}
    for event in all_events:
        day_key = event.start_time.date()
        if day_key not in events_by_day:
            events_by_day[day_key] = []
        events_by_day[day_key].append(event)

    # process each day
    for day_offset in range(lookahead_days):
        current_day = start_date + timedelta(days=day_offset)
        day_key = current_day.date()
        day_start = current_day.replace(hour=WAKE_TIME, minute=0)
        day_end = current_day.replace(hour=SLEEP_TIME, minute=0)

        existing_events = events_by_day.get(day_key, [])
        current_time = day_start

        if not existing_events:
            # entire day available - create hourly blocks
            for hour in range(WAKE_TIME, SLEEP_TIME):
                block_start = current_day.replace(hour=hour, minute=0)
                block_end = block_start + timedelta(hours=1)
                time_blocks.append({
                    'start_time': block_start,
                    'end_time': block_end,
                    'available_minutes': 60,
                    'energy_level': ENERGY_LEVELS.get(hour, 5)
                })
        else:
            # fill gaps between events
            for event in existing_events:
                if current_time < event.start_time:
                    gap_minutes = int((event.start_time - current_time).total_seconds() / 60)
                    if gap_minutes >= MIN_DURATION:
                        time_blocks.append({
                            'start_time': current_time,
                            'end_time': event.start_time,
                            'available_minutes': gap_minutes,
                            'energy_level': ENERGY_LEVELS.get(current_time.hour, 5)
                        })
                current_time = max(current_time, event.end_time)

            # block after last event
            if current_time < day_end:
                gap_minutes = int((day_end - current_time).total_seconds() / 60)
                if gap_minutes >= MIN_DURATION:
                    time_blocks.append({
                        'start_time': current_time,
                        'end_time': day_end,
                        'available_minutes': gap_minutes,
                        'energy_level': ENERGY_LEVELS.get(current_time.hour, 5)
                    })

    return time_blocks


def unschedule_old_events(db: Session):
    """reset all task schedules and delete system calendar events"""
    # reset all task schedules (bulk update)
    db.query(Task).filter(Task.scheduled_start != None).update({
        "scheduled_start": None,
        "scheduled_end": None
    })

    # delete all system-generated calendar events
    db.query(CalendarEvent).filter(
        CalendarEvent.source == "system"
    ).delete()

    db.commit()


def reschedule_optimistic(tasks: List[Task], time_blocks: List[Dict], user_id: int, consts: Dict, db: Session) -> Dict:
    """
    optimistic reschedule: returns events with IDs immediately, commits async
    assigns harder tasks to higher energy blocks
    returns created calendar events for immediate frontend use
    """
    # sort time blocks by energy level (highest first)
    sorted_blocks = sorted(time_blocks, key=lambda b: b['energy_level'], reverse=True)

    # sort tasks by difficulty (hardest first)
    sorted_tasks = sorted(tasks, key=lambda t: t.difficulty, reverse=True)

    # collect created events
    created_events = []
    scheduled_count = 0

    # assign tasks to time blocks
    for task in sorted_tasks:
        # find first available block that fits this task
        for block in sorted_blocks:
            if block['available_minutes'] >= task.estimated_minutes:
                # schedule task in this block
                start_time = block['start_time']
                end_time = start_time + timedelta(minutes=task.estimated_minutes)

                # update task
                task.scheduled_start = start_time
                task.scheduled_end = end_time

                # create calendar event
                calendar_event = CalendarEvent(
                    user_id=user_id,
                    title=task.topic,
                    description=f"Study session for {task.topic}",
                    start_time=start_time,
                    end_time=end_time,
                    event_type="study",
                    source="system",
                    task_id=task.id
                )
                db.add(calendar_event)
                created_events.append(calendar_event)

                # reduce available time in this block
                block['available_minutes'] -= task.estimated_minutes
                block['start_time'] = end_time  # move block start forward

                scheduled_count += 1
                break

    # flush to get IDs without committing (optimistic update)
    db.flush()

    # refresh events to get IDs immediately
    for event in created_events:
        db.refresh(event)

    # NOTE: commit happens in background via BackgroundTasks

    return {
        "scheduled_count": scheduled_count,
        "total_tasks": len(tasks),
        "unscheduled_count": len(tasks) - scheduled_count,
        "events": created_events
    }

def commit_schedule_async(db: Session):
    """async commit for optimistic updates"""
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing schedule: {str(e)}")
        raise

def reschedule(tasks: List[Task], time_blocks: List[Dict], user_id: int, consts: Dict, db: Session) -> Dict:
    """
    DEPRECATED: Use reschedule_optimistic instead
    synchronous reschedule - kept for backwards compatibility
    """
    # sort time blocks by energy level (highest first)
    sorted_blocks = sorted(time_blocks, key=lambda b: b['energy_level'], reverse=True)

    # sort tasks by difficulty (hardest first)
    sorted_tasks = sorted(tasks, key=lambda t: t.difficulty, reverse=True)

    # collect created events
    created_events = []
    scheduled_count = 0

    # assign tasks to time blocks
    for task in sorted_tasks:
        # find first available block that fits this task
        for block in sorted_blocks:
            if block['available_minutes'] >= task.estimated_minutes:
                # schedule task in this block
                start_time = block['start_time']
                end_time = start_time + timedelta(minutes=task.estimated_minutes)

                # update task
                task.scheduled_start = start_time
                task.scheduled_end = end_time

                # create calendar event
                calendar_event = CalendarEvent(
                    user_id=user_id,
                    title=task.topic,
                    description=f"Study session for {task.topic}",
                    start_time=start_time,
                    end_time=end_time,
                    event_type="study",
                    source="system",
                    task_id=task.id
                )
                db.add(calendar_event)
                created_events.append(calendar_event)

                # reduce available time in this block
                block['available_minutes'] -= task.estimated_minutes
                block['start_time'] = end_time  # move block start forward

                scheduled_count += 1
                break

    db.commit()

    # refresh events to get IDs and timestamps
    for event in created_events:
        db.refresh(event)

    return {
        "scheduled_count": scheduled_count,
        "total_tasks": len(tasks),
        "unscheduled_count": len(tasks) - scheduled_count,
        "events": created_events
    }
