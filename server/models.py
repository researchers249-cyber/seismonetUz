from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class EarthquakeModel(BaseModel):
    id: str
    magnitude: float
    latitude: float
    longitude: float
    depth: float
    location: str
    timestamp: str
    source: str  # "usgs" | "emsc" | "device" | "simulated"


class AlertModel(BaseModel):
    id: str
    earthquake_id: str
    severity: str
    message: str
    timestamp: str
    affected_radius_km: float


class DeviceModel(BaseModel):
    device_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_seen: str
    online: bool = False


class SignalData(BaseModel):
    device_id: str
    x: float
    y: float
    z: float
    timestamp: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SimulateRequest(BaseModel):
    magnitude: float  # 2.0 - 9.0
    latitude: float
    longitude: float
    depth: float = 10.0
    location: str = "Simulatsiya"
