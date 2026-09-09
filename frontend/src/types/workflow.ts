import { 
  Vessel, 
  Fuel, 
  FuelEstimationResult, 
  MaritimeRoute, 
  RouteEnvironmentalAssessmentResponse, 
  VoyageOptimizationRequest, 
  ClassicalOptimizationResponse, 
  QuantumInspiredOptimizationResponse, 
  SimulatedAnnealingConfig,
  ComparativeAnalysisResponse,
  DecisionPriority
} from './index';

export interface FuelIntelligenceStageResult {
  status: string;
  available_vessels_count: number;
  available_fuels_count: number;
  selected_vessel_context?: Vessel | null;
  selected_fuel_context?: Fuel | null;
  representative_fuel_estimate?: FuelEstimationResult | null;
  notes: string[];
}

export interface MaritimeNetworkStageResult {
  status: string;
  origin_port_id: string;
  destination_port_id: string;
  candidate_routes_count: number;
  candidate_routes: MaritimeRoute[];
  feasible_routes_count: number;
  route_feasibility_breakdown: Record<string, boolean>;
  notes: string[];
}

export interface WeatherOceanStageResult {
  status: string;
  scenario_id?: string | null;
  assessed_routes_count: number;
  route_assessments: Record<string, RouteEnvironmentalAssessmentResponse>;
  safe_routes_count: number;
  unsafe_routes_count: number;
  weather_fuel_factors: Record<string, number>;
  notes: string[];
}

export interface ClassicalOptimizationStageResult {
  status: string;
  total_evaluated_combinations: number;
  feasible_solutions_count: number;
  runtime_ms: number;
  best_cost_candidate_id?: string | null;
  best_time_candidate_id?: string | null;
  full_response: ClassicalOptimizationResponse;
}

export interface QuantumInspiredStageResult {
  status: string;
  qubo_variable_count: number;
  qubo_formulation_level: string;
  solver_runtime_ms: number;
  total_runtime_ms: number;
  best_decision_id?: string | null;
  top_k_solutions_count: number;
  full_response: QuantumInspiredOptimizationResponse;
}

export interface ComparativeAnalysisStageResult {
  status: string;
  pareto_front_count: number;
  selected_priority: DecisionPriority;
  recommended_decision_id: string;
  full_response: ComparativeAnalysisResponse;
}

export interface WorkflowStagesResult {
  fuel_intelligence?: FuelIntelligenceStageResult | null;
  maritime_network?: MaritimeNetworkStageResult | null;
  weather_ocean?: WeatherOceanStageResult | null;
  classical_optimization?: ClassicalOptimizationStageResult | null;
  quantum_inspired?: QuantumInspiredStageResult | null;
  comparative_analysis?: ComparativeAnalysisStageResult | null;
}

export interface WorkflowMetadata {
  workflow_id: string;
  execution_status: string;
  failed_stage?: string | null;
  error_detail?: string | null;
  stage_completion_status: Record<string, string>;
  total_runtime_ms: number;
  deterministic_mode: boolean;
  timestamp_utc: string;
  assumptions: string[];
}

export interface WorkflowOptimizationRequest {
  voyage_request: VoyageOptimizationRequest;
  priority?: DecisionPriority;
  top_k?: number;
  solver_config?: SimulatedAnnealingConfig;
}

export interface WorkflowOptimizationResponse {
  request: VoyageOptimizationRequest;
  stages: WorkflowStagesResult;
  workflow_metadata: WorkflowMetadata;
}
