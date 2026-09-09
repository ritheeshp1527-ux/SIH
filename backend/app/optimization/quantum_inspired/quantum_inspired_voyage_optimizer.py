import time
from typing import List, Dict, Optional, Tuple, Set
from fastapi import HTTPException

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    VoyageCandidate,
    SimulatedAnnealingConfig,
    QuantumInspiredSolution,
    QuantumInspiredOptimizationRequest,
    QuantumInspiredOptimizationResponse,
    QUBOModelSummary,
    OptimizationTimingBreakdown,
    StochasticRunTelemetry,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.qubo.qubo_builder import QUBOBuilder, QUBOModel
from backend.app.optimization.quantum_inspired.simulated_annealing_solver import (
    SimulatedAnnealingSolver,
    AnnealingResult,
)

class QuantumInspiredVoyageOptimizer:
    """
    Quantum-Inspired Classical Voyage Optimizer for SIH26138.
    
    Pipeline:
      1. Generates and evaluates the exact same Phase 4 decision space (Vessel x Route x Speed x Fuel).
      2. Pre-filters physical/operational infeasibilities to form the feasible candidate set.
      3. Constructs an inspectable QUBOModel with normalized objectives and an exact one-hot selection penalty.
      4. Solves the QUBO using multi-run classical Simulated Annealing with deterministic random seed tracking.
      5. Decodes binary vectors into voyage decisions, verifies sum(x) == 1, and revalidates maritime constraints.
      6. Ranks and returns Top-K unique feasible solutions along with QUBO diagnostics and energy values.
    """

    def __init__(
        self,
        classical_optimizer: Optional[ClassicalVoyageOptimizer] = None,
        qubo_builder: Optional[QUBOBuilder] = None,
    ):
        self.classical_optimizer = classical_optimizer or ClassicalVoyageOptimizer()
        self.qubo_builder = qubo_builder or QUBOBuilder(safety_multiplier=2.5)

    def optimize(
        self,
        request: QuantumInspiredOptimizationRequest
    ) -> QuantumInspiredOptimizationResponse:
        total_start = time.perf_counter()
        
        mode = request.objective_mode.lower()
        if mode not in ("cost", "time"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported objective_mode '{request.objective_mode}'. Must be 'cost' or 'time'."
            )

        solver_config = request.solver_config or SimulatedAnnealingConfig()
        top_k = request.top_k

        # 1. Preprocessing & Phase 4 Candidate Evaluation
        (
            evaluated_candidates,
            decision_options_preview,
            rejection_breakdown,
            raw_combinations,
            feasible_count,
            eval_runtime_ms,
        ) = self.classical_optimizer.evaluate_all_candidates(request.voyage_request)

        feasible_candidates = [c for c in evaluated_candidates if c.is_feasible]
        if not feasible_candidates:
            raise HTTPException(
                status_code=400,
                detail="No feasible candidates satisfy operational, schedule, and safety constraints for the given request."
            )

        # 2. Build QUBO Model
        qubo_build_start = time.perf_counter()
        qubo = self.qubo_builder.build_qubo(
            candidates=feasible_candidates,
            objective_mode=mode
        )
        qubo_construction_runtime_ms = round((time.perf_counter() - qubo_build_start) * 1000.0, 2)

        # 3. Multi-run Simulated Annealing Solver
        solver = SimulatedAnnealingSolver(config=solver_config)
        solver_start = time.perf_counter()
        
        solver_runs = solver_config.number_of_runs
        base_seed = solver_config.random_seed
        
        # Collect candidate solutions across runs: decision_id -> (VoyageCandidate, best_qubo_energy, seed)
        discovered_candidates: Dict[str, Tuple[VoyageCandidate, float, int]] = {}
        run_telemetry_details: List[Dict[str, Any]] = []

        for run_idx in range(solver_runs):
            run_seed = base_seed + run_idx
            result: AnnealingResult = solver.solve(qubo, seed_override=run_seed)

            run_best_did = None
            run_best_obj = None

            # Check best state from this run
            if result.is_valid_one_hot and result.selected_variable_index is not None:
                var_idx = result.selected_variable_index
                candidate = qubo.variable_to_candidate[var_idx]
                d_id = candidate.decision_id
                run_best_did = d_id
                run_best_obj = candidate.total_voyage_cost_usd if mode == "cost" else candidate.total_voyage_time_hours
                
                if d_id not in discovered_candidates or result.best_energy < discovered_candidates[d_id][1]:
                    discovered_candidates[d_id] = (candidate, result.best_energy, run_seed)

            # Also incorporate any valid one-hot states discovered during the trajectory
            for var_idx, state_energy in result.discovered_one_hot_states:
                candidate = qubo.variable_to_candidate[var_idx]
                d_id = candidate.decision_id
                if d_id not in discovered_candidates or state_energy < discovered_candidates[d_id][1]:
                    discovered_candidates[d_id] = (candidate, state_energy, run_seed)

            run_telemetry_details.append({
                "run_index": run_idx,
                "seed": run_seed,
                "is_valid_one_hot": result.is_valid_one_hot,
                "best_energy": result.best_energy,
                "decision_id": run_best_did,
                "objective_value": run_best_obj,
                "runtime_ms": result.runtime_ms,
                "iterations": result.iterations_executed
            })

        solver_runtime_ms = round((time.perf_counter() - solver_start) * 1000.0, 2)

        # 4. Decode, Revalidate, and Sort Unique Feasible Solutions
        decode_start = time.perf_counter()
        validated_solutions: List[QuantumInspiredSolution] = []
        for d_id, (candidate, energy, run_seed) in discovered_candidates.items():
            # Strict safety re-validation
            is_revalidated = (
                candidate.is_feasible and 
                candidate.deadline_margin_hours >= 0.0 and
                len(candidate.infeasibility_reasons) == 0
            )

            if is_revalidated:
                validated_solutions.append(
                    QuantumInspiredSolution(
                        rank=0,  # assigned after sorting
                        decision_id=candidate.decision_id,
                        vessel_id=candidate.vessel_id,
                        vessel_name=candidate.vessel_name,
                        route_id=candidate.route_id,
                        route_name=candidate.route_name,
                        speed_knots=candidate.cruising_speed_knots,
                        fuel_id=candidate.fuel_id,
                        fuel_name=candidate.fuel_name,
                        total_cost_usd=candidate.total_voyage_cost_usd,
                        total_duration_hours=candidate.total_voyage_time_hours,
                        fuel_consumption_tonnes=candidate.fuel_consumption_tonnes,
                        operational_co2_tonnes=candidate.operational_co2_tonnes,
                        lifecycle_ghg_tonnes=candidate.lifecycle_ghg_tonnes,
                        arrival_datetime=candidate.arrival_datetime,
                        deadline_margin_hours=candidate.deadline_margin_hours,
                        weather_risk_level=candidate.weather_risk_level,
                        qubo_energy=energy,
                        is_valid_one_hot=True,
                        is_feasible=True,
                        infeasibility_reasons=[],
                        solver_seed=run_seed,
                        candidate=candidate
                    )
                )

        # Sort according to requested objective mode
        if mode == "cost":
            validated_solutions.sort(
                key=lambda s: (
                    s.total_cost_usd,
                    s.fuel_consumption_tonnes,
                    s.lifecycle_ghg_tonnes,
                    s.total_duration_hours,
                    s.decision_id
                )
            )
        else:
            validated_solutions.sort(
                key=lambda s: (
                    s.total_duration_hours,
                    s.total_cost_usd,
                    s.fuel_consumption_tonnes,
                    s.lifecycle_ghg_tonnes,
                    s.decision_id
                )
            )

        # Assign ranks and slice to top_k
        top_solutions = validated_solutions[:top_k]
        for idx, sol in enumerate(top_solutions):
            sol.rank = idx + 1

        decoding_validation_runtime_ms = round((time.perf_counter() - decode_start) * 1000.0, 2)
        total_runtime_ms = round((time.perf_counter() - total_start) * 1000.0, 2)

        # 5. Stochastic Statistics Compilation
        valid_run_objs = [r["objective_value"] for r in run_telemetry_details if r["objective_value"] is not None]
        if valid_run_objs:
            sorted_objs = sorted(valid_run_objs)
            best_obj = sorted_objs[0]
            worst_obj = sorted_objs[-1]
            median_obj = sorted_objs[len(sorted_objs) // 2]
        else:
            best_obj = None
            worst_obj = None
            median_obj = None

        stochastic_stats = StochasticRunTelemetry(
            runs_executed=solver_runs,
            successful_runs=0,  # Cross-evaluated in benchmark service
            success_rate_pct=0.0,
            classical_optimum_found=False,
            best_run_objective=best_obj,
            median_run_objective=median_obj,
            worst_run_objective=worst_obj,
            run_details=run_telemetry_details
        )

        timing_breakdown = OptimizationTimingBreakdown(
            candidate_evaluation_runtime_ms=eval_runtime_ms,
            qubo_construction_runtime_ms=qubo_construction_runtime_ms,
            solver_runtime_ms=solver_runtime_ms,
            decoding_validation_runtime_ms=decoding_validation_runtime_ms,
            total_runtime_ms=total_runtime_ms
        )

        return QuantumInspiredOptimizationResponse(
            status="quantum_inspired_simulated_annealing",
            disclaimer=(
                "QUANTUM-INSPIRED CLASSICAL OPTIMIZATION — SOLVED VIA SIMULATED ANNEALING ON QUBO FORMULATION; "
                "NO QUANTUM HARDWARE USED. Because the current QUBO is a one-hot selection formulation over a "
                "prevalidated feasible candidate set, this phase demonstrates QUBO construction and quantum-inspired "
                "optimization methodology rather than quantum computational advantage."
            ),
            qubo_formulation_level="Feasible-decision selection (each binary variable represents one complete feasible voyage decision)",
            objective_mode=mode,
            qubo_summary=qubo.to_summary(),
            solver_config=solver_config,
            top_k_solutions=top_solutions,
            best_solution=top_solutions[0] if top_solutions else None,
            solver_runtime_ms=solver_runtime_ms,
            total_runtime_ms=total_runtime_ms,
            timing_breakdown=timing_breakdown,
            stochastic_run_stats=stochastic_stats,
            number_of_runs_executed=solver_runs,
            unique_feasible_solutions_found=len(validated_solutions),
            raw_decision_space_size=raw_combinations,
            feasible_candidate_space_size=len(feasible_candidates)
        )
