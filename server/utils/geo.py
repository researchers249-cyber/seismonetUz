from math import radians, sin, cos, sqrt, atan2

_EARTH_RADIUS_KM = 6371.0


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in km between two coordinates."""
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * atan2(sqrt(a), sqrt(1 - a))


def is_within_radius(
    center_lat: float,
    center_lon: float,
    point_lat: float,
    point_lon: float,
    radius_km: float,
) -> bool:
    """Return True if the point lies within *radius_km* of the centre."""
    return haversine(center_lat, center_lon, point_lat, point_lon) <= radius_km


def format_coords(lat: float, lon: float) -> str:
    """Return a human-readable coordinate string, e.g. '41.299N, 69.240E'."""
    lat_dir = "N" if lat >= 0 else "S"
    lon_dir = "E" if lon >= 0 else "W"
    return f"{abs(lat):.3f}{lat_dir}, {abs(lon):.3f}{lon_dir}"
