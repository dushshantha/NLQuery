from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "NLQuery"
    ENVIRONMENT: str = "development"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # CORS Configuration
    BACKEND_CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]

    # Database Configuration
    DB_TYPE: str
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    DB_SSL: bool = False

    # AI Configuration
    AI_PROVIDER: str
    AI_API_KEY: str
    AI_MODEL: Optional[str] = None
    AI_TEMPERATURE: float = 0
    AI_MAX_TOKENS: int = 1000

    class Config:
        env_file = ".env"


settings = Settings()