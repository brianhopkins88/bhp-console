from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

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
    def evaluate(self, tool: ToolSpec, context: ToolContext) -> PolicyDecision:
        if tool.requires_approval:
            return PolicyDecision(
                result="require_approval",
                reason="Tool requires explicit approval.",
            )
        return PolicyDecision(result="allow")
