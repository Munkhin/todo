import asyncio
from unittest.mock import AsyncMock

import pytest
from dotenv import load_dotenv
from fastapi import HTTPException
from pydantic import ValidationError

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


def test_chat_endpoint_normalizes_list_text():
    mock_run_agent.reset_mock()
    mock_run_agent.return_value = [{"text": "Combined tasks."}]

    payload = _make_payload()
    payload["text"] = ["first task", "second task"]

    request = chat_routes.ChatRequest(**payload)
    response = asyncio.run(chat_routes.chat_endpoint(request))

    assert response["success"] is True
    assert response["results"] == [{"text": "Combined tasks."}]
    mock_run_agent.assert_awaited_once()
    user_input = mock_run_agent.await_args.args[0]
    assert user_input["text"] == "first task\nsecond task"


def test_chat_request_rejects_non_string_text():
    payload = _make_payload()
    payload["text"] = {"bad": "payload"}

    with pytest.raises(ValidationError):
        chat_routes.ChatRequest(**payload)
