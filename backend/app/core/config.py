import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-it-in-production-1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.db")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    class Config:
        env_file = ".env"

settings = Settings()
