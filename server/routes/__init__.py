from server.routes.health import router as health_router
from server.routes.earthquakes import router as eq_router
from server.routes.alerts import router as alert_router
from server.routes.devices import router as device_router

__all__ = ["health_router", "eq_router", "alert_router", "device_router"]
