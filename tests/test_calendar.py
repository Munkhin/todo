import pytest
from unittest.mock import MagicMock, patch

def test_get_calendar_events_missing_user_id(client):
    """Test getting events without user_id"""
    response = client.get("/api/calendar/events")
    assert response.status_code == 400

def test_create_event_success(client):
    """Test creating a calendar event"""
    with patch("api.calendar.event_routes.create_calendar_event") as mock_create, \
         patch("api.calendar.event_routes.get_supabase_client") as mock_get_client:
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase
        mock_create.return_value = 1
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": 1, "title": "Test Event"}
        ]

        payload = {
            "user_id": 1,
            "title": "Test Event",
            "start_time": "2024-01-01T10:00:00Z",
            "end_time": "2024-01-01T11:00:00Z"
        }

        response = client.post("/api/calendar/events", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

def test_create_event_invalid_times(client):
    """Test creating event with end before start"""
    payload = {
        "user_id": 1,
        "title": "Invalid Event",
        "start_time": "2024-01-01T12:00:00Z",
        "end_time": "2024-01-01T10:00:00Z"
    }
    
    response = client.post("/api/calendar/events", json=payload)
    assert response.status_code == 400

def test_update_event_success(client):
    """Test updating an event"""
    with patch("api.calendar.event_routes.update_calendar_event") as mock_update, \
         patch("api.calendar.event_routes.get_supabase_client") as mock_get_client:
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase
        mock_update.return_value = True
        # Mock for existence check and final fetch
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": 1, "title": "Updated"}
        ]

        response = client.put("/api/calendar/events/1", json={"title": "Updated"})

        assert response.status_code == 200
        assert response.json()["success"] is True

def test_delete_event_success(client):
    """Test deleting an event"""
    with patch("api.calendar.event_routes.delete_calendar_event") as mock_delete, \
         patch("api.calendar.event_routes.get_supabase_client") as mock_get_client:
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase
        mock_delete.return_value = True
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": 1}
        ]

        response = client.delete("/api/calendar/events/1")

        assert response.status_code == 200
        assert response.json()["success"] is True
