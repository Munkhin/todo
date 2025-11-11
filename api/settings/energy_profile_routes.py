# routes for energy profile settings
# allows users to configure their energy levels, wake/sleep times, and study preferences

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from api.database import get_energy_profile, create_or_update_energy_profile

router = APIRouter()

# request model for energy profile
class EnergyProfileRequest(BaseModel):
    due_date_days: Optional[int] = None
    wake_time: int
    sleep_time: int
    max_study_duration: int
    min_study_duration: int
    energy_levels: str  # JSON string of hourly energy levels
    insert_breaks: Optional[bool] = True
    short_break_min: Optional[int] = None
    long_break_min: Optional[int] = None
    long_study_threshold_min: Optional[int] = None
    min_gap_for_break_min: Optional[int] = None

# ============ ENERGY PROFILE ROUTES ============

@router.get("/energy-profile")
async def get_user_energy_profile(user_id: int = Query(...)):
    """get user's energy profile settings"""
    try:
        profile = get_energy_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Energy profile not found")

        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching energy profile: {str(e)}")

@router.post("/energy-profile")
async def save_user_energy_profile(
    request: EnergyProfileRequest,
    user_id: int = Query(...)
):
    """create or update user's energy profile settings"""
    try:
        # build profile data
        profile_data = {
            "wake_time": request.wake_time,
            "sleep_time": request.sleep_time,
            "max_study_duration": request.max_study_duration,
            "min_study_duration": request.min_study_duration,
            "energy_levels": request.energy_levels,
        }

        # add optional fields if provided
        if request.due_date_days is not None:
            profile_data["due_date_days"] = request.due_date_days
        if request.insert_breaks is not None:
            profile_data["insert_breaks"] = request.insert_breaks
        if request.short_break_min is not None:
            profile_data["short_break_min"] = request.short_break_min
        if request.long_break_min is not None:
            profile_data["long_break_min"] = request.long_break_min
        if request.long_study_threshold_min is not None:
            profile_data["long_study_threshold_min"] = request.long_study_threshold_min
        if request.min_gap_for_break_min is not None:
            profile_data["min_gap_for_break_min"] = request.min_gap_for_break_min

        success = create_or_update_energy_profile(user_id, profile_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save energy profile")

        # return updated profile
        profile = get_energy_profile(user_id)
        return {
            "success": True,
            "message": "Energy profile saved successfully",
            "profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving energy profile: {str(e)}")
