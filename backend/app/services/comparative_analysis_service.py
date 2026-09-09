import math
from typing import List, Dict, Tuple, Optional, Any

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    VoyageCandidate,
    MethodBenchmarkSummary,
    QuantumInspiredOptimizationRequest,
    QuantumInspiredOptimizationResponse
)
from backend.app.models.decision_analysis import (
    ComparativeAnalysisRequest,
    ComparativeAnalysisResponse,
    DecisionPriority,
    TradeoffMetrics,
    MethodComparisonRecord,
    CandidateComparisonRecord,
    EnvironmentalAnalysis,
    ScheduleAnalysis,
    Recommendation
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import QuantumInspiredVoyageOptimizer
from backend.app.services.optimization_benchmark_service import OptimizationBenchmarkService

class ComparativeAnalysisService:
    """
    Phase 6: Post-Optimization Comparative Decision Analysis Service.
    
    Consumes outputs from Phase 4 (Classical Exact) and Phase 5 (Quantum-Inspired Simulated Annealing)
    and constructs multi-objective trade-offs, Pareto dominance, priority-based selections,
    and a transparent balanced recommendation closest to the ideal theoretical point.
    
    This service is NOT an optimizer. It evaluates precomputed optimization outcomes.
    """

    def __init__(
        self,
        classical_optimizer: Optional[ClassicalVoyageOptimizer] = None,
        quantum_optimizer: Optional[QuantumInspiredVoyageOptimizer] = None,
        benchmark_service: Optional[OptimizationBenchmarkService] = None
    ):
        self.classical_optimizer = classical_optimizer or ClassicalVoyageOptimizer()
        self.quantum_optimizer = quantum_optimizer or QuantumInspiredVoyageOptimizer(
            classical_optimizer=self.classical_optimizer
        )
        self.benchmark_service = benchmark_service or OptimizationBenchmarkService(
            classical_optimizer=self.classical_optimizer,
            quantum_optimizer=self.quantum_optimizer
        )

    def analyze(self, request: ComparativeAnalysisRequest) -> ComparativeAnalysisResponse:
        voyage_req = request.voyage_request
        priority = request.priority

        # 1. Evaluate classical candidates
        (
            evaluated_candidates,
            _, _, _, _, _
        ) = self.classical_optimizer.evaluate_all_candidates(voyage_req)
        feasible_candidates = [c for c in evaluated_candidates if c.is_feasible]
        if not feasible_candidates:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="No feasible candidates found for comparative analysis. Constraints preclude physical/schedule feasibility."
            )

        # 2. Run benchmark comparison to obtain both Classical Exact and QI outcomes
        benchmark_resp = self.benchmark_service.compare(
            request=voyage_req,
            objective_mode="cost",
            top_k=request.top_k
        )

        qi_full_response = benchmark_resp.quantum_inspired_full_response

        # 3. Calculate Pareto Front from feasible candidates
        pareto_front = self._calculate_pareto_front(feasible_candidates)

        # 4. Determine Recommendations for each operational priority
        recommendations = self._generate_recommendations(pareto_front, benchmark_resp.classical_full_response)

        # Ensure the selected priority has a recommendation (default to BALANCED or COST)
        selected_rec = recommendations.get(priority)
        if not selected_rec:
            selected_rec = recommendations.get(DecisionPriority.BALANCED, recommendations[DecisionPriority.COST])

        # 5. Compute Trade-offs and Head-to-Head Comparison Record
        cl_cand = next((c for c in feasible_candidates if c.decision_id == benchmark_resp.classical.best_decision_id), None)
        qi_best_sol = qi_full_response.best_solution
        qi_cand_raw = qi_best_sol.candidate if qi_best_sol else None

        cl_runtime = benchmark_resp.classical.runtime_ms
        qi_runtime = benchmark_resp.quantum_inspired.runtime_ms

        cl_record = (
            CandidateComparisonRecord.from_candidate(
                candidate=cl_cand,
                optimization_method="Classical Exact Enumeration",
                runtime=cl_runtime,
                qubo_energy=None
            )
            if cl_cand else None
        )
        qi_record = (
            CandidateComparisonRecord.from_candidate(
                candidate=qi_cand_raw,
                optimization_method="Quantum-Inspired Simulated Annealing",
                runtime=qi_runtime,
                qubo_energy=qi_best_sol.qubo_energy if qi_best_sol else None
            )
            if qi_cand_raw else None
        )

        tradeoffs = self._compute_tradeoffs(
            cl=cl_cand,
            qi=qi_cand_raw,
            cl_runtime=cl_runtime,
            qi_runtime=qi_runtime,
            objective_mode="cost"
        )

        comparison = MethodComparisonRecord(
            classical_candidate=cl_record,
            quantum_inspired_candidate=qi_record,
            tradeoffs=tradeoffs,
            cost_difference=tradeoffs.cost_difference,
            cost_percentage_difference=tradeoffs.cost_percentage_difference,
            time_difference=tradeoffs.time_difference,
            time_percentage_difference=tradeoffs.time_percentage_difference,
            fuel_difference=tradeoffs.fuel_difference,
            co2_difference=tradeoffs.co2_difference,
            lifecycle_ghg_difference=tradeoffs.lifecycle_ghg_difference,
            deadline_margin_difference=tradeoffs.deadline_margin_difference,
            runtime_difference=tradeoffs.runtime_difference,
            objective_gap=tradeoffs.objective_gap
        )

        # 6. Environmental and Schedule analysis for the selected recommendation
        env_analysis = EnvironmentalAnalysis(
            fuel_consumption_tonnes=selected_rec.candidate.fuel_consumption_tonnes,
            operational_co2_tonnes=selected_rec.candidate.operational_co2_tonnes,
            lifecycle_ghg_tonnes=selected_rec.candidate.lifecycle_ghg_tonnes
        )

        is_safe = selected_rec.candidate.deadline_margin_hours > 0
        status = "Safe" if selected_rec.candidate.deadline_margin_hours > 5.0 else ("Tight" if is_safe else "Infeasible")

        sched_analysis = ScheduleAnalysis(
            departure_datetime=selected_rec.candidate.departure_datetime.isoformat(),
            arrival_datetime=selected_rec.candidate.arrival_datetime.isoformat(),
            deadline_datetime=voyage_req.deadline_datetime.isoformat(),
            deadline_margin_hours=selected_rec.candidate.deadline_margin_hours,
            is_safe=is_safe,
            status=status
        )

        return ComparativeAnalysisResponse(
            request=voyage_req,
            classical=benchmark_resp.classical,
            quantum_inspired=benchmark_resp.quantum_inspired,
            classical_summary=benchmark_resp.classical,
            quantum_inspired_summary=benchmark_resp.quantum_inspired,
            comparison=comparison,
            pareto_front=pareto_front,
            recommendations=recommendations,
            tradeoffs=tradeoffs,
            environmental_analysis=env_analysis,
            schedule_analysis=sched_analysis,
            qi_top_k=qi_full_response.top_k_solutions
        )

    def _calculate_pareto_front(self, candidates: List[VoyageCandidate]) -> List[VoyageCandidate]:
        """
        Calculates the non-dominated Pareto front over the finite feasible candidate set.
        Objectives to minimize:
        1. total_voyage_cost_usd
        2. total_voyage_time_hours
        3. fuel_consumption_tonnes
        4. operational_co2_tonnes
        5. lifecycle_ghg_tonnes

        Candidate A dominates B when:
        A_k <= B_k for all k in {cost, time, fuel, co2, ghg} and
        A_k < B_k for at least one k.
        """
        def get_obj(c: VoyageCandidate):
            return (
                c.total_voyage_cost_usd,
                c.total_voyage_time_hours,
                c.fuel_consumption_tonnes,
                c.operational_co2_tonnes,
                c.lifecycle_ghg_tonnes
            )

        pareto: List[VoyageCandidate] = []
        for c in candidates:
            c_obj = get_obj(c)
            is_dominated = False
            for other in candidates:
                if other.decision_id == c.decision_id:
                    continue
                o_obj = get_obj(other)
                
                if all(o <= c_val for o, c_val in zip(o_obj, c_obj)) and any(o < c_val for o, c_val in zip(o_obj, c_obj)):
                    is_dominated = True
                    break
            
            if not is_dominated:
                # Discard candidates with identical objective vectors
                if not any(get_obj(p) == c_obj for p in pareto):
                    pareto.append(c)

        # Deterministic sorting
        pareto.sort(key=lambda c: (c.total_voyage_cost_usd, c.total_voyage_time_hours, c.decision_id))
        return pareto

    def _generate_recommendations(
        self, pareto_front: List[VoyageCandidate], classical_response: Any
    ) -> Dict[str, Recommendation]:
        recs: Dict[str, Recommendation] = {}
        if not pareto_front:
            return recs

        # 1. Min Cost
        min_cost_c = min(pareto_front, key=lambda c: (c.total_voyage_cost_usd, c.decision_id))
        recs[DecisionPriority.COST] = Recommendation(
            priority=DecisionPriority.COST,
            method="Classical Exact Optimization",
            candidate=min_cost_c,
            reasons=[
                "Lowest absolute total voyage cost.",
                f"Saves capital with ${min_cost_c.total_voyage_cost_usd:,.2f} total expenditure at {min_cost_c.cruising_speed_knots:.1f} kts on {min_cost_c.route_name}.",
                f"Consumes {min_cost_c.fuel_consumption_tonnes:.1f}t of {min_cost_c.fuel_name}."
            ]
        )

        # 2. Min Time
        min_time_c = min(pareto_front, key=lambda c: (c.total_voyage_time_hours, c.decision_id))
        recs[DecisionPriority.TIME] = Recommendation(
            priority=DecisionPriority.TIME,
            method="Classical Exact Optimization",
            candidate=min_time_c,
            reasons=[
                "Fastest viable transit.",
                f"Maximizes deadline margin ({min_time_c.deadline_margin_hours:.1f} hrs) with {min_time_c.total_voyage_time_hours:.1f}h duration.",
                f"Sails at {min_time_c.cruising_speed_knots:.1f} kts via {min_time_c.route_name}."
            ]
        )

        # 3. Min Fuel
        min_fuel_c = min(pareto_front, key=lambda c: (c.fuel_consumption_tonnes, c.decision_id))
        recs[DecisionPriority.FUEL] = Recommendation(
            priority=DecisionPriority.FUEL,
            method="Classical Exact Optimization",
            candidate=min_fuel_c,
            reasons=[
                "Lowest absolute fuel consumption.",
                f"Consumes {min_fuel_c.fuel_consumption_tonnes:.1f}t bunker fuel in highly energy efficient configuration.",
                f"Operates {min_fuel_c.vessel_name} at eco-speed of {min_fuel_c.cruising_speed_knots:.1f} kts."
            ]
        )

        # 4. Min CO2
        min_co2_c = min(pareto_front, key=lambda c: (c.operational_co2_tonnes, c.decision_id))
        recs[DecisionPriority.CO2] = Recommendation(
            priority=DecisionPriority.CO2,
            method="Classical Exact Optimization",
            candidate=min_co2_c,
            reasons=[
                "Lowest operational tailpipe CO2 emissions.",
                f"Emits only {min_co2_c.operational_co2_tonnes:.1f}t direct combustion CO2.",
                f"Optimized for direct environmental compliance on {min_co2_c.route_name}."
            ]
        )

        # 5. Min GHG
        min_ghg_c = min(pareto_front, key=lambda c: (c.lifecycle_ghg_tonnes, c.decision_id))
        recs[DecisionPriority.GHG] = Recommendation(
            priority=DecisionPriority.GHG,
            method="Classical Exact Optimization",
            candidate=min_ghg_c,
            reasons=[
                "Lowest well-to-wake lifecycle GHG.",
                f"Emits {min_ghg_c.lifecycle_ghg_tonnes:.1f}t CO2e lifecycle emissions using {min_ghg_c.fuel_name}.",
                "Best overall climate impact choice across full upstream and operational fuel cycles."
            ]
        )

        # 6. Balanced (Normalized Euclidean distance to ideal point)
        min_vals = {
            "cost": min_cost_c.total_voyage_cost_usd,
            "time": min_time_c.total_voyage_time_hours,
            "fuel": min_fuel_c.fuel_consumption_tonnes,
            "co2": min_co2_c.operational_co2_tonnes,
            "ghg": min_ghg_c.lifecycle_ghg_tonnes
        }
        max_vals = {
            "cost": max(c.total_voyage_cost_usd for c in pareto_front),
            "time": max(c.total_voyage_time_hours for c in pareto_front),
            "fuel": max(c.fuel_consumption_tonnes for c in pareto_front),
            "co2": max(c.operational_co2_tonnes for c in pareto_front),
            "ghg": max(c.lifecycle_ghg_tonnes for c in pareto_front)
        }

        def _normalized_dist(c: VoyageCandidate) -> float:
            d = 0.0
            for k, val in [
                ("cost", c.total_voyage_cost_usd),
                ("time", c.total_voyage_time_hours),
                ("fuel", c.fuel_consumption_tonnes),
                ("co2", c.operational_co2_tonnes),
                ("ghg", c.lifecycle_ghg_tonnes)
            ]:
                rng = max_vals[k] - min_vals[k]
                if rng > 1e-6:
                    norm = (val - min_vals[k]) / rng
                else:
                    norm = 0.0
                d += norm ** 2
            return math.sqrt(d)

        balanced_c = min(pareto_front, key=lambda c: (_normalized_dist(c), c.decision_id))
        balanced_dist = _normalized_dist(balanced_c)

        recs[DecisionPriority.BALANCED] = Recommendation(
            priority=DecisionPriority.BALANCED,
            method="Comparative Decision Analysis",
            candidate=balanced_c,
            reasons=[
                "Pareto-efficient trade-off.",
                f"Minimizes the normalized distance ({balanced_dist:.4f}) to the ideal theoretical optimum across all 5 metrics.",
                f"Provides balanced trade-off between cost (${balanced_c.total_voyage_cost_usd:,.2f}), travel time ({balanced_c.total_voyage_time_hours:.1f}h), and emissions ({balanced_c.operational_co2_tonnes:.1f}t CO2).",
                f"Meets deadline with {balanced_c.deadline_margin_hours:.1f} hrs margin."
            ]
        )

        return recs

    def _compute_tradeoffs(
        self,
        cl: Optional[VoyageCandidate],
        qi: Optional[VoyageCandidate],
        cl_runtime: float = 0.0,
        qi_runtime: float = 0.0,
        objective_mode: str = "cost"
    ) -> TradeoffMetrics:
        """
        Computes differences as (Quantum-Inspired - Classical).
        Uses neutral scientific terminology.
        """
        if not cl or not qi:
            return TradeoffMetrics(
                cost_difference=0.0, cost_percentage_difference=0.0,
                time_difference=0.0, time_percentage_difference=0.0,
                fuel_difference=0.0, co2_difference=0.0, lifecycle_ghg_difference=0.0,
                deadline_margin_difference=0.0, runtime_difference=0.0, objective_gap=0.0,
                cost_delta_usd=0.0, cost_delta_pct=0.0,
                time_delta_hours=0.0, time_delta_pct=0.0,
                fuel_delta_tonnes=0.0, co2_delta_tonnes=0.0, ghg_delta_tonnes=0.0
            )

        c_cost = cl.total_voyage_cost_usd
        q_cost = qi.total_voyage_cost_usd
        c_time = cl.total_voyage_time_hours
        q_time = qi.total_voyage_time_hours

        cost_diff = q_cost - c_cost
        time_diff = q_time - c_time

        cost_pct = (cost_diff / c_cost) * 100.0 if c_cost > 0 else 0.0
        time_pct = (time_diff / c_time) * 100.0 if c_time > 0 else 0.0

        fuel_diff = qi.fuel_consumption_tonnes - cl.fuel_consumption_tonnes
        co2_diff = qi.operational_co2_tonnes - cl.operational_co2_tonnes
        ghg_diff = qi.lifecycle_ghg_tonnes - cl.lifecycle_ghg_tonnes
        margin_diff = qi.deadline_margin_hours - cl.deadline_margin_hours
        runtime_diff = qi_runtime - cl_runtime
        obj_gap = cost_pct if objective_mode == "cost" else time_pct

        return TradeoffMetrics(
            cost_difference=cost_diff,
            cost_percentage_difference=cost_pct,
            time_difference=time_diff,
            time_percentage_difference=time_pct,
            fuel_difference=fuel_diff,
            co2_difference=co2_diff,
            lifecycle_ghg_difference=ghg_diff,
            deadline_margin_difference=margin_diff,
            runtime_difference=runtime_diff,
            objective_gap=obj_gap,
            # Backwards compatibility
            cost_delta_usd=cost_diff,
            cost_delta_pct=cost_pct,
            time_delta_hours=time_diff,
            time_delta_pct=time_pct,
            fuel_delta_tonnes=fuel_diff,
            co2_delta_tonnes=co2_diff,
            ghg_delta_tonnes=ghg_diff
        )
