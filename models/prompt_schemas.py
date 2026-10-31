"""Prompt and Remote Control Schemas."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class AgentModeEnum(str, Enum):
    FAST = "Fast"
    PLANNING = "Planning"


class SupportedModelsEnum(str, Enum):
    DEFAULT_AGENT = "Default Antigravity Agent"
    GEMINI_PRO = "Gemini 3.1 Pro (High)"
    CLAUDE_SONNET = "Claude Sonnet 4.6 (Thinking)"
    CLAUDE_OPUS = "Claude Opus 4.6 (Thinking)"
    GPT_OSS = "GPT-OSS 120B (Medium)"


class SetModeRequest(BaseModel):
    mode: AgentModeEnum = Field(description="Agent execution mode (Fast or Planning)")


class SetModelRequest(BaseModel):
    model: str = Field(..., min_length=1, max_length=128, description="Target model name")

    @field_validator("model")
    @classmethod
    def validate_model_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Model name cannot be blank")
        return trimmed


class RemoteScrollRequest(BaseModel):
    scrollPercent: float = Field(
        ..., ge=0.0, le=100.0, description="Normalized vertical scroll percentage between 0 and 100"
    )


class RemoteClickRequest(BaseModel):
    text: Optional[str] = Field(default="", max_length=500, description="Element text to click")
    x: Optional[float] = Field(
        default=None, ge=0.0, le=10000.0, description="Optional X pixel coordinate"
    )
    y: Optional[float] = Field(
        default=None, ge=0.0, le=10000.0, description="Optional Y pixel coordinate"
    )


class LoginRequest(BaseModel):
    password: str


class PromptSubmissionRequest(BaseModel):
    message: Optional[str] = Field(
        default=None, max_length=10000, description="Prompt text to dispatch"
    )
    prompt: Optional[str] = Field(
        default=None, max_length=10000, exclude=True, description="Prompt text alias"
    )
    session_id: Optional[str] = Field(
        default=None, max_length=128, description="Target session UUID if explicitly specified"
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Client idempotency token to prevent duplicate dispatch",
    )
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Attached images or files metadata"
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_prompt_message(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("message") and data.get("prompt"):
                data["message"] = data["prompt"]
        return data

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            raise ValueError("Prompt message cannot be empty or whitespace only")
        return v.strip()

    @field_validator("idempotency_key")
    @classmethod
    def validate_idempotency_key(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("idempotency_key cannot be empty or whitespace only")
            return trimmed
        return v


class ControlActionRequest(BaseModel):
    action: str
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
