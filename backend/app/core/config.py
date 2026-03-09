from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    environment: str = "development"
    allowed_origins: List[str] = ["http://localhost:3000", "https://roadtrip-game.vercel.app"]
    daily_route_index: int = 0


settings = Settings()
