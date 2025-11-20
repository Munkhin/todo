"""
Test fixtures for API tests
"""
import pytest
import os
from typing import Generator
from unittest.mock import Mock, AsyncMock, patch
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Import from parent directory
import sys
from pathlib import Path
api_dir = Path(__file__).parent.parent
sys.path.insert(0, str(api_dir))

from main import app


# Mock environment variables for testing
@pytest.fixture(autouse=True)
def mock_env_vars():
    """Mock environment variables for all tests"""
    with patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_KEY": "test-service-key",
        "OPENAI_API_KEY": "test-openai-key",
        "ALLOWED_ORIGINS": "http://localhost:3000",
    }):
        yield


# Test client fixtures
@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client for FastAPI"""
    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_client() -> Generator[AsyncClient, None, None]:
    """Asynchronous test client for FastAPI"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# Mock Supabase client
@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = Mock()
    mock.table = Mock(return_value=mock)
    mock.select = Mock(return_value=mock)
    mock.insert = Mock(return_value=mock)
    mock.update = Mock(return_value=mock)
    mock.delete = Mock(return_value=mock)
    mock.eq = Mock(return_value=mock)
    mock.execute = Mock(return_value=Mock(data=[]))
    return mock


# Mock OpenAI client
@pytest.fixture
def mock_openai():
    """Mock OpenAI client"""
    mock = Mock()
    mock.chat = Mock()
    mock.chat.completions = Mock()
    mock.chat.completions.create = AsyncMock()
    return mock


# Test user data
@pytest.fixture
def test_user_id() -> int:
    """Test user ID"""
    return 1


@pytest.fixture
def test_user_data(test_user_id):
    """Test user data"""
    return {
        "id": test_user_id,
        "email": "test@example.com",
        "name": "Test User",
        "timezone": "America/New_York",
        "wake_time": "07:00",
        "sleep_time": "23:00",
        "onboarding_completed": True
    }


# Test task data
@pytest.fixture
def test_task_data(test_user_id):
    """Test task data"""
    return {
        "user_id": test_user_id,
        "title": "Test Task",
        "description": "This is a test task",
        "status": "pending",
        "estimated_duration": 60,
        "difficulty": 3,
        "priority": "medium",
        "due_date": "2025-12-01T12:00:00Z"
    }


# Test event data
@pytest.fixture
def test_event_data(test_user_id):
    """Test event data"""
    return {
        "user_id": test_user_id,
        "title": "Test Event",
        "description": "This is a test event",
        "start_time": "2025-11-21T10:00:00Z",
        "end_time": "2025-11-21T11:00:00Z",
        "is_fixed": False,
        "task_id": None
    }


# Mock database functions
@pytest.fixture
def mock_database_functions():
    """Mock database functions to prevent actual DB calls"""
    with patch('database.get_user_by_id') as mock_get_user, \
         patch('database.create_task') as mock_create_task, \
         patch('database.get_tasks') as mock_get_tasks, \
         patch('database.update_task') as mock_update_task, \
         patch('database.delete_task') as mock_delete_task, \
         patch('database.create_event') as mock_create_event, \
         patch('database.get_events') as mock_get_events, \
         patch('database.update_event') as mock_update_event, \
         patch('database.delete_event') as mock_delete_event:
        
        yield {
            'get_user_by_id': mock_get_user,
            'create_task': mock_create_task,
            'get_tasks': mock_get_tasks,
            'update_task': mock_update_task,
            'delete_task': mock_delete_task,
            'create_event': mock_create_event,
            'get_events': mock_get_events,
            'update_event': mock_update_event,
            'delete_event': mock_delete_event,
        }
