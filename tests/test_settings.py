import pytest
from unittest.mock import MagicMock, patch

def test_get_settings_existing(client):
    """Test getting existing settings"""
    with patch("api.settings.settings_routes.get_settings") as mock_get:
        mock_get.return_value = {"user_id": 1, "wake_time": "08:00:00"}

        response = client.get("/api/settings", params={"user_id": 1})

        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert "wake_time" in data
        assert data["wake_time"] == "08:00:00"

def test_get_settings_seed_default(client):
    """Test seeding default settings"""
    with patch("api.settings.settings_routes.get_settings") as mock_get, \
         patch("api.settings.settings_routes.create_or_update_settings") as mock_create:
        # First call returns None, second returns defaults
        mock_get.side_effect = [None, {"user_id": 1, "wake_time": "07:00:00"}]
        mock_create.return_value = True

        response = client.get("/api/settings", params={"user_id": 1})

        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert "wake_time" in data
        assert data["wake_time"] == "07:00:00"

def test_save_settings_success(client):
    """Test saving settings"""
    with patch("api.settings.settings_routes.create_or_update_settings") as mock_save, \
         patch("api.settings.settings_routes.get_settings") as mock_get:
        mock_save.return_value = True
        mock_get.return_value = {"user_id": 1, "wake_time": "09:00:00"}

        payload = {
            "wake_time": "09:00:00",
            "sleep_time": "23:00:00"
        }

        response = client.post("/api/settings", json=payload, params={"user_id": 1})

        assert response.status_code == 200
        assert response.json()["success"] is True
