import time
from typing import Optional, Dict, Any

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    SimulatedAnnealingConfig,
    QuantumInspiredOptimizationRequest,
    ClassicalOptimizationResponse,
    QuantumInspiredOptimizationResponse,
    MethodBenchmarkSummary,
    OptimizationComparisonResponse,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import QuantumInspiredVoyageOptimizer

class OptimizationBenchmarkService:
    """
    Benchmarking Service comparing Phase 4 Classical Exact Baseline vs Phase 5 Quantum-Inspired Optimization.
    
    Principles:
      - Rigorous scientific fairness: identical request, constraints, candidate pool, and objective evaluation.
      - Objective reporting: calculates relative objective gaps without marketing bias or false quantum advantage claims.
    """

    def __init__(
        self,
        classical_optimizer: Optional[ClassicalVoyageOptimizer] = None,
        quantum_optimizer: Optional[QuantumInspiredVoyageOptimizer] = None,
    ):
        self.classical_optimizer = classical_optimizer or ClassicalVoyageOptimizer()
        self.quantum_optimizer = quantum_optimizer or QuantumInspiredVoyageOptimizer(
            classical_optimizer=self.classical_optimizer
        )

    def compare(
        self,
        request: VoyageOptimizationRequest,
        objective_mode: str = "cost",
        top_k: int = 5,
        solver_config: Optional[SimulatedAnnealingConfig] = None,
    ) -> OptimizationComparisonResponse:
        """
        Executes both Classical Exact Enumeration and Quantum-Inspired Simulated Annealing on the exact same request.
        """
        mode = objective_mode.lower()
        if mode not in ("cost", "time"):
            raise ValueError(f"objective_mode must be 'cost' or 'time', got '{objective_mode}'")

        # 1. Execute Classical Exact Baseline
        classical_resp: ClassicalOptimizationResponse = self.classical_optimizer.optimize(request)

        # 2. Execute Quantum-Inspired Optimizer
        qi_req = QuantumInspiredOptimizationRequest(
            voyage_request=request,
            objective_mode=mode,
            top_k=top_k,
            solver_config=solver_config or SimulatedAnnealingConfig()
        )
        qi_resp: QuantumInspiredOptimizationResponse = self.quantum_optimizer.optimize(qi_req)

        # 3. Extract Classical Metrics for requested objective mode
        if mode == "cost":
            cl_best_cand = classical_resp.cost_efficient.global_best
        else:
            cl_best_cand = classical_resp.time_efficient.global_best

        cl_cost = cl_best_cand.total_voyage_cost_usd if cl_best_cand else None
        cl_time = cl_best_cand.total_voyage_time_hours if cl_best_cand else None
        cl_fuel = cl_best_cand.fuel_consumption_tonnes if cl_best_cand else None
        cl_co2 = cl_best_cand.operational_co2_tonnes if cl_best_cand else None
        cl_dec_id = cl_best_cand.decision_id if cl_best_cand else None

        classical_summary = MethodBenchmarkSummary(
            method_name="Classical Exact Enumeration",
            best_cost_usd=cl_cost,
            best_time_hours=cl_time,
            fuel_consumption_tonnes=cl_fuel,
            operational_co2_tonnes=cl_co2,
            runtime_ms=classical_resp.benchmark.runtime_ms,
            candidates_evaluated=classical_resp.benchmark.total_candidates_evaluated,
            feasible_solutions_count=classical_resp.benchmark.feasible_candidates_count,
            best_decision_id=cl_dec_id,
            details={
                "search_strategy": "Deterministic Exhaustive Grid Enumeration",
                "guarantee": "Global Optimum over Discretized Search Grid",
                "raw_combinations": classical_resp.benchmark.raw_combinations_evaluated
            }
        )

        # 4. Extract Quantum-Inspired Metrics
        qi_best_sol = qi_resp.best_solution
        qi_cost = qi_best_sol.total_cost_usd if qi_best_sol else None
        qi_time = qi_best_sol.total_duration_hours if qi_best_sol else None
        qi_fuel = qi_best_sol.fuel_consumption_tonnes if qi_best_sol else None
        qi_co2 = qi_best_sol.operational_co2_tonnes if qi_best_sol else None
        qi_dec_id = qi_best_sol.decision_id if qi_best_sol else None

        qi_summary = MethodBenchmarkSummary(
            method_name="Quantum-Inspired Simulated Annealing (QUBO)",
            best_cost_usd=qi_cost,
            best_time_hours=qi_time,
            fuel_consumption_tonnes=qi_fuel,
            operational_co2_tonnes=qi_co2,
            runtime_ms=qi_resp.total_runtime_ms,
            candidates_evaluated=qi_resp.qubo_summary.num_variables,
            feasible_solutions_count=qi_resp.unique_feasible_solutions_found,
            best_decision_id=qi_dec_id,
            details={
                "solver_runtime_ms": qi_resp.solver_runtime_ms,
                "qubo_variables": qi_resp.qubo_summary.num_variables,
                "qubo_nonzero_terms": qi_resp.qubo_summary.num_nonzero_coefficients,
                "penalty_magnitude": qi_resp.qubo_summary.penalty_magnitude,
                "number_of_runs": qi_resp.number_of_runs_executed,
                "base_seed": qi_resp.solver_config.random_seed
            }
        )

        # 5. Compute Relative Objective Gaps: (QI - Classical) / Classical * 100
        cost_gap = None
        if qi_cost is not None and cl_cost is not None and cl_cost > 0:
            cost_gap = round(((qi_cost - cl_cost) / cl_cost) * 100.0, 4)

        time_gap = None
        if qi_time is not None and cl_time is not None and cl_time > 0:
            time_gap = round(((qi_time - cl_time) / cl_time) * 100.0, 4)

        fuel_gap = None
        if qi_fuel is not None and cl_fuel is not None and cl_fuel > 0:
            fuel_gap = round(((qi_fuel - cl_fuel) / cl_fuel) * 100.0, 4)

        co2_gap = None
        if qi_co2 is not None and cl_co2 is not None and cl_co2 > 0:
            co2_gap = round(((qi_co2 - cl_co2) / cl_co2) * 100.0, 4)

        # 6. Evaluate Stochastic Run Telemetry against Classical Optimum
        cl_target_val = cl_cost if mode == "cost" else cl_time
        stochastic_stats = qi_resp.stochastic_run_stats

        successful_runs = 0
        if stochastic_stats and cl_dec_id:
            for r in stochastic_stats.run_details:
                matched = (r["decision_id"] == cl_dec_id)
                r["matched_classical_optimum"] = matched
                if cl_target_val and cl_target_val > 0 and r["objective_value"] is not None:
                    r["relative_gap_pct"] = round(((r["objective_value"] - cl_target_val) / cl_target_val) * 100.0, 4)
                if matched:
                    successful_runs += 1

            total_runs = stochastic_stats.runs_executed
            stochastic_stats.successful_runs = successful_runs
            stochastic_stats.success_rate_pct = round((successful_runs / max(1, total_runs)) * 100.0, 2)
            stochastic_stats.classical_optimum_found = (successful_runs > 0)

            if cl_target_val and cl_target_val > 0:
                if stochastic_stats.best_run_objective is not None:
                    stochastic_stats.best_objective_gap_pct = round(((stochastic_stats.best_run_objective - cl_target_val) / cl_target_val) * 100.0, 4)
                if stochastic_stats.median_run_objective is not None:
                    stochastic_stats.median_objective_gap_pct = round(((stochastic_stats.median_run_objective - cl_target_val) / cl_target_val) * 100.0, 4)
                if stochastic_stats.worst_run_objective is not None:
                    stochastic_stats.worst_objective_gap_pct = round(((stochastic_stats.worst_run_objective - cl_target_val) / cl_target_val) * 100.0, 4)

        total_runs_count = stochastic_stats.runs_executed if stochastic_stats else 0
        success_ratio_str = f"{successful_runs}/{total_runs_count} runs found classical optimum"

        # 7. Scientific Defensibility Statement (Adhering strictly to neutral language)
        if cl_dec_id == qi_dec_id:
            match_status = f"Quantum-Inspired Simulated Annealing discovered the exact classical global optimum ({success_ratio_str})."
        else:
            primary_gap = cost_gap if mode == "cost" else time_gap
            if mode == "cost":
                time_diff = (cl_time - qi_time) if (cl_time and qi_time) else 0.0
                tradeoff_text = f", while delivering a {time_diff:.1f} hours ({abs(time_gap):.2f}%) faster transit" if (time_gap and time_gap < 0) else ""
                match_status = (
                    f"Quantum-Inspired optimizer converged to a feasible solution with a relative cost gap of {primary_gap:+.2f}% "
                    f"relative to the classical cost-optimal solution{tradeoff_text}."
                )
            else:
                cost_diff = (cl_cost - qi_cost) if (cl_cost and qi_cost) else 0.0
                tradeoff_text = f", while reducing total voyage expenditure by ${cost_diff:,.2f} ({abs(cost_gap):.2f}%)" if (cost_gap and cost_gap < 0) else ""
                match_status = (
                    f"Quantum-Inspired optimizer converged to a feasible solution with a relative duration gap of {primary_gap:+.2f}% "
                    f"relative to the classical time-optimal solution{tradeoff_text}."
                )

        summary_text = (
            f"Both algorithms evaluated identical decision spaces under the '{mode}' objective. "
            f"{match_status} "
            f"Stochastic success rate: {success_ratio_str}. "
            "The current prototype uses a feasible-decision selection QUBO. Each binary variable represents one complete feasible Vessel × Route × Speed × Fuel combination generated by the classical maritime evaluation layer. "
            "This demonstrates QUBO formulation and quantum-inspired optimization methodology, but does not claim quantum computational advantage."
        )

        return OptimizationComparisonResponse(
            status="optimization_comparison_complete",
            objective_mode=mode,
            classical_optimum_found=(successful_runs > 0),
            successful_runs_ratio=success_ratio_str,
            classical=classical_summary,
            quantum_inspired=qi_summary,
            cost_gap_percent=cost_gap,
            time_gap_percent=time_gap,
            fuel_gap_percent=fuel_gap,
            co2_gap_percent=co2_gap,
            timing_breakdown=qi_resp.timing_breakdown,
            stochastic_run_stats=stochastic_stats,
            classical_full_response=classical_resp,
            quantum_inspired_full_response=qi_resp,
            scientific_summary=summary_text
        )
