import pytest
import sys
import os

# Add the project root to the python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Set environment variables before importing app
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-key"
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["GOOGLE_CLIENT_ID"] = "test-google-client-id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test-google-client-secret"

from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

# Import app after setting env vars
from api.main import app

@pytest.fixture(scope="session")
def client():
    """Create a test client for the FastAPI app"""
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def mock_supabase():
    """Mock the supabase client globally for all tests"""
    with patch("api.database.get_supabase_client") as mock_get_client:
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase
        # Setup default mock behavior
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        yield mock_supabase
