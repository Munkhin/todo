# routes for user settings
# allows users to configure their energy levels, wake/sleep times, study preferences, and subjects

import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Union
from api.database import get_settings, create_or_update_settings

router = APIRouter()

# backend defaults should mirror the frontend to keep UX consistent
DEFAULT_ENERGY_LEVELS = {
    7: 6,
    8: 7,
    9: 9,
    10: 9,
    11: 8,
    12: 6,
    13: 5,
    14: 6,
    15: 7,
    16: 8,
    17: 7,
    18: 6,
    19: 5,
    20: 5,
    21: 4,
    22: 3,
}

DEFAULT_SETTINGS = {
    "due_date_days": 7,
    "wake_time": "07:00:00",
    "sleep_time": "23:00:00",
    "max_study_duration": 180,
    "min_study_duration": 30,
    "energy_levels": json.dumps(DEFAULT_ENERGY_LEVELS),
    "insert_breaks": False,
    "short_break_min": 5,
    "long_break_min": 15,
    "long_study_threshold_min": 90,
    "min_gap_for_break_min": 3,
    "onboarding_completed": False,
    "subjects": [],
}


def seed_default_settings(user_id: int):
    """Create default settings for first-time users so the UI always has data."""
    settings_payload = DEFAULT_SETTINGS.copy()
    # use existing helper so inserts go through a single code path
    created = create_or_update_settings(user_id, settings_payload)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to seed default settings")
    return get_settings(user_id)

# request model for settings
class SettingsRequest(BaseModel):
    due_date_days: Optional[int] = 7
    wake_time: Optional[Union[int, str]] = "07:00:00" # Can be int (hour) or str (HH:MM:SS)
    sleep_time: Optional[Union[int, str]] = "23:00:00"
    max_study_duration: Optional[int] = 180
    min_study_duration: Optional[int] = 30
    energy_levels: Optional[str] = None  # JSON string of hourly energy levels
    insert_breaks: Optional[bool] = True
    short_break_min: Optional[int] = 5
    long_break_min: Optional[int] = 15
    long_study_threshold_min: Optional[int] = 90
    min_gap_for_break_min: Optional[int] = 3
    onboarding_completed: Optional[bool] = False
    subjects: Optional[List[str]] = []
    subject_colors: Optional[dict] = None

# ============ SETTINGS ROUTES ============

@router.get("/settings")
async def get_user_settings(user_id: int = Query(...)):
    """get user's settings"""
    try:
        settings = get_settings(user_id)
        if not settings:
            settings = seed_default_settings(user_id)

        return settings
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")

@router.post("/settings")
async def save_user_settings(
    request: SettingsRequest,
    user_id: int = Query(...)
):
    """create or update user's settings"""
    try:
        # Get default energy levels if not provided
        energy_levels = request.energy_levels
        if energy_levels is None:
            # Use default energy levels from global setting
            energy_levels = json.dumps(DEFAULT_ENERGY_LEVELS)

        # Handle time conversion
        wake_time = request.wake_time
        if isinstance(wake_time, int):
            wake_time = f"{wake_time:02d}:00:00"
            
        sleep_time = request.sleep_time
        if isinstance(sleep_time, int):
            sleep_time = f"{sleep_time:02d}:00:00"

        # build settings data with defaults for required fields
        settings_data = {
            "wake_time": wake_time,
            "sleep_time": sleep_time,
            "max_study_duration": request.max_study_duration,
            "min_study_duration": request.min_study_duration,
            "energy_levels": energy_levels,
            "subjects": request.subjects or [],
        }

        if request.subject_colors is not None:
            settings_data["subject_colors"] = json.dumps(request.subject_colors)

        # add optional fields if provided
        if request.due_date_days is not None:
            settings_data["due_date_days"] = request.due_date_days
        if request.insert_breaks is not None:
            settings_data["insert_breaks"] = request.insert_breaks
        if request.short_break_min is not None:
            settings_data["short_break_min"] = request.short_break_min
        if request.long_break_min is not None:
            settings_data["long_break_min"] = request.long_break_min
        if request.long_study_threshold_min is not None:
            settings_data["long_study_threshold_min"] = request.long_study_threshold_min
        if request.min_gap_for_break_min is not None:
            settings_data["min_gap_for_break_min"] = request.min_gap_for_break_min
        if request.onboarding_completed is not None:
            settings_data["onboarding_completed"] = request.onboarding_completed

        success = create_or_update_settings(user_id, settings_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save settings")

        # return updated settings
        settings = get_settings(user_id)
        return {
            "success": True,
            "message": "Settings saved successfully",
            "settings": settings
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving settings: {str(e)}")
