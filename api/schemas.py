# schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TaskCreate(BaseModel):
    """schema for creating a new task"""
    user_id: int
    topic: str
    estimated_minutes: int
    difficulty: Optional[int] = 3
    due_date: Optional[datetime] = None  # will default to 7 days from now if not provided
    description: Optional[str] = None
    source_text: Optional[str] = None
    confidence_score: Optional[float] = 1.0
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: Optional[str] = "unscheduled"

class TaskUpdate(BaseModel):
    """schema for updating a task"""
    topic: Optional[str] = None
    estimated_minutes: Optional[int] = None
    difficulty: Optional[int] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None

class TaskOut(BaseModel):
    """schema for task output"""
    id: int
    user_id: int
    topic: str
    estimated_minutes: int
    difficulty: int
    due_date: datetime
    description: Optional[str] = None
    status: str
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    review_count: int
    confidence_score: float

    class Config:
        from_attributes = True  # updated from orm_mode

class CalendarEventCreate(BaseModel):
    """schema for creating a calendar event"""
    title: str
    start_time: datetime
    end_time: datetime
    event_type: str = "study"  # study, rest, break
    description: Optional[str] = None

class CalendarEventUpdate(BaseModel):
    """schema for updating a calendar event"""
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event_type: Optional[str] = None
    description: Optional[str] = None

class CalendarEventOut(BaseModel):
    """schema for calendar event output"""
    id: int
    user_id: int
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    event_type: str
    source: str
    task_id: Optional[int]

    class Config:
        from_attributes = True


class ManualEventCreate(BaseModel):
    """schema for creating a manual calendar event (user-driven)"""
    user_id: int
    title: str
    start_time: datetime
    end_time: datetime
    difficulty: Optional[int] = 3
    estimated_minutes: Optional[int] = None
    description: Optional[str] = None
    event_type: str = "study"
    task_id: Optional[int] = None


class ManualEventUpdate(BaseModel):
    """schema for updating a manual calendar event"""
    user_id: int
    title: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    difficulty: Optional[int] = None
    estimated_minutes: Optional[int] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    task_id: Optional[int] = None

class EnergyProfileUpdate(BaseModel):
    """schema for updating energy profile"""
    due_date_days: Optional[int] = None
    wake_time: Optional[int] = None
    sleep_time: Optional[int] = None
    max_study_duration: Optional[int] = None
    min_study_duration: Optional[int] = None

class EnergyProfileOut(BaseModel):
    """schema for energy profile output"""
    id: int
    user_id: int
    due_date_days: int
    wake_time: int
    sleep_time: int
    max_study_duration: int
    min_study_duration: int
    energy_levels: Optional[str] = None

    class Config:
        from_attributes = True
