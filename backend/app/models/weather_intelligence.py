from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class SegmentEnvironmentalCondition(BaseModel):
    """
    Simulated oceanographic and atmospheric condition attached to a specific route segment.
    All physical units explicitly declared.
    """
    segment_id: str = Field(..., description="Target route segment identifier", examples=["SEG-SUEZ-TRANSIT"])
    segment_name: Optional[str] = Field(None, description="Segment descriptive title", examples=["Suez Canal Transit"])
    demo_time_window: str = Field(default="Standard Operational Season", description="Simulated forecast window/season")
    wind_speed_knots: float = Field(..., ge=0.0, le=120.0, description="Sustained wind velocity in knots", examples=[16.5])
    wind_direction_degrees: float = Field(default=0.0, ge=0.0, le=360.0, description="Wind coming direction in degrees (0-360)", examples=[45.0])
    significant_wave_height_m: float = Field(..., ge=0.0, le=25.0, description="Significant wave height (Hs) in meters", examples=[1.8])
    sea_state: int = Field(..., ge=0, le=9, description="World Meteorological Organization (WMO) Sea State (0-9)", examples=[3])
    ocean_current_speed_knots: float = Field(..., ge=0.0, le=10.0, description="Surface ocean drift velocity in knots", examples=[1.2])
    ocean_current_direction_degrees: float = Field(default=0.0, ge=0.0, le=360.0, description="Direction towards which current flows (degrees)", examples=[90.0])
    along_track_current_knots: float = Field(
        ...,
        description="Effective along-track current component (+ = assisting tail current, - = opposing head current)",
        examples=[0.8]
    )
    visibility_nm: float = Field(default=10.0, ge=0.0, le=30.0, description="Atmospheric horizontal optical visibility in nautical miles", examples=[10.0])
    storm_flag: bool = Field(default=False, description="Flag indicating active storm, tropical depression, or extreme gale")
    weather_risk_level: str = Field(default="LOW", description="'LOW', 'MODERATE', 'HIGH', 'CRITICAL'", examples=["LOW"])
    notes: Optional[str] = Field(None, description="Regional weather phenomena notes", examples=["Moderate swell south of Sri Lanka"])
    disclaimer: str = Field(
        default="SIMULATED WEATHER & OCEAN DATA — DEMONSTRATION ONLY",
        description="Non-operational transparency label"
    )

class SegmentEnvironmentalAssessment(BaseModel):
    """
    Detailed operational evaluation of a single segment under environmental conditions.
    Distinguishes Speed Through Water from Effective Speed Over Ground.

    DEMO ENVIRONMENTAL FUEL FACTOR:
    A deterministic simulated sensitivity multiplier representing the illustrative effect of
    environmental conditions on fuel-consumption estimates. It is not calibrated against
    real vessel operational data and is not a validated hydrodynamic resistance or fuel-consumption model.
    """
    segment_id: str
    segment_name: str
    distance_nm: float
    vessel_speed_knots: float = Field(..., description="Vessel commanded cruising speed through water (STW)")
    effective_current_knots: float = Field(..., description="Along-track assisting/opposing current velocity (knots)")
    effective_speed_knots: float = Field(..., description="Resultant navigational speed over ground (SOG = STW + Current)")
    baseline_travel_time_hours: float = Field(..., description="Calm-water transit time at commanded speed (hours)")
    weather_adjusted_travel_time_hours: float = Field(..., description="Transit time accounting for speed over ground (hours)")
    
    demo_environmental_fuel_factor: float = Field(
        ...,
        description="Deterministic simulated sensitivity multiplier representing illustrative environmental effect. Not calibrated on real operational data."
    )
    weather_fuel_factor: Optional[float] = Field(
        None,
        description="Backward-compatible alias for demo_environmental_fuel_factor"
    )

    condition: SegmentEnvironmentalCondition
    weather_risk_level: str = Field(..., description="'LOW', 'MODERATE', 'HIGH', 'CRITICAL'")
    is_feasible: bool = Field(default=True, description="Whether segment is safe to transit under these conditions")
    infeasibility_reasons: List[str] = Field(default_factory=list, description="Explicit safety violation codes")
    warnings: List[str] = Field(default_factory=list, description="Navigational advisories")

    @model_validator(mode="before")
    @classmethod
    def sync_fuel_factors(cls, data: Any) -> Any:
        if isinstance(data, dict):
            factor = data.get("demo_environmental_fuel_factor")
            if factor is None:
                factor = data.get("weather_fuel_factor")
            if factor is not None:
                data["demo_environmental_fuel_factor"] = factor
                data["weather_fuel_factor"] = factor
        return data

class RouteEnvironmentalAssessmentRequest(BaseModel):
    """
    Input model to assess environmental impacts across an entire candidate route.
    """
    route_id: str = Field(..., description="Route identifier", examples=["RT-SG-RTM-SUEZ"])
    vessel_id: str = Field(..., description="Fleet vessel identifier", examples=["VES-001"])
    speed_knots: float = Field(default=14.0, gt=0.0, description="Commanded speed through water in knots", examples=[14.0])
    scenario_id: Optional[str] = Field(
        None,
        description="Optional presentation scenario override (e.g. 'scenario-a-favorable-current', 'scenario-d-storm')",
        examples=["scenario-a-favorable-current"]
    )

class RouteEnvironmentalAssessmentResponse(BaseModel):
    """
    Comprehensive environmental impact assessment for a maritime passage.
    """
    status: str = Field(default="demo_environmental_assessment")
    disclaimer: str = Field(
        default="SIMULATED WEATHER & OCEAN DATA — DEMONSTRATION ONLY",
        description="Prominent non-navigational notice"
    )
    environmental_disclaimer: str = Field(
        default="DEMO ENVIRONMENTAL FUEL FACTOR — NOT CALIBRATED ON REAL OPERATIONAL DATA",
        description="Explicit heuristic factor notice"
    )
    route_id: str
    route_name: str
    vessel_id: str
    vessel_name: str
    vessel_speed_knots: float = Field(..., description="Commanded speed through water (STW)")
    total_distance_nm: float
    baseline_travel_time_hours: float
    baseline_travel_time_days: float
    weather_adjusted_travel_time_hours: float
    weather_adjusted_travel_time_days: float
    time_delta_hours: float = Field(..., description="Difference between weather-adjusted and baseline travel time")
    
    aggregate_demo_environmental_fuel_factor: float = Field(
        ...,
        description="Distance-weighted average demo environmental fuel factor for the route."
    )
    aggregate_weather_fuel_factor: Optional[float] = Field(
        None,
        description="Backward-compatible alias for aggregate_demo_environmental_fuel_factor"
    )

    overall_risk_level: str = Field(..., description="'LOW', 'MODERATE', 'HIGH', 'CRITICAL'")
    is_feasible: bool = Field(..., description="False if any mandatory segment violates safety limits")
    infeasibility_reasons: List[str]
    warnings: List[str]
    segment_assessments: List[SegmentEnvironmentalAssessment]

    @model_validator(mode="before")
    @classmethod
    def sync_aggregate_factors(cls, data: Any) -> Any:
        if isinstance(data, dict):
            factor = data.get("aggregate_demo_environmental_fuel_factor")
            if factor is None:
                factor = data.get("aggregate_weather_fuel_factor")
            if factor is not None:
                data["aggregate_demo_environmental_fuel_factor"] = factor
                data["aggregate_weather_fuel_factor"] = factor
        return data

class WeatherScenarioPreset(BaseModel):
    """
    Deterministic presentation scenario showcasing weather sensitivities.
    """
    id: str
    title: str
    description: str
    expected_behavior: str
    route_id: str
    vessel_id: str
    speed_knots: float
