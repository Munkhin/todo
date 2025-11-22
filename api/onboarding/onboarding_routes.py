from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import json
from api.scheduling.agent import run_agent
from api.settings.settings_routes import SettingsRequest
from api.database import create_or_update_settings

router = APIRouter()

class TestItem(BaseModel):
    name: str
    date: str # ISO format date

class OnboardingRequest(BaseModel):
    subjects: Optional[List[str]] = []
    tests: Optional[List[TestItem]] = []
    preferences: SettingsRequest
    additional_notes: Optional[str] = None

@router.post("/submit")
async def submit_onboarding(
    request: OnboardingRequest,
    user_id: int = Query(...)
):
    """
    Process onboarding data:
    1. Save user preferences (energy profile)
    2. Save user subjects to user_subjects table
    3. Mark onboarding as completed
    4. Trigger AI agent to generate initial tasks and schedule based on subjects/tests
    """
    try:
        # 1. Save preferences and mark onboarding as complete
        # Convert Pydantic model to dict, excluding None values
        profile_data = request.preferences.dict(exclude_unset=True)
        
        # Force onboarding_completed to True
        profile_data["onboarding_completed"] = True
        
        # Ensure energy_levels is handled correctly (it should be a JSON string from the frontend/request model)
        # The EnergyProfileRequest defines it as str, so we pass it as is.
        
        success = create_or_update_settings(user_id, profile_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save preferences")

        # 2. Save subjects to settings (merged with preferences)
        if request.subjects:
            # Add subjects to profile data
            # Ensure subjects is a list
            current_subjects = profile_data.get("subjects", [])
            if not isinstance(current_subjects, list):
                current_subjects = []
            
            # Merge and deduplicate
            new_subjects = set(current_subjects)
            for s in request.subjects:
                if s.strip():
                    new_subjects.add(s.strip())
            
            profile_data["subjects"] = list(new_subjects)
            
            # Update settings again with subjects
            create_or_update_settings(user_id, profile_data)

        # 3. Construct prompt for AI Agent
        subjects_str = ", ".join(request.subjects) if request.subjects else "No specific subjects provided"
        tests_str = "\n".join([f"- {t.name} on {t.date}" for t in request.tests]) if request.tests else "No upcoming tests"
        
        # Only call AI agent if user actually provided subjects or tests
        agent_result = None
        if request.subjects or request.tests or request.additional_notes:
            prompt = f"""
I have just completed onboarding.
My subjects are: {subjects_str}

My upcoming tests are:
{tests_str}

{f"Additional notes: {request.additional_notes}" if request.additional_notes else ""}

Please create tasks for my subjects and schedule study sessions for my upcoming tests based on my preferences.
"""


            # 4. Call AI Agent only if there's content to process
            if request.subjects or request.tests or request.additional_notes:
                agent_result = await run_agent({
                    "user_id": user_id,
                    "text": prompt
                })
        
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "agent_result": agent_result
        }

    except Exception as e:
        # If something goes wrong, we should probably still try to return what happened
        # But for critical failure (like DB save), we raise HTTP exception
        print(f"Error during onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")
