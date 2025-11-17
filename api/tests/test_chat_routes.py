import asyncio
from unittest.mock import AsyncMock

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

from api.ai import chat_routes  # noqa: E402


mock_run_agent = AsyncMock()
chat_routes.run_agent = mock_run_agent


def _make_payload():
    return {
        "text": "Please schedule two study sessions for biology and chemistry.",
        "user_id": "42",
        "file": None,
    }


def test_chat_endpoint_returns_results_on_success():
    mock_run_agent.reset_mock()
    mock_run_agent.return_value = [
        {"text": "Scheduled biology session."},
        {"text": "Scheduled chemistry session."},
    ]

    request = chat_routes.ChatRequest(**_make_payload())
    response = asyncio.run(chat_routes.chat_endpoint(request))

    assert response == {
        "success": True,
        "results": [
            {"text": "Scheduled biology session."},
            {"text": "Scheduled chemistry session."},
        ],
    }


def test_chat_endpoint_propagates_exceptions_as_http_error():
    mock_run_agent.reset_mock()
    mock_run_agent.side_effect = RuntimeError("scheduling failed")

    request = chat_routes.ChatRequest(**_make_payload())
    try:
        asyncio.run(chat_routes.chat_endpoint(request))
        assert False, "Expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 500
        assert exc.detail == "scheduling failed"
    finally:
        mock_run_agent.side_effect = None
