import os
from typing import List
from pydantic import BaseModel, Field

class Settings(BaseModel):
    """
    Application Settings and Environment Configuration.
    Allows easy switching between prototype demo modes and production providers.
    """
    PROJECT_NAME: str = "SIH26138 - Quantum-Inspired Green Fleet Optimization"
    VERSION: str = "0.1.0-alpha"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1")
    API_V1_STR: str = "/api/v1"

    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Data Ingestion Mode: "external" (loads stage3_maritime_routes.csv, stage6_emission_factors.csv, stage7_bunker_prices.csv) or "demo"
    DATA_SOURCE_MODE: str = os.getenv("DATA_SOURCE_MODE", "external")

    # Demo Simulation Flags
    USE_DEMO_DATA: bool = os.getenv("USE_DEMO_DATA", "true").lower() in ("true", "1")
    USE_DEMO_OPTIMIZER: bool = True

    # SeaRoutes + Weather Reference Engine Service URL
    SEAROUTES_SERVICE_URL: str = os.getenv("SEAROUTES_SERVICE_URL", "http://127.0.0.1:3001")

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

settings = Settings()
