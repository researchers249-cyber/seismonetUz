"""
SEISMON — Akselerometr signal tahlili.

Mobil qurilma tebranishini tahlil qilib, haqiqiy zilzilani
oddiy harakatdan (telefon silkitish, eshik yopilishi) farqlash.

Asosiy strategiyalar:
─────────────────────────────────────────────────────────────
1. G-kuchi chegarasi — faqat min_g_force dan yuqori signallar
2. Davomiylik tekshiruvi — zilzila > 300 ms, telefon tushishi < 100 ms
3. Uzluksizlik — signallar orasida katta bo'shliq yo'q
4. Cooldown — 30 s oralig'ida qayta trigger yo'q
5. Ko'p qurilma tasdiqlash — ishonchlilikni oshiradi
6. Confidence darajasi — 0.0-1.0, past = faqat log, broadcast yo'q
"""

from __future__ import annotations

import logging
import math
import time
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

# ── constants ──────────────────────────────────────────────
GRAVITY_MS2: float = 9.81
_MAX_SIGNAL_GAP_MS: float = 500.0  # max gap between consecutive samples


class SignalAnalyzer:
    """
    Akselerometr signalini tahlil qiluvchi.

    Qurilmalardan keluvchi ``(x, y, z)`` ma'lumotlarni bufferga yig'ib,
    zilzilaga xos patternni aniqlaydi.  Yolg'on signallarni (silkitish,
    eshik yopilishi, telefon tushishi) filtrlaydi.

    *Linear acceleration* (gravitatsiya olib tashlangan) kutiladi:
    tinch holatda ``(x≈0, y≈0, z≈0)``.
    """

    THRESHOLDS: dict[str, float | int] = {
        "min_g_force": 0.15,        # minimal g-kuchi (linear)
        "min_duration_ms": 300,     # minimal davomiylik
        "freq_min_hz": 1.0,        # zilzila chastota diapazoni (past)
        "freq_max_hz": 20.0,       # zilzila chastota diapazoni (yuqori)
        "min_confirmations": 2,    # yuqori confidence uchun qurilmalar soni
    }

    # ── init ───────────────────────────────────────────

    def __init__(self) -> None:
        self.signal_buffer: list[dict[str, Any]] = []
        self.buffer_max: int = 100
        self._last_trigger_time: float = 0          # epoch seconds
        self._cooldown_sec: int = 30
        self._lock: Lock = Lock()

        # Ko'p qurilma tasdiqlash
        self._device_triggers: dict[str, float] = {}   # device_id → epoch sec
        self._trigger_window_sec: float = 10.0

    # ── public API ─────────────────────────────────────

    def add_signal(self, signal: dict[str, Any]) -> dict[str, Any] | None:
        """
        Yangi signal qo'shing va tahlil qiling.

        Parameters
        ----------
        signal : dict
            Kamida ``x``, ``y``, ``z`` (float, m/s²) va ``device_id`` (str).
            Ixtiyoriy: ``timestamp`` (epoch ms yoki ISO str).

        Returns
        -------
        dict | None
            Zilzila aniqlansa::

                {
                    "detected": True,
                    "estimated_magnitude": float,
                    "confidence": float,
                    "max_g_force": float,
                    "duration_ms": float,
                    "device_id": str,
                    "confirmations": int,
                }

            Aks holda ``None``.
        """
        x = float(signal.get("x", 0.0))
        y = float(signal.get("y", 0.0))
        z = float(signal.get("z", 0.0))
        device_id: str = signal.get("device_id", "unknown")

        g_force = self._calculate_g_force(x, y, z)
        now_ms = time.time() * 1000.0
        timestamp_ms = self._parse_timestamp(signal.get("timestamp"), now_ms)

        entry: dict[str, Any] = {
            "device_id": device_id,
            "x": x,
            "y": y,
            "z": z,
            "g_force": g_force,
            "timestamp_ms": timestamp_ms,
        }

        with self._lock:
            # ── buffer boshqaruvi ──
            self.signal_buffer.append(entry)
            if len(self.signal_buffer) > self.buffer_max:
                self.signal_buffer = self.signal_buffer[-self.buffer_max :]

            # ── tez rad etish ──
            if g_force < self.THRESHOLDS["min_g_force"]:
                return None

            # ── pattern tekshiruvi ──
            is_valid, max_g, duration_ms = self._is_valid_earthquake_pattern()

            if not is_valid:
                return None

            # ── cooldown ──
            now_sec = time.time()
            elapsed = now_sec - self._last_trigger_time
            if elapsed < self._cooldown_sec:
                logger.info(
                    "Zilzila pattern topildi lekin cooldown faol (%.0fs qoldi)",
                    self._cooldown_sec - elapsed,
                )
                return None

            self._last_trigger_time = now_sec

            # ── ko'p qurilma tasdiqlash ──
            self._cleanup_stale_triggers(now_sec)
            self._device_triggers[device_id] = now_sec
            num_confirmations = len(self._device_triggers)

            magnitude = self._estimate_magnitude(max_g, duration_ms)
            confidence = self._calculate_confidence(
                num_confirmations, max_g, duration_ms
            )

            result: dict[str, Any] = {
                "detected": True,
                "estimated_magnitude": round(magnitude, 1),
                "confidence": round(confidence, 3),
                "max_g_force": round(max_g, 4),
                "duration_ms": round(duration_ms, 1),
                "device_id": device_id,
                "confirmations": num_confirmations,
            }

            logger.warning(
                "ZILZILA ANIQLANDI: M%.1f "
                "(confidence=%.2f, g=%.3f, dur=%.0fms, devices=%d)",
                magnitude,
                confidence,
                max_g,
                duration_ms,
                num_confirmations,
            )
            return result

    # ── calculations ───────────────────────────────────

    def _calculate_g_force(self, x: float, y: float, z: float) -> float:
        """
        Linear akseleratsiyani g-kuchiga aylantirish.

        ``sqrt(x² + y² + z²) / 9.81``

        Tinch holatda (linear accel) ≈ 0.0 g.
        """
        return math.sqrt(x * x + y * y + z * z) / GRAVITY_MS2

    def _estimate_magnitude(self, max_g: float, duration_ms: float) -> float:
        """
        Taxminiy magnitud: logarifmik shkala.

        Kalibrlash nuqtalari::

            0.15 g  →  ≈ M 2.0
            0.50 g  →  ≈ M 3.5
            1.00 g  →  ≈ M 5.0
            3.00 g  →  ≈ M 7.0

        Formula: ``M = a · ln(g) + b``

        Chiqarish::

            a · ln(0.15) + b = 2.0   →  -1.897a + b = 2.0
            a · ln(3.00) + b = 7.0   →   1.099a + b = 7.0
            ─────────────────────────────────────────────
            a = 5.0 / 2.996 ≈ 1.669
            b = 2.0 + 1.897 × 1.669  ≈ 5.167

        Uzun davom etgan hodisa (> 1 s) uchun kichik bonus qo'shiladi.
        """
        if max_g <= 0:
            return 0.0

        a = 1.669
        b = 5.167
        base_mag = a * math.log(max_g) + b

        # Davomiylik bonusi (> 1000 ms → max +0.5)
        duration_bonus = 0.0
        if duration_ms > 1000:
            duration_bonus = min(0.5, math.log10(duration_ms / 1000) * 0.3)

        magnitude = base_mag + duration_bonus
        return max(1.0, min(9.5, magnitude))

    def _is_valid_earthquake_pattern(self) -> tuple[bool, float, float]:
        """
        Buffer zilzila patterniga mos keladimi?

        Returns
        -------
        tuple[bool, float, float]
            ``(is_valid, max_g_force, duration_ms)``

        Tekshiruvlar:

        1. **G-kuchi** — eng yuqori g-force threshold dan oshishi kerak
        2. **Davomiylik** — ketma-ket yuqori signallar ≥ ``min_duration_ms``
        3. **Uzluksizlik** — signallar orasida > 500 ms bo'shliq bo'lmasligi
        """
        if len(self.signal_buffer) < 2:
            return False, 0.0, 0.0

        threshold: float = float(self.THRESHOLDS["min_g_force"])

        # Oxirdan boshlab, ketma-ket threshold dan yuqori signallarni yig'ish
        above: list[dict[str, Any]] = []
        max_g = 0.0

        for entry in reversed(self.signal_buffer):
            if entry["g_force"] >= threshold:
                above.append(entry)
                if entry["g_force"] > max_g:
                    max_g = entry["g_force"]
            else:
                # Birinchi past signal → joriy hodisa tugadi
                if above:
                    break

        if len(above) < 2:
            return False, 0.0, 0.0

        # Davomiylik: above[0] = eng oxirgi, above[-1] = eng birinchi
        t_start: float = above[-1]["timestamp_ms"]
        t_end: float = above[0]["timestamp_ms"]
        duration_ms = t_end - t_start

        if duration_ms < float(self.THRESHOLDS["min_duration_ms"]):
            return False, max_g, duration_ms

        # Uzluksizlik: ketma-ket signallar orasida katta gap yo'qligini tekshirish
        chronological = list(reversed(above))
        for i in range(1, len(chronological)):
            gap = chronological[i]["timestamp_ms"] - chronological[i - 1]["timestamp_ms"]
            if gap > _MAX_SIGNAL_GAP_MS:
                logger.debug(
                    "Signal uzilishi: %.0f ms gap — uzluksiz pattern emas",
                    gap,
                )
                return False, max_g, duration_ms

        return True, max_g, duration_ms

    def _calculate_confidence(
        self,
        num_confirmations: int,
        max_g: float,
        duration_ms: float,
    ) -> float:
        """
        Ishonchlilik darajasi ``[0.0, 1.0]``.

        Uchta omil:

        * **Qurilmalar** — ko'p qurilma tasdiqlasa → yuqori (0.2 – 0.5)
        * **G-kuchi** — kuchli signal → yuqori (0.0 – 0.3)
        * **Davomiylik** — uzoq davom etsa → yuqori (0.0 – 0.2)
        """
        min_conf = int(self.THRESHOLDS["min_confirmations"])

        # Qurilma omili
        if num_confirmations >= min_conf:
            device_factor = min(0.5, 0.3 + 0.1 * (num_confirmations - min_conf))
        else:
            device_factor = 0.2  # bitta qurilma — past ishonch

        # G-kuchi omili
        g_threshold = float(self.THRESHOLDS["min_g_force"])
        g_norm = min(max_g / (g_threshold * 10), 1.0)
        g_factor = g_norm * 0.3

        # Davomiylik omili
        min_dur = float(self.THRESHOLDS["min_duration_ms"])
        dur_norm = min(duration_ms / (min_dur * 10), 1.0)
        dur_factor = dur_norm * 0.2

        return min(1.0, max(0.0, device_factor + g_factor + dur_factor))

    # ── maintenance ────────────────────────────────────

    def _cleanup_stale_triggers(self, now_sec: float) -> None:
        """Eskirgan qurilma triggerlarini tozalash (correlation window tashqarisida)."""
        cutoff = now_sec - self._trigger_window_sec
        stale = [did for did, ts in self._device_triggers.items() if ts < cutoff]
        for did in stale:
            del self._device_triggers[did]

    def reset(self) -> None:
        """Buffer va barcha holatni tozalash."""
        with self._lock:
            self.signal_buffer.clear()
            self._device_triggers.clear()
            self._last_trigger_time = 0

    def reset_device(self, device_id: str) -> None:
        """Ma'lum qurilma bufferini tozalash."""
        with self._lock:
            self.signal_buffer = [
                s for s in self.signal_buffer if s.get("device_id") != device_id
            ]
            self._device_triggers.pop(device_id, None)

    # ── helpers ────────────────────────────────────────

    @staticmethod
    def _parse_timestamp(
        raw: Any,
        fallback_ms: float,
    ) -> float:
        """Timestamp ni epoch millisekund ga aylantirish."""
        if isinstance(raw, (int, float)):
            return float(raw)
        # ISO string yoki boshqa formatlar — fallback
        return fallback_ms


# ── module-level singleton ─────────────────────────────
analyzer = SignalAnalyzer()
