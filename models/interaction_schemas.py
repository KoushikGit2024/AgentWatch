"""Dynamic Interaction Models and Schemas."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


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
