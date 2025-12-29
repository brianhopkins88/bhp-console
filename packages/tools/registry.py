from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel


@dataclass(frozen=True)
class ToolContext:
    run_id: str
    step_id: int | None
    requester: str | None
    db: object | None = None


@dataclass(frozen=True)
class ToolSpec:
    name: str
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    handler: Callable[[BaseModel, ToolContext], BaseModel]
    requires_approval: bool = False
    description: str | None = None


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, tool: ToolSpec) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.name}")
        self._tools[tool.name] = tool

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def list(self) -> list[ToolSpec]:
        return list(self._tools.values())
