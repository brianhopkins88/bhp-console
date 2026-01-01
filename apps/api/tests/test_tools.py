from datetime import UTC, datetime
import json

from pydantic import BaseModel

from app.api.v1.tools import _serialize_tool_output


class _DummyOutput(BaseModel):
    created_at: datetime
    status: str


def test_serialize_tool_output_datetime_json_safe():
    output = _DummyOutput(created_at=datetime(2025, 1, 1, tzinfo=UTC), status="ok")
    payload = _serialize_tool_output(output)
    encoded = json.dumps(payload)
    assert "2025-01-01T00:00:00Z" in encoded
