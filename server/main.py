from contextlib import asynccontextmanager
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from server import database
from server.models import SimulateRequest
from server.routes import health_router, eq_router, alert_router, device_router
from server.services.alert import create_alert
from server.ws.manager import ws_manager
from server.ws.routes import ws_router
from server.utils.scheduler import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_tables()
    await scheduler.start()
    yield
    await scheduler.stop()


app = FastAPI(title="SEISMON API", version="1.0.0", lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(eq_router, prefix="/api")
app.include_router(alert_router, prefix="/api")
app.include_router(device_router, prefix="/api")
app.include_router(ws_router)


@app.post("/api/simulate")
async def simulate_earthquake(body: SimulateRequest):
    now = datetime.now(timezone.utc).isoformat()
    eq = {
        "id": str(uuid.uuid4()),
        "magnitude": body.magnitude,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "depth": body.depth,
        "location": body.location,
        "timestamp": now,
        "source": "simulated",
    }
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
    return {"status": "ok", "earthquake_id": row_id}


# ↓ "/" o'chirildi — StaticFiles egallab oladi
@app.get("/api/status")
async def root():
    return {"message": "SEISMON API ishlayapti"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server.main:app", host="0.0.0.0", port=port, reload=True)


# ↓ Eng oxirida — "/" bo'sh bo'lgani uchun React ishlaydi
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")