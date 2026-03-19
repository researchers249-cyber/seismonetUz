"""
SEISMON — WebSocket route (FastAPI).

Mounts at ``/ws`` and delegates all message handling to ``handlers.handle_message``.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from server.ws.manager import ws_manager
from server.ws.handlers import handle_message

logger = logging.getLogger(__name__)

ws_router = APIRouter()


@ws_router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    device_id: str = Query(default=""),
) -> None:
    """
    Main WebSocket endpoint.

    Clients connect to ``ws://<host>/ws?device_id=<uuid>``.
    If no device_id query param is provided, one is generated server-side
    so every connection is tracked.
    """
    import uuid as _uuid

    # Resolve device id
    did = device_id.strip() if device_id else str(_uuid.uuid4())

    await ws_manager.connect(websocket, did)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                logger.warning("Non-JSON WS message from %s: %s", did, raw_text[:200])
                continue

            if not isinstance(data, dict):
                logger.warning("WS message is not a dict from %s", did)
                continue

            await handle_message(did, data)

    except WebSocketDisconnect:
        logger.info("WS client disconnected: %s", did)
    except Exception as exc:
        logger.error("WS error for %s: %s", did, exc, exc_info=True)
    finally:
        await ws_manager.disconnect(did)
