from typing import List

from fastapi import APIRouter, Query

from server import database
from server.config import settings
from server.models import AlertModel

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=List[AlertModel])
async def get_alerts(limit: int = Query(default=50, ge=1, le=500)):
    rows = database.get_alerts(limit=limit)
    result = []
    for row in rows:
        result.append(
            AlertModel(
                id=str(row.get("id", "")),
                earthquake_id=str(row.get("earthquake_id", "")),
                severity=row.get("severity", "low"),
                message=row.get("message") or "",
                timestamp=row.get("timestamp", ""),
                affected_radius_km=settings.alert_radius_km,
            )
        )
    return result
