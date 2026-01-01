from datetime import datetime, timezone
from types import SimpleNamespace

import app  # noqa: F401

from packages.tools import canonical as canonical_tools
from packages.tools.registry import ToolContext


def _make_site_structure(structure_id: int) -> SimpleNamespace:
    return SimpleNamespace(
        id=structure_id,
        parent_version_id=None,
        business_profile_version_id=None,
        structure_data={"pages": []},
        selection_rules=None,
        taxonomy_snapshot_id=None,
        created_by="user",
        source_run_id=None,
        commit_classification="approval_required",
        status="draft",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


def test_business_profile_latest_returns_none(monkeypatch):
    monkeypatch.setattr(canonical_tools, "_latest_record", lambda *args, **kwargs: None)
    output = canonical_tools._business_profile_latest_handler(
        canonical_tools.BusinessProfileLatestInput(),
        ToolContext(run_id="run", step_id=None, requester=None, db=object()),
    )
    assert output.business_profile is None


def test_site_structure_history_maps_items(monkeypatch):
    dummy = [_make_site_structure(1), _make_site_structure(2)]
    monkeypatch.setattr(canonical_tools, "_list_records", lambda *args, **kwargs: dummy)
    output = canonical_tools._site_structure_history_handler(
        canonical_tools.SiteStructureHistoryInput(limit=2),
        ToolContext(run_id="run", step_id=None, requester=None, db=object()),
    )
    assert [item.id for item in output.items] == [1, 2]
