"""
Tests for task endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock


class TestTaskEndpoints:
    """Test task CRUD operations"""
    
    def test_get_tasks_success(self, client, test_user_id):
        """Test getting tasks for a user"""
        response = client.get(f"/api/tasks?user_id={test_user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tasks" in data
        assert "count" in data
    
    def test_get_tasks_missing_user_id(self, client):
        """Test getting tasks without user_id parameter"""
        response = client.get("/api/tasks")
        assert response.status_code == 400
        assert "user_id" in response.json()["detail"].lower()
    
    @patch('tasks.task_routes.create_task')
    def test_create_task_success(self, mock_create, client, test_task_data):
        """Test creating a new task"""
        mock_create.return_value = 123
        
        response = client.post("/api/tasks", json=test_task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "task_id" in data
        assert data["message"] == "Task created successfully"
    
    @patch('tasks.task_routes.create_task')
    def test_create_task_invalid_due_date(self, mock_create, client, test_task_data):
        """Test creating task with invalid due date format"""
        test_task_data["due_date"] = "invalid-date"
        response = client.post("/api/tasks", json=test_task_data)
        assert response.status_code == 400
        assert "invalid due_date format" in response.json()["detail"].lower()
    
    @patch('tasks.task_routes.create_task')
    def test_create_task_invalid_difficulty(self, mock_create, client, test_task_data):
        """Test creating task with invalid difficulty"""
        test_task_data["difficulty"] = 15  # Should be 1-10
        response = client.post("/api/tasks", json=test_task_data)
        assert response.status_code == 400
        assert "difficulty" in response.json()["detail"].lower()
    
    @patch('tasks.task_routes.update_task')
    def test_update_task_success(self, mock_update, client):
        """Test updating a task"""
        mock_update.return_value = True
        task_id = 1
        update_data = {
            "title": "Updated Title",
            "status": "completed"
        }
        
        response = client.put(f"/api/tasks/{task_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Task updated successfully"
    
    @patch('tasks.task_routes.update_task')
    def test_update_task_no_fields(self, mock_update, client):
        """Test updating task with no fields"""
        task_id = 1
        response = client.put(f"/api/tasks/{task_id}", json={})
        assert response.status_code == 400
        assert "no fields to update" in response.json()["detail"].lower()
    
    @patch('tasks.task_routes.delete_task')
    def test_delete_task_success(self, mock_delete, client):
        """Test deleting a task"""
        mock_delete.return_value = True
        task_id = 1
        
        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Task deleted successfully"
    
    @patch('tasks.task_routes.delete_task')
    def test_delete_task_failure(self, mock_delete, client):
        """Test deleting task that fails"""
        mock_delete.return_value = False
        task_id = 999
        
        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 500


class TestTaskScheduling:
    """Test task scheduling endpoint"""
    
    @pytest.mark.asyncio
    @patch('tasks.task_routes.supabase')
    @patch('tasks.task_routes.get_energy_profile')
    @patch('tasks.task_routes.schedule_tasks')
    @patch('tasks.task_routes.create_calendar_event')
    async def test_schedule_task_success(
        self, 
        mock_create_event, 
        mock_schedule, 
        mock_get_profile,
        mock_supabase,
        client,
        test_user_id
    ):
        """Test scheduling a task"""
        task_id = 1
        
        # Mock task data
        mock_task = {
            "id": task_id,
            "user_id": test_user_id,
            "title": "Test Task",
            "description": "Test Description",
            "estimated_duration": 60,
            "difficulty": 5,
            "priority": "high",
            "due_date": "2025-12-01T12:00:00Z"
        }
        
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [mock_task]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Mock energy profile
        mock_get_profile.return_value = {
            "min_study_duration": 30,
            "max_study_duration": 180,
            "short_break_min": 5,
            "long_study_threshold_min": 90,
            "energy_levels": "[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]",
            "due_date_days": 7
        }
        
        # Mock scheduler return
        mock_schedule.return_value = [
            {
                "title": "Study Session",
                "description": "Test Task",
                "start_time": "2025-11-21T10:00:00Z",
                "end_time": "2025-11-21T11:00:00Z",
                "event_type": "study",
                "priority": "high",
                "source": "scheduler",
                "color_hex": "#000000"
            }
        ]
        
        mock_create_event.return_value = 1
        
        response = client.post(f"/api/tasks/{task_id}/schedule")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "events" in data
    
    @pytest.mark.asyncio
    @patch('tasks.task_routes.supabase')
    async def test_schedule_task_not_found(self, mock_supabase, client):
        """Test scheduling non-existent task"""
        task_id = 999
        
        # Mock empty response
        mock_response = Mock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        response = client.post(f"/api/tasks/{task_id}/schedule")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
