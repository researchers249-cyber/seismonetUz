"""Alert creation and severity logic."""

import uuid
from datetime import datetime, timezone

from server.config import settings


def determine_severity(magnitude: float) -> str:
    """Return severity label based on earthquake magnitude."""
    if magnitude < 3.0:
        return "low"
    elif magnitude < 5.0:
        return "medium"
    elif magnitude < 7.0:
        return "high"
    else:
        return "critical"


def create_alert(earthquake: dict) -> dict:
    """Build an alert dict from an earthquake record."""
    mag = earthquake.get("magnitude", 0.0)
    location = earthquake.get("location") or "Noma'lum joy"
    severity = determine_severity(mag)

    return {
        "id": str(uuid.uuid4()),
        "earthquake_id": str(earthquake.get("id", "")),
        "severity": severity,
        "message": f"M{mag:.1f} kuchidagi zilzila: {location}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "affected_radius_km": settings.alert_radius_km,
    }
