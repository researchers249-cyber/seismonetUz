"""
SEISMON — WebSocket ConnectionManager.

Thread-safe async manager that tracks every connected device,
broadcasts messages to all or to devices within a geographic radius,
and automatically cleans up dead connections.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from server.models import DeviceModel, WSDeviceListUpdate
from server.utils.geo import is_within_radius

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections keyed by device_id."""

    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}
        self.device_info: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    # ── connection lifecycle ───────────────────────────────

    async def connect(
        self,
        websocket: WebSocket,
        device_id: str,
        lat: float | None = None,
        lon: float | None = None,
    ) -> None:
        """Accept the websocket and register the device."""
        await websocket.accept()
        async with self._lock:
            # If the same device reconnects, close the stale socket silently
            old_ws = self.active_connections.get(device_id)
            if old_ws is not None:
                try:
                    await old_ws.close(code=1012, reason="replaced")
                except Exception:
                    pass
            self.active_connections[device_id] = websocket
            self.device_info[device_id] = {
                "lat": lat,
                "lon": lon,
                "last_seen": datetime.now(timezone.utc).isoformat(),
            }
        logger.info("WS connected: %s", device_id)
        await self.broadcast_device_list()

    async def disconnect(self, device_id: str) -> None:
        """Remove device from the active set and notify others."""
        removed = False
        async with self._lock:
            if device_id in self.active_connections:
                self.active_connections.pop(device_id, None)
                self.device_info.pop(device_id, None)
                removed = True
        if removed:
            logger.info("WS disconnected: %s", device_id)
            await self.broadcast_device_list()

    # ── device info helpers ───────────────────────────────

    def update_device_info(
        self, device_id: str, lat: float | None = None, lon: float | None = None
    ) -> None:
        """Update cached coordinates and last_seen timestamp (no lock needed for dict value mutation)."""
        info = self.device_info.get(device_id)
        if info is not None:
            if lat is not None:
                info["lat"] = lat
            if lon is not None:
                info["lon"] = lon
            info["last_seen"] = datetime.now(timezone.utc).isoformat()

    def get_device_list(self) -> list[DeviceModel]:
        """Return a list of DeviceModel for every connected device."""
        result: list[DeviceModel] = []
        for dev_id, info in self.device_info.items():
            result.append(
                DeviceModel(
                    device_id=dev_id,
                    latitude=info.get("lat"),
                    longitude=info.get("lon"),
                    last_seen=info.get("last_seen", datetime.now(timezone.utc).isoformat()),
                    online=dev_id in self.active_connections,
                )
            )
        return result

    # ── broadcasting ──────────────────────────────────────

    async def _send_safe(self, device_id: str, ws: WebSocket, message: dict[str, Any]) -> bool:
        """Try to send JSON to a single websocket. Returns False when the socket is dead."""
        try:
            if ws.client_state == WebSocketState.CONNECTED:
                await ws.send_json(message)
                return True
        except Exception as exc:
            logger.debug("Send failed to %s: %s", device_id, exc)
        return False

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send *message* to every connected device. Dead sockets are pruned."""
        dead: list[str] = []
        # snapshot so we don't hold the lock while sending
        async with self._lock:
            snapshot = list(self.active_connections.items())

        for device_id, ws in snapshot:
            ok = await self._send_safe(device_id, ws, message)
            if not ok:
                dead.append(device_id)

        for d in dead:
            await self.disconnect(d)

    async def broadcast_to_radius(
        self,
        message: dict[str, Any],
        center_lat: float,
        center_lon: float,
        radius_km: float,
    ) -> None:
        """Send *message* only to devices within *radius_km* of a centre point."""
        dead: list[str] = []
        async with self._lock:
            snapshot = list(self.active_connections.items())

        for device_id, ws in snapshot:
            info = self.device_info.get(device_id, {})
            dev_lat = info.get("lat")
            dev_lon = info.get("lon")

            # Skip devices without coordinates
            if dev_lat is None or dev_lon is None:
                continue

            if not is_within_radius(center_lat, center_lon, dev_lat, dev_lon, radius_km):
                continue

            ok = await self._send_safe(device_id, ws, message)
            if not ok:
                dead.append(device_id)

        for d in dead:
            await self.disconnect(d)

    async def broadcast_device_list(self) -> None:
        """Build and broadcast the current device list to all connected clients."""
        devices = self.get_device_list()
        msg = WSDeviceListUpdate(
            type="DEVICE_LIST_UPDATE",
            devices=devices,
        )
        await self.broadcast(msg.model_dump(by_alias=True))

    async def send_to_device(self, device_id: str, message: dict[str, Any]) -> bool:
        """Send a message to a specific device. Returns True on success."""
        async with self._lock:
            ws = self.active_connections.get(device_id)
        if ws is None:
            return False
        ok = await self._send_safe(device_id, ws, message)
        if not ok:
            await self.disconnect(device_id)
        return ok

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# ── application-level singleton ────────────────────────────
ws_manager = ConnectionManager()
