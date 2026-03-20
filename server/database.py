import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional
 
DB_PATH = "seismon.db"
 
 
def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
 
 
def create_tables() -> None:
    """Create all required tables if they don't already exist."""
    with _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS earthquakes (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                magnitude REAL    NOT NULL,
                latitude  REAL    NOT NULL,
                longitude REAL    NOT NULL,
                depth     REAL,
                location  TEXT,
                timestamp TEXT    NOT NULL,
                source    TEXT
            );
 
            CREATE TABLE IF NOT EXISTS alerts (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                earthquake_id INTEGER REFERENCES earthquakes(id),
                severity      TEXT    NOT NULL,
                message       TEXT,
                timestamp     TEXT    NOT NULL
            );
 
            CREATE TABLE IF NOT EXISTS devices (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id  TEXT    UNIQUE NOT NULL,
                latitude   REAL,
                longitude  REAL,
                last_seen  TEXT,
                user_agent TEXT
            );
        """)
 
 
def save_earthquake(eq: dict) -> int:
    sql = """
        INSERT INTO earthquakes (magnitude, latitude, longitude, depth, location, timestamp, source)
        VALUES (:magnitude, :latitude, :longitude, :depth, :location, :timestamp, :source)
    """
    with _get_conn() as conn:
        cur = conn.execute(sql, eq)
        return cur.lastrowid
 
 
def get_earthquakes(
    limit: int = 50,
    min_mag: Optional[float] = None,
    hours: Optional[int] = None,
) -> list[dict]:
    conditions = []
    params: list = []
 
    if min_mag is not None:
        conditions.append("magnitude >= ?")
        params.append(min_mag)
 
    if hours is not None:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        conditions.append("timestamp >= ?")
        params.append(cutoff)
 
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    params.append(limit)
 
    with _get_conn() as conn:
        rows = conn.execute(
            f"SELECT * FROM earthquakes {where} ORDER BY timestamp DESC LIMIT ?",
            params,
        ).fetchall()
    return [dict(r) for r in rows]
 
 
def save_alert(alert: dict) -> int:
    sql = """
        INSERT INTO alerts (earthquake_id, severity, message, timestamp)
        VALUES (:earthquake_id, :severity, :message, :timestamp)
    """
    with _get_conn() as conn:
        cur = conn.execute(sql, alert)
        return cur.lastrowid
 
 
def get_alerts(limit: int = 50) -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]
 
 
def save_device(device: dict) -> None:
    sql = """
        INSERT INTO devices (device_id, latitude, longitude, last_seen, user_agent)
        VALUES (:device_id, :latitude, :longitude, :last_seen, :user_agent)
        ON CONFLICT(device_id) DO UPDATE SET
            latitude   = excluded.latitude,
            longitude  = excluded.longitude,
            last_seen  = excluded.last_seen,
            user_agent = excluded.user_agent
    """
    with _get_conn() as conn:
        conn.execute(sql, device)
 
 
def get_devices() -> list[dict]:
    """Return only recently active devices (last 24 hours)."""
    # ✅ 24 soatdan eski, hech qachon ko'rinmagan qurilmalarni o'chirish
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    with _get_conn() as conn:
        conn.execute(
            "DELETE FROM devices WHERE last_seen < ? OR last_seen IS NULL",
            (cutoff,)
        )
        rows = conn.execute(
            "SELECT * FROM devices ORDER BY last_seen DESC"
        ).fetchall()
    return [dict(r) for r in rows]
 
 
def update_device_seen(device_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with _get_conn() as conn:
        conn.execute(
            "UPDATE devices SET last_seen = ? WHERE device_id = ?", (now, device_id)
        )
