import hashlib
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

from backend.app.models.workflow import (
    WorkflowOptimizationRequest,
    WorkflowOptimizationResponse,
    WorkflowStagesResult,
    WorkflowMetadata,
    FuelIntelligenceStageResult,
    MaritimeNetworkStageResult,
    WeatherOceanStageResult,
    ClassicalOptimizationStageResult,
    QuantumInspiredStageResult,
    ComparativeAnalysisStageResult,
)
from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    QuantumInspiredOptimizationRequest,
    SimulatedAnnealingConfig,
)
from backend.app.models.fuel_intelligence import FuelEstimationRequest
from backend.app.models.weather_intelligence import RouteEnvironmentalAssessmentRequest
from backend.app.models.decision_analysis import (
    ComparativeAnalysisRequest,
    DecisionPriority,
)
from backend.app.core.config import settings
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.route_environmental_assessment_service import RouteEnvironmentalAssessmentService
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import QuantumInspiredVoyageOptimizer
from backend.app.services.comparative_analysis_service import ComparativeAnalysisService


class EndToEndWorkflowService:
    """
    Phase 7 — Part 1: End-to-End Backend Orchestration Service.

    Coordinates the execution sequence across existing discrete services:
      Phase 1 -> Ship & Fuel Intelligence
      Phase 2 -> Maritime Network Construction
      Phase 3 -> Weather & Ocean Feasibility
      Phase 4 -> Classical Exact Voyage Optimization
      Phase 5 -> Quantum-Inspired QUBO + Simulated Annealing
      Phase 6 -> Comparative Decision Analysis & Recommendation

    This service is strictly an orchestration coordinator; it contains NO new
    optimization logic, fuel equations, QUBO formulation, or weather models.
    """

    def __init__(
        self,
        fuel_service: Optional[FuelIntelligenceService] = None,
        route_provider: Optional[RouteProviderBase] = None,
        weather_service: Optional[RouteEnvironmentalAssessmentService] = None,
        classical_optimizer: Optional[ClassicalVoyageOptimizer] = None,
        quantum_optimizer: Optional[QuantumInspiredVoyageOptimizer] = None,
        comparative_service: Optional[ComparativeAnalysisService] = None,
    ):
        self.fuel_service = fuel_service or FuelIntelligenceService()
        if route_provider is None:
            route_provider = ExternalRouteProvider() if settings.DATA_SOURCE_MODE == "external" else DemoRouteProvider()
        self.route_provider = route_provider
        self.weather_service = weather_service or RouteEnvironmentalAssessmentService(
            route_provider=self.route_provider,
            fuel_service=self.fuel_service
        )
        self.classical_optimizer = classical_optimizer or ClassicalVoyageOptimizer(
            route_provider=self.route_provider,
            fuel_service=self.fuel_service
        )
        self.quantum_optimizer = quantum_optimizer or QuantumInspiredVoyageOptimizer(
            classical_optimizer=self.classical_optimizer
        )
        self.comparative_service = comparative_service or ComparativeAnalysisService(
            classical_optimizer=self.classical_optimizer,
            quantum_optimizer=self.quantum_optimizer
        )

    def _compute_workflow_id(
        self,
        req: VoyageOptimizationRequest,
        priority: DecisionPriority,
        top_k: int,
        seed: int
    ) -> str:
        """
        Generates a deterministic workflow identifier based on canonical request parameters.
        """
        hash_input = (
            f"{req.source_port_id}:{req.destination_port_id}:{req.cargo_weight_tonnes}:"
            f"{req.departure_datetime.isoformat()}:{req.deadline_datetime.isoformat()}:"
            f"{priority.value}:{top_k}:{seed}"
        )
        digest = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:12].upper()
        return f"WF-{digest}"

    def execute_workflow(
        self,
        request: WorkflowOptimizationRequest,
        raise_on_error: bool = True
    ) -> WorkflowOptimizationResponse:
        """
        Executes the end-to-end pipeline deterministically across Phases 1 through 6.
        """
        wall_clock_start = time.perf_counter()
        voyage_req = request.voyage_request
        priority = request.priority
        top_k = request.top_k
        solver_config = request.solver_config or SimulatedAnnealingConfig()
        seed = solver_config.random_seed

        workflow_id = self._compute_workflow_id(voyage_req, priority, top_k, seed)

        stage_completion_status: Dict[str, str] = {
            "fuel_intelligence": "pending",
            "maritime_network": "pending",
            "weather_ocean": "pending",
            "classical_optimization": "pending",
            "quantum_inspired": "pending",
            "comparative_analysis": "pending",
        }

        stages = WorkflowStagesResult()
        current_stage = "fuel_intelligence"

        try:
            # =========================================================================
            # STAGE 1: Phase 1 — Ship & Fuel Intelligence
            # =========================================================================
            current_stage = "fuel_intelligence"
            stage_completion_status[current_stage] = "running"

            all_vessels = self.fuel_service.get_vessels()
            all_fuels = self.fuel_service.get_fuels(port=voyage_req.source_port_id)

            # Filter vessels if requested
            if voyage_req.vessel_ids:
                matching_vessels = [v for v in all_vessels if v.id in voyage_req.vessel_ids]
                if not matching_vessels:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Requested vessel IDs {voyage_req.vessel_ids} not found in fleet catalog."
                    )
                candidate_vessels = matching_vessels
            else:
                candidate_vessels = all_vessels

            # Select representative vessel (capable of cargo if possible)
            capable_vessels = [v for v in candidate_vessels if v.capacity_tonnes >= voyage_req.cargo_weight_tonnes]
            selected_vessel = capable_vessels[0] if capable_vessels else candidate_vessels[0]

            # Select representative fuel
            selected_fuel = None
            if selected_vessel.fuel_options:
                selected_fuel = self.fuel_service.get_fuel_by_id(selected_vessel.fuel_options[0], port=voyage_req.source_port_id)
            if not selected_fuel and all_fuels:
                selected_fuel = all_fuels[0]

            # Representative fuel estimate
            rep_estimate = None
            nominal_speed = round((selected_vessel.min_speed_knots + selected_vessel.max_speed_knots) / 2.0, 1)
            if selected_vessel and selected_fuel:
                rep_cargo = min(voyage_req.cargo_weight_tonnes, selected_vessel.capacity_tonnes)
                rep_estimate = self.fuel_service.estimate_fuel(
                    FuelEstimationRequest(
                        vessel_id=selected_vessel.id,
                        fuel_id=selected_fuel.id,
                        distance_nm=1000.0,
                        speed_knots=nominal_speed,
                        cargo_weight_tonnes=rep_cargo,
                        weather_factor=1.0,
                        include_breakdown=True
                    )
                )

            stages.fuel_intelligence = FuelIntelligenceStageResult(
                status="completed",
                available_vessels_count=len(all_vessels),
                available_fuels_count=len(all_fuels),
                selected_vessel_context=selected_vessel,
                selected_fuel_context=selected_fuel,
                representative_fuel_estimate=rep_estimate,
                notes=[
                    f"Fleet verified: {len(all_vessels)} vessels, {len(all_fuels)} fuel options.",
                    f"Selected representative vessel: {selected_vessel.name} ({selected_vessel.id}).",
                ]
            )
            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # STAGE 2: Phase 2 — Maritime Network Construction
            # =========================================================================
            current_stage = "maritime_network"
            stage_completion_status[current_stage] = "running"

            origin_port = self.route_provider.get_port_by_id(voyage_req.source_port_id)
            if not origin_port:
                raise HTTPException(
                    status_code=404,
                    detail=f"Origin port '{voyage_req.source_port_id}' not found in maritime network."
                )

            dest_port = self.route_provider.get_port_by_id(voyage_req.destination_port_id)
            if not dest_port:
                raise HTTPException(
                    status_code=404,
                    detail=f"Destination port '{voyage_req.destination_port_id}' not found in maritime network."
                )

            candidate_routes = self.route_provider.get_candidate_routes(
                origin_port_id=origin_port.id,
                destination_port_id=dest_port.id,
                vessel=selected_vessel,
                cargo_weight_tonnes=voyage_req.cargo_weight_tonnes
            )

            if voyage_req.route_ids:
                candidate_routes = [r for r in candidate_routes if r.id in voyage_req.route_ids]

            if not candidate_routes:
                raise HTTPException(
                    status_code=400,
                    detail=f"No candidate routes found connecting '{origin_port.id}' to '{dest_port.id}'."
                )

            feasibility_breakdown = {
                r.id: (r.feasibility_status == "feasible") for r in candidate_routes
            }
            feasible_routes_count = sum(1 for is_feas in feasibility_breakdown.values() if is_feas)

            stages.maritime_network = MaritimeNetworkStageResult(
                status="completed",
                origin_port_id=voyage_req.source_port_id,
                destination_port_id=voyage_req.destination_port_id,
                candidate_routes_count=len(candidate_routes),
                candidate_routes=candidate_routes,
                feasible_routes_count=feasible_routes_count,
                route_feasibility_breakdown=feasibility_breakdown,
                notes=[
                    f"Evaluated {len(candidate_routes)} network corridor(s) between {origin_port.name} and {dest_port.name}.",
                    f"Physical & draft feasible routes: {feasible_routes_count}/{len(candidate_routes)}."
                ]
            )
            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # STAGE 3: Phase 3 — Weather & Ocean Feasibility
            # =========================================================================
            current_stage = "weather_ocean"
            stage_completion_status[current_stage] = "running"

            route_assessments = {}
            weather_fuel_factors = {}
            safe_routes_count = 0
            unsafe_routes_count = 0

            for route in candidate_routes:
                assessment = self.weather_service.assess_route(
                    RouteEnvironmentalAssessmentRequest(
                        route_id=route.id,
                        vessel_id=selected_vessel.id,
                        speed_knots=nominal_speed,
                        scenario_id=voyage_req.scenario_id
                    )
                )
                route_assessments[route.id] = assessment
                weather_fuel_factors[route.id] = assessment.aggregate_weather_fuel_factor
                if assessment.is_feasible:
                    safe_routes_count += 1
                else:
                    unsafe_routes_count += 1

            stages.weather_ocean = WeatherOceanStageResult(
                status="completed",
                scenario_id=voyage_req.scenario_id or "default_deterministic",
                assessed_routes_count=len(route_assessments),
                route_assessments=route_assessments,
                safe_routes_count=safe_routes_count,
                unsafe_routes_count=unsafe_routes_count,
                weather_fuel_factors=weather_fuel_factors,
                notes=[
                    f"Evaluated ocean currents and sea conditions for {len(route_assessments)} candidate route(s).",
                    f"Safe navigational corridors: {safe_routes_count}, Unsafe: {unsafe_routes_count}."
                ]
            )
            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # STAGE 4: Phase 4 — Classical Exact Voyage Optimization
            # =========================================================================
            current_stage = "classical_optimization"
            stage_completion_status[current_stage] = "running"

            classical_resp = self.classical_optimizer.optimize(voyage_req)

            best_cost_id = (
                classical_resp.cost_efficient.global_best.decision_id
                if classical_resp.cost_efficient.global_best else None
            )
            best_time_id = (
                classical_resp.time_efficient.global_best.decision_id
                if classical_resp.time_efficient.global_best else None
            )

            stages.classical_optimization = ClassicalOptimizationStageResult(
                status="completed",
                total_evaluated_combinations=classical_resp.benchmark.total_candidates_evaluated,
                feasible_solutions_count=classical_resp.benchmark.feasible_candidates_count,
                runtime_ms=classical_resp.benchmark.runtime_ms,
                best_cost_candidate_id=best_cost_id,
                best_time_candidate_id=best_time_id,
                full_response=classical_resp
            )

            if classical_resp.benchmark.feasible_candidates_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No feasible candidates satisfy operational, schedule, and safety constraints for the given request."
                )

            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # STAGE 5: Phase 5 — Quantum-Inspired Optimization
            # =========================================================================
            current_stage = "quantum_inspired"
            stage_completion_status[current_stage] = "running"

            qi_req = QuantumInspiredOptimizationRequest(
                voyage_request=voyage_req,
                objective_mode="cost",
                solver_config=solver_config,
                top_k=top_k
            )
            qi_resp = self.quantum_optimizer.optimize(qi_req)

            best_qi_id = (
                qi_resp.best_solution.decision_id
                if qi_resp.best_solution else None
            )

            stages.quantum_inspired = QuantumInspiredStageResult(
                status="completed",
                qubo_variable_count=qi_resp.qubo_summary.num_variables,
                qubo_formulation_level="Single-Voyage Discrete One-Hot QUBO",
                solver_runtime_ms=qi_resp.solver_runtime_ms,
                total_runtime_ms=qi_resp.total_runtime_ms,
                best_decision_id=best_qi_id,
                top_k_solutions_count=len(qi_resp.top_k_solutions),
                full_response=qi_resp
            )
            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # STAGE 6: Phase 6 — Comparative Decision Analysis
            # =========================================================================
            current_stage = "comparative_analysis"
            stage_completion_status[current_stage] = "running"

            comp_req = ComparativeAnalysisRequest(
                voyage_request=voyage_req,
                priority=priority,
                top_k=top_k
            )
            comp_resp = self.comparative_service.analyze(comp_req)

            selected_rec = comp_resp.recommendations.get(priority) or comp_resp.recommendations.get(
                priority.value if hasattr(priority, "value") else str(priority)
            )
            rec_id = selected_rec.candidate.decision_id if selected_rec else "NONE"

            stages.comparative_analysis = ComparativeAnalysisStageResult(
                status="completed",
                pareto_front_count=len(comp_resp.pareto_front),
                selected_priority=priority,
                recommended_decision_id=rec_id,
                full_response=comp_resp
            )
            stage_completion_status[current_stage] = "completed"

            # =========================================================================
            # Traceability & Metadata Finalization
            # =========================================================================
            wall_clock_end = time.perf_counter()
            total_runtime_ms = round((wall_clock_end - wall_clock_start) * 1000.0, 2)

            metadata = WorkflowMetadata(
                workflow_id=workflow_id,
                execution_status="completed",
                failed_stage=None,
                error_detail=None,
                stage_completion_status=stage_completion_status,
                total_runtime_ms=total_runtime_ms,
                deterministic_mode=True,
                timestamp_utc=datetime.now(timezone.utc).isoformat(),
                assumptions=[
                    "Deterministic end-to-end orchestration across Phase 1 to Phase 6.",
                    "Calls existing services without modifying or duplicating optimization models.",
                    "Simulated Annealing is seeded for bitwise reproducibility.",
                    "No quantum advantage or hardware execution is claimed."
                ]
            )

            return WorkflowOptimizationResponse(
                request=voyage_req,
                stages=stages,
                workflow_metadata=metadata
            )

        except Exception as exc:
            wall_clock_end = time.perf_counter()
            total_runtime_ms = round((wall_clock_end - wall_clock_start) * 1000.0, 2)
            stage_completion_status[current_stage] = "failed"
            error_message = exc.detail if isinstance(exc, HTTPException) else str(exc)

            metadata = WorkflowMetadata(
                workflow_id=workflow_id,
                execution_status="failed",
                failed_stage=current_stage,
                error_detail=error_message,
                stage_completion_status=stage_completion_status,
                total_runtime_ms=total_runtime_ms,
                deterministic_mode=True,
                timestamp_utc=datetime.now(timezone.utc).isoformat(),
                assumptions=[
                    "Deterministic end-to-end orchestration across Phase 1 to Phase 6.",
                    f"Workflow execution halted at stage '{current_stage}'."
                ]
            )

            if raise_on_error:
                if isinstance(exc, HTTPException):
                    raise exc
                raise HTTPException(
                    status_code=500,
                    detail=f"Workflow failed at stage '{current_stage}': {error_message}"
                )

            return WorkflowOptimizationResponse(
                request=voyage_req,
                stages=stages,
                workflow_metadata=metadata
            )
