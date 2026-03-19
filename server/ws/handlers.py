"""
SEISMON — WebSocket message handlers.

Each incoming WS message is dispatched by `type` field to a dedicated handler.
Handlers update state, persist to DB, and broadcast as needed.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from server import database
from server.config import settings
from server.models import (
    AlertModel,
    DeviceModel,
    EarthquakeModel,
    SignalData,
    WSAccelData,
    WSDeviceRegister,
    WSEarthquakeDetected,
    WSPong,
    WSSimulateEarthquake,
)
from server.services.alert import create_alert, determine_severity
from server.services.analyzer import analyzer
from server.ws.manager import ws_manager

logger = logging.getLogger(__name__)


async def handle_message(device_id: str, raw: dict[str, Any]) -> None:
    """
    Top-level dispatcher.  Validates the ``type`` field and routes to the
    correct handler.  Unknown types are logged but never raise.
    """
    msg_type: str | None = raw.get("type")
    if msg_type is None:
        logger.warning("WS message without type from %s: %s", device_id, raw)
        return

    try:
        if msg_type == "DEVICE_REGISTER":
            await _handle_device_register(device_id, raw)
        elif msg_type == "ACCEL_DATA":
            await _handle_accel_data(device_id, raw)
        elif msg_type == "SIMULATE_EARTHQUAKE":
            await _handle_simulate_earthquake(device_id, raw)
        elif msg_type == "PING":
            await _handle_ping(device_id)
        else:
            logger.debug("Unknown WS message type '%s' from %s", msg_type, device_id)
    except Exception as exc:
        logger.error(
            "Error handling WS message type=%s from %s: %s",
            msg_type,
            device_id,
            exc,
            exc_info=True,
        )


# ── individual handlers ───────────────────────────────────


async def _handle_device_register(device_id: str, raw: dict[str, Any]) -> None:
    """Register / update device info on the server."""
    try:
        msg = WSDeviceRegister.model_validate(raw)
    except Exception as exc:
        logger.warning("Invalid DEVICE_REGISTER payload from %s: %s", device_id, exc)
        return

    now = datetime.now(timezone.utc).isoformat()

    # Update in-memory connection info
    ws_manager.update_device_info(device_id, lat=msg.lat, lon=msg.lon)

    # Persist to database
    database.save_device(
        {
            "device_id": device_id,
            "latitude": msg.lat,
            "longitude": msg.lon,
            "last_seen": now,
            "user_agent": None,
        }
    )

    logger.info(
        "Device registered: %s (lat=%s, lon=%s)", device_id, msg.lat, msg.lon
    )
    await ws_manager.broadcast_device_list()


async def _handle_accel_data(device_id: str, raw: dict[str, Any]) -> None:
    """
    Process accelerometer data from a device.

    Parses the payload into a ``SignalData`` model, feeds it to the
    :pyclass:`SignalAnalyzer`, and — if a seismic event is detected with
    sufficient confidence — creates an earthquake + alert and broadcasts.
    """
    try:
        msg = WSAccelData.model_validate(raw)
    except Exception as exc:
        logger.warning("Invalid ACCEL_DATA payload from %s: %s", device_id, exc)
        return

    signal: SignalData = msg.data

    # Update device position if sent
    ws_manager.update_device_info(device_id, lat=signal.latitude, lon=signal.longitude)

    # ── Signal Analyzer (O3) ──────────────────────────
    result = analyzer.add_signal(
        {
            "device_id": device_id,
            "x": signal.x,
            "y": signal.y,
            "z": signal.z,
            "timestamp": signal.timestamp,
        }
    )

    if result is None:
        logger.debug(
            "ACCEL from %s: x=%.3f y=%.3f z=%.3f — no event",
            device_id,
            signal.x,
            signal.y,
            signal.z,
        )
        return

    # ── Zilzila aniqlandi ─────────────────────────────
    confidence: float = result["confidence"]
    magnitude: float = result["estimated_magnitude"]

    # Past confidence — faqat log, broadcast yo'q
    _MIN_BROADCAST_CONFIDENCE = 0.4
    if confidence < _MIN_BROADCAST_CONFIDENCE:
        logger.info(
            "Low-confidence detection from %s: M%.1f (conf=%.2f) — not broadcasting",
            device_id,
            magnitude,
            confidence,
        )
        return

    # Earthquake va alert yaratish
    now = datetime.now(timezone.utc).isoformat()
    eq_id = str(uuid.uuid4())
    lat = signal.latitude or ws_manager.get_device_lat(device_id)
    lon = signal.longitude or ws_manager.get_device_lon(device_id)

    earthquake = EarthquakeModel(
        id=eq_id,
        magnitude=magnitude,
        latitude=lat or 0.0,
        longitude=lon or 0.0,
        depth=10.0,  # taxminiy chuqurlik
        location="Qurilma aniqlagan zilzila",
        timestamp=now,
        source="device",
    )

    eq_dict = earthquake.model_dump(by_alias=False)
    row_id = database.save_earthquake(eq_dict)

    alert_dict = create_alert({**eq_dict, "id": row_id})
    database.save_alert(
        {
            "earthquake_id": row_id,
            "severity": alert_dict["severity"],
            "message": alert_dict["message"],
            "timestamp": alert_dict["timestamp"],
        }
    )

    alert = AlertModel(
        id=alert_dict["id"],
        earthquake_id=eq_id,
        severity=alert_dict["severity"],
        message=alert_dict["message"],
        timestamp=alert_dict["timestamp"],
        affected_radius_km=alert_dict["affected_radius_km"],
    )

    broadcast_msg = WSEarthquakeDetected(
        type="EARTHQUAKE_DETECTED",
        earthquake=earthquake,
        alert=alert,
    )
    await ws_manager.broadcast(broadcast_msg.model_dump(by_alias=True))

    logger.info(
        "Device-detected earthquake broadcast: M%.1f (conf=%.2f) from %s",
        magnitude,
        confidence,
        device_id,
    )


async def _handle_simulate_earthquake(device_id: str, raw: dict[str, Any]) -> None:
    """Simulate an earthquake event — for testing the alert pipeline."""
    try:
        msg = WSSimulateEarthquake.model_validate(raw)
    except Exception as exc:
        logger.warning("Invalid SIMULATE_EARTHQUAKE from %s: %s", device_id, exc)
        return

    now = datetime.now(timezone.utc).isoformat()
    eq_id = str(uuid.uuid4())

    # Build earthquake model
    earthquake = EarthquakeModel(
        id=eq_id,
        magnitude=msg.magnitude,
        latitude=msg.latitude,
        longitude=msg.longitude,
        depth=msg.depth,
        location=msg.location,
        timestamp=now,
        source="simulated",
    )

    # Persist to database
    eq_dict = {
        "magnitude": msg.magnitude,
        "latitude": msg.latitude,
        "longitude": msg.longitude,
        "depth": msg.depth,
        "location": msg.location,
        "timestamp": now,
        "source": "simulated",
    }
    row_id = database.save_earthquake(eq_dict)

    # Create alert
    alert_dict = create_alert({**eq_dict, "id": row_id})
    database.save_alert(
        {
            "earthquake_id": row_id,
            "severity": alert_dict["severity"],
            "message": alert_dict["message"],
            "timestamp": alert_dict["timestamp"],
        }
    )

    alert = AlertModel(
        id=alert_dict["id"],
        earthquake_id=eq_id,
        severity=alert_dict["severity"],
        message=alert_dict["message"],
        timestamp=alert_dict["timestamp"],
        affected_radius_km=alert_dict["affected_radius_km"],
    )

    # Broadcast to all connected devices
    broadcast_msg = WSEarthquakeDetected(
        type="EARTHQUAKE_DETECTED",
        earthquake=earthquake,
        alert=alert,
    )
    await ws_manager.broadcast(broadcast_msg.model_dump(by_alias=True))

    logger.info(
        "Simulated earthquake: M%.1f at %s by %s",
        msg.magnitude,
        msg.location,
        device_id,
    )


async def _handle_ping(device_id: str) -> None:
    """Respond with PONG to keep the connection alive."""
    pong = WSPong(type="PONG")
    await ws_manager.send_to_device(device_id, pong.model_dump(by_alias=True))
