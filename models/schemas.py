"""Domain models and Pydantic schemas for CloudWatchV2."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum


class SourceConfidence(str, Enum):
    OBSERVED = "observed"
    INFERRED = "inferred"
    DECLARED = "declared"


class EventType(str, Enum):
    PRE_TOOL_USE = "PreToolUse"
    POST_TOOL_USE = "PostToolUse"
    STOP = "Stop"
    USER_PROMPT = "UserPrompt"
    AGENT_MESSAGE = "AgentMessage"
    SNAPSHOT = "Snapshot"
    STATE_CHANGE = "StateChange"


class IngestEventRequest(BaseModel):
    """Payload submitted to event ingestion API."""
    source_event_id: Optional[str] = Field(default=None, description="Deterministic source ID for deduplication")
    agent_id: str = Field(default="antigravity_agent", description="Identifier of the emitting agent")
    session_id: str = Field(description="Conversation or session UUID")
    task_id: Optional[str] = Field(default=None, description="Active task identifier if known")
    event_type: str = Field(description="Event classification, e.g., PreToolUse, PostToolUse, Stop")
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = Field(default="antigravity", description="Originating source system")
    source_confidence: SourceConfidence = Field(default=SourceConfidence.DECLARED)
    raw_payload: Optional[Dict[str, Any]] = Field(default=None, description="Raw metadata payload before sanitization")


class EventDocument(BaseModel):
    """Persisted event document schema."""
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    source_event_id: Optional[str] = None
    agent_id: str
    session_id: str
    task_id: Optional[str] = None
    event_type: str
    timestamp: datetime
    source: str
    source_confidence: str
    sanitized_payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionDocument(BaseModel):
    """Persisted agent session document."""
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str
    agent_id: str
    title: Optional[str] = "Antigravity Session"
    status: str = "active"  # active, idle, completed, error
    current_mode: Optional[str] = "Fast"  # Fast, Planning
    current_model: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentDocument(BaseModel):
    """Persisted agent metadata."""
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    agent_id: str
    name: str = "Antigravity Agent"
    capabilities: List[str] = Field(default_factory=list)
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LoginRequest(BaseModel):
    password: str


class ControlActionRequest(BaseModel):
    action: str
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
