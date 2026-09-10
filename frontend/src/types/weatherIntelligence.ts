export interface SegmentEnvironmentalCondition {
  segment_id: string;
  segment_name?: string;
  demo_time_window: string;
  wind_speed_knots: number;
  wind_direction_degrees: number;
  significant_wave_height_m: number;
  sea_state: number;
  ocean_current_speed_knots: number;
  ocean_current_direction_degrees: number;
  along_track_current_knots: number;
  visibility_nm: number;
  storm_flag: boolean;
  weather_risk_level: string;
  notes?: string;
  disclaimer: string;
}

export interface SegmentEnvironmentalAssessment {
  segment_id: string;
  segment_name: string;
  distance_nm: number;
  vessel_speed_knots: number;
  effective_current_knots: number;
  effective_speed_knots: number;
  baseline_travel_time_hours: number;
  weather_adjusted_travel_time_hours: number;
  demo_environmental_fuel_factor: number;
  weather_fuel_factor?: number;
  condition: SegmentEnvironmentalCondition;
  weather_risk_level: string;
  is_feasible: boolean;
  infeasibility_reasons: string[];
  warnings: string[];
}

export interface RouteEnvironmentalAssessmentRequest {
  route_id: string;
  vessel_id: string;
  speed_knots: number;
  scenario_id?: string;
}

export interface RouteEnvironmentalAssessmentResponse {
  status: string;
  disclaimer: string;
  environmental_disclaimer: string;
  route_id: string;
  route_name: string;
  vessel_id: string;
  vessel_name: string;
  vessel_speed_knots: number;
  total_distance_nm: number;
  baseline_travel_time_hours: number;
  baseline_travel_time_days: number;
  weather_adjusted_travel_time_hours: number;
  weather_adjusted_travel_time_days: number;
  time_delta_hours: number;
  aggregate_demo_environmental_fuel_factor: number;
  aggregate_weather_fuel_factor?: number;
  overall_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  is_feasible: boolean;
  infeasibility_reasons: string[];
  warnings: string[];
  segment_assessments: SegmentEnvironmentalAssessment[];
}

export interface WeatherScenarioPreset {
  id: string;
  title: string;
  description: string;
  expected_behavior: string;
  route_id: string;
  vessel_id: string;
  speed_knots: number;
}

// ==============================================================================
// Phase 4B & 4C: Live SeaRoute + Weather Contracts
// ==============================================================================

export interface LiveVoyageRequest {
  source_port: string;
  destination_port: string;
  departure_datetime?: string;
  vessel_id?: string;
  vessel_draft_m?: number;
  vessel_speed_knots?: number;
  avoid_seca?: boolean;
  avoid_hra?: boolean;
}

export interface NormalizedEnvironmentalPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  wind_speed_knots: number | null;
  wind_direction_deg: number | null;
  significant_wave_height_m: number | null;
  wave_direction_deg: number | null;
  wave_period_s: number | null;
  ocean_current_velocity_knots: number | null;
  ocean_current_direction_deg: number | null;
  sea_state: number | null;
  along_track_current_knots: number | null;
  storm_flag: boolean | null;
  weather_risk_level: string | null;
  visibility_m: number | null;
}

export interface NormalizedRouteOptimization {
  score: number;
  rank: number;
  distance_score: number;
  wind_score: number;
  wave_score: number | null;
  current_score: number | null;
  risk_score: number;
  storm_penalty: number;
  marine_coverage_ratio: number;
  weather_coverage_ratio: number;
  explanation: string;
}

export interface NormalizedRoutePlan {
  id: string;
  is_primary: boolean;
  distance_m: number;
  distance_nm: number;
  duration_ms: number;
  duration_hours: number;
  geometry: Record<string, any>;
  environmental_points: NormalizedEnvironmentalPoint[];
  metadata: Record<string, any>;
  optimization?: NormalizedRouteOptimization | null;
}

export interface LiveVoyageResponse {
  status: string;
  source_port: string;
  destination_port: string;
  source_locode: string;
  destination_locode: string;
  routes: NormalizedRoutePlan[];
  primary_route?: NormalizedRoutePlan | null;
  fuel_model_input?: Record<string, any> | null;
  marine_coverage_ratio: number;
  weather_coverage_ratio: number;
}

