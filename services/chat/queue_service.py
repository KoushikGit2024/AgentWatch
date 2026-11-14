"""
Queued Message Service.
Maintains state of queued follow-up prompts across offline buffer and live Antigravity IDE workbench.
Supports listing, queuing, send-now, deleting, and editing queued messages.
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, Any, List, Optional
from integrations.antigravity.core.adapter import antigravity_adapter

logger = logging.getLogger(__name__)


class QueueMessageService:
    def __init__(self):
        # Local buffer of messages queued when agent is working or IDE is disconnected
        self._buffered_queue: List[Dict[str, Any]] = []

    def queue_message(
        self, message: str, attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Add a follow-up message to the queue."""
        item = {
            "id": f"q_{uuid.uuid4().hex[:8]}",
            "text": message.strip(),
            "attachments": attachments or [],
            "source": "local_buffer",
            "created_at": time.time(),
            "status": "queued",
        }
        self._buffered_queue.append(item)
        return item

    def get_buffered_messages(self) -> List[Dict[str, Any]]:
        """Return the list of locally buffered messages."""
        return list(self._buffered_queue)

    def remove_buffered_message(self, item_id: str) -> bool:
        """Remove a message from the local buffer by ID."""
        initial_len = len(self._buffered_queue)
        self._buffered_queue = [m for m in self._buffered_queue if m.get("id") != item_id]
        return len(self._buffered_queue) < initial_len

    def update_buffered_message(self, item_id: str, new_text: str) -> Optional[Dict[str, Any]]:
        """Update the text of a locally buffered message."""
        for m in self._buffered_queue:
            if m.get("id") == item_id:
                m["text"] = new_text.strip()
                m["updated_at"] = time.time()
                return m
        return None

    async def get_all_queued_messages(self) -> List[Dict[str, Any]]:
        """
        Merge IDE native queued messages from CDP with any locally buffered messages.
        """
        ide_items = []
        target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
        if target_ws:
            from integrations.antigravity.cdp.cdp_queue_actions import get_ide_queued_messages

            ide_items = await get_ide_queued_messages(target_ws)

        # Combine IDE native items + local items
        combined = []
        # IDE items first
        for it in ide_items:
            combined.append(
                {
                    "id": it["id"],
                    "index": it["index"],
                    "text": it["text"],
                    "source": "ide_native",
                    "can_send_now": it.get("can_send_now", True),
                    "can_edit": it.get("can_edit", True),
                    "can_delete": it.get("can_delete", True),
                }
            )

        # Local buffer items
        for it in self._buffered_queue:
            combined.append(
                {
                    "id": it["id"],
                    "text": it["text"],
                    "attachments": it.get("attachments", []),
                    "source": "local_buffer",
                    "can_send_now": True,
                    "can_edit": True,
                    "can_delete": True,
                }
            )

        return combined

    async def execute_action(
        self, item_id: str, action: str, new_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute an action ('send_now', 'delete', 'edit') on either an IDE queued item or a local buffer item.
        """
        act = action.lower()
        # If it's an IDE native item (starts with ide_q_)
        if item_id.startswith("ide_q_"):
            target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
            if not target_ws:
                antigravity_adapter.discover_cdp()
                target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
            if not target_ws:
                return {"success": False, "error": "Antigravity CDP not connected"}

            try:
                index = int(item_id.replace("ide_q_", ""))
            except ValueError:
                index = 0

            from integrations.antigravity.cdp.cdp_queue_actions import dispatch_queued_action

            return await dispatch_queued_action(
                target_ws, act, index=index, text=new_text
            )

        # Otherwise, local buffer item
        if act == "delete":
            removed = self.remove_buffered_message(item_id)
            return {"success": removed, "action": "deleted"}
        elif act == "edit":
            if not new_text:
                return {"success": False, "error": "New text required for edit"}
            updated = self.update_buffered_message(item_id, new_text)
            return {"success": bool(updated), "item": updated, "action": "edited"}
        elif act == "send_now":
            # Dispatch to Antigravity immediately
            item = next((m for m in self._buffered_queue if m.get("id") == item_id), None)
            if not item:
                return {"success": False, "error": "Item not found in buffer"}

            prompt_msg = item["text"]
            attachments = item.get("attachments", [])
            if attachments:
                attachment_lines = ["\n\n[Attached Files]:"]
                for att in attachments:
                    name = att.get("original_name") or att.get("filename") or "file"
                    path = att.get("storage_path") or att.get("relative_path") or ""
                    is_img = att.get("is_image", False)
                    tag = "Image" if is_img else "File"
                    attachment_lines.append(f"- {tag} ({name}): {path}")
                prompt_msg = prompt_msg + "\n".join(attachment_lines)

            res = await antigravity_adapter.send_prompt(prompt_msg)
            if res.get("success"):
                self.remove_buffered_message(item_id)
            return {"success": res.get("success", False), "action": "send_now", "details": res}

        return {"success": False, "error": f"Unknown action: {action}"}

    async def dispatch_next_queued(self) -> Optional[Dict[str, Any]]:
        """
        Pop and dispatch the oldest queued message when the agent finishes working.
        Supports both IDE native queued items and local buffer.
        """
        # 1. Check IDE native queued messages first
        target_ws = antigravity_adapter.active_chat_url or antigravity_adapter.active_target_url
        if target_ws:
            from integrations.antigravity.cdp.cdp_queue_actions import (
                get_ide_queued_messages,
                dispatch_queued_action,
            )

            try:
                ide_items = await get_ide_queued_messages(target_ws)
                if ide_items:
                    logger.info("Auto-dispatching oldest IDE native queued message (index 0)")
                    res = await dispatch_queued_action(
                        target_ws, "send_now", index=0
                    )
                    return {"source": "ide_native", "result": res}
            except Exception as e:
                logger.debug("Failed auto-dispatching IDE native queue: %s", str(e))

        # 2. Check local buffered queue
        if self._buffered_queue:
            next_item = self._buffered_queue[0]
            logger.info("Auto-dispatching oldest local buffered message: %s", next_item.get("id"))
            res = await self.execute_action(next_item["id"], "send_now")
            try:
                from services.networking.websocket_manager import websocket_manager
                remaining = await self.get_all_queued_messages()
                await websocket_manager.broadcast({"type": "queue_update", "messages": remaining})
            except Exception as b_err:
                logger.debug("Failed broadcasting queue update on auto-dispatch: %s", str(b_err))
            return res

        return None


queue_service = QueueMessageService()
