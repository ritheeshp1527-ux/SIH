from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class WeatherCondition(BaseModel):
    """
    Preliminary schema for ocean and atmospheric conditions along route segments.
    """
    timestamp: datetime = Field(..., description="Forecast timestamp (UTC)")
    wind: float = Field(..., ge=0, description="Wind speed in knots", examples=[18.5])
    wave: float = Field(..., ge=0, description="Significant wave height in meters", examples=[2.2])
    current: float = Field(..., description="Ocean current speed in knots (positive=favorable)", examples=[0.8])
    sea_state: int = Field(..., ge=0, le=9, description="World Meteorological Organization (WMO) Sea State (0-9)", examples=[4])
    risk: str = Field(..., description="Categorical navigation risk: 'low', 'moderate', 'high'", examples=["moderate"])
    location_name: Optional[str] = Field(None, description="Associated waypoint or region name")

