from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Optional, Set
from backend.app.models.vessel import Vessel
from backend.app.models.maritime_network import Port, MaritimeRoute
from backend.app.models.fuel import Fuel
from backend.app.models.optimization import VoyageCandidate
from backend.app.models.weather_intelligence import RouteEnvironmentalAssessmentRequest
from backend.app.services.interfaces.fuel_model import FuelConsumptionModelBase
from backend.app.services.demo.demo_fuel_model import DemoFuelModel
from backend.app.services.route_environmental_assessment_service import RouteEnvironmentalAssessmentService

class VoyageEvaluationService:
    """
    Orchestrates the evaluation of a single discrete decision tuple:
      (Vessel x Route x Speed x Fuel x Schedule)
    
    CRITICAL NON-DOUBLE-COUNTING RULE:
    1. Evaluates baseline fuel consumption under calm-water conditions (sea_state = 2, weather_factor = 1.0).
    2. Applies Phase 3's demo_environmental_fuel_factor exactly once:
       fuel_consumption = baseline_fuel_calm * demo_environmental_fuel_factor
    3. Sailing time is derived directly from Phase 3 segment-by-segment SOG (v_ground = v_water + c_along).
    4. Evaluates physical capacity, draft, speed envelopes, weather safety, and arrival deadlines.
    """

    def __init__(
        self,
        fuel_model: Optional[FuelConsumptionModelBase] = None,
        weather_assessment_service: Optional[RouteEnvironmentalAssessmentService] = None,
    ):
        self.fuel_model = fuel_model or DemoFuelModel()
        self.weather_service = weather_assessment_service or RouteEnvironmentalAssessmentService()

    def evaluate_candidate(
        self,
        vessel: Vessel,
        route: MaritimeRoute,
        fuel: Fuel,
        speed_knots: float,
        cargo_weight_tonnes: float,
        departure_datetime: datetime,
        deadline_datetime: datetime,
        origin_port: Port,
        destination_port: Port,
        scenario_id: Optional[str] = None
    ) -> Tuple[VoyageCandidate, List[str]]:
        """
        Evaluates a single decision tuple and returns the candidate evaluation record
        along with a list of rejection category tags for benchmarking stats.
        """
        decision_id = f"{vessel.id}::{route.id}::{speed_knots:.1f}::{fuel.id}"
        infeasibility_reasons: List[str] = []
        rejection_categories: List[str] = []

        # 1. Cargo capacity constraint
        if cargo_weight_tonnes > vessel.capacity_tonnes:
            infeasibility_reasons.append(
                f"CARGO_EXCEEDS_CAPACITY: Cargo payload ({cargo_weight_tonnes:,.0f}t) exceeds vessel deadweight capacity ({vessel.capacity_tonnes:,.0f}t)."
            )
            rejection_categories.append("capacity")

        # 2. Vessel speed bounds constraint
        if speed_knots < vessel.min_speed_knots or speed_knots > vessel.max_speed_knots:
            infeasibility_reasons.append(
                f"SPEED_OUT_OF_BOUNDS: Commanded speed ({speed_knots:.1f} kts) is outside operating envelope ({vessel.min_speed_knots:.1f} - {vessel.max_speed_knots:.1f} kts)."
            )
            rejection_categories.append("speed")

        # 3. Fuel compatibility constraint
        if fuel.id not in vessel.fuel_options:
            infeasibility_reasons.append(
                f"INCOMPATIBLE_FUEL: Fuel '{fuel.name}' ({fuel.id}) is not supported by {vessel.name} propulsion system."
            )
            rejection_categories.append("fuel_compatibility")

        # 4. Draft constraints (Ports and Segments)
        if origin_port.draft_limit_m is not None and vessel.design_draft_m > origin_port.draft_limit_m:
            infeasibility_reasons.append(
                f"DRAFT_EXCEEDS_ORIGIN_PORT: Vessel draft ({vessel.design_draft_m:.1f}m) exceeds origin port {origin_port.name} limit ({origin_port.draft_limit_m:.1f}m)."
            )
            rejection_categories.append("draft")

        if destination_port.draft_limit_m is not None and vessel.design_draft_m > destination_port.draft_limit_m:
            infeasibility_reasons.append(
                f"DRAFT_EXCEEDS_DEST_PORT: Vessel draft ({vessel.design_draft_m:.1f}m) exceeds destination port {destination_port.name} limit ({destination_port.draft_limit_m:.1f}m)."
            )
            rejection_categories.append("draft")

        for segment in route.segments:
            if segment.draft_limit_m is not None and vessel.design_draft_m > segment.draft_limit_m:
                infeasibility_reasons.append(
                    f"DRAFT_EXCEEDS_SEGMENT_LIMIT: Vessel draft ({vessel.design_draft_m:.1f}m) exceeds segment {segment.id} limit ({segment.draft_limit_m:.1f}m)."
                )
                rejection_categories.append("draft")
                break

        # 5. Phase 3 Weather & Ocean Assessment
        weather_req = RouteEnvironmentalAssessmentRequest(
            route_id=route.id,
            vessel_id=vessel.id,
            speed_knots=speed_knots,
            scenario_id=scenario_id
        )
        weather_resp = self.weather_service.assess_route(weather_req)

        if not weather_resp.is_feasible:
            infeasibility_reasons.extend(weather_resp.infeasibility_reasons)
            if any("NON_POSITIVE_EFFECTIVE_SPEED" in r for r in weather_resp.infeasibility_reasons):
                rejection_categories.append("negative_speed")
            else:
                rejection_categories.append("weather")

        sailing_time_hours = round(weather_resp.weather_adjusted_travel_time_hours, 2)
        effective_speed_knots = round(
            route.total_distance_nm / max(0.1, sailing_time_hours), 2
        ) if sailing_time_hours > 0 else speed_knots

        demo_env_factor = weather_resp.aggregate_demo_environmental_fuel_factor or 1.0
        weather_risk_level = weather_resp.overall_risk_level

        # 6. Port wait duration and schedule arrival
        port_wait_hours = round(
            (origin_port.typical_wait_hours or 0.0) + (destination_port.typical_wait_hours or 0.0), 2
        )
        total_voyage_time_hours = round(sailing_time_hours + port_wait_hours, 2)
        arrival_datetime = departure_datetime + timedelta(hours=total_voyage_time_hours)
        deadline_margin_hours = round(
            (deadline_datetime - arrival_datetime).total_seconds() / 3600.0, 2
        )

        # 7. Deadline constraint check
        if deadline_margin_hours < 0.0:
            infeasibility_reasons.append(
                f"DEADLINE_EXCEEDED: Arrival ({arrival_datetime.strftime('%Y-%m-%d %H:%M UTC')}) exceeds contractual deadline ({deadline_datetime.strftime('%Y-%m-%d %H:%M UTC')}) by {-deadline_margin_hours:.1f} hours."
            )
            rejection_categories.append("deadline")

        # 8. Fuel consumption & emissions (No double counting: calm water baseline * demo_env_factor)
        _, _, baseline_fuel_calm, _ = self.fuel_model.calculate_consumption_breakdown(
            vessel=vessel,
            fuel=fuel,
            distance_nm=route.total_distance_nm,
            speed_knots=speed_knots,
            cargo_weight_tonnes=cargo_weight_tonnes,
            sea_state=2  # Calm water reference baseline
        )
        fuel_consumption_tonnes = round(baseline_fuel_calm * demo_env_factor, 2)
        fuel_cost_usd = round(fuel_consumption_tonnes * fuel.price_per_tonne, 2)
        route_cost_usd = round(route.route_cost, 2)
        total_voyage_cost_usd = round(fuel_cost_usd + route_cost_usd, 2)

        operational_co2_tonnes = round(
            (fuel_consumption_tonnes * fuel.emission_factor_kg_co2_per_tonne) / 1000.0, 2
        )
        lifecycle_ghg_tonnes = round(
            (fuel_consumption_tonnes * fuel.lifecycle_ghg_factor_kg_co2e_per_tonne) / 1000.0, 2
        )

        cargo_utilization_pct = round(
            (cargo_weight_tonnes / max(1.0, vessel.capacity_tonnes)) * 100.0, 1
        )

        is_feasible = len(infeasibility_reasons) == 0

        candidate = VoyageCandidate(
            decision_id=decision_id,
            vessel_id=vessel.id,
            vessel_name=vessel.name,
            vessel_type=vessel.type,
            route_id=route.id,
            route_name=route.name,
            fuel_id=fuel.id,
            fuel_name=fuel.name,
            cargo_tonnes=round(cargo_weight_tonnes, 1),
            distance_nm=round(route.total_distance_nm, 1),
            cruising_speed_knots=round(speed_knots, 2),
            effective_speed_knots=effective_speed_knots,
            sailing_time_hours=sailing_time_hours,
            port_wait_hours=port_wait_hours,
            total_voyage_time_hours=total_voyage_time_hours,
            departure_datetime=departure_datetime,
            arrival_datetime=arrival_datetime,
            deadline_datetime=deadline_datetime,
            deadline_margin_hours=deadline_margin_hours,
            fuel_consumption_tonnes=fuel_consumption_tonnes,
            fuel_cost_usd=fuel_cost_usd,
            route_cost_usd=route_cost_usd,
            total_voyage_cost_usd=total_voyage_cost_usd,
            operational_co2_tonnes=operational_co2_tonnes,
            lifecycle_ghg_tonnes=lifecycle_ghg_tonnes,
            cargo_utilization_pct=cargo_utilization_pct,
            demo_environmental_fuel_factor=round(demo_env_factor, 4),
            weather_risk_level=weather_risk_level,
            is_feasible=is_feasible,
            infeasibility_reasons=infeasibility_reasons
        )

        return candidate, rejection_categories
