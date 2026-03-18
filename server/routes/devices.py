from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter

from server import database
from server.models import DeviceModel

router = APIRouter(tags=["devices"])

# Consider a device "online" if last seen within 5 minutes
ONLINE_THRESHOLD_MINUTES = 5


@router.get("/devices", response_model=List[DeviceModel])
async def get_devices():
    rows = database.get_devices()
    now = datetime.now(timezone.utc)
    result = []
    for row in rows:
        last_seen = row.get("last_seen") or ""
        online = False
        if last_seen:
            try:
                ls = datetime.fromisoformat(last_seen)
                if ls.tzinfo is None:
                    ls = ls.replace(tzinfo=timezone.utc)
                online = (now - ls) < timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
            except ValueError:
                pass
        result.append(
            DeviceModel(
                device_id=row.get("device_id", ""),
                latitude=row.get("latitude"),
                longitude=row.get("longitude"),
                last_seen=last_seen,
                online=online,
            )
        )
    return result
