from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel

from packages.tools.registry import ToolContext, ToolSpec

DecisionType = Literal["allow", "deny", "require_approval"]


@dataclass(frozen=True)
class PolicyDecision:
    result: DecisionType
    reason: str | None = None

    @property
    def requires_approval(self) -> bool:
        return self.result == "require_approval"

    @property
    def denied(self) -> bool:
        return self.result == "deny"


class PolicyEngine:
    def evaluate(
        self,
        tool: ToolSpec,
        context: ToolContext,
        payload: BaseModel | dict[str, Any] | None = None,
    ) -> PolicyDecision:
        if tool.requires_approval:
            return PolicyDecision(
                result="require_approval",
                reason="Tool requires explicit approval.",
            )
        if _is_canonical_mutation(tool):
            commit_classification = _extract_commit_classification(payload)
            if commit_classification != "safe_auto_commit":
                return PolicyDecision(
                    result="require_approval",
                    reason="Canonical changes require approval unless marked safe_auto_commit.",
                )
        return PolicyDecision(result="allow")


def _is_canonical_mutation(tool: ToolSpec) -> bool:
    if not tool.name.startswith("canonical."):
        return False
    return tool.name.endswith(
        (".create", ".update", ".restore", ".delete", ".commit", ".approve")
    )


def _extract_commit_classification(payload: BaseModel | dict[str, Any] | None) -> str | None:
    if payload is None:
        return None
    if isinstance(payload, BaseModel):
        return getattr(payload, "commit_classification", None)
    if isinstance(payload, dict):
        return payload.get("commit_classification")
    return None
