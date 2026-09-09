import { VoyageOptimizationRequest, VoyageCandidate, QuantumInspiredSolution, MethodBenchmarkSummary } from './optimization';

export enum DecisionPriority {
  COST = 'cost',
  TIME = 'time',
  FUEL = 'fuel',
  CO2 = 'co2',
  GHG = 'ghg',
  BALANCED = 'balanced'
}

export interface CandidateComparisonRecord {
  decision_id: string;
  optimization_method: string;
  vessel: string;
  vessel_id: string;
  vessel_name: string;
  vessel_type: string;
  route: string;
  route_id: string;
  route_name: string;
  speed: number;
  fuel: string;
  fuel_id: string;
  fuel_name: string;
  total_cost: number;
  total_time: number;
  fuel_consumption: number;
  operational_CO2: number;
  lifecycle_GHG: number;
  deadline_margin: number;
  utilization: number;
  risk: string;
  feasibility: boolean;
  runtime?: number | null;
  qubo_energy?: number | null;
}

export interface TradeoffMetrics {
  cost_delta_usd: number;
  cost_delta_pct: number;
  time_delta_hours: number;
  time_delta_pct: number;
  fuel_delta_tonnes: number;
  co2_delta_tonnes: number;
  ghg_delta_tonnes: number;
  cost_difference?: number;
  cost_percentage_difference?: number;
  time_difference?: number;
  time_percentage_difference?: number;
  fuel_difference?: number;
  co2_difference?: number;
  lifecycle_ghg_difference?: number;
  deadline_margin_difference?: number;
  runtime_difference?: number;
  objective_gap?: number;
}

export interface MethodComparisonRecord {
  classical_candidate?: CandidateComparisonRecord | null;
  quantum_inspired_candidate?: CandidateComparisonRecord | null;
  tradeoffs: TradeoffMetrics;
  cost_difference: number;
  cost_percentage_difference: number;
  time_difference: number;
  time_percentage_difference: number;
  fuel_difference: number;
  co2_difference: number;
  lifecycle_ghg_difference: number;
  deadline_margin_difference: number;
  runtime_difference: number;
  objective_gap: number;
  neutral_notes: string[];
}

export interface EnvironmentalAnalysis {
  fuel_consumption_tonnes: number;
  operational_co2_tonnes: number;
  lifecycle_ghg_tonnes: number;
}

export interface ScheduleAnalysis {
  departure_datetime: string;
  arrival_datetime: string;
  deadline_datetime: string;
  deadline_margin_hours: number;
  is_safe: boolean;
  status: string;
}

export interface Recommendation {
  priority: DecisionPriority;
  method: string;
  candidate: VoyageCandidate;
  reasons: string[];
}

export interface ComparativeAnalysisResponse {
  request: VoyageOptimizationRequest;
  classical?: MethodBenchmarkSummary;
  quantum_inspired?: MethodBenchmarkSummary;
  classical_summary: MethodBenchmarkSummary;
  quantum_inspired_summary: MethodBenchmarkSummary;
  comparison?: MethodComparisonRecord;
  pareto_front: VoyageCandidate[];
  recommendations: Record<string, Recommendation>;
  tradeoffs: TradeoffMetrics;
  environmental_analysis: EnvironmentalAnalysis;
  schedule_analysis: ScheduleAnalysis;
  qi_top_k: QuantumInspiredSolution[];
  assumptions: string[];
}

export interface ComparativeAnalysisRequest {
  voyage_request: VoyageOptimizationRequest;
  priority: DecisionPriority;
  top_k: number;
}
