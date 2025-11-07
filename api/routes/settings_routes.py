"""
settings routes for managing user preferences (energy profile, scheduling settings, etc.)
formerly schedule_routes.py - scheduling is now handled by agent tools, not HTTP endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from api.database import get_db
from api.services.consts import DEFAULT_DUE_DATE_DAYS

router = APIRouter()

@router.get("/energy-profile")
async def get_energy_profile(user_id: int, db: Session = Depends(get_db)):
    """get user's energy profile"""
    if user_id <= 0:
        raise HTTPException(status_code=401, detail="Invalid or missing user authentication")

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
    if user_id <= 0:
        raise HTTPException(status_code=401, detail="Invalid or missing user authentication")

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
    if user_id <= 0:
        raise HTTPException(status_code=401, detail="Invalid or missing user authentication")

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
