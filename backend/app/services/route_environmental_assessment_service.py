from typing import List, Optional, Dict
from fastapi import HTTPException

from backend.app.models.weather_intelligence import (
    SegmentEnvironmentalCondition,
    SegmentEnvironmentalAssessment,
    RouteEnvironmentalAssessmentRequest,
    RouteEnvironmentalAssessmentResponse,
)
from backend.app.core.config import settings
from backend.app.services.interfaces.weather_provider import WeatherProviderBase
from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.services.demo.demo_weather_provider import DemoWeatherProvider
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

class RouteEnvironmentalAssessmentService:
    """
    Evaluates segment-level environmental impacts across candidate maritime passages.
    Calculates:
      - Effective navigational Speed Over Ground (SOG = STW + Current)
      - Weather-adjusted travel times vs calm-water baselines
      - Hydrodynamic weather fuel resistance factors
      - Navigational safety and physical feasibility checks
    """

    def __init__(
        self,
        weather_provider: Optional[WeatherProviderBase] = None,
        route_provider: Optional[RouteProviderBase] = None,
        fuel_service: Optional[FuelIntelligenceService] = None,
    ):
        self.weather_provider = weather_provider or DemoWeatherProvider()
        if route_provider is None:
            route_provider = ExternalRouteProvider() if settings.DATA_SOURCE_MODE == "external" else DemoRouteProvider()
        self.route_provider = route_provider
        self.fuel_service = fuel_service or FuelIntelligenceService()

    def assess_route(
        self,
        request: RouteEnvironmentalAssessmentRequest
    ) -> RouteEnvironmentalAssessmentResponse:
        route = self.route_provider.get_maritime_route_by_id(request.route_id)
        if not route:
            raise HTTPException(
                status_code=404,
                detail=f"Route '{request.route_id}' not found in maritime network."
            )

        vessel = self.fuel_service.get_vessel_by_id(request.vessel_id)
        if not vessel:
            raise HTTPException(
                status_code=404,
                detail=f"Vessel '{request.vessel_id}' not found in fleet catalog."
            )

        v_water = request.speed_knots
        if v_water <= 0.0:
            raise HTTPException(
                status_code=400,
                detail="Vessel commanded speed through water must be strictly positive."
            )

        segment_assessments: List[SegmentEnvironmentalAssessment] = []
        route_warnings: List[str] = []

        # Speed envelope check against vessel capabilities
        if v_water < vessel.min_speed_knots:
            route_warnings.append(
                f"Commanded speed ({v_water} kts) is below vessel operating minimum ({vessel.min_speed_knots} kts)."
            )
        if v_water > vessel.max_speed_knots:
            route_warnings.append(
                f"Commanded speed ({v_water} kts) exceeds vessel maximum operational speed ({vessel.max_speed_knots} kts)."
            )

        for segment in route.segments:
            cond = self.weather_provider.get_segment_condition(segment.id, scenario_id=request.scenario_id)
            if not cond:
                # Default nominal calm condition
                cond = SegmentEnvironmentalCondition(
                    segment_id=segment.id,
                    segment_name=segment.notes or segment.id,
                    wind_speed_knots=12.0,
                    significant_wave_height_m=1.0,
                    sea_state=2,
                    ocean_current_speed_knots=0.5,
                    along_track_current_knots=0.0,
                    visibility_nm=10.0,
                    storm_flag=False,
                    weather_risk_level="LOW"
                )

            # Along-track current and speed over ground
            c_along = cond.along_track_current_knots
            v_ground = v_water + c_along

            dist_nm = segment.distance_nm
            t_base = dist_nm / v_water

            # Segment safety & feasibility checks
            infeasibility_reasons: List[str] = []
            seg_warnings: List[str] = []

            if v_ground <= 0.0:
                infeasibility_reasons.append(
                    f"NON_POSITIVE_EFFECTIVE_SPEED: Opposing current ({c_along:+.1f} kts) negates or arrests vessel forward motion (STW {v_water} kts)."
                )

            if cond.significant_wave_height_m > 6.0:
                infeasibility_reasons.append(
                    f"EXCESSIVE_WAVE_HEIGHT: Significant wave height {cond.significant_wave_height_m:.1f}m exceeds permissible limit of 6.0m."
                )

            if cond.sea_state > 7:
                infeasibility_reasons.append(
                    f"SEA_STATE_TOO_HIGH: WMO Sea State {cond.sea_state} exceeds navigational threshold of 7."
                )

            if cond.visibility_nm < 1.0:
                infeasibility_reasons.append(
                    f"LOW_VISIBILITY: Optical visibility {cond.visibility_nm:.1f} NM is below critical safety minimum of 1.0 NM."
                )

            if cond.storm_flag:
                infeasibility_reasons.append(
                    "STORM_CONDITION: Active severe storm or tropical depression present in segment corridor."
                )

            is_seg_feasible = len(infeasibility_reasons) == 0

            # Transit time accounting for speed over ground
            effective_calc_speed = max(0.1, v_ground)
            t_weather = dist_nm / effective_calc_speed

            # =========================================================================
            # DEMO ENVIRONMENTAL FUEL FACTOR (HEURISTIC SENSITIVITY MULTIPLIER)
            # =========================================================================
            # Explicit semantic clarification:
            # 1. Navigational effect: v_ground = v_water + c_along dictates effective SOG and travel time.
            # 2. Environmental fuel-impact effect: Represents an illustrative demo sensitivity multiplier.
            #    Formula coefficients (0.035, 0.040, -0.020) are DEMO PARAMETERS — NOT CALIBRATED
            #    ON REAL VESSEL DATA, and do not represent a scientifically validated hydrodynamic model.
            # Bounded between 0.90 (assisting drift) and 2.00 (heavy head seas/swells).
            f_sea = 0.035 * max(0, cond.sea_state - 2)
            f_wave = 0.040 * max(0.0, cond.significant_wave_height_m - 1.5)
            f_current = -0.020 * (c_along / v_water)
            demo_factor = round(max(0.90, min(2.00, 1.0 + f_sea + f_wave + f_current)), 4)

            # Advisories and warnings
            if 4.0 <= cond.significant_wave_height_m <= 6.0:
                seg_warnings.append(f"Elevated swell warning: Hs = {cond.significant_wave_height_m:.1f}m")
            if 5 <= cond.sea_state <= 7:
                seg_warnings.append(f"Rough sea state: WMO {cond.sea_state}")
            if cond.wind_speed_knots >= 30.0:
                seg_warnings.append(f"Near gale wind velocity: {cond.wind_speed_knots:.0f} kts")
            if c_along <= -1.5:
                seg_warnings.append(f"Strong adverse current retardation: {c_along:+.1f} kts")
            if (t_weather - t_base) >= 3.0:
                seg_warnings.append(f"Significant transit delay from opposing currents: +{t_weather - t_base:.1f} hrs")

            # Segment risk determination
            if not is_seg_feasible or cond.weather_risk_level == "CRITICAL":
                seg_risk = "CRITICAL"
            elif cond.weather_risk_level == "HIGH" or cond.significant_wave_height_m >= 4.0 or cond.sea_state >= 6:
                seg_risk = "HIGH"
            elif cond.weather_risk_level == "MODERATE" or cond.significant_wave_height_m >= 2.5 or cond.sea_state >= 4 or c_along <= -1.0:
                seg_risk = "MODERATE"
            else:
                seg_risk = "LOW"

            assessment = SegmentEnvironmentalAssessment(
                segment_id=segment.id,
                segment_name=cond.segment_name or segment.notes or segment.id,
                distance_nm=round(dist_nm, 1),
                vessel_speed_knots=round(v_water, 2),
                effective_current_knots=round(c_along, 2),
                effective_speed_knots=round(v_ground, 2),
                baseline_travel_time_hours=round(t_base, 2),
                weather_adjusted_travel_time_hours=round(t_weather, 2),
                demo_environmental_fuel_factor=demo_factor,
                weather_fuel_factor=demo_factor,
                condition=cond,
                weather_risk_level=seg_risk,
                is_feasible=is_seg_feasible,
                infeasibility_reasons=infeasibility_reasons,
                warnings=seg_warnings,
            )
            segment_assessments.append(assessment)

        # Route-level aggregations
        total_distance = sum(s.distance_nm for s in segment_assessments)
        total_base_time = sum(s.baseline_travel_time_hours for s in segment_assessments)
        total_weather_time = sum(s.weather_adjusted_travel_time_hours for s in segment_assessments)
        time_delta = round(total_weather_time - total_base_time, 2)

        aggregate_factor = round(
            sum(s.demo_environmental_fuel_factor * s.distance_nm for s in segment_assessments) / total_distance,
            4
        ) if total_distance > 0 else 1.0

        route_is_feasible = all(s.is_feasible for s in segment_assessments)

        all_infeasibility_reasons: List[str] = []
        for s in segment_assessments:
            for r in s.infeasibility_reasons:
                all_infeasibility_reasons.append(f"[{s.segment_id}] {r}")

        all_warnings: List[str] = list(route_warnings)
        for s in segment_assessments:
            for w in s.warnings:
                all_warnings.append(f"[{s.segment_id}] {w}")

        if not route_is_feasible or any(s.weather_risk_level == "CRITICAL" for s in segment_assessments):
            overall_risk = "CRITICAL"
        elif any(s.weather_risk_level == "HIGH" for s in segment_assessments):
            overall_risk = "HIGH"
        elif any(s.weather_risk_level == "MODERATE" for s in segment_assessments):
            overall_risk = "MODERATE"
        else:
            overall_risk = "LOW"

        return RouteEnvironmentalAssessmentResponse(
            status="demo_environmental_assessment",
            disclaimer="SIMULATED WEATHER & OCEAN DATA — DEMONSTRATION ONLY",
            environmental_disclaimer="DEMO ENVIRONMENTAL FUEL FACTOR — NOT CALIBRATED ON REAL OPERATIONAL DATA",
            route_id=route.id,
            route_name=route.name,
            vessel_id=vessel.id,
            vessel_name=vessel.name,
            vessel_speed_knots=round(v_water, 2),
            total_distance_nm=round(total_distance, 1),
            baseline_travel_time_hours=round(total_base_time, 2),
            baseline_travel_time_days=round(total_base_time / 24.0, 2),
            weather_adjusted_travel_time_hours=round(total_weather_time, 2),
            weather_adjusted_travel_time_days=round(total_weather_time / 24.0, 2),
            time_delta_hours=time_delta,
            aggregate_demo_environmental_fuel_factor=aggregate_factor,
            aggregate_weather_fuel_factor=aggregate_factor,
            overall_risk_level=overall_risk,
            is_feasible=route_is_feasible,
            infeasibility_reasons=all_infeasibility_reasons,
            warnings=all_warnings,
            segment_assessments=segment_assessments,
        )
