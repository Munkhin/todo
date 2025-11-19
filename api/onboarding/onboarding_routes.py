from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import json
from api.ai.agent import run_agent
from api.settings.energy_profile_routes import EnergyProfileRequest
from api.database import create_or_update_energy_profile

router = APIRouter()

class TestItem(BaseModel):
    name: str
    date: str # ISO format date

class OnboardingRequest(BaseModel):
    subjects: List[str]
    tests: List[TestItem]
    preferences: EnergyProfileRequest
    additional_notes: Optional[str] = None

@router.post("/submit")
async def submit_onboarding(
    request: OnboardingRequest,
    user_id: int = Query(...)
):
    """
    Process onboarding data:
    1. Save user preferences (energy profile)
    2. Mark onboarding as completed
    3. Trigger AI agent to generate initial tasks and schedule based on subjects/tests
    """
    try:
        # 1. Save preferences and mark onboarding as complete
        # Convert Pydantic model to dict, excluding None values
        profile_data = request.preferences.dict(exclude_unset=True)
        
        # Force onboarding_completed to True
        profile_data["onboarding_completed"] = True
        
        # Ensure energy_levels is handled correctly (it should be a JSON string from the frontend/request model)
        # The EnergyProfileRequest defines it as str, so we pass it as is.
        
        success = create_or_update_energy_profile(user_id, profile_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save preferences")

        # 2. Construct prompt for AI Agent
        subjects_str = ", ".join(request.subjects)
        tests_str = "\n".join([f"- {t.name} on {t.date}" for t in request.tests]) if request.tests else "None"
        
        prompt = f"""
I have just completed onboarding.
My subjects are: {subjects_str}

My upcoming tests are:
{tests_str}

{f"Additional notes: {request.additional_notes}" if request.additional_notes else ""}

Please create tasks for my subjects and schedule study sessions for my upcoming tests based on my preferences.
"""

        # 3. Call AI Agent
        # We use run_agent which handles intent classification and execution
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
