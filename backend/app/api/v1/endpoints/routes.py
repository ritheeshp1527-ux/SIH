from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException

from backend.app.models.maritime_network import (
    Port,
    Waypoint,
    MaritimeRoute,
    CandidateRouteRequest,
    CandidateRouteResponse,
)
from backend.app.core.config import settings
from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
from backend.app.api.v1.endpoints.fuel import get_fuel_service

router = APIRouter()

# Dependency singleton for RouteProvider
_route_provider_instance: RouteProviderBase | None = None

def get_route_provider() -> RouteProviderBase:
    global _route_provider_instance
    if _route_provider_instance is None:
        if settings.DATA_SOURCE_MODE == "external":
            _route_provider_instance = ExternalRouteProvider()
        else:
            _route_provider_instance = DemoRouteProvider()
    return _route_provider_instance

@router.get("/ports", response_model=List[Port], summary="List Maritime Commercial Ports")
def list_ports(
    provider: RouteProviderBase = Depends(get_route_provider)
) -> List[Port]:
    """Returns all available commercial maritime origin/destination ports with draft limits and fuel availability."""
    return provider.get_ports()

@router.get("/waypoints", response_model=List[Waypoint], summary="List Navigational Waypoints")
def list_waypoints(
    provider: RouteProviderBase = Depends(get_route_provider)
) -> List[Waypoint]:
    """Returns all navigational waypoints, straits, canals, and ocean passages in the network graph."""
    return provider.get_waypoints()

@router.get("", response_model=List[MaritimeRoute], summary="List All Network Routes")
def list_all_routes(
    provider: RouteProviderBase = Depends(get_route_provider)
) -> List[MaritimeRoute]:
    """Returns all predefined candidate routes with resolved waypoints and segments."""
    return provider.get_all_maritime_routes()

@router.get("/{route_id}", response_model=MaritimeRoute, summary="Get Route by Identifier")
def get_route_by_id(
    route_id: str,
    provider: RouteProviderBase = Depends(get_route_provider)
) -> MaritimeRoute:
    """Retrieves full route details, including segment distance breakdown and navigational restrictions."""
    route = provider.get_maritime_route_by_id(route_id)
    if not route:
        raise HTTPException(
            status_code=404,
            detail=f"Maritime route with ID '{route_id}' not found."
        )
    return route

@router.post("/candidates", response_model=CandidateRouteResponse, summary="Generate Candidate Maritime Routes")
def generate_candidate_routes(
    request: CandidateRouteRequest,
    provider: RouteProviderBase = Depends(get_route_provider),
    fuel_service: FuelIntelligenceService = Depends(get_fuel_service)
) -> CandidateRouteResponse:
    """
    Generates feasible and infeasible candidate maritime routes between origin and destination ports.
    Performs draft limit verification against port berths and canal segments (e.g. Suez 16.0m limit).
    """
    origin = provider.get_port_by_id(request.origin_port_id)
    if not origin:
        raise HTTPException(
            status_code=404,
            detail=f"Origin port '{request.origin_port_id}' not found."
        )

    destination = provider.get_port_by_id(request.destination_port_id)
    if not destination:
        raise HTTPException(
            status_code=404,
            detail=f"Destination port '{request.destination_port_id}' not found."
        )

    vessel = None
    if request.vessel_id:
        vessel = fuel_service.get_vessel_by_id(request.vessel_id)
        if not vessel:
            raise HTTPException(
                status_code=404,
                detail=f"Vessel with ID '{request.vessel_id}' not found."
            )

    candidates = provider.get_candidate_routes(
        origin_port_id=request.origin_port_id,
        destination_port_id=request.destination_port_id,
        vessel=vessel,
        cargo_weight_tonnes=request.cargo_weight_tonnes
    )

    feasible_count = sum(1 for r in candidates if r.feasibility_status == "feasible")

    return CandidateRouteResponse(
        status="demo_network",
        disclaimer="SIMULATED MARITIME NETWORK — DEMONSTRATION DATA ONLY",
        origin_port=origin,
        destination_port=destination,
        vessel_id=vessel.id if vessel else None,
        vessel_name=vessel.name if vessel else None,
        cargo_weight_tonnes=request.cargo_weight_tonnes,
        candidate_routes=candidates,
        total_candidates=len(candidates),
        feasible_candidates=feasible_count
    )
