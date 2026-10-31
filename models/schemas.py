"""Domain models and Pydantic schemas for AgentWatch.

Decomposed modularly:
- Interaction schemas: models.interaction_schemas
- Prompt & Control schemas: models.prompt_schemas
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

# Re-export prompt and interaction schemas for backwards compatibility
from models.interaction_schemas import (
    InteractionDocument,
    InteractionFormField,
    InteractionKind,
    InteractionOption,
    InteractionStatus,
    QuestionItem,
    SubmitInteractionRequest,
)
from models.prompt_schemas import (
    AgentModeEnum,
    ControlActionRequest,
    LoginRequest,
    PromptSubmissionRequest,
    RemoteClickRequest,
    RemoteScrollRequest,
    SetModeRequest,
    SetModelRequest,
    SupportedModelsEnum,
)


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
        return target in (
            ActionExecutionState.REQUEST_RECEIVED,
            ActionExecutionState.REQUEST_ACCEPTED,
            ActionExecutionState.DISPATCH_ATTEMPTED,
            ActionExecutionState.REJECTED,
        )
    if current == target:
        return True
    allowed = VALID_ACTION_TRANSITIONS.get(current, set())
    return target in allowed
