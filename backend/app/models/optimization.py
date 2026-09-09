from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ==============================================================================
# Phase 0 Legacy Models (Preserved for backward-compatibility with tests)
# ==============================================================================

class OptimizationRequest(BaseModel):
    """
    Preliminary schema for triggering fleet and voyage optimization (Phase 0).
    """
    shipment_id: Optional[str] = Field(None, description="Reference shipment ID")
    source: str = Field(..., description="Origin port")
    destination: str = Field(..., description="Destination port")
    cargo_weight: float = Field(..., gt=0, description="Cargo weight (metric tons)")
    deadline: datetime = Field(..., description="Delivery deadline (UTC)")
    preferred_vessel_id: Optional[str] = Field(None, description="Optional pinned vessel")
    objective_weights: Dict[str, float] = Field(
        default_factory=lambda: {"fuel_cost": 0.5, "emissions": 0.3, "time": 0.2},
        description="Multi-objective trade-off weights"
    )

class VoyagePlan(BaseModel):
    """
    Preliminary result from classical or quantum-inspired voyage solver (Phase 0).
    """
    algorithm_name: str = Field(..., description="E.g., 'Classical-Dijkstra' or 'Quantum-Inspired-Annealer'")
    route_id: str = Field(..., description="Selected route ID")
    vessel_id: str = Field(..., description="Assigned vessel ID")
    fuel_id: str = Field(..., description="Chosen fuel type")
    planned_speed_knots: float = Field(..., description="Optimal speed profile (average knots)")
    estimated_transit_hours: float = Field(..., description="Total voyage duration (hours)")
    estimated_fuel_tonnes: float = Field(..., description="Total fuel consumption (metric tons)")
    estimated_fuel_cost_usd: float = Field(..., description="Total fuel expenditure in USD")
    estimated_co2_tonnes: float = Field(..., description="Total CO2 emissions in metric tons")
    feasibility_score: float = Field(default=1.0, ge=0.0, le=1.0, description="1.0 = meets all weather/deadlines")
    notes: Optional[str] = Field(None, description="Solver diagnostic notes")

class ComparativeAnalysis(BaseModel):
    """
    Preliminary schema for comparing classical baseline vs quantum-inspired optimization (Phase 0).
    """
    request_id: str = Field(..., description="Unique run identifier")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    classical_plan: VoyagePlan
    quantum_plan: VoyagePlan
    fuel_saved_tonnes: float = Field(..., description="Classical minus Quantum fuel consumed")
    cost_saved_usd: float = Field(..., description="Classical minus Quantum fuel cost")
    co2_saved_tonnes: float = Field(..., description="Classical minus Quantum emissions")
    efficiency_gain_pct: float = Field(..., description="Percentage improvement achieved")

# ==============================================================================
# Phase 4 Exact Classical Voyage Optimization Models
# ==============================================================================

class VoyageOptimizationRequest(BaseModel):
    """
    Operational voyage optimization request defining cargo, endpoints, schedule, and resolution.
    """
    source_port_id: str = Field(..., description="Origin departure port ID", examples=["PORT-SG"])
    destination_port_id: str = Field(..., description="Destination arrival port ID", examples=["PORT-RTM"])
    cargo_weight_tonnes: float = Field(..., gt=0.0, description="Shipment cargo payload weight in metric tons", examples=[60000.0])
    departure_datetime: datetime = Field(..., description="Scheduled departure timestamp (UTC)")
    deadline_datetime: datetime = Field(..., description="Contractual delivery deadline timestamp (UTC)")
    vessel_ids: Optional[List[str]] = Field(None, description="Optional available fleet subset; if omitted, all fleet vessels are evaluated")
    route_ids: Optional[List[str]] = Field(None, description="Optional route subset; if omitted, all candidate routes are evaluated")
    speed_grid_step_knots: float = Field(
        default=0.5,
        ge=0.1,
        le=2.0,
        description="Speed discretization resolution for exact enumeration grid",
        examples=[0.5]
    )
    currency: str = Field(default="USD", description="Base accounting currency")
    scenario_id: Optional[str] = Field(
        None,
        description="Optional environmental scenario preset override",
        examples=["scenario-a-favorable-current"]
    )

class DecisionOption(BaseModel):
    """
    Reusable discrete decision identifier for Vessel x Route x Speed x Fuel tuple.
    Identical representation will be consumed by Phase 5 quantum-inspired QUBO encoding.
    """
    decision_id: str = Field(..., description="Unique deterministic decision key", examples=["DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-14.0"])
    vessel_id: str
    route_id: str
    fuel_id: str
    speed_knots: float

class VoyageCandidate(BaseModel):
    """
    Full operational evaluation record for a single discrete decision tuple.
    """
    decision_id: str
    vessel_id: str
    vessel_name: str
    vessel_type: str
    route_id: str
    route_name: str
    fuel_id: str
    fuel_name: str
    cargo_tonnes: float
    distance_nm: float
    cruising_speed_knots: float = Field(..., description="Commanded Speed Through Water (STW)")
    effective_speed_knots: float = Field(..., description="Navigational Speed Over Ground (SOG = STW + Current)")
    sailing_time_hours: float = Field(..., description="Weather/current-adjusted open-water transit duration")
    port_wait_hours: float = Field(..., description="Sum of origin and destination port typical wait duration")
    total_voyage_time_hours: float = Field(..., description="Total voyage duration (sailing_time + port_wait)")
    departure_datetime: datetime
    arrival_datetime: datetime
    deadline_datetime: datetime
    deadline_margin_hours: float = Field(..., description="Hours before deadline (>0 meets deadline, <0 misses deadline)")
    fuel_consumption_tonnes: float = Field(..., description="Total bunker fuel consumed in metric tons")
    fuel_cost_usd: float = Field(..., description="Total fuel expenditure in USD")
    route_cost_usd: float = Field(..., description="Canal tolls and port dues in USD")
    total_voyage_cost_usd: float = Field(..., description="Sum of fuel cost and route transit fees")
    operational_co2_tonnes: float = Field(..., description="Combustion CO2 emissions in metric tons")
    lifecycle_ghg_tonnes: float = Field(..., description="Well-to-Wake lifecycle GHG emissions in metric tons CO2e")
    cargo_utilization_pct: float = Field(..., description="Cargo weight as percentage of vessel deadweight capacity")
    demo_environmental_fuel_factor: float = Field(..., description="Simulated sensitivity multiplier; not calibrated on real operational data")
    weather_risk_level: str = Field(..., description="'LOW', 'MODERATE', 'HIGH', 'CRITICAL'")
    is_feasible: bool = Field(..., description="True if meeting all physical, environmental, and schedule constraints")
    infeasibility_reasons: List[str] = Field(default_factory=list, description="List of explicit safety/schedule/operational constraint violations")

class OptimizationModeResult(BaseModel):
    """
    Optimization result for a specific objective mode (Cost-Efficient or Time-Efficient).
    """
    mode: str = Field(..., description="'cost_efficient' or 'time_efficient'")
    objective_description: str
    per_vessel_best: Dict[str, VoyageCandidate] = Field(
        ...,
        description="Best feasible candidate per available vessel for this objective"
    )
    global_best: Optional[VoyageCandidate] = Field(
        None,
        description="Globally optimal candidate across all vessels for this objective"
    )

class OptimizationBenchmarkStats(BaseModel):
    """
    Transparent search statistics and execution metrics for benchmarking against Phase 5.
    """
    raw_combinations_evaluated: int
    pre_filtered_combinations: int
    total_candidates_evaluated: int
    feasible_candidates_count: int
    infeasible_candidates_count: int
    feasibility_rate_pct: float
    rejection_breakdown: Dict[str, int] = Field(
        default_factory=dict,
        description="Counts of rejections by constraint type (capacity, speed, draft, weather, deadline, etc.)"
    )
    runtime_ms: float
    speed_grid_step_knots: float
    unique_vessels_count: int
    unique_routes_count: int
    unique_fuels_count: int

class ClassicalOptimizationResponse(BaseModel):
    """
    Complete response payload from the exact classical voyage optimization baseline.
    """
    status: str = Field(default="exact_classical_optimization")
    disclaimer: str = Field(
        default="SIMULATED VOYAGE OPTIMIZATION — DEMONSTRATION BASELINE ONLY",
        description="Transparency label"
    )
    environmental_disclaimer: str = Field(
        default="DEMO ENVIRONMENTAL FUEL FACTOR — NOT CALIBRATED ON REAL OPERATIONAL DATA",
        description="Heuristic factor label"
    )
    request: VoyageOptimizationRequest
    cost_efficient: OptimizationModeResult
    time_efficient: OptimizationModeResult
    informational_best_fuel: Optional[VoyageCandidate] = Field(
        None,
        description="Feasible candidate with lowest total fuel consumption (informational only)"
    )
    informational_best_emissions: Optional[VoyageCandidate] = Field(
        None,
        description="Feasible candidate with lowest operational CO2 emissions (informational only)"
    )
    benchmark: OptimizationBenchmarkStats
    candidate_decision_space_preview: List[DecisionOption] = Field(
        default_factory=list,
        description="Sample decision options illustrating the discrete combinatorial search space for Phase 5"
    )

# ==============================================================================
# Phase 5 Quantum-Inspired Optimization & QUBO Models
# ==============================================================================

class SimulatedAnnealingConfig(BaseModel):
    """
    Configuration parameters for classical Simulated Annealing QUBO solver.
    """
    initial_temperature: float = Field(default=10.0, gt=0.0, description="Starting temperature for annealing schedule")
    final_temperature: float = Field(default=0.001, gt=0.0, description="Stopping temperature")
    cooling_rate: float = Field(default=0.95, gt=0.0, lt=1.0, description="Geometric cooling factor: T_next = T * cooling_rate")
    iterations_per_temperature: int = Field(default=50, ge=1, description="Markov chain step limit per temperature step")
    number_of_runs: int = Field(default=5, ge=1, le=50, description="Number of seeded annealing executions for top-K diversity")
    random_seed: int = Field(default=42, description="Base pseudo-random seed for strict determinism")

class QUBOVariableMapping(BaseModel):
    """
    Transparent mapping of a single QUBO binary variable to its discrete candidate decision.
    """
    variable_index: int
    variable_id: str = Field(..., description="E.g., 'x_0', 'x_1'")
    decision_id: str
    vessel_id: str
    route_id: str
    fuel_id: str
    speed_knots: float
    raw_objective_value: float = Field(..., description="Cost in USD or Time in hours before scaling")
    normalized_objective_value: float = Field(..., description="Normalized objective weight w_i in [0, 1]")

class QUBOModelSummary(BaseModel):
    """
    Detailed inspectable summary of the formulated QUBO matrix: minimize x^T Q x + offset.
    """
    num_variables: int = Field(..., description="Number of binary decision variables x_i")
    num_nonzero_coefficients: int = Field(..., description="Total non-zero entries in linear + quadratic matrix")
    objective_mode: str = Field(..., description="'cost' or 'time'")
    penalty_magnitude: float = Field(..., description="One-hot selection penalty multiplier P")
    penalty_strategy: str = Field(
        default="P = safety_multiplier * max(1.0, delta_objective); guarantees infeasible sum(x) != 1 has higher energy than any feasible state"
    )
    normalization_scale: Dict[str, float] = Field(
        ...,
        description="Min, max, and span (delta) of raw objective values used for min-max scaling to [0, 1]"
    )
    constant_offset: float = Field(..., description="Constant scalar term added from (sum x_i - 1)^2 expansion")
    variable_mappings_preview: List[QUBOVariableMapping] = Field(
        default_factory=list,
        description="First N variable-to-decision mappings for transparency"
    )
    sample_linear_coefficients: Dict[str, float] = Field(
        default_factory=dict,
        description="Sample diagonal coefficients Q_ii = w_i - P"
    )
    sample_quadratic_coefficients: Dict[str, float] = Field(
        default_factory=dict,
        description="Sample off-diagonal coupling coefficients Q_ij = 2P"
    )
    qubo_formulation_level: str = Field(
        default="Feasible-decision selection (each binary variable represents one complete feasible voyage decision)",
        description="Formal scope and granularity of the QUBO formulation"
    )
    formulation_scope_note: str = Field(
        default="Physical feasibility is established by Phase 4; QUBO selects among feasible complete decisions with exact one-hot penalty.",
        description="Scientific scope note"
    )

class QuantumInspiredSolution(BaseModel):
    """
    Decoded and re-validated voyage solution extracted from a QUBO solver run.
    """
    rank: int = Field(..., description="Rank in top-K solutions (1 = best)")
    decision_id: str
    vessel_id: str
    vessel_name: str
    route_id: str
    route_name: str
    speed_knots: float
    fuel_id: str
    fuel_name: str
    total_cost_usd: float
    total_duration_hours: float
    fuel_consumption_tonnes: float
    operational_co2_tonnes: float
    lifecycle_ghg_tonnes: float
    arrival_datetime: datetime
    deadline_margin_hours: float
    weather_risk_level: str
    qubo_energy: float = Field(..., description="Evaluated objective energy x^T Q x + offset")
    is_valid_one_hot: bool = Field(..., description="True if sum(x) == 1 exactly")
    is_feasible: bool = Field(..., description="True if revalidated against all Phase 4 maritime constraints")
    infeasibility_reasons: List[str] = Field(default_factory=list)
    solver_seed: int
    candidate: VoyageCandidate

class QuantumInspiredOptimizationRequest(BaseModel):
    """
    Request payload to trigger Quantum-Inspired QUBO Optimization.
    """
    voyage_request: VoyageOptimizationRequest
    objective_mode: str = Field(default="cost", description="'cost' (minimum voyage cost) or 'time' (minimum voyage duration)")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of top unique feasible solutions to return")
    solver_config: Optional[SimulatedAnnealingConfig] = Field(default_factory=SimulatedAnnealingConfig)

class OptimizationTimingBreakdown(BaseModel):
    """
    Detailed latency accounting separating preprocessing, QUBO compilation, solver trajectory, and decoding.
    """
    candidate_evaluation_runtime_ms: float = Field(..., description="Time evaluating candidate combinations under Phase 4 constraints")
    qubo_construction_runtime_ms: float = Field(..., description="Time building linear, quadratic, and normalization terms")
    solver_runtime_ms: float = Field(..., description="Time executing Simulated Annealing search trajectories")
    decoding_validation_runtime_ms: float = Field(..., description="Time decoding binary vectors and re-verifying constraints")
    total_runtime_ms: float = Field(..., description="Total wall-clock runtime for complete pipeline")

class StochasticRunTelemetry(BaseModel):
    """
    Statistical telemetry tracking solution quality across stochastic seeded annealing runs.
    """
    runs_executed: int = Field(..., description="Total number of seeded annealing executions")
    successful_runs: int = Field(..., description="Number of runs that discovered the exact classical global optimum")
    success_rate_pct: float = Field(..., description="Percentage of runs discovering the classical optimum")
    classical_optimum_found: bool = Field(..., description="True if at least one run discovered the classical optimum")
    best_run_objective: Optional[float] = None
    median_run_objective: Optional[float] = None
    worst_run_objective: Optional[float] = None
    best_objective_gap_pct: Optional[float] = None
    median_objective_gap_pct: Optional[float] = None
    worst_objective_gap_pct: Optional[float] = None
    run_details: List[Dict[str, Any]] = Field(default_factory=list)

class QuantumInspiredOptimizationResponse(BaseModel):
    """
    Response payload from Quantum-Inspired Simulated Annealing QUBO optimization.
    """
    status: str = Field(default="quantum_inspired_simulated_annealing")
    disclaimer: str = Field(
        default=(
            "QUANTUM-INSPIRED CLASSICAL OPTIMIZATION — SOLVED VIA SIMULATED ANNEALING ON QUBO FORMULATION; "
            "NO QUANTUM HARDWARE USED. The current prototype uses a feasible-decision selection QUBO. Each binary variable represents one complete feasible Vessel × Route × Speed × Fuel combination generated by the classical maritime evaluation layer. "
            "This demonstrates QUBO formulation and quantum-inspired optimization methodology, but does not claim quantum computational advantage."
        ),
        description="Scientific transparency notice"
    )
    qubo_formulation_level: str = Field(
        default="Feasible-decision selection (each binary variable represents one complete feasible voyage decision)"
    )
    objective_mode: str
    qubo_summary: QUBOModelSummary
    solver_config: SimulatedAnnealingConfig
    top_k_solutions: List[QuantumInspiredSolution]
    best_solution: Optional[QuantumInspiredSolution]
    solver_runtime_ms: float = Field(..., description="Time spent in Simulated Annealing loops")
    total_runtime_ms: float = Field(..., description="Total pipeline runtime including Phase 4 candidate generation, QUBO formulation, solving, and validation")
    timing_breakdown: Optional[OptimizationTimingBreakdown] = None
    stochastic_run_stats: Optional[StochasticRunTelemetry] = None
    number_of_runs_executed: int
    unique_feasible_solutions_found: int
    raw_decision_space_size: int = Field(..., description="Total combinations before candidate feasibility filter")
    feasible_candidate_space_size: int = Field(..., description="Feasible candidates encoded as QUBO binary variables")

class MethodBenchmarkSummary(BaseModel):
    """
    Metrics summary for an optimization method (Classical Exact or Quantum-Inspired).
    """
    method_name: str
    best_cost_usd: Optional[float] = None
    best_time_hours: Optional[float] = None
    fuel_consumption_tonnes: Optional[float] = None
    operational_co2_tonnes: Optional[float] = None
    runtime_ms: float
    candidates_evaluated: int
    feasible_solutions_count: int
    best_decision_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)

class OptimizationComparisonRequest(BaseModel):
    """
    Request schema for running both Classical Exact and Quantum-Inspired optimization for comparison.
    """
    voyage_request: VoyageOptimizationRequest
    objective_mode: str = Field(default="cost", description="'cost' or 'time'")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of top solutions to return for Quantum-Inspired")
    solver_config: Optional[SimulatedAnnealingConfig] = Field(default_factory=SimulatedAnnealingConfig)

class OptimizationComparisonResponse(BaseModel):
    """
    Side-by-side scientific comparison of Phase 4 Classical Exact Baseline vs Phase 5 Quantum-Inspired Optimization.
    """
    status: str = Field(default="optimization_comparison_complete")
    objective_mode: str
    classical_optimum_found: bool = Field(
        default=False,
        description="True if the quantum-inspired solver discovered the exact classical optimum"
    )
    successful_runs_ratio: str = Field(
        default="0/0",
        description="Number of seeded runs that converged to the exact classical optimum (e.g. '2/5 runs')"
    )
    classical: MethodBenchmarkSummary
    quantum_inspired: MethodBenchmarkSummary
    cost_gap_percent: Optional[float] = Field(
        None,
        description="Relative objective gap: (QI_cost - Classical_cost) / Classical_cost * 100"
    )
    time_gap_percent: Optional[float] = Field(
        None,
        description="Relative objective gap: (QI_time - Classical_time) / Classical_time * 100"
    )
    fuel_gap_percent: Optional[float] = Field(
        None,
        description="Relative objective gap for fuel consumption"
    )
    co2_gap_percent: Optional[float] = Field(
        None,
        description="Relative objective gap for operational CO2 emissions"
    )
    timing_breakdown: Optional[OptimizationTimingBreakdown] = None
    stochastic_run_stats: Optional[StochasticRunTelemetry] = None
    classical_full_response: ClassicalOptimizationResponse
    quantum_inspired_full_response: QuantumInspiredOptimizationResponse
    scientific_summary: str = Field(
        ...,
        description="Defensible comparison summary adhering strictly to neutral scientific terminology"
    )
