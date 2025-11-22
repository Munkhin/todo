import pytest
from unittest.mock import patch

def test_submit_feedback_success(client):
    """Test submitting feedback"""
    with patch("api.feedback.feedback_routes.save_feedback") as mock_save:
        mock_save.return_value = True

        payload = {"message": "Great app!", "email": "test@example.com"}
        response = client.post("/api/feedback", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

def test_submit_feedback_empty(client):
    """Test submitting empty feedback"""
    payload = {"message": "   "}
    response = client.post("/api/feedback", json=payload)
    
    assert response.status_code == 400
