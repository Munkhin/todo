"""
Tests for calendar event endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock


class TestEventEndpoints:
    """Test calendar event CRUD operations"""
    
    @patch('calendar.event_routes.supabase')
    def test_get_events_success(self, mock_supabase, client, test_user_id):
        """Test getting events for a user"""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [
            {
                "id": 1,
                "user_id": test_user_id,
                "title": "Test Event",
                "start_time": "2025-11-21T10:00:00Z",
                "end_time": "2025-11-21T11:00:00Z"
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_response
        
        response = client.get(f"/api/calendar/events?user_id={test_user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "events" in data
        assert len(data["events"]) > 0
    
    def test_get_events_missing_user_id(self, client):
        """Test getting events without user_id"""
        response = client.get("/api/calendar/events")
        assert response.status_code == 400
        assert "user_id" in response.json()["detail"].lower()
    
    @patch('calendar.event_routes.supabase')
    def test_get_events_with_date_range(self, mock_supabase, client, test_user_id):
        """Test getting events with date range filter"""
        mock_response = Mock()
        mock_response.data = []
        
        # Chain mock calls
        mock_query = Mock()
        mock_query.order.return_value.execute.return_value = mock_response
        mock_query.gt.return_value = mock_query
        mock_supabase.table.return_value.select.return_value.eq.return_value.lt.return_value = mock_query
        
        response = client.get(
            f"/api/calendar/events?user_id={test_user_id}"
            f"&start_date=2025-11-20T00:00:00Z&end_date=2025-11-27T00:00:00Z"
        )
        assert response.status_code == 200
    
    @patch('calendar.event_routes.create_calendar_event')
    @patch('calendar.event_routes.supabase')
    def test_create_event_success(self, mock_supabase, mock_create, client, test_event_data):
        """Test creating a new event"""
        mock_create.return_value = 123
        
        # Mock fetch response
        mock_response = Mock()
        mock_response.data = [{**test_event_data, "id": 123}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        response = client.post("/api/calendar/events", json=test_event_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "event" in data
    
    @patch('calendar.event_routes.create_calendar_event')
    def test_create_event_invalid_datetime(self, mock_create, client, test_event_data):
        """Test creating event with invalid datetime"""
        test_event_data["start_time"] = "invalid-datetime"
        response = client.post("/api/calendar/events", json=test_event_data)
        assert response.status_code == 400
        assert "invalid datetime format" in response.json()["detail"].lower()
    
    @patch('api.calendar.event_routes.create_calendar_event')
    def test_create_event_end_before_start(self, mock_create, client, test_event_data):
        """Test creating event where end is before start"""
        test_event_data["end_time"] = "2025-11-21T09:00:00Z"  # Before start
        response = client.post("/api/calendar/events", json=test_event_data)
        assert response.status_code == 400
        assert "end_time must be after start_time" in response.json()["detail"].lower()
    
    @patch('calendar.event_routes.update_calendar_event')
    @patch('calendar.event_routes.supabase')
    def test_update_event_success(self, mock_supabase, mock_update, client):
        """Test updating an event"""
        event_id = 1
        mock_update.return_value = True
        
        # Mock existing event
        mock_existing = Mock()
        mock_existing.data = [{"id": event_id, "title": "Old Title"}]
        
        # Mock updated event
        mock_updated = Mock()
        mock_updated.data = [{"id": event_id, "title": "New Title"}]
        
        # Setup mock to return different responses for different calls
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            mock_existing,  # First call (check exists)
            mock_updated    # Second call (fetch updated)
        ]
        
        update_data = {"title": "New Title"}
        response = client.put(f"/api/calendar/events/{event_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @patch('calendar.event_routes.supabase')
    def test_update_event_not_found(self, mock_supabase, client):
        """Test updating non-existent event"""
        event_id = 999
        
        # Mock empty response
        mock_response = Mock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        update_data = {"title": "New Title"}
        response = client.put(f"/api/calendar/events/{event_id}", json=update_data)
        assert response.status_code == 404
    
    @patch('calendar.event_routes.delete_calendar_event')
    @patch('calendar.event_routes.supabase')
    def test_delete_event_success(self, mock_supabase, mock_delete, client):
        """Test deleting an event"""
        event_id = 1
        mock_delete.return_value = True
        
        # Mock existing event
        mock_response = Mock()
        mock_response.data = [{"id": event_id}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        response = client.delete(f"/api/calendar/events/{event_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @patch('api.calendar.event_routes.supabase')
    def test_delete_event_not_found(self, mock_supabase, client):
        """Test deleting non-existent event"""
        event_id = 999
        
        # Mock empty response
        mock_response = Mock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        response = client.delete(f"/api/calendar/events/{event_id}")
        assert response.status_code == 404
