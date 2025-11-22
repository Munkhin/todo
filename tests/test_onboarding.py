import pytest
from unittest.mock import patch

def test_submit_onboarding_success(client):
    """Test submitting onboarding"""
    with patch("api.database.create_or_update_settings") as mock_save, \
         patch("api.onboarding.onboarding_routes.run_agent") as mock_agent:
        mock_save.return_value = True
        mock_agent.return_value = [{"text": "Tasks created"}]
        
        payload = {
            "subjects": ["Math"],
            "tests": [],
            "preferences": {
                "wake_time": "08:00:00",
                "sleep_time": "22:00:00"
            }
        }
        
        response = client.post("/api/onboarding/submit", json=payload, params={"user_id": 1})
        
        assert response.status_code == 200
        assert response.json()["success"] is True

def test_submit_onboarding_no_agent(client):
    """Test onboarding without triggering agent"""
    with patch("api.database.create_or_update_settings") as mock_save:
        mock_save.return_value = True
        
        payload = {
            "subjects": [],
            "tests": [],
            "preferences": {"wake_time": "08:00:00"}
        }
        
        response = client.post("/api/onboarding/submit", json=payload, params={"user_id": 1})
        
        assert response.status_code == 200
        assert response.json()["agent_result"] is None
