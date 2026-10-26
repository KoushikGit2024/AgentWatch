"""Routes for Web Push notification subscription and management."""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.web_push_service import web_push_service

logger = logging.getLogger("agentwatch.routes.push")

router = APIRouter(prefix="/api/v1/push", tags=["Web Push Notifications"])


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionPayload(BaseModel):
    endpoint: str
    expirationTime: Optional[float] = None
    keys: PushSubscriptionKeys


class PushUnsubscribePayload(BaseModel):
    endpoint: str


class PushTestPayload(BaseModel):
    title: Optional[str] = "AgentWatch Test Notification"
    body: Optional[str] = "Web push notifications are working on your device!"


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Return the base64 VAPID public key needed by browser pushManager.subscribe()."""
    key = web_push_service.get_public_key()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VAPID keys not configured or pywebpush unavailable.",
        )
    return {"publicKey": key}


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe_device(payload: PushSubscriptionPayload):
    """Register or refresh a device's push subscription."""
    success = web_push_service.add_subscription(payload.model_dump())
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscription payload; endpoint required.",
        )
    return {"status": "subscribed"}


@router.post("/unsubscribe")
def unsubscribe_device(payload: PushUnsubscribePayload):
    """Remove a device's push subscription."""
    removed = web_push_service.remove_subscription(payload.endpoint)
    return {"status": "unsubscribed" if removed else "not_found"}


@router.post("/test")
def send_test_push(payload: PushTestPayload):
    """Dispatch a test push notification to all registered devices."""
    count = web_push_service.send_notification(
        title=payload.title or "AgentWatch Test Alert",
        body=payload.body or "Push notifications are working smoothly!",
        tag="agentwatch-test",
        url="/",
    )
    return {
        "status": "sent",
        "recipients_delivered": count,
    }
