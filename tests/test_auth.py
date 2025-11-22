import pytest
from unittest.mock import MagicMock, patch

def test_auth_status_unauthenticated(client):
    """Test auth status when not authenticated"""
    with patch("api.database.get_session") as mock_get_session:
        mock_get_session.return_value = None
        
        response = client.get("/api/auth/status")
        
        assert response.status_code == 200
        assert response.json() == {"authenticated": False}

def test_auth_status_authenticated(client):
    """Test auth status when authenticated"""
    with patch("api.database.get_session") as mock_get_session:
        mock_get_session.return_value = {"session_id": "test_session"}
        
        response = client.get("/api/auth/status", params={"session_id": "test_session"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["session_id"] == "test_session"

def test_logout_success(client):
    """Test successful logout"""
    with patch("api.database.delete_session") as mock_delete:
        mock_delete.return_value = True
        
        response = client.post("/api/auth/logout", params={"session_id": "test_session"})
        
        assert response.status_code == 200
        assert response.json() == {"message": "Logged out successfully"}

def test_logout_invalid_session(client):
    """Test logout with invalid session"""
    with patch("api.database.delete_session") as mock_delete:
        mock_delete.return_value = False
        
        response = client.post("/api/auth/logout", params={"session_id": "invalid"})
        
        assert response.status_code == 404

def test_user_me(client):
    """Test get or create user by email"""
    with patch("api.database.create_or_update_user_by_email") as mock_create:
        mock_create.return_value = 123
        
        payload = {"email": "test@example.com", "name": "Test User"}
        response = client.post("/api/user/me", json=payload)
        
        assert response.status_code == 200
        assert response.json() == {"user_id": 123}

def test_update_timezone(client):
    """Test updating user timezone"""
    with patch("api.database.get_user_by_id") as mock_get, \
         patch("api.database.update_user_timezone") as mock_update:
        mock_get.return_value = {"id": 1}
        mock_update.return_value = True
        
        payload = {"user_id": 1, "timezone": "America/New_York"}
        response = client.post("/api/auth/update-timezone", json=payload)
        
        assert response.status_code == 200
        assert response.json()["success"] is True
