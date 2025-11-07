# routes/tasks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from api.database import get_db
from api.models import Task
from api.schemas import TaskCreate, TaskUpdate, TaskOut
from datetime import datetime, timedelta, timezone

router = APIRouter()

# Get all tasks with optional filters
@router.get("/", response_model=List[TaskOut])
def get_tasks(
    scheduled: bool = None,  # None=all, True=scheduled, False=unscheduled
    completed: bool = None,  # filter by review_count > 0
    difficulty: int = None,  # filter by specific difficulty
    sort_by: str = "due_date",  # due_date, difficulty, review_count
    db: Session = Depends(get_db)
):
    """
    get tasks with optional filters

    filters:
    - scheduled: None (all), True (scheduled only), False (unscheduled only)
    - completed: None (all), True (completed), False (not completed)
    - difficulty: filter by difficulty level (1-5)
    - sort_by: sort tasks by due_date, difficulty, or review_count
    """
    from api.models import CalendarEvent

    query = db.query(Task)

    # filter by scheduled status
    if scheduled is not None:
        if scheduled:
            query = query.filter(Task.scheduled_start != None)
        else:
            query = query.filter(Task.scheduled_start == None)

    # filter by completion status
    if completed is not None:
        if completed:
            query = query.filter(Task.review_count > 0)
        else:
            query = query.filter(Task.review_count == 0)

    # filter by difficulty
    if difficulty is not None:
        query = query.filter(Task.difficulty == difficulty)

    # get results
    tasks = query.all()

    # sort tasks
    if sort_by == "due_date":
        tasks = sorted(tasks, key=lambda t: t.due_date)
    elif sort_by == "difficulty":
        tasks = sorted(tasks, key=lambda t: t.difficulty, reverse=True)
    elif sort_by == "review_count":
        tasks = sorted(tasks, key=lambda t: t.review_count)

    # attach associated calendar events to each task
    from api.utils.timezone import naive_utc_to_iso_z

    result = []
    for task in tasks:
        events = db.query(CalendarEvent).filter(CalendarEvent.task_id == task.id).all()
        task_dict = TaskOut.model_validate(task).model_dump()

        # convert datetime fields to ISO 8601 with Z
        task_dict['due_date'] = naive_utc_to_iso_z(task.due_date)
        task_dict['scheduled_start'] = naive_utc_to_iso_z(task.scheduled_start) if task.scheduled_start else None
        task_dict['scheduled_end'] = naive_utc_to_iso_z(task.scheduled_end) if task.scheduled_end else None

        task_dict['events'] = [
            {
                'id': e.id,
                'title': e.title,
                'start_time': naive_utc_to_iso_z(e.start_time),
                'end_time': naive_utc_to_iso_z(e.end_time),
                'event_type': e.event_type,
                'source': e.source
            }
            for e in events
        ]
        result.append(task_dict)

    return result

# Get single task by ID
@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": db_task}

# Create new task
@router.post("/", response_model=TaskOut, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):

    from api.services.consts import DEFAULT_DUE_DATE_DAYS
    from datetime import timedelta

    # unpack the data
    task_data = task.model_dump()

    # enforce the due date
    if not task_data.get("due_date"):
        # default due date as naive UTC
        task_data["due_date"] = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=DEFAULT_DUE_DATE_DAYS)
    elif isinstance(task_data["due_date"], datetime) and task_data["due_date"].tzinfo:
        # convert aware datetime to naive UTC for storage
        task_data["due_date"] = task_data["due_date"].astimezone(timezone.utc).replace(tzinfo=None)

    # convert scheduled_start and scheduled_end if timezone-aware
    if task_data.get("scheduled_start") and isinstance(task_data["scheduled_start"], datetime) and task_data["scheduled_start"].tzinfo:
        task_data["scheduled_start"] = task_data["scheduled_start"].astimezone(timezone.utc).replace(tzinfo=None)
    if task_data.get("scheduled_end") and isinstance(task_data["scheduled_end"], datetime) and task_data["scheduled_end"].tzinfo:
        task_data["scheduled_end"] = task_data["scheduled_end"].astimezone(timezone.utc).replace(tzinfo=None)

    # repack the data
    db_task = Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task

# Update task
@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    from api.models import CalendarEvent

    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # convert timezone-aware datetimes to naive UTC before setting
    task_updates = task.model_dump(exclude_unset=True)
    for field, value in task_updates.items():
        if field in ['due_date', 'scheduled_start', 'scheduled_end'] and isinstance(value, datetime) and value.tzinfo:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        setattr(db_task, field, value)

    # update associated calendar events to match task changes
    if db_task.scheduled_start and db_task.scheduled_end:
        calendar_events = db.query(CalendarEvent).filter(
            CalendarEvent.task_id == task_id
        ).all()

        for event in calendar_events:
            event.title = db_task.topic
            event.start_time = db_task.scheduled_start
            event.end_time = db_task.scheduled_end
            if db_task.description:
                event.description = f"Study session for {db_task.topic}"

    db.commit()
    db.refresh(db_task)
    return db_task

# Delete task
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}


# Mark task as completed
@router.post("/{task_id}/complete", response_model=TaskOut)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db_task.review_count += 1
    db_task.last_studied = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(db_task)
    return db_task
