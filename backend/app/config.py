from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "SismosCR"
    debug: bool = True
    log_level: str = "INFO"

    database_url: str = "sqlite+aiosqlite:///./sismocr.db"

    ws_max_connections: int = 1000
    ws_heartbeat_interval: int = 30

    usgs_poll_interval: int = 60
    scrape_interval: int = 120

    cr_bbox_lat_min: float = 8.0
    cr_bbox_lat_max: float = 11.5
    cr_bbox_lon_min: float = -86.0
    cr_bbox_lon_max: float = -82.0

    rate_limit_per_minute: int = 60
    enable_api_v2: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
