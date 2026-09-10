from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LiveVoyageRequest(BaseModel):
    """
    Request model for triggering live SeaRoute + Open-Meteo weather evaluation.
    Accepts UN/LOCODEs or application port aliases (e.g. 'PORT-SG', 'PORT-RTM').
    """
    source_port: str = Field(..., description="Departure port UN/LOCODE or alias (e.g. 'SGSIN', 'PORT-SG')")
    destination_port: str = Field(..., description="Arrival port UN/LOCODE or alias (e.g. 'AEDXB', 'PORT-RTM')")
    departure_datetime: Optional[str] = Field(None, description="Departure timestamp in ISO-8601 format")
    vessel_id: Optional[str] = Field(None, description="Optional fleet vessel ID (e.g. 'VES-001') to resolve draft/speed")
    vessel_draft_m: Optional[float] = Field(None, description="Vessel design/operational draft in meters")
    vessel_speed_knots: Optional[float] = Field(None, description="Vessel cruising speed in knots")
    avoid_seca: Optional[bool] = Field(False, description="Flag to avoid Sulphur Emission Control Areas where possible")
    avoid_hra: Optional[bool] = Field(False, description="Flag to avoid High Risk Areas where possible")

class NormalizedEnvironmentalPoint(BaseModel):
    """
    Observation point along maritime route with strict null preservation.
    When parameters are unavailable from weather/marine models, fields remain None (null).
    """
    latitude: float
    longitude: float
    timestamp: str

    wind_speed_knots: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    significant_wave_height_m: Optional[float] = None
    wave_direction_deg: Optional[float] = None
    wave_period_s: Optional[float] = None
    ocean_current_velocity_knots: Optional[float] = None
    ocean_current_direction_deg: Optional[float] = None

    sea_state: Optional[int] = None
    along_track_current_knots: Optional[float] = None
    storm_flag: Optional[bool] = None
    weather_risk_level: Optional[str] = None
    visibility_m: Optional[float] = None

class NormalizedRouteOptimization(BaseModel):
    """
    Multi-factor optimization scoring and ranking metadata.
    """
    score: float
    rank: int
    distance_score: float
    wind_score: float
    wave_score: Optional[float] = None
    current_score: Optional[float] = None
    risk_score: float
    storm_penalty: float
    marine_coverage_ratio: float
    weather_coverage_ratio: float
    explanation: str

class NormalizedRoutePlan(BaseModel):
    """
    Candidate maritime route plan with explicit dual-unit distances and durations.
    """
    id: str
    is_primary: bool
    distance_m: float
    distance_nm: float
    duration_ms: float
    duration_hours: float
    geometry: Dict[str, Any]
    environmental_points: List[NormalizedEnvironmentalPoint] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    optimization: Optional[NormalizedRouteOptimization] = None

class LiveVoyageResponse(BaseModel):
    """
    Client-facing response contract for Live SeaRoute + Weather evaluation.
    Internal service endpoints/URLs are kept strictly server-side.
    """
    status: str = "success"
    source_port: str
    destination_port: str
    source_locode: str
    destination_locode: str
    routes: List[NormalizedRoutePlan] = Field(default_factory=list)
    primary_route: Optional[NormalizedRoutePlan] = None
    fuel_model_input: Optional[Dict[str, Any]] = None
    marine_coverage_ratio: float = 0.0
    weather_coverage_ratio: float = 0.0
