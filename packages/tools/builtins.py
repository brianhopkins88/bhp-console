from __future__ import annotations

from pydantic import BaseModel

from packages.tools.registry import ToolContext, ToolRegistry, ToolSpec


class EchoInput(BaseModel):
    message: str


class EchoOutput(BaseModel):
    echo: str


def _echo_handler(payload: EchoInput, context: ToolContext) -> EchoOutput:
    return EchoOutput(echo=payload.message)

def register_builtin_tools(registry: ToolRegistry) -> None:
    registry.register(
        ToolSpec(
            name="system.echo",
            input_model=EchoInput,
            output_model=EchoOutput,
            handler=_echo_handler,
            description="Echo input payload for smoke testing.",
        )
    )
