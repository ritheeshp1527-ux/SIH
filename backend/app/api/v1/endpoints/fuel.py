from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.fuel_intelligence import (
    FuelEstimationRequest,
    FuelEstimationResult,
    ScenarioPreset,
)
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

router = APIRouter()

# Dependency provider for FuelIntelligenceService singleton
_service_instance: FuelIntelligenceService | None = None

def get_fuel_service() -> FuelIntelligenceService:
    global _service_instance
    if _service_instance is None:
        _service_instance = FuelIntelligenceService()
    return _service_instance

@router.post(
    "/estimate",
    response_model=FuelEstimationResult,
    summary="Estimate Vessel Fuel Consumption, Cost & Emissions"
)
def estimate_fuel_consumption(
    request: FuelEstimationRequest,
    service: FuelIntelligenceService = Depends(get_fuel_service)
) -> FuelEstimationResult:
    """
    Computes voyage fuel consumption rate (t/h), total fuel (t), fuel cost, operational CO2,
    optional lifecycle GHG, and efficiency indicators for a specified vessel, fuel, speed, and sea state.
    
    DISCLAIMER: Outputs are SIMULATED DEMONSTRATION ESTIMATES — NOT TRAINED ON REAL OPERATIONAL DATA.
    """
    return service.estimate_fuel(request)

@router.get(
    "/vessels",
    response_model=List[Vessel],
    summary="List Fleet Vessels"
)
def list_fleet_vessels(
    service: FuelIntelligenceService = Depends(get_fuel_service)
) -> List[Vessel]:
    """Returns available fleet vessels with propulsion specifications and fuel capabilities."""
    return service.get_vessels()

@router.get(
    "/fuels",
    response_model=List[Fuel],
    summary="List Bunker Fuel Profiles"
)
def list_fuel_profiles(
    port: Optional[str] = Query(None, description="Optional UN/LOCODE port to retrieve port-specific bunker prices (e.g. SGSIN, INBOM, NLRTM)"),
    allow_fallback: bool = Query(True, description="Whether to include fallback reference prices for unobserved fuels"),
    service: FuelIntelligenceService = Depends(get_fuel_service)
) -> List[Fuel]:
    """Returns available bunker fuel profiles including prices, energy densities, and emission factors."""
    return service.get_fuels(port=port, allow_fallback=allow_fallback)

@router.get(
    "/scenarios",
    response_model=List[ScenarioPreset],
    summary="List Deterministic Demonstration Scenarios"
)
def list_demo_scenarios(
    service: FuelIntelligenceService = Depends(get_fuel_service)
) -> List[ScenarioPreset]:
    """Returns standard scenarios demonstrating speed, distance, cargo, weather, and fuel sensitivities."""
    return service.get_scenarios()
