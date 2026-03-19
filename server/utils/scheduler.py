"""Async background scheduler that polls USGS and EMSC periodically."""

import asyncio
import logging
from datetime import datetime, timezone

from server import database
from server.config import settings
from server.services import usgs, emsc
from server.services.alert import create_alert
from server.ws.manager import ws_manager

logger = logging.getLogger(__name__)

# Track already-saved external IDs to avoid duplicates within a session
_seen_ids: set[str] = set()


class AsyncScheduler:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        """Start the background polling loop (call from lifespan)."""
        if self._running:
            return
        database.create_tables()
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("Scheduler ishga tushdi (interval: %ds)", settings.poll_interval_sec)

    async def stop(self) -> None:
        """Gracefully stop the polling loop (call from lifespan shutdown)."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Scheduler to'xtatildi")

    async def _poll_loop(self) -> None:
        """Main loop: fetch from both sources, save new earthquakes and alerts."""
        while self._running:
            await self._fetch_and_save()
            try:
                await asyncio.sleep(settings.poll_interval_sec)
            except asyncio.CancelledError:
                break

    async def _fetch_and_save(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        logger.debug("Polling boshlanmoqda: %s", now)

        usgs_data, emsc_data = await asyncio.gather(
            usgs.fetch_earthquakes(),
            emsc.fetch_earthquakes(),
            return_exceptions=True,
        )

        all_earthquakes: list[dict] = []
        if isinstance(usgs_data, list):
            all_earthquakes.extend(usgs_data)
        else:
            logger.error("USGS fetch xatosi: %s", usgs_data)

        if isinstance(emsc_data, list):
            all_earthquakes.extend(emsc_data)
        else:
            logger.error("EMSC fetch xatosi: %s", emsc_data)

        new_count = 0
        for eq in all_earthquakes:
            ext_id = str(eq.get("id", ""))
            if not ext_id or ext_id in _seen_ids:
                continue
            _seen_ids.add(ext_id)

            try:
                row_id = database.save_earthquake(eq)
                alert = create_alert({**eq, "id": row_id})
                database.save_alert(
                    {
                        "earthquake_id": row_id,
                        "severity": alert["severity"],
                        "message": alert["message"],
                        "timestamp": alert["timestamp"],
                    }
                )
                await ws_manager.broadcast(
                    {
                        "type": "EARTHQUAKE_DETECTED",
                        "earthquake": {**eq, "id": str(row_id)},
                        "alert": alert,
                    }
                )
                new_count += 1
            except Exception as exc:
                logger.error("Saqlash xatosi (id=%s): %s", ext_id, exc)

        if new_count:
            logger.info("%d yangi zilzila saqlandi", new_count)


# Application-level singleton
scheduler = AsyncScheduler()
