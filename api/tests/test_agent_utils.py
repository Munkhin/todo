import pytest

from api.ai.agent import _normalize_task_collection


def test_normalize_task_collection_accepts_json_string():
    raw = '[{"description": "task one"}]'
    tasks = _normalize_task_collection(raw, context="test")
    assert isinstance(tasks, list)
    assert tasks[0]["description"] == "task one"


def test_normalize_task_collection_rejects_invalid_string():
    with pytest.raises(TypeError):
        _normalize_task_collection("not a list", context="test")
