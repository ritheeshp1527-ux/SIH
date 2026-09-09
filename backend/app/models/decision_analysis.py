from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    VoyageCandidate,
    QuantumInspiredSolution,
    MethodBenchmarkSummary,
)

class DecisionPriority(str, Enum):
    COST = "cost"
    TIME = "time"
    FUEL = "fuel"
    CO2 = "co2"
    GHG = "ghg"
    BALANCED = "balanced"

class CandidateComparisonRecord(BaseModel):
    """
    Standardized comparative record representing an evaluated candidate option.
    Captures operational metrics, environmental indices, and solver properties.
    """
    decision_id: str = Field(..., description="Unique deterministic decision key")
    optimization_method: str = Field(..., description="Method name ('Classical Exact Enumeration', 'Quantum-Inspired Simulated Annealing')")
    vessel: str = Field(..., description="Vessel descriptor")
    vessel_id: str
    vessel_name: str
    vessel_type: str
    route: str = Field(..., description="Route descriptor")
    route_id: str
    route_name: str
    speed: float = Field(..., description="Commanded cruising speed in knots")
    fuel: str = Field(..., description="Bunker fuel descriptor")
    fuel_id: str
    fuel_name: str
    total_cost: float = Field(..., description="Total voyage cost in USD")
    total_time: float = Field(..., description="Total voyage duration in hours")
    fuel_consumption: float = Field(..., description="Bunker fuel consumption in metric tons")
    operational_CO2: float = Field(..., description="Direct combustion CO2 emissions in metric tons")
    lifecycle_GHG: float = Field(..., description="Well-to-wake lifecycle GHG emissions in metric tons CO2e")
    deadline_margin: float = Field(..., description="Hours before delivery deadline")
    utilization: float = Field(..., description="Cargo deadweight utilization percentage")
    risk: str = Field(..., description="Weather risk level ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')")
    feasibility: bool = Field(..., description="Feasibility compliance flag")
    runtime: Optional[float] = Field(None, description="Optimizer execution runtime in milliseconds where applicable")
    qubo_energy: Optional[float] = Field(None, description="QUBO objective energy where applicable")

    @classmethod
    def from_candidate(
        cls,
        candidate: VoyageCandidate,
        optimization_method: str,
        runtime: Optional[float] = None,
        qubo_energy: Optional[float] = None
    ) -> "CandidateComparisonRecord":
        return cls(
            decision_id=candidate.decision_id,
            optimization_method=optimization_method,
            vessel=candidate.vessel_name,
            vessel_id=candidate.vessel_id,
            vessel_name=candidate.vessel_name,
            vessel_type=candidate.vessel_type,
            route=candidate.route_name,
            route_id=candidate.route_id,
            route_name=candidate.route_name,
            speed=candidate.cruising_speed_knots,
            fuel=candidate.fuel_name,
            fuel_id=candidate.fuel_id,
            fuel_name=candidate.fuel_name,
            total_cost=candidate.total_voyage_cost_usd,
            total_time=candidate.total_voyage_time_hours,
            fuel_consumption=candidate.fuel_consumption_tonnes,
            operational_CO2=candidate.operational_co2_tonnes,
            lifecycle_GHG=candidate.lifecycle_ghg_tonnes,
            deadline_margin=candidate.deadline_margin_hours,
            utilization=candidate.cargo_utilization_pct,
            risk=candidate.weather_risk_level,
            feasibility=candidate.is_feasible,
            runtime=runtime,
            qubo_energy=qubo_energy
        )

class TradeoffMetrics(BaseModel):
    """
    Trade-off differentials between Quantum-Inspired Simulated Annealing and Classical Exact optimum.
    Calculated as (Quantum-Inspired - Classical).
    """
    cost_difference: float = Field(default=0.0, description="Cost difference (USD)")
    cost_percentage_difference: float = Field(default=0.0, description="Cost difference percentage (%)")
    time_difference: float = Field(default=0.0, description="Time difference (hours)")
    time_percentage_difference: float = Field(default=0.0, description="Time difference percentage (%)")
    fuel_difference: float = Field(default=0.0, description="Fuel consumption difference (tonnes)")
    co2_difference: float = Field(default=0.0, description="Operational CO2 difference (tonnes)")
    lifecycle_ghg_difference: float = Field(default=0.0, description="Lifecycle GHG difference (tonnes CO2e)")
    deadline_margin_difference: float = Field(default=0.0, description="Deadline margin difference (hours)")
    runtime_difference: float = Field(default=0.0, description="Runtime difference (ms)")
    objective_gap: float = Field(default=0.0, description="Relative objective gap (%)")

    # Backward compatibility aliases
    cost_delta_usd: float = Field(default=0.0, description="Alias for cost_difference")
    cost_delta_pct: float = Field(default=0.0, description="Alias for cost_percentage_difference")
    time_delta_hours: float = Field(default=0.0, description="Alias for time_difference")
    time_delta_pct: float = Field(default=0.0, description="Alias for time_percentage_difference")
    fuel_delta_tonnes: float = Field(default=0.0, description="Alias for fuel_difference")
    co2_delta_tonnes: float = Field(default=0.0, description="Alias for co2_difference")
    ghg_delta_tonnes: float = Field(default=0.0, description="Alias for lifecycle_ghg_difference")

class MethodComparisonRecord(BaseModel):
    """
    Direct head-to-head comparison between Classical Exact and Quantum-Inspired solutions.
    """
    classical_candidate: Optional[CandidateComparisonRecord] = Field(None, description="Best Classical candidate")
    quantum_inspired_candidate: Optional[CandidateComparisonRecord] = Field(None, description="Best Quantum-Inspired candidate")
    tradeoffs: TradeoffMetrics = Field(..., description="Trade-off differentials")
    cost_difference: float = 0.0
    cost_percentage_difference: float = 0.0
    time_difference: float = 0.0
    time_percentage_difference: float = 0.0
    fuel_difference: float = 0.0
    co2_difference: float = 0.0
    lifecycle_ghg_difference: float = 0.0
    deadline_margin_difference: float = 0.0
    runtime_difference: float = 0.0
    objective_gap: float = 0.0
    neutral_notes: List[str] = Field(
        default_factory=lambda: [
            "Comparison evaluates Classical Exact Enumeration against Quantum-Inspired Simulated Annealing.",
            "No quantum advantage, superiority, or speedup is claimed or demonstrated.",
            "Objective gap indicates heuristic proximity to classical global optimum."
        ]
    )

class EnvironmentalAnalysis(BaseModel):
    fuel_consumption_tonnes: float = Field(..., description="Total fuel consumed in metric tons")
    operational_co2_tonnes: float = Field(..., description="Direct operational CO2 combustion emissions in metric tons")
    lifecycle_ghg_tonnes: float = Field(..., description="Well-to-wake lifecycle GHG emissions in metric tons CO2e")

class ScheduleAnalysis(BaseModel):
    departure_datetime: str
    arrival_datetime: str
    deadline_datetime: str
    deadline_margin_hours: float
    is_safe: bool = Field(..., description="True if positive margin")
    status: str = Field(..., description="'Safe', 'Tight', or 'Infeasible'")

class Recommendation(BaseModel):
    priority: DecisionPriority
    method: str = Field(..., description="Optimization Method (e.g. Classical Exact, Quantum-Inspired, Comparative Decision Analysis)")
    candidate: VoyageCandidate
    reasons: List[str] = Field(..., description="Human-readable concrete reasons for recommendation based on actual metrics")

class ComparativeAnalysisResponse(BaseModel):
    request: VoyageOptimizationRequest
    classical: MethodBenchmarkSummary = Field(..., description="Classical benchmark summary")
    quantum_inspired: MethodBenchmarkSummary = Field(..., description="Quantum-inspired benchmark summary")
    classical_summary: MethodBenchmarkSummary = Field(..., description="Alias for classical")
    quantum_inspired_summary: MethodBenchmarkSummary = Field(..., description="Alias for quantum_inspired")
    comparison: MethodComparisonRecord = Field(..., description="Head-to-head Classical vs Quantum-Inspired comparison")
    
    # Pareto front from feasible candidates
    pareto_front: List[VoyageCandidate]
    
    # Selected recommendations per priority
    recommendations: Dict[str, Recommendation]
    
    # Primary tradeoff: QI vs Classical optimum (based on selected priority or default Cost)
    tradeoffs: TradeoffMetrics
    
    # Environment and Schedule for the default or requested priority recommendation
    environmental_analysis: EnvironmentalAnalysis
    schedule_analysis: ScheduleAnalysis
    
    # Top K QI solutions to show to the operator
    qi_top_k: List[QuantumInspiredSolution]
    
    assumptions: List[str] = Field(
        default=[
            "Phase 6 is a decision-analysis layer over existing optimization outputs. It does not create a new optimizer.",
            "Current environmental data is deterministic demo data.",
            "Current fuel model is a prototype model.",
            "Current route network is a deterministic demo network.",
            "Pareto analysis is performed over the available finite candidate set.",
            "Balanced recommendation is a decision-support heuristic, not a universal optimality guarantee.",
            "Equal weighting across normalized objectives is a prototype decision-analysis assumption.",
            "Quantum-inspired simulated annealing currently does not guarantee the classical global optimum.",
            "No quantum advantage is claimed.",
            "No quantum superiority or quantum speedup is claimed.",
            "The current problem is a single-voyage decision problem, not full fleet-wide simultaneous optimization."
        ]
    )

class ComparativeAnalysisRequest(BaseModel):
    voyage_request: VoyageOptimizationRequest
    priority: DecisionPriority = DecisionPriority.BALANCED
    top_k: int = 5
