"""Domain models and Pydantic schemas for AgentWatch."""

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum


class SourceConfidence(str, Enum):
    OBSERVED = "observed"
    INFERRED = "inferred"
    DECLARED = "declared"


class ActionExecutionState(str, Enum):
    REQUEST_RECEIVED = "request_received"
    REQUEST_ACCEPTED = "request_accepted"
    DISPATCH_ATTEMPTED = "dispatch_attempted"
    DISPATCH_ACKNOWLEDGED = "dispatch_acknowledged"
    EXECUTION_OBSERVED = "execution_observed"
    COMPLETION_CONFIRMED = "completion_confirmed"
    STOP_REQUESTED = "stop_requested"
    STOP_ACKNOWLEDGED = "stop_acknowledged"
    TERMINATION_CONFIRMED = "termination_confirmed"
    REJECTED = "rejected"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    OUTCOME_UNKNOWN = "outcome_unknown"


class EventCategory(str, Enum):
    PROMPT = "prompt"
    EXECUTION = "execution"
    INTERACTION = "interaction"
    SYSTEM = "system"
    TOOL = "tool"
    ERROR = "error"
    RECOVERY = "recovery"


class EventType(str, Enum):
    PRE_TOOL_USE = "PreToolUse"
    POST_TOOL_USE = "PostToolUse"
    STOP = "Stop"
    USER_PROMPT = "UserPrompt"
    AGENT_MESSAGE = "AgentMessage"
    SNAPSHOT = "Snapshot"
    STATE_CHANGE = "StateChange"
    PROMPT_SUBMITTED = "PromptSubmitted"
    STOP_REQUESTED = "StopRequested"
    INTERACTION_CREATED = "InteractionCreated"
    INTERACTION_ANSWERED = "InteractionAnswered"
    MODE_SWITCHED = "ModeSwitched"
    MODEL_SWITCHED = "ModelSwitched"
    NEW_CHAT = "NewChat"
    RECOVERY_ACTION = "RecoveryAction"


class IngestEventRequest(BaseModel):
    """Payload submitted to event ingestion API."""

    source_event_id: Optional[str] = Field(
        default=None, description="Deterministic source ID for deduplication"
    )
    agent_id: str = Field(
        default="antigravity_agent", description="Identifier of the emitting agent"
    )
    session_id: str = Field(description="Conversation or session UUID")
    task_id: Optional[str] = Field(default=None, description="Active task identifier if known")
    event_type: str = Field(description="Event classification, e.g., PreToolUse, PostToolUse, Stop")
    category: Optional[EventCategory] = Field(default=None, description="Normalized event category")
    summary: Optional[str] = Field(default=None, description="Human-readable safe summary")
    execution_state: Optional[ActionExecutionState] = Field(
        default=None, description="Observed lifecycle state"
    )
    correlation_id: Optional[str] = Field(default=None, description="Correlation or action ID")
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = Field(default="antigravity", description="Originating source system")
    source_confidence: SourceConfidence = Field(default=SourceConfidence.DECLARED)
    raw_payload: Optional[Dict[str, Any]] = Field(
        default=None, description="Raw metadata payload before sanitization"
    )


class EventDocument(BaseModel):
    """Persisted event document schema."""

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    source_event_id: Optional[str] = None
    agent_id: str = "antigravity_agent"
    session_id: str
    task_id: Optional[str] = None
    event_type: str
    category: str = "system"
    summary: str = ""
    execution_state: Optional[str] = None
    correlation_id: Optional[str] = None
    timestamp: datetime
    source: str = "antigravity"
    source_confidence: str = "declared"
    sanitized_payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RecoveryItem(BaseModel):
    """Actionable diagnostic item for Recovery Center."""

    id: str
    title: str
    severity: str  # critical, warning, info
    description: str
    what_happened: str
    what_is_known: str
    what_is_unknown: str
    is_retry_safe: bool
    recommended_action: str
    action_type: str  # open_interaction, inspect_idempotency, recheck_connection, reconcile_manual, retry_rejected
    context: Dict[str, Any] = Field(default_factory=dict)


class ReconcileActionRequest(BaseModel):
    """User-reported reconciliation request for uncertain or crashed operations."""

    scope: str = Field(..., min_length=1, max_length=128)
    idempotency_key: str = Field(..., min_length=1, max_length=128)
    resolution_notes: str = Field(..., min_length=1, max_length=1000)
    reported_outcome: str = Field(default="user_reconciled", max_length=64)


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


# --- Dynamic Interaction Models ---


class InteractionKind(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    FREE_TEXT = "free_text"
    CONFIRMATION = "confirmation"
    FORM = "form"
    APPROVAL = "approval"
    BROWSER_PERMISSION = "browser_permission"


class InteractionStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    CANCELLED = "cancelled"
    DISMISSED = "dismissed"
    EXPIRED = "expired"
    SUPERSEDED = "superseded"
    RESOLVED = "resolved"


class InteractionOption(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    label: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_recommended: bool = False


class InteractionFormField(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    label: str = Field(..., min_length=1, max_length=256)
    field_type: str = "text"  # text, textarea, select, checkbox
    placeholder: Optional[str] = None
    required: bool = True
    options: Optional[List[str]] = None


class QuestionItem(BaseModel):
    """Individual question inside a multi-question ask_question tool call."""

    id: str = Field(..., min_length=1, max_length=128)
    question: str = Field(..., min_length=1, max_length=500)
    is_multi_select: bool = False
    options: List[InteractionOption] = Field(default_factory=list)


class InteractionDocument(BaseModel):
    """Persisted dynamic interaction request schema."""

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = Field(default=None, alias="_id")
    interaction_id: str = Field(..., min_length=1, max_length=128)
    session_id: str = Field(..., min_length=1, max_length=128)
    kind: InteractionKind
    popup_kind: Optional[str] = Field(
        default=None, description="question, approval, browser_permission"
    )
    title: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(default=None, max_length=2000)
    target_domain: Optional[str] = Field(
        default=None, max_length=256, description="Target domain for browser permissions"
    )
    command: Optional[str] = Field(
        default=None, max_length=2000, description="Command/script target for approval cards"
    )
    options: List[InteractionOption] = Field(default_factory=list)
    questions: List[QuestionItem] = Field(default_factory=list)
    fields: List[InteractionFormField] = Field(default_factory=list)
    step_indicator: Optional[str] = Field(
        default=None, max_length=64, description="Step count, e.g., 1 of 2"
    )
    allow_custom_response: bool = False
    custom_response_label: str = "Other / Custom Text"
    status: InteractionStatus = InteractionStatus.PENDING
    submitted_response: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None


class SubmitInteractionRequest(BaseModel):
    selected_option_ids: List[str] = Field(default_factory=list)
    custom_response: Optional[str] = Field(
        default=None, max_length=5000, description="Custom text response when permitted"
    )
    form_values: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Client idempotency token to prevent duplicate responses",
    )

    @field_validator("idempotency_key")
    @classmethod
    def validate_interaction_idempotency_key(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("idempotency_key cannot be empty or whitespace only")
            return trimmed
        return v


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


class OperationalDiagnostics(BaseModel):
    """Sanitized operational system health and readiness diagnostics."""

    fastapi_live: bool = True
    mongodb_ready: bool
    mongodb_database: str
    mongodb_version: Optional[str] = None
    cdp_connected: bool
    cdp_port: Optional[int] = None
    cdp_target: Optional[str] = None
    last_successful_observation: Optional[datetime] = None
    last_event_ingestion: Optional[datetime] = None
    pending_interactions_count: int = 0
    in_progress_operations_count: int = 0
    outcome_unknown_count: int = 0
    reconnection_attempts: int = 0
    last_error: Optional[str] = None
    server_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


VALID_ACTION_TRANSITIONS = {
    ActionExecutionState.REQUEST_RECEIVED: {
        ActionExecutionState.REQUEST_ACCEPTED,
        ActionExecutionState.REJECTED,
        ActionExecutionState.FAILED,
    },
    ActionExecutionState.REQUEST_ACCEPTED: {
        ActionExecutionState.DISPATCH_ATTEMPTED,
        ActionExecutionState.FAILED,
        ActionExecutionState.TIMED_OUT,
    },
    ActionExecutionState.DISPATCH_ATTEMPTED: {
        ActionExecutionState.DISPATCH_ACKNOWLEDGED,
        ActionExecutionState.EXECUTION_OBSERVED,
        ActionExecutionState.OUTCOME_UNKNOWN,
        ActionExecutionState.FAILED,
    },
    ActionExecutionState.DISPATCH_ACKNOWLEDGED: {
        ActionExecutionState.EXECUTION_OBSERVED,
        ActionExecutionState.COMPLETION_CONFIRMED,
        ActionExecutionState.OUTCOME_UNKNOWN,
        ActionExecutionState.FAILED,
    },
    ActionExecutionState.EXECUTION_OBSERVED: {
        ActionExecutionState.COMPLETION_CONFIRMED,
        ActionExecutionState.OUTCOME_UNKNOWN,
        ActionExecutionState.FAILED,
        ActionExecutionState.STOP_REQUESTED,
    },
    ActionExecutionState.STOP_REQUESTED: {
        ActionExecutionState.STOP_ACKNOWLEDGED,
        ActionExecutionState.TERMINATION_CONFIRMED,
        ActionExecutionState.OUTCOME_UNKNOWN,
        ActionExecutionState.FAILED,
    },
    ActionExecutionState.STOP_ACKNOWLEDGED: {
        ActionExecutionState.TERMINATION_CONFIRMED,
        ActionExecutionState.OUTCOME_UNKNOWN,
    },
    ActionExecutionState.OUTCOME_UNKNOWN: {
        ActionExecutionState.EXECUTION_OBSERVED,
        ActionExecutionState.COMPLETION_CONFIRMED,
        ActionExecutionState.FAILED,
    },
    # Terminal states
    ActionExecutionState.COMPLETION_CONFIRMED: set(),
    ActionExecutionState.TERMINATION_CONFIRMED: set(),
    ActionExecutionState.REJECTED: set(),
    ActionExecutionState.FAILED: set(),
    ActionExecutionState.TIMED_OUT: set(),
}


def validate_action_transition(
    current: Optional[ActionExecutionState], target: ActionExecutionState
) -> bool:
    """Validate whether an action execution state transition is permitted."""
    if current is None:
        # Initial transition is valid for entry states
        return target in (
            ActionExecutionState.REQUEST_RECEIVED,
            ActionExecutionState.REQUEST_ACCEPTED,
            ActionExecutionState.DISPATCH_ATTEMPTED,
            ActionExecutionState.REJECTED,
        )
    if current == target:
        return True  # Idempotent state assertion
    allowed = VALID_ACTION_TRANSITIONS.get(current, set())
    return target in allowed
