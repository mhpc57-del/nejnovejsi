"""
Expo Push Notification sender for CraftBolt mobile app.
Uses Expo's push notification API to send messages to mobile devices.
"""

import httpx
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send push notification via Expo Push API."""
    if not push_tokens:
        return False

    messages = []
    for token in push_tokens:
        if not token or not token.startswith("ExponentPushToken["):
            continue
        msg = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "channelId": "default",
        }
        if data:
            msg["data"] = data
        messages.append(msg)

    if not messages:
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            if response.status_code == 200:
                logger.info(f"Push notifications sent to {len(messages)} devices")
                return True
            else:
                logger.warning(f"Push API returned {response.status_code}: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send push notifications: {e}")
        return False
