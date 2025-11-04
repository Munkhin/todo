"""
schedule routes for running scheduling algorithm and managing schedules
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from api.database import get_db
from api.services.scheduler import schedule_tasks, commit_schedule_async
from api.services.consts import DEFAULT_DUE_DATE_DAYS
from api.schemas import CalendarEventOut
from datetime import datetime, timezone

router = APIRouter()

# request/response models
class ScheduleRequest(BaseModel):
    user_id: int

@router.post("/generate")
async def generate_schedule(
    request: ScheduleRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """generate the study schedule for the user based on unscheduled tasks (optimistic update)"""
    try:
        result = schedule_tasks(request.user_id, db)

        # serialize events to UTC ISO8601
        def _to_utc_iso(dt: datetime) -> str:
            if dt.tzinfo is None:
                local_tz = datetime.now().astimezone().tzinfo
                dt = dt.replace(tzinfo=local_tz)
            return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

        def _serialize_event_utc(ev) -> dict:
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
                "source": getattr(ev, 'source', 'system'),
                "task_id": ev.task_id,
            }

        events_data = [_serialize_event_utc(event) for event in result.get("events", [])]

        # commit to database asynchronously (optimistic update)
        background_tasks.add_task(commit_schedule_async, db)

        return {
            "message": result.get("message", "Schedule generated successfully"),
            "scheduled_count": result["scheduled_count"],
            "total_tasks": result["total_tasks"],
            "unscheduled_count": result["unscheduled_count"],
            "events": events_data,
            "optimistic": True  # flag to indicate optimistic update
        }
    except Exception as e:
        import traceback
        print(f"ERROR in /generate: {str(e)}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating schedule: {str(e)}")

@router.get("/energy-profile")
async def get_energy_profile(user_id: int, db: Session = Depends(get_db)):
    """get user's energy profile"""
    try:
        from api.models import EnergyProfile
        import traceback

        profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
        if not profile:
            # create default profile if not found
            profile = EnergyProfile(user_id=user_id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        return {
            "due_date_days": profile.due_date_days if profile.due_date_days is not None else DEFAULT_DUE_DATE_DAYS,
            "wake_time": profile.wake_time,
            "sleep_time": profile.sleep_time,
            "max_study_duration": profile.max_study_duration,
            "min_study_duration": profile.min_study_duration,
            "energy_levels": profile.energy_levels,
            "insert_breaks": getattr(profile, 'insert_breaks', False),
            "short_break_min": getattr(profile, 'short_break_min', 5),
            "long_break_min": getattr(profile, 'long_break_min', 15),
            "long_study_threshold_min": getattr(profile, 'long_study_threshold_min', 90),
            "min_gap_for_break_min": getattr(profile, 'min_gap_for_break_min', 3),
        }
    except Exception as e:
        import traceback
        print(f"ERROR in /energy-profile: {str(e)}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error fetching energy profile: {str(e)}")

class EnergyProfileUpdate(BaseModel):
    due_date_days: Optional[int] = None
    wake_time: Optional[int] = None
    sleep_time: Optional[int] = None
    max_study_duration: Optional[int] = None
    min_study_duration: Optional[int] = None
    energy_levels: Optional[str] = None  # JSON string
    # rest-aware fields
    insert_breaks: Optional[bool] = None
    short_break_min: Optional[int] = None
    long_break_min: Optional[int] = None
    long_study_threshold_min: Optional[int] = None
    min_gap_for_break_min: Optional[int] = None

@router.post("/energy-profile")
async def update_energy_profile(
    user_id: int,
    profile_update: EnergyProfileUpdate,
    db: Session = Depends(get_db)
):
    """update user's energy profile"""
    try:
        from api.models import EnergyProfile

        profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
        if not profile:
            # create new profile
            profile = EnergyProfile(user_id=user_id)
            db.add(profile)

        # update fields if provided
        if profile_update.due_date_days is not None:
            profile.due_date_days = profile_update.due_date_days
        if profile_update.wake_time is not None:
            profile.wake_time = profile_update.wake_time
        if profile_update.sleep_time is not None:
            profile.sleep_time = profile_update.sleep_time
        if profile_update.max_study_duration is not None:
            profile.max_study_duration = profile_update.max_study_duration
        if profile_update.min_study_duration is not None:
            profile.min_study_duration = profile_update.min_study_duration
        if profile_update.energy_levels is not None:
            profile.energy_levels = profile_update.energy_levels
        # rest-aware fields
        if profile_update.insert_breaks is not None:
            profile.insert_breaks = profile_update.insert_breaks
        if profile_update.short_break_min is not None:
            profile.short_break_min = profile_update.short_break_min
        if profile_update.long_break_min is not None:
            profile.long_break_min = profile_update.long_break_min
        if profile_update.long_study_threshold_min is not None:
            profile.long_study_threshold_min = profile_update.long_study_threshold_min
        if profile_update.min_gap_for_break_min is not None:
            profile.min_gap_for_break_min = profile_update.min_gap_for_break_min

        db.commit()
        db.refresh(profile)

        return {
            "message": "Energy profile updated successfully",
            "profile": {
                "due_date_days": profile.due_date_days,
                "wake_time": profile.wake_time,
                "sleep_time": profile.sleep_time,
                "max_study_duration": profile.max_study_duration,
                "min_study_duration": profile.min_study_duration,
                "energy_levels": profile.energy_levels,
                "insert_breaks": profile.insert_breaks,
                "short_break_min": profile.short_break_min,
                "long_break_min": profile.long_break_min,
                "long_study_threshold_min": profile.long_study_threshold_min,
                "min_gap_for_break_min": profile.min_gap_for_break_min
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating energy profile: {str(e)}")


class BreakTuningUpdate(BaseModel):
    insert_breaks: Optional[bool] = None
    short_break_min: Optional[int] = None
    long_break_min: Optional[int] = None
    long_study_threshold_min: Optional[int] = None
    min_gap_for_break_min: Optional[int] = None


@router.post("/tune-breaks")
async def tune_breaks(
    user_id: int,
    tuning: BreakTuningUpdate,
    db: Session = Depends(get_db)
):
    """Tune rest/break scheduling parameters only (for agent/chat usage)."""
    try:
        from api.models import EnergyProfile
        profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()
        if not profile:
            profile = EnergyProfile(user_id=user_id)
            db.add(profile)

        if tuning.insert_breaks is not None:
            profile.insert_breaks = tuning.insert_breaks
        if tuning.short_break_min is not None:
            profile.short_break_min = tuning.short_break_min
        if tuning.long_break_min is not None:
            profile.long_break_min = tuning.long_break_min
        if tuning.long_study_threshold_min is not None:
            profile.long_study_threshold_min = tuning.long_study_threshold_min
        if tuning.min_gap_for_break_min is not None:
            profile.min_gap_for_break_min = tuning.min_gap_for_break_min

        db.commit()
        db.refresh(profile)

        return {
            "message": "Break settings tuned",
            "profile": {
                "insert_breaks": profile.insert_breaks,
                "short_break_min": profile.short_break_min,
                "long_break_min": profile.long_break_min,
                "long_study_threshold_min": profile.long_study_threshold_min,
                "min_gap_for_break_min": profile.min_gap_for_break_min,
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error tuning break settings: {str(e)}")
