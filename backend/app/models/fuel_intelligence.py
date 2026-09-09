from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class FuelEstimationRequest(BaseModel):
    """
    Input parameters for estimating voyage fuel consumption, cost, and emissions.
    """
    vessel_id: str = Field(..., description="Vessel IMO or unique identifier", examples=["VES-001"])
    fuel_id: str = Field(..., description="Target fuel identifier", examples=["VLSFO"])
    cargo_weight_tonnes: float = Field(..., gt=0, description="Payload weight in metric tons", examples=[45000.0])
    distance_nm: float = Field(..., gt=0, description="Voyage distance in nautical miles", examples=[3200.0])
    speed_knots: float = Field(..., gt=0, description="Commanded cruising speed in knots", examples=[14.0])
    sea_state: int = Field(default=2, ge=0, le=9, description="WMO sea state (0=calm, 9=phenomenal)", examples=[2])
    currency: str = Field(default="USD", description="Currency symbol/code for cost output", examples=["USD"])

class FuelConsumptionBreakdown(BaseModel):
    """
    Detailed internal components of the fuel model computation.
    """
    base_hourly_rate_tonnes: float = Field(..., description="Baseline engine consumption rate at 14 knots (t/h)")
    speed_factor: float = Field(..., description="Nonlinear speed multiplier (v/14)^3")
    load_factor: float = Field(..., description="Displacement modifier based on cargo utilization")
    weather_factor: float = Field(..., description="Sea state resistance modifier")
    fuel_energy_factor: float = Field(..., description="Energy density ratio relative to VLSFO")

class FuelEstimationResult(BaseModel):
    """
    Presentation-ready response for Ship & Fuel Intelligence calculations.
    Clearly marks values as simulated demonstration estimates.
    """
    status: str = Field(default="demo_estimate", description="Computation mode indicator")
    disclaimer: str = Field(
        default="SIMULATED DEMONSTRATION ESTIMATES — NOT TRAINED ON REAL OPERATIONAL DATA",
        description="Transparency and accuracy disclaimer"
    )
    vessel_id: str = Field(..., description="Vessel identifier")
    vessel_name: str = Field(..., description="Vessel display name")
    vessel_type: str = Field(..., description="Vessel category")
    fuel_id: str = Field(..., description="Fuel identifier")
    fuel_name: str = Field(..., description="Fuel display name")
    
    # Voyage specifications
    distance_nm: float = Field(..., description="Voyage distance in nautical miles (NM)")
    speed_knots: float = Field(..., description="Average cruising speed in knots")
    sea_state: int = Field(..., description="WMO sea state (0-9)")
    cargo_weight_tonnes: float = Field(..., description="Carried cargo payload in metric tons")
    
    # Voyage duration & fuel consumption (separated rate vs total)
    travel_time_hours: float = Field(..., description="Voyage transit time in hours (distance / speed)")
    travel_time_days: float = Field(..., description="Voyage transit time in days")
    fuel_consumption_rate_tonnes_per_hour: float = Field(..., description="Hourly fuel consumption rate (t/h)")
    fuel_consumption_tonnes: float = Field(..., description="Total fuel consumed for entire voyage (metric tons)")
    
    # Commercial cost
    currency: str = Field(default="USD", description="Currency code")
    fuel_price_per_tonne: float = Field(..., description="Fuel unit cost per metric ton")
    fuel_cost: float = Field(..., description="Total bunker fuel expenditure in selected currency")
    
    # Emissions
    operational_co2_tonnes: float = Field(..., description="Direct Tank-to-Wake operational CO2 emissions (metric tons)")
    lifecycle_ghg_tonnes: Optional[float] = Field(
        None,
        description="Simulated Well-to-Wake lifecycle GHG emissions (metric tons CO2e) [DEMO PARAMETER]"
    )
    
    # Efficiency & Intensity Metrics
    fuel_per_nm_kg: float = Field(..., description="Fuel consumed per nautical mile in kilograms (kg/NM)")
    fuel_per_tonne_cargo_kg: float = Field(..., description="Fuel consumed per metric ton of cargo delivered (kg/t cargo)")
    fuel_per_tonne_nm_grams: float = Field(..., description="Transport work intensity in grams fuel per tonne-nautical-mile (g/t-NM)")
    co2_per_tonne_nm_grams: float = Field(..., description="Carbon intensity indicator in grams CO2 per tonne-nautical-mile (g CO2/t-NM)")
    vessel_utilization_percent: float = Field(..., description="Cargo weight / vessel capacity percentage (%)")
    
    # Computation breakdown
    breakdown: Optional[FuelConsumptionBreakdown] = Field(None, description="Detailed component factors")

class ScenarioPreset(BaseModel):
    """
    Standard test scenario demonstrating predictable model behavior.
    """
    id: str
    title: str
    description: str
    expected_behavior: str
    request: FuelEstimationRequest
