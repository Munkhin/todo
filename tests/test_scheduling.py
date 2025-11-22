import pytest
from unittest.mock import patch

def test_chat_endpoint_success(client):
    """Test chat endpoint"""
    with patch("api.scheduling.chat_routes.run_agent") as mock_agent:
        mock_agent.return_value = [{"text": "Hello!"}]
        
        payload = {"text": "Schedule a meeting", "user_id": "1"}
        response = client.post("/api/chat/", json=payload)
        
        assert response.status_code == 200
        assert response.json()["success"] is True

def test_chat_endpoint_invalid_text(client):
    """Test chat with invalid text type"""
    payload = {"text": 123, "user_id": "1"}
    response = client.post("/api/chat/", json=payload)

    # Accept both 400 (Bad Request) and 422 (Unprocessable Entity) as valid responses for invalid input
    assert response.status_code in [400, 422]
