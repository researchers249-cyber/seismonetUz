"""USGS Earthquake API integration."""

import logging
from datetime import datetime, timezone, timedelta

import httpx

from server.config import settings

logger = logging.getLogger(__name__)


async def fetch_earthquakes() -> list[dict]:
    """Fetch recent earthquakes from USGS for Central Asia region."""
    start_time = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime(
        "%Y-%m-%dT%H:%M:%S"
    )
    params = {
        "format": "geojson",
        "starttime": start_time,
        "minmagnitude": settings.min_magnitude,
        "minlatitude": 30,
        "maxlatitude": 55,
        "minlongitude": 55,
        "maxlongitude": 85,
        "orderby": "time",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(settings.usgs_api_url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("USGS so'rov xatosi: %s", exc)
        return []
    except Exception as exc:
        logger.error("USGS noma'lum xato: %s", exc)
        return []

    earthquakes: list[dict] = []
    for feature in data.get("features", []):
        try:
            props = feature.get("properties", {})
            coords = feature.get("geometry", {}).get("coordinates", [0, 0, 0])
            time_ms = props.get("time") or 0
            timestamp = datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat()

            earthquakes.append(
                {
                    "id": props.get("code", feature.get("id", "")),
                    "magnitude": float(props.get("mag") or 0),
                    "latitude": float(coords[1]),
                    "longitude": float(coords[0]),
                    "depth": float(coords[2]) if len(coords) > 2 else 0.0,
                    "location": props.get("place") or "",
                    "timestamp": timestamp,
                    "source": "usgs",
                }
            )
        except Exception as exc:
            logger.warning("USGS feature parse xatosi: %s", exc)
            continue

    logger.info("USGS: %d ta zilzila olindi", len(earthquakes))
    return earthquakes
