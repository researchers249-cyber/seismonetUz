"""
SEISMON — Pydantic v2 models.

All models use camelCase aliases so JSON serialised with `by_alias=True`
matches the TypeScript interfaces in client/src/types/index.ts.
Python code keeps snake_case via `populate_by_name=True`.
"""

from __future__ import annotations

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# ────────────────────────────────────────────────────────────
# Base model — shared config for every SEISMON model
# ────────────────────────────────────────────────────────────

class SeismonBase(BaseModel):
    """Base with camelCase alias generation and populate_by_name."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,       # allow snake_case in Python
        serialize_by_alias=True,     # JSON output uses camelCase
        str_strip_whitespace=True,
    )


# ────────────────────────────────────────────────────────────
# Core domain models
# ────────────────────────────────────────────────────────────

EarthquakeSource = Literal["usgs", "emsc", "device", "simulated"]
Severity = Literal["low", "medium", "high", "critical"]


class EarthquakeModel(SeismonBase):
    """A single earthquake event."""

    id: str
    magnitude: float = Field(..., ge=0.0, le=10.0, description="Richter magnitude")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    depth: float = Field(..., ge=0.0, le=700.0, description="Depth in km")
    location: str
    timestamp: str
    source: EarthquakeSource = "usgs"


class AlertModel(SeismonBase):
    """Alert generated from a detected earthquake."""

    id: str
    earthquake_id: str
    severity: Severity = "low"
    message: str
    timestamp: str
    affected_radius_km: float = Field(..., ge=0.0, description="Radius in km")


class DeviceModel(SeismonBase):
    """Registered IoT sensor device."""

    device_id: str
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    last_seen: str
    online: bool = False


class SignalData(SeismonBase):
    """Accelerometer signal payload from a device."""

    device_id: str
    x: float
    y: float
    z: float
    timestamp: str
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


class SimulateRequest(SeismonBase):
    """Body for the simulate-earthquake endpoint."""

    magnitude: float = Field(..., ge=0.0, le=10.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    depth: float = Field(default=10.0, ge=0.0, le=700.0)
    location: str = "Simulatsiya"


# ────────────────────────────────────────────────────────────
# WebSocket message models  (discriminated union on `type`)
# ────────────────────────────────────────────────────────────

class WSDeviceRegister(SeismonBase):
    type: Literal["DEVICE_REGISTER"] = "DEVICE_REGISTER"
    device_id: str
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


class WSAccelData(SeismonBase):
    type: Literal["ACCEL_DATA"] = "ACCEL_DATA"
    data: SignalData


class WSEarthquakeDetected(SeismonBase):
    type: Literal["EARTHQUAKE_DETECTED"] = "EARTHQUAKE_DETECTED"
    earthquake: EarthquakeModel
    alert: AlertModel


class WSAlertBroadcast(SeismonBase):
    type: Literal["ALERT_BROADCAST"] = "ALERT_BROADCAST"
    alert: AlertModel


class WSSimulateEarthquake(SeismonBase):
    type: Literal["SIMULATE_EARTHQUAKE"] = "SIMULATE_EARTHQUAKE"
    magnitude: float = Field(..., ge=0.0, le=10.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    depth: float = Field(default=10.0, ge=0.0, le=700.0)
    location: str = "Simulatsiya"


class WSDeviceListUpdate(SeismonBase):
    type: Literal["DEVICE_LIST_UPDATE"] = "DEVICE_LIST_UPDATE"
    devices: List[DeviceModel]


class WSPing(SeismonBase):
    type: Literal["PING"] = "PING"


class WSPong(SeismonBase):
    type: Literal["PONG"] = "PONG"


WSMessage = Union[
    WSDeviceRegister,
    WSAccelData,
    WSEarthquakeDetected,
    WSAlertBroadcast,
    WSSimulateEarthquake,
    WSDeviceListUpdate,
    WSPing,
    WSPong,
]
