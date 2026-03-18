from typing import List, Optional

from fastapi import APIRouter, Query

from server import database
from server.models import EarthquakeModel

router = APIRouter(tags=["earthquakes"])


@router.get("/earthquakes", response_model=List[EarthquakeModel])
async def get_earthquakes(
    limit: int = Query(default=50, ge=1, le=500),
    min_magnitude: Optional[float] = Query(default=None, ge=0.0),
    hours: Optional[int] = Query(default=None, ge=1),
):
    rows = database.get_earthquakes(limit=limit, min_mag=min_magnitude, hours=hours)
    result = []
    for row in rows:
        result.append(
            EarthquakeModel(
                id=str(row.get("id", "")),
                magnitude=row.get("magnitude", 0.0),
                latitude=row.get("latitude", 0.0),
                longitude=row.get("longitude", 0.0),
                depth=row.get("depth") or 0.0,
                location=row.get("location") or "",
                timestamp=row.get("timestamp", ""),
                source=row.get("source") or "unknown",
            )
        )
    return result
