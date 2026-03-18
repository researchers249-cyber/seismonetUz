from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 8000
    usgs_api_url: str = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    emsc_api_url: str = "https://www.seismicportal.eu/fdsnws/event/1/query"
    min_magnitude: float = 2.0
    alert_radius_km: float = 500.0
    poll_interval_sec: int = 60
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
