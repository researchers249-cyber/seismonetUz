"""EMSC (European-Mediterranean Seismological Centre) API integration."""

import logging
from datetime import datetime, timezone, timedelta

import httpx

from server.config import settings

logger = logging.getLogger(__name__)


async def fetch_earthquakes() -> list[dict]:
    """Fetch recent earthquakes from EMSC for Central Asia region."""
    start_time = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime(
        "%Y-%m-%dT%H:%M:%S"
    )
    params = {
        "format": "json",
        "limit": 50,
        "minmag": settings.min_magnitude,
        "minlat": 30,
        "maxlat": 55,
        "minlon": 55,
        "maxlon": 85,
        "starttime": start_time,
        "orderby": "time",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(settings.emsc_api_url, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("EMSC so'rov xatosi: %s", exc)
        return []
    except Exception as exc:
        logger.error("EMSC noma'lum xato: %s", exc)
        return []

    earthquakes: list[dict] = []

    # EMSC returns either {"features": [...]} (GeoJSON) or {"earthquakes": [...]}
    features = data.get("features") or []
    raw_list = data.get("earthquakes") or []

    for feature in features:
        try:
            props = feature.get("properties", {})
            coords = feature.get("geometry", {}).get("coordinates", [0, 0, 0])
            time_str = props.get("time") or props.get("lastupdate") or ""
            # Normalise timezone marker
            timestamp = time_str.replace(" ", "T")
            if not timestamp.endswith("Z") and "+" not in timestamp:
                timestamp += "Z"

            earthquakes.append(
                {
                    "id": props.get("unid") or props.get("evid") or feature.get("id", ""),
                    "magnitude": float(props.get("mag") or 0),
                    "latitude": float(coords[1]),
                    "longitude": float(coords[0]),
                    "depth": float(coords[2]) if len(coords) > 2 else 0.0,
                    "location": props.get("flynn_region") or props.get("place") or "",
                    "timestamp": timestamp,
                    "source": "emsc",
                }
            )
        except Exception as exc:
            logger.warning("EMSC feature parse xatosi: %s", exc)
            continue

    for item in raw_list:
        try:
            time_str = item.get("time") or item.get("lastupdate") or ""
            timestamp = time_str.replace(" ", "T")
            if not timestamp.endswith("Z") and "+" not in timestamp:
                timestamp += "Z"

            earthquakes.append(
                {
                    "id": item.get("unid") or item.get("evid") or "",
                    "magnitude": float(item.get("mag") or 0),
                    "latitude": float(item.get("lat") or 0),
                    "longitude": float(item.get("lon") or 0),
                    "depth": float(item.get("depth") or 0),
                    "location": item.get("flynn_region") or item.get("place") or "",
                    "timestamp": timestamp,
                    "source": "emsc",
                }
            )
        except Exception as exc:
            logger.warning("EMSC item parse xatosi: %s", exc)
            continue

    logger.info("EMSC: %d ta zilzila olindi", len(earthquakes))
    return earthquakes
