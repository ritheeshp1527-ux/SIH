export interface OptimizationRequest {
  shipment_id?: string;
  source: string;
  destination: string;
  cargo_weight: number;
  deadline: string;
  preferred_vessel_id?: string;
  objective_weights?: Record<string, number>;
}

export interface VoyagePlan {
  algorithm_name: string;
  route_id: string;
  vessel_id: string;
  fuel_id: string;
  planned_speed_knots: number;
  estimated_transit_hours: number;
  estimated_fuel_tonnes: number;
  estimated_fuel_cost_usd: number;
  estimated_co2_tonnes: number;
  feasibility_score: number;
  notes?: string;
}

export interface ComparativeAnalysis {
  request_id: string;
  timestamp: string;
  classical_plan: VoyagePlan;
  quantum_plan: VoyagePlan;
  fuel_saved_tonnes: number;
  cost_saved_usd: number;
  co2_saved_tonnes: number;
  efficiency_gain_pct: number;
}

// ==============================================================================
// Phase 4 Optimization Types
// ==============================================================================

export interface VoyageOptimizationRequest {
  source_port_id: string;
  destination_port_id: string;
  cargo_weight_tonnes: number;
  departure_datetime: string;
  deadline_datetime: string;
  vessel_ids?: string[] | null;
  route_ids?: string[] | null;
  speed_grid_step_knots?: number;
  currency?: string;
  scenario_id?: string | null;
}

export interface DecisionOption {
  decision_id: string;
  vessel_id: string;
  route_id: string;
  fuel_id: string;
  speed_knots: number;
}

export interface VoyageCandidate {
  decision_id: string;
  vessel_id: string;
  vessel_name: string;
  vessel_type: string;
  route_id: string;
  route_name: string;
  fuel_id: string;
  fuel_name: string;
  cargo_tonnes: number;
  distance_nm: number;
  cruising_speed_knots: number;
  effective_speed_knots: number;
  sailing_time_hours: number;
  port_wait_hours: number;
  total_voyage_time_hours: number;
  departure_datetime: string;
  arrival_datetime: string;
  deadline_datetime: string;
  deadline_margin_hours: number;
  fuel_consumption_tonnes: number;
  fuel_cost_usd: number;
  route_cost_usd: number;
  total_voyage_cost_usd: number;
  operational_co2_tonnes: number;
  lifecycle_ghg_tonnes: number;
  cargo_utilization_pct: number;
  demo_environmental_fuel_factor: number;
  weather_risk_level: string;
  is_feasible: boolean;
  infeasibility_reasons: string[];
}

export interface OptimizationModeResult {
  mode: 'cost_efficient' | 'time_efficient' | string;
  objective_description: string;
  per_vessel_best: Record<string, VoyageCandidate>;
  global_best: VoyageCandidate | null;
}

export interface OptimizationBenchmarkStats {
  total_candidates_evaluated: number;
  feasible_candidates_count: number;
  infeasible_candidates_count: number;
  feasibility_rate_pct: number;
  rejection_breakdown: Record<string, number>;
  runtime_ms: number;
  speed_grid_step_knots: number;
  unique_vessels_count: number;
  unique_routes_count: number;
  unique_fuels_count: number;
}

export interface ClassicalOptimizationResponse {
  status: string;
  disclaimer: string;
  environmental_disclaimer: string;
  request: VoyageOptimizationRequest;
  cost_efficient: OptimizationModeResult;
  time_efficient: OptimizationModeResult;
  informational_best_fuel: VoyageCandidate | null;
  informational_best_emissions: VoyageCandidate | null;
  benchmark: OptimizationBenchmarkStats;
  candidate_decision_space_preview: DecisionOption[];
}

// ==============================================================================
// Phase 5 Quantum-Inspired Optimization Types
// ==============================================================================

export interface SimulatedAnnealingConfig {
  initial_temperature: number;
  final_temperature: number;
  cooling_rate: number;
  iterations_per_temperature: number;
  number_of_runs: number;
  random_seed: number;
}

export interface QUBOVariableMapping {
  variable_index: number;
  variable_id: string;
  decision_id: string;
  vessel_id: string;
  route_id: string;
  fuel_id: string;
  speed_knots: number;
  raw_objective_value: number;
  normalized_objective_value: number;
}

export interface QUBOModelSummary {
  num_variables: number;
  num_nonzero_coefficients: number;
  objective_mode: string;
  penalty_magnitude: number;
  penalty_strategy: string;
  normalization_scale: {
    min: number;
    max: number;
    scale_delta: number;
  };
  constant_offset: number;
  variable_mappings_preview: QUBOVariableMapping[];
  sample_linear_coefficients: Record<string, number>;
  sample_quadratic_coefficients: Record<string, number>;
  qubo_formulation_level?: string;
  formulation_scope_note?: string;
}

export interface OptimizationTimingBreakdown {
  candidate_evaluation_runtime_ms: number;
  qubo_construction_runtime_ms: number;
  solver_runtime_ms: number;
  decoding_validation_runtime_ms: number;
  total_runtime_ms: number;
}

export interface StochasticRunTelemetry {
  runs_executed: number;
  successful_runs: number;
  success_rate_pct: number;
  classical_optimum_found: boolean;
  best_run_objective?: number | null;
  median_run_objective?: number | null;
  worst_run_objective?: number | null;
  best_objective_gap_pct?: number | null;
  median_objective_gap_pct?: number | null;
  worst_objective_gap_pct?: number | null;
  run_details: Array<{
    run_index: number;
    seed: number;
    is_valid_one_hot: boolean;
    best_energy: number;
    decision_id: string | null;
    objective_value: number | null;
    runtime_ms: number;
    iterations: number;
    matched_classical_optimum?: boolean;
    relative_gap_pct?: number;
  }>;
}

export interface QuantumInspiredSolution {
  rank: number;
  decision_id: string;
  vessel_id: string;
  vessel_name: string;
  route_id: string;
  route_name: string;
  speed_knots: number;
  fuel_id: string;
  fuel_name: string;
  total_cost_usd: number;
  total_duration_hours: number;
  fuel_consumption_tonnes: number;
  operational_co2_tonnes: number;
  lifecycle_ghg_tonnes: number;
  arrival_datetime: string;
  deadline_margin_hours: number;
  weather_risk_level: string;
  qubo_energy: number;
  is_valid_one_hot: boolean;
  is_feasible: boolean;
  infeasibility_reasons: string[];
  solver_seed: number;
  candidate: VoyageCandidate;
}

export interface QuantumInspiredOptimizationRequest {
  voyage_request: VoyageOptimizationRequest;
  objective_mode: 'cost' | 'time' | string;
  top_k: number;
  solver_config?: SimulatedAnnealingConfig;
}

export interface QuantumInspiredOptimizationResponse {
  status: string;
  disclaimer: string;
  qubo_formulation_level?: string;
  objective_mode: string;
  qubo_summary: QUBOModelSummary;
  solver_config: SimulatedAnnealingConfig;
  top_k_solutions: QuantumInspiredSolution[];
  best_solution: QuantumInspiredSolution | null;
  solver_runtime_ms: number;
  total_runtime_ms: number;
  timing_breakdown?: OptimizationTimingBreakdown;
  stochastic_run_stats?: StochasticRunTelemetry;
  number_of_runs_executed: number;
  unique_feasible_solutions_found: number;
  raw_decision_space_size: number;
  feasible_candidate_space_size: number;
}

export interface MethodBenchmarkSummary {
  method_name: string;
  best_cost_usd: number | null;
  best_time_hours: number | null;
  fuel_consumption_tonnes: number | null;
  operational_co2_tonnes: number | null;
  runtime_ms: number;
  candidates_evaluated: number;
  feasible_solutions_count: number;
  best_decision_id: string | null;
  details: Record<string, any>;
}

export interface OptimizationComparisonRequest {
  voyage_request: VoyageOptimizationRequest;
  objective_mode: 'cost' | 'time' | string;
  top_k: number;
  solver_config?: SimulatedAnnealingConfig;
}

export interface OptimizationComparisonResponse {
  status: string;
  objective_mode: string;
  classical_optimum_found?: boolean;
  successful_runs_ratio?: string;
  classical: MethodBenchmarkSummary;
  quantum_inspired: MethodBenchmarkSummary;
  cost_gap_percent: number | null;
  time_gap_percent: number | null;
  fuel_gap_percent: number | null;
  co2_gap_percent: number | null;
  timing_breakdown?: OptimizationTimingBreakdown;
  stochastic_run_stats?: StochasticRunTelemetry;
  classical_full_response: ClassicalOptimizationResponse;
  quantum_inspired_full_response: QuantumInspiredOptimizationResponse;
  scientific_summary: string;
}
