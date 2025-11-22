import pytest
from unittest.mock import MagicMock, patch

def test_get_tasks_missing_user_id(client):
    """Test getting tasks without user_id"""
    response = client.get("/api/tasks")
    assert response.status_code == 400

def test_get_tasks_success(client):
    """Test getting tasks"""
    with patch("api.tasks.task_routes.get_tasks_by_user") as mock_get:
        mock_get.return_value = [{"id": 1, "title": "Test Task"}]

        response = client.get("/api/tasks", params={"user_id": 1})

        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["success"] is True
        assert "tasks" in data
        assert len(data["tasks"]) == 1

def test_create_task_success(client):
    """Test creating a task"""
    with patch("api.tasks.task_routes.create_task") as mock_create:
        mock_create.return_value = 1

        payload = {
            "user_id": 1,
            "description": "Test Task",
            "estimated_duration": 60
        }

        response = client.post("/api/tasks", json=payload)

        assert response.status_code == 200
        assert response.json()["success"] is True

def test_create_task_invalid_difficulty(client):
    """Test creating task with invalid difficulty"""
    payload = {
        "user_id": 1,
        "description": "Test",
        "difficulty": 11
    }
    
    response = client.post("/api/tasks", json=payload)
    assert response.status_code == 400

def test_update_task_success(client):
    """Test updating a task"""
    with patch("api.tasks.task_routes.update_task") as mock_update:
        mock_update.return_value = True

        response = client.put("/api/tasks/1", json={"title": "Updated"})

        assert response.status_code == 200
        assert response.json()["success"] is True

def test_delete_task_success(client):
    """Test deleting a task"""
    with patch("api.tasks.task_routes.delete_task") as mock_delete:
        mock_delete.return_value = True

        response = client.delete("/api/tasks/1")

        assert response.status_code == 200
        assert response.json()["success"] is True
