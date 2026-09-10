from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Path, Depends, status
from fastapi.responses import JSONResponse

from backend.app.models.weather_intelligence import (
    SegmentEnvironmentalCondition,
    RouteEnvironmentalAssessmentRequest,
    RouteEnvironmentalAssessmentResponse,
    WeatherScenarioPreset,
)
from backend.app.models.live_weather_route import (
    LiveVoyageRequest,
    LiveVoyageResponse,
)
from backend.app.services.demo.demo_weather_provider import DemoWeatherProvider
from backend.app.services.route_environmental_assessment_service import (
    RouteEnvironmentalAssessmentService,
)
from backend.app.services.external.live_weather_route_adapter import (
    LiveWeatherRouteAdapter,
    ReferenceServiceUnavailableException,
    ReferenceBadRequestException,
)
from backend.app.api.v1.endpoints.routes import get_route_provider
from backend.app.api.v1.endpoints.fuel import get_fuel_service

router = APIRouter()

# Singletons for dependency injection
_weather_provider = DemoWeatherProvider()
_live_weather_adapter: Optional[LiveWeatherRouteAdapter] = None

def get_assessment_service() -> RouteEnvironmentalAssessmentService:
    return RouteEnvironmentalAssessmentService(
        weather_provider=_weather_provider,
        route_provider=get_route_provider(),
        fuel_service=get_fuel_service(),
    )

def get_live_weather_adapter() -> LiveWeatherRouteAdapter:
    global _live_weather_adapter
    if _live_weather_adapter is None:
        _live_weather_adapter = LiveWeatherRouteAdapter(
            fuel_service=get_fuel_service(),
        )
    return _live_weather_adapter

@router.get(
    "/segments",
    response_model=List[SegmentEnvironmentalCondition],
    summary="List all segment environmental conditions",
    description="Returns simulated oceanographic and atmospheric data across all defined route segments."
)
def get_all_segments_weather(
    scenario_id: Optional[str] = Query(
        None,
        description="Optional presentation scenario override to apply (e.g. 'scenario-a-favorable-current')"
    )
) -> List[SegmentEnvironmentalCondition]:
    return _weather_provider.get_all_segment_conditions(scenario_id=scenario_id)

@router.get(
    "/segments/{segment_id}",
    response_model=SegmentEnvironmentalCondition,
    summary="Get single segment environmental condition",
    description="Returns simulated conditions for a single route segment by ID."
)
def get_segment_weather(
    segment_id: str = Path(..., description="Target segment ID (e.g. 'SEG-SG-MALACCA')"),
    scenario_id: Optional[str] = Query(None, description="Optional presentation scenario override")
) -> SegmentEnvironmentalCondition:
    cond = _weather_provider.get_segment_condition(segment_id, scenario_id=scenario_id)
    if not cond:
        raise HTTPException(
            status_code=404,
            detail=f"Environmental data for segment '{segment_id}' not found."
        )
    return cond

@router.post(
    "/assess-route",
    response_model=RouteEnvironmentalAssessmentResponse,
    summary="Assess route under dynamic weather and ocean currents",
    description="Evaluates effective navigational SOG, transit times, weather resistance fuel multipliers, and feasibility."
)
def assess_route_environmental_impact(
    request: RouteEnvironmentalAssessmentRequest,
    service: RouteEnvironmentalAssessmentService = Depends(get_assessment_service)
) -> RouteEnvironmentalAssessmentResponse:
    return service.assess_route(request)

@router.get(
    "/scenarios",
    response_model=List[WeatherScenarioPreset],
    summary="List presentation weather scenarios",
    description="Returns deterministic scenarios (A through E) demonstrating current assistance, headwinds, rough seas, and storms."
)
def get_weather_scenarios() -> List[WeatherScenarioPreset]:
    return _weather_provider.get_all_scenarios()

@router.get(
    "/scenarios/{scenario_id}",
    response_model=WeatherScenarioPreset,
    summary="Get specific weather scenario preset",
    description="Returns details for a specific weather scenario."
)
def get_weather_scenario(
    scenario_id: str = Path(..., description="Scenario identifier (e.g. 'scenario-a-favorable-current')")
) -> WeatherScenarioPreset:
    sc = _weather_provider.get_scenario(scenario_id)
    if not sc:
        raise HTTPException(
            status_code=404,
            detail=f"Weather scenario '{scenario_id}' not found."
        )
    return sc

@router.post(
    "/live-voyage",
    response_model=LiveVoyageResponse,
    summary="Evaluate live SeaRoute maritime routing and Open-Meteo environmental conditions",
    description="Connects to the internal searoutes-weather reference service to compute maritime route candidates and live weather along track."
)
def evaluate_live_voyage(
    request: LiveVoyageRequest,
    adapter: LiveWeatherRouteAdapter = Depends(get_live_weather_adapter)
):
    try:
        return adapter.evaluate_live_voyage(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except ReferenceBadRequestException as rbe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=rbe.message)
    except ReferenceServiceUnavailableException as sue:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "source": "live_weather_engine",
                "message": sue.message
            }
        )
