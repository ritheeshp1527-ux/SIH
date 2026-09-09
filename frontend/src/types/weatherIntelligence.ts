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
