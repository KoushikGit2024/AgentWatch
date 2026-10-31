"""Transcript and CDP DOM live observation loop."""

import asyncio
import hashlib
import logging
import time
from integrations.antigravity.adapter import antigravity_adapter
from services.conversation_service import conversation_service
from services.queue_service import queue_service
from services.interaction_service import interaction_service
from services.websocket_manager import websocket_manager

logger = logging.getLogger("services.transcript_watcher")


async def run_transcript_watcher():
    """
    Continuously watches transcript.jsonl AND active Antigravity CDP DOM popups
    for updates, broadcasting lightweight paginated chat updates, command approvals,
    and dynamic question interactions live to connected mobile clients.
    """
    last_mtime = 0.0
    last_size = 0
    last_approval_key = None
    last_interaction_id = None
    last_conversation_id = None
    dom_probe_tick = 0
    cached_dom_approval = None
    dom_miss_count = 0

    approval_candidate_key = None
    approval_candidate_time = 0.0
    agent_was_working = False

    while True:
        try:
            ag_status = antigravity_adapter.get_status()
            current_cid = ag_status.get("active_conversation_id")
            chat_switched = False
            if current_cid and current_cid != last_conversation_id:
                last_conversation_id = current_cid
                last_mtime = 0.0
                last_size = 0
                chat_switched = True
                conversation_service._cached_key = None
                conversation_service._cached_turns = []

            p = conversation_service.get_latest_transcript_path(conversation_id=current_cid)
            transcript_changed = False
            if p and p.exists():
                stat = p.stat()
                mtime = stat.st_mtime
                size = stat.st_size
                if mtime != last_mtime or size != last_size or chat_switched:
                    last_mtime = mtime
                    last_size = size
                    transcript_changed = True

            if transcript_changed:
                paginated = conversation_service.get_paginated_conversation(limit=15)
                if websocket_manager.active_connections:
                    await websocket_manager.broadcast(
                        {
                            "type": "chat_update",
                            "conversation_id": current_cid,
                            "messages": paginated["messages"],
                            "total": paginated["total"],
                            "oldest_index": paginated["oldest_index"],
                            "has_more": paginated["has_more"],
                        }
                    )

                # Track working -> idle transition to auto-dispatch queued prompts
                msgs = paginated.get("messages") or []
                is_currently_working = bool(msgs and msgs[-1].get("role") == "agent" and msgs[-1].get("is_working"))
                if agent_was_working and not is_currently_working:
                    logger.info("Agent finished turn. Checking queue for pending prompts...")
                    asyncio.create_task(queue_service.dispatch_next_queued())
                agent_was_working = is_currently_working

            dom_probe_tick = (dom_probe_tick + 1) % 2
            if websocket_manager.active_connections or transcript_changed:
                if not transcript_changed and dom_probe_tick == 0:
                    conversation_service.get_recent_conversation(limit=15)

                pending_approval = conversation_service.get_pending_approval()

                if dom_probe_tick == 0:
                    ag_status = antigravity_adapter.get_status()
                    if ag_status.get("cdp", {}).get("connected"):
                        dom_popup = await antigravity_adapter.inspect_active_popup()
                        if dom_popup.get("has_popup"):
                            dom_miss_count = 0
                            if dom_popup.get("popup_kind") == "question":
                                cached_dom_approval = None
                                interaction_service.sync_question_from_transcript(
                                    session_id="cdp_live_session",
                                    question_data={
                                        "question": dom_popup.get("title") or "Select an option",
                                        "options": dom_popup.get("options") or [],
                                        "is_multi_select": dom_popup.get("is_multi_select", False),
                                        "allow_custom_response": dom_popup.get(
                                            "allow_custom_response", True
                                        ),
                                    },
                                    is_active=True,
                                )
                            elif not pending_approval:
                                target_str = (
                                    dom_popup.get("command")
                                    or dom_popup.get("target")
                                    or dom_popup.get("title")
                                    or "action"
                                )
                                step_hash = hashlib.md5(
                                    target_str.encode("utf-8", errors="ignore")
                                ).hexdigest()[:8]
                                step_id = f"dom-{step_hash}"
                                if step_id not in conversation_service._resolved_approvals:
                                    cached_dom_approval = {
                                        "step_id": step_id,
                                        "request_type": "command"
                                        if dom_popup.get("command")
                                        else "decision",
                                        "target": target_str,
                                        "title": dom_popup.get("title")
                                        or "Antigravity Approval Required",
                                        "description": "Detected live confirmation popup in Antigravity IDE.",
                                        "command": dom_popup.get("command"),
                                        "options": dom_popup.get("options"),
                                        "allow_custom_response": True,
                                    }
                        else:
                            dom_miss_count += 1
                            if dom_miss_count >= 4:
                                cached_dom_approval = None
                                if (
                                    conversation_service._latest_pending_approval
                                    and conversation_service._latest_pending_approval.get(
                                        "step_id", ""
                                    ).startswith("dom-")
                                ):
                                    conversation_service._latest_pending_approval = None
                                conversation_service._resolved_approvals = {
                                    k: v
                                    for k, v in conversation_service._resolved_approvals.items()
                                    if not k.startswith("dom-") and not k.startswith("cmd-")
                                }
                                interaction_service.sync_question_from_transcript(
                                    session_id="cdp_live_session",
                                    question_data=None,
                                    is_active=False,
                                )

                if not pending_approval and cached_dom_approval:
                    pending_approval = cached_dom_approval
                    conversation_service._latest_pending_approval = cached_dom_approval

                cur_approval_key = pending_approval.get("step_id") if pending_approval else None
                now = time.time()

                if cur_approval_key and cur_approval_key != last_approval_key:
                    if approval_candidate_key != cur_approval_key:
                        approval_candidate_key = cur_approval_key
                        approval_candidate_time = now
                    elif (now - approval_candidate_time) >= 0.5:
                        last_approval_key = cur_approval_key
                        approval_candidate_key = None
                        await websocket_manager.broadcast(
                            {
                                "type": "pending_approval",
                                "approval": pending_approval,
                            }
                        )
                        try:
                            from services.web_push_service import web_push_service

                            cmd_title = pending_approval.get("title") or "Approval Needed"
                            cmd_target = (
                                pending_approval.get("command")
                                or pending_approval.get("target")
                                or "Action"
                            )
                            web_push_service.send_notification(
                                title=f"⚠️ {cmd_title}",
                                body=f"Agent requesting approval: {cmd_target[:120]}",
                                tag=f"approval-{cur_approval_key}",
                                url="/",
                                data={"type": "approval", "step_id": cur_approval_key},
                            )
                        except Exception as push_err:
                            logger.debug("Failed to dispatch approval web push: %s", str(push_err))
                else:
                    if not cur_approval_key:
                        approval_candidate_key = None
                        if last_approval_key is not None:
                            last_approval_key = None
                            await websocket_manager.broadcast(
                                {
                                    "type": "approval_dismissed",
                                }
                            )

                pending_list = interaction_service.list_pending()
                active_interaction = pending_list[0] if pending_list else None
                cur_int_id = (
                    active_interaction.get("interaction_id") if active_interaction else None
                )
                if cur_int_id and cur_int_id != last_interaction_id:
                    last_interaction_id = cur_int_id
                    await websocket_manager.broadcast(
                        {
                            "type": "interaction_prompt",
                            "interaction": active_interaction,
                        }
                    )
                    try:
                        from services.web_push_service import web_push_service

                        prompt_msg = (
                            active_interaction.get("prompt") or "Agent has a question for you"
                        )
                        web_push_service.send_notification(
                            title="❓ Agent Input Required",
                            body=prompt_msg[:120],
                            tag=f"interaction-{cur_int_id}",
                            url="/",
                            data={"type": "interaction", "interaction_id": cur_int_id},
                        )
                    except Exception as push_err:
                        logger.debug("Failed to dispatch interaction web push: %s", str(push_err))
                elif not cur_int_id and last_interaction_id is not None:
                    prev_id = last_interaction_id
                    last_interaction_id = None
                    await websocket_manager.broadcast(
                        {
                            "type": "interaction_resolved",
                            "interaction_id": prev_id,
                        }
                    )

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug("Transcript watcher loop notice: %s", str(e))
        await asyncio.sleep(0.35)

