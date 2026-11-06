from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

_SERVER_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DB_PATH = os.path.join(_SERVER_DIR, "penjadwalan_ga.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistem Penjadwalan Kuliah Berbasis Algoritma Genetika"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "unu-penjadwalan-genetika-super-secret-key-2026"
    
    # Database URL: default to local SQLite with absolute path
    DATABASE_URL: str = f"sqlite:///{_DB_PATH}"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
