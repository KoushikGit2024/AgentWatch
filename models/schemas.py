"""Domain models and Pydantic schemas for AgentWatch."""

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


class PromptSubmissionRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000, description="Prompt text to dispatch")
    session_id: Optional[str] = Field(default=None, description="Target session UUID if explicitly specified")
    idempotency_key: Optional[str] = Field(default=None, max_length=128, description="Client idempotency token to prevent duplicate dispatch")


class ControlActionRequest(BaseModel):
    action: str
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)


# --- Dynamic Interaction Models ---

class InteractionKind(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    FREE_TEXT = "free_text"
    CONFIRMATION = "confirmation"
    FORM = "form"


class InteractionStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class InteractionOption(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    is_recommended: bool = False


class InteractionFormField(BaseModel):
    id: str
    label: str
    field_type: str = "text"  # text, textarea, select, checkbox
    placeholder: Optional[str] = None
    required: bool = True
    options: Optional[List[str]] = None


class InteractionDocument(BaseModel):
    """Persisted dynamic interaction request schema."""
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    interaction_id: str
    session_id: str
    kind: InteractionKind
    title: str
    description: Optional[str] = None
    options: List[InteractionOption] = Field(default_factory=list)
    fields: List[InteractionFormField] = Field(default_factory=list)
    allow_custom_response: bool = False
    custom_response_label: str = "Other / Custom Text"
    status: InteractionStatus = InteractionStatus.PENDING
    submitted_response: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None


class SubmitInteractionRequest(BaseModel):
    selected_option_ids: List[str] = Field(default_factory=list)
    custom_response: Optional[str] = Field(default=None, max_length=5000, description="Custom text response when permitted")
    form_values: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = Field(default=None, max_length=128, description="Client idempotency token to prevent duplicate responses")


class CapabilityStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    UNSUPPORTED = "unsupported"
    UNVERIFIED = "unverified"
    REQUIRES_NATIVE_IDE = "requires_native_ide"
    TEMPORARILY_DISCONNECTED = "temporarily_disconnected"


class CapabilityItem(BaseModel):
    name: str
    category: str
    status: CapabilityStatus
    verified: bool
    requires_confirmation: bool = False
    description: str
    reason: Optional[str] = None

