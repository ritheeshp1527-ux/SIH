import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from fastapi import HTTPException

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    VoyageCandidate,
    DecisionOption,
    OptimizationModeResult,
    OptimizationBenchmarkStats,
    ClassicalOptimizationResponse,
)
from backend.app.models.vessel import Vessel
from backend.app.core.config import settings
from backend.app.models.maritime_network import Port, MaritimeRoute
from backend.app.models.fuel import Fuel
from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
from backend.app.services.voyage_evaluation_service import VoyageEvaluationService
from backend.app.services.route_environmental_assessment_service import RouteEnvironmentalAssessmentService

class ClassicalVoyageOptimizer:
    """
    Exact Classical Voyage Optimization Baseline for SIH26138.
    
    Conducts deterministic, exhaustive enumeration over the discrete candidate decision space:
      Vessel x Route x Speed x Fuel
    
    The exhaustive candidate space grows multiplicatively with the number of vessels, routes, discrete speed choices and fuels. As additional decision dimensions such as bunkering, multi-leg routing, departure times, shore power and fleet-level allocation are introduced, the resulting combinatorial search space can become prohibitively large.
    
    Determines:
      - Cost-Efficient Voyage: min(total_voyage_cost_usd) subject to all operational/schedule constraints
      - Time-Efficient Voyage: min(total_voyage_time_hours) subject to all operational/schedule constraints
      - Transparent benchmarking statistics and reusable decision IDs for Phase 5 comparisons.
    """

    def __init__(
        self,
        route_provider: Optional[RouteProviderBase] = None,
        fuel_service: Optional[FuelIntelligenceService] = None,
        evaluation_service: Optional[VoyageEvaluationService] = None,
    ):
        if route_provider is None:
            route_provider = ExternalRouteProvider() if settings.DATA_SOURCE_MODE == "external" else DemoRouteProvider()
        self.route_provider = route_provider
        self.fuel_service = fuel_service or FuelIntelligenceService()
        self.eval_service = evaluation_service or VoyageEvaluationService(
            weather_assessment_service=RouteEnvironmentalAssessmentService(
                route_provider=self.route_provider,
                fuel_service=self.fuel_service
            )
        )

    def _generate_speed_grid(
        self,
        min_speed: float,
        max_speed: float,
        step: float
    ) -> List[float]:
        """
        Generates deterministic discrete speed points between min_speed and max_speed inclusive.
        """
        speeds = []
        curr = min_speed
        # Use epsilon to prevent floating-point omission of the boundary
        while curr <= max_speed + 1e-6:
            speeds.append(round(curr, 2))
            curr += step
        if speeds[-1] < max_speed - 1e-4:
            speeds.append(round(max_speed, 2))
        return speeds

    def evaluate_all_candidates(
        self,
        request: VoyageOptimizationRequest
    ) -> Tuple[List[VoyageCandidate], List[DecisionOption], Dict[str, int], int, int, float]:
        """
        Evaluates the exhaustive combinatorial candidate space: Vessel x Route x Speed x Fuel.
        Returns:
          (evaluated_candidates, decision_options, rejection_breakdown, raw_count, feasible_count, runtime_ms)
        """
        start_time = time.perf_counter()

        # 1. Validate ports
        origin_port = self.route_provider.get_port_by_id(request.source_port_id)
        if not origin_port:
            raise HTTPException(
                status_code=404,
                detail=f"Origin port '{request.source_port_id}' not found in maritime catalog."
            )

        dest_port = self.route_provider.get_port_by_id(request.destination_port_id)
        if not dest_port:
            raise HTTPException(
                status_code=404,
                detail=f"Destination port '{request.destination_port_id}' not found in maritime catalog."
            )

        if request.departure_datetime >= request.deadline_datetime:
            raise HTTPException(
                status_code=400,
                detail="Delivery deadline timestamp must be strictly after departure timestamp."
            )

        # 2. Resolve candidate routes
        all_candidate_routes = self.route_provider.get_candidate_routes(
            origin_port_id=request.source_port_id,
            destination_port_id=request.destination_port_id
        )
        if not all_candidate_routes:
            raise HTTPException(
                status_code=404,
                detail=f"No navigable candidate routes found between {request.source_port_id} and {request.destination_port_id}."
            )

        if request.route_ids:
            candidate_routes = [r for r in all_candidate_routes if r.id in request.route_ids]
            if not candidate_routes:
                for rid in request.route_ids:
                    r = self.route_provider.get_maritime_route_by_id(rid)
                    if r:
                        r_copy = r.model_copy(deep=True)
                        r_copy.origin_port = origin_port
                        r_copy.destination_port = dest_port
                        candidate_routes.append(r_copy)
            if not candidate_routes:
                raise HTTPException(
                    status_code=400,
                    detail=f"None of the requested route IDs {request.route_ids} match available candidate routes."
                )
        else:
            candidate_routes = all_candidate_routes

        # 3. Resolve fleet vessels
        all_vessels = self.fuel_service.get_vessels()
        if request.vessel_ids:
            vessels = [v for v in all_vessels if v.id in request.vessel_ids]
            if not vessels:
                raise HTTPException(
                    status_code=400,
                    detail=f"None of the requested vessel IDs {request.vessel_ids} found in fleet catalog."
                )
        else:
            vessels = all_vessels

        # 4. Resolve bunker fuels (using departure port market prices from stage7 where observed)
        all_fuels = self.fuel_service.get_fuels(port=request.source_port_id)

        # 5. Exhaustive Enumeration across Vessels x Routes x Speeds x Fuels
        evaluated_candidates: List[VoyageCandidate] = []
        decision_options_preview: List[DecisionOption] = []
        rejection_breakdown: Dict[str, int] = {
            "capacity": 0,
            "speed": 0,
            "fuel_compatibility": 0,
            "draft": 0,
            "route_restriction": 0,
            "weather": 0,
            "negative_speed": 0,
            "deadline": 0,
        }

        step = request.speed_grid_step_knots

        raw_combinations_evaluated = sum(
            len(self._generate_speed_grid(v.min_speed_knots, v.max_speed_knots, step)) 
            for v in vessels
        ) * len(candidate_routes) * len(all_fuels)

        for vessel in vessels:
            speed_grid = self._generate_speed_grid(
                vessel.min_speed_knots,
                vessel.max_speed_knots,
                step
            )

            for route in candidate_routes:
                for fuel in all_fuels:
                    for speed in speed_grid:
                        decision_id = f"{vessel.id}::{route.id}::{speed:.1f}::{fuel.id}"
                        decision_options_preview.append(
                            DecisionOption(
                                decision_id=decision_id,
                                vessel_id=vessel.id,
                                route_id=route.id,
                                fuel_id=fuel.id,
                                speed_knots=speed
                            )
                        )

                        candidate, rejections = self.eval_service.evaluate_candidate(
                            vessel=vessel,
                            route=route,
                            fuel=fuel,
                            speed_knots=speed,
                            cargo_weight_tonnes=request.cargo_weight_tonnes,
                            departure_datetime=request.departure_datetime,
                            deadline_datetime=request.deadline_datetime,
                            origin_port=origin_port,
                            destination_port=dest_port,
                            scenario_id=request.scenario_id
                        )

                        evaluated_candidates.append(candidate)
                        for r_cat in rejections:
                            if r_cat in rejection_breakdown:
                                rejection_breakdown[r_cat] += 1

        end_time = time.perf_counter()
        runtime_ms = round((end_time - start_time) * 1000.0, 2)
        feasible_count = sum(1 for c in evaluated_candidates if c.is_feasible)

        return (
            evaluated_candidates,
            decision_options_preview,
            rejection_breakdown,
            raw_combinations_evaluated,
            feasible_count,
            runtime_ms,
        )

    def optimize(
        self,
        request: VoyageOptimizationRequest
    ) -> ClassicalOptimizationResponse:
        (
            evaluated_candidates,
            decision_options_preview,
            rejection_breakdown,
            raw_combinations_evaluated,
            feasible_count,
            eval_runtime_ms,
        ) = self.evaluate_all_candidates(request)

        start_solve = time.perf_counter()

        step = request.speed_grid_step_knots
        candidate_routes = self.route_provider.get_candidate_routes(
            origin_port_id=request.source_port_id,
            destination_port_id=request.destination_port_id
        )
        if request.route_ids:
            candidate_routes = [r for r in candidate_routes if r.id in request.route_ids]

        all_vessels = self.fuel_service.get_vessels()
        if request.vessel_ids:
            vessels = [v for v in all_vessels if v.id in request.vessel_ids]
        else:
            vessels = all_vessels
        all_fuels = self.fuel_service.get_fuels(port=request.source_port_id)

        # 6. Benchmark Statistics
        total_eval = len(evaluated_candidates)
        feasible_candidates = [c for c in evaluated_candidates if c.is_feasible]
        feasible_count = len(feasible_candidates)
        infeasible_count = total_eval - feasible_count
        feasibility_rate = round((feasible_count / max(1, total_eval)) * 100.0, 2)

        total_runtime_ms = round(eval_runtime_ms + (time.perf_counter() - start_solve) * 1000.0, 2)

        benchmark_stats = OptimizationBenchmarkStats(
            raw_combinations_evaluated=raw_combinations_evaluated,
            pre_filtered_combinations=0,
            total_candidates_evaluated=total_eval,
            feasible_candidates_count=feasible_count,
            infeasible_candidates_count=infeasible_count,
            feasibility_rate_pct=feasibility_rate,
            rejection_breakdown=rejection_breakdown,
            runtime_ms=total_runtime_ms,
            speed_grid_step_knots=step,
            unique_vessels_count=len(vessels),
            unique_routes_count=len(candidate_routes),
            unique_fuels_count=len(all_fuels)
        )

        # 7. Solve Cost-Efficient Mode
        # Sort key: total cost, fuel consumption, lifecycle GHG, total voyage time, decision_id
        def cost_sort_key(c: VoyageCandidate):
            return (
                c.total_voyage_cost_usd,
                c.fuel_consumption_tonnes,
                c.lifecycle_ghg_tonnes,
                c.total_voyage_time_hours,
                c.decision_id
            )

        per_vessel_cost: Dict[str, VoyageCandidate] = {}
        for vessel in vessels:
            vessel_feasibles = [c for c in feasible_candidates if c.vessel_id == vessel.id]
            if vessel_feasibles:
                vessel_feasibles.sort(key=cost_sort_key)
                per_vessel_cost[vessel.id] = vessel_feasibles[0]

        global_best_cost: Optional[VoyageCandidate] = None
        if feasible_candidates:
            sorted_by_cost = sorted(feasible_candidates, key=cost_sort_key)
            global_best_cost = sorted_by_cost[0]

        cost_result = OptimizationModeResult(
            mode="cost_efficient",
            objective_description="Minimizes total voyage cost (fuel cost + route tolls) subject to all operational and deadline constraints",
            per_vessel_best=per_vessel_cost,
            global_best=global_best_cost
        )

        # 8. Solve Time-Efficient Mode
        # Sort key: total voyage time, total cost, fuel consumption, lifecycle GHG, decision_id
        def time_sort_key(c: VoyageCandidate):
            return (
                c.total_voyage_time_hours,
                c.total_voyage_cost_usd,
                c.fuel_consumption_tonnes,
                c.lifecycle_ghg_tonnes,
                c.decision_id
            )

        per_vessel_time: Dict[str, VoyageCandidate] = {}
        for vessel in vessels:
            vessel_feasibles = [c for c in feasible_candidates if c.vessel_id == vessel.id]
            if vessel_feasibles:
                vessel_feasibles.sort(key=time_sort_key)
                per_vessel_time[vessel.id] = vessel_feasibles[0]

        global_best_time: Optional[VoyageCandidate] = None
        if feasible_candidates:
            sorted_by_time = sorted(feasible_candidates, key=time_sort_key)
            global_best_time = sorted_by_time[0]

        time_result = OptimizationModeResult(
            mode="time_efficient",
            objective_description="Minimizes total voyage duration (sailing time + port wait) subject to all operational and deadline constraints",
            per_vessel_best=per_vessel_time,
            global_best=global_best_time
        )

        # 9. Informational Highlights (Best Fuel & Best Emissions)
        informational_fuel: Optional[VoyageCandidate] = None
        informational_emissions: Optional[VoyageCandidate] = None

        if feasible_candidates:
            informational_fuel = sorted(
                feasible_candidates,
                key=lambda c: (c.fuel_consumption_tonnes, c.total_voyage_cost_usd, c.decision_id)
            )[0]
            informational_emissions = sorted(
                feasible_candidates,
                key=lambda c: (c.operational_co2_tonnes, c.lifecycle_ghg_tonnes, c.total_voyage_cost_usd, c.decision_id)
            )[0]

        return ClassicalOptimizationResponse(
            status="exact_classical_optimization",
            disclaimer="SIMULATED VOYAGE OPTIMIZATION — DEMONSTRATION BASELINE ONLY",
            environmental_disclaimer="DEMO ENVIRONMENTAL FUEL FACTOR — NOT CALIBRATED ON REAL OPERATIONAL DATA",
            request=request,
            cost_efficient=cost_result,
            time_efficient=time_result,
            informational_best_fuel=informational_fuel,
            informational_best_emissions=informational_emissions,
            benchmark=benchmark_stats,
            candidate_decision_space_preview=decision_options_preview[:20]  # First 20 as preview
        )
