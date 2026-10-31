"""Question synchronization helper for InteractionService."""

import hashlib
from typing import Any, Dict, List, Optional
from models.schemas import (
    InteractionDocument,
    InteractionKind,
    InteractionOption,
    InteractionStatus,
    QuestionItem,
)
from repositories.interaction_repository import InteractionRepository


def sync_question_from_transcript_data(
    repo: InteractionRepository,
    session_id: str,
    question_data: Optional[Dict[str, Any]],
    is_active: bool,
) -> Optional[str]:
    """
    Synchronize active agent questions from transcript or CDP DOM into interaction repository.
    Supports both string and dict options, preserves active questions across idle periods,
    and supersedes concluded questions once answered.
    """
    if not is_active or not question_data:
        repo.supersede_pending_interactions(session_id=session_id)
        return None

    q_text = str(
        question_data.get("question") or question_data.get("title") or "Agent Question"
    ).strip()[:250]
    q_desc = str(
        question_data.get("description")
        or "Select an option below or type your own custom instructions to guide the agent."
    ).strip()[:1900]
    q_hash = hashlib.md5(f"{session_id}:{q_text}".encode()).hexdigest()[:12]
    interaction_id = f"q-{q_hash}"

    repo.supersede_pending_interactions(session_id=session_id, exclude_id=interaction_id)

    existing = repo.get_interaction(interaction_id)
    if existing:
        return interaction_id

    raw_options = question_data.get("options") or []
    options_list: List[InteractionOption] = []
    for i, opt in enumerate(raw_options):
        if isinstance(opt, dict):
            label_str = str(
                opt.get("label")
                or opt.get("title")
                or opt.get("text")
                or opt.get("value")
                or f"Option {i + 1}"
            ).strip()[:250]
            desc_val = opt.get("description") or opt.get("detail")
            desc_str = str(desc_val).strip()[:950] if desc_val else None
            is_rec = bool(
                opt.get("is_recommended")
                or opt.get("recommended")
                or "(recommended)" in label_str.lower()
            )
            opt_id = str(opt.get("id") or f"opt_{i + 1}")[:120]
            if label_str:
                options_list.append(
                    InteractionOption(
                        id=opt_id,
                        label=label_str,
                        description=desc_str,
                        is_recommended=is_rec,
                    )
                )
        elif opt is not None:
            label_str = str(opt).strip()[:250]
            if label_str:
                options_list.append(
                    InteractionOption(
                        id=f"opt_{i + 1}",
                        label=label_str,
                        is_recommended=(i == 0 and "(recommended)" in label_str.lower())
                        or "(recommended)" in label_str.lower(),
                    )
                )

    raw_questions = question_data.get("questions") or []
    questions_list: List[QuestionItem] = []
    for q_idx, q_obj in enumerate(raw_questions):
        if isinstance(q_obj, dict):
            sub_title = str(q_obj.get("question") or f"Question {q_idx + 1}").strip()[:250]
            sub_opts_raw = q_obj.get("options") or []
            sub_opts_list: List[InteractionOption] = []
            for o_idx, o_raw in enumerate(sub_opts_raw):
                if isinstance(o_raw, dict):
                    lbl = str(
                        o_raw.get("label") or o_raw.get("title") or f"Option {o_idx + 1}"
                    ).strip()[:250]
                    d_val = o_raw.get("description") or o_raw.get("detail")
                    sub_opts_list.append(
                        InteractionOption(
                            id=str(o_raw.get("id") or f"q{q_idx + 1}_opt_{o_idx + 1}"),
                            label=lbl,
                            description=str(d_val).strip()[:950] if d_val else None,
                            is_recommended=bool(
                                o_raw.get("is_recommended") or "(recommended)" in lbl.lower()
                            ),
                        )
                    )
                elif o_raw is not None:
                    lbl = str(o_raw).strip()[:250]
                    sub_opts_list.append(
                        InteractionOption(
                            id=f"q{q_idx + 1}_opt_{o_idx + 1}",
                            label=lbl,
                            is_recommended="(recommended)" in lbl.lower(),
                        )
                    )
            questions_list.append(
                QuestionItem(
                    id=f"q_{q_idx + 1}",
                    question=sub_title,
                    is_multi_select=bool(q_obj.get("is_multi_select", False)),
                    options=sub_opts_list,
                )
            )

    if not options_list and not questions_list:
        kind = InteractionKind.FREE_TEXT
    elif question_data.get("is_multi_select"):
        kind = InteractionKind.MULTIPLE_CHOICE
    else:
        kind = InteractionKind.SINGLE_CHOICE

    doc = InteractionDocument(
        interaction_id=interaction_id,
        session_id=session_id,
        kind=kind,
        title=q_text,
        description=q_desc,
        options=options_list,
        questions=questions_list,
        allow_custom_response=True,
        custom_response_label="Type something else / Custom instructions",
        status=InteractionStatus.PENDING,
    )
    repo.create_interaction(doc)
    return interaction_id
