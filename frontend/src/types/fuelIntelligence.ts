export interface FuelEstimationRequest {
  vessel_id: string;
  fuel_id: string;
  cargo_weight_tonnes: number;
  distance_nm: number;
  speed_knots: number;
  sea_state: number;
  currency?: string;
}

export interface FuelConsumptionBreakdown {
  base_hourly_rate_tonnes: number;
  speed_factor: number;
  load_factor: number;
  weather_factor: number;
  fuel_energy_factor: number;
}

export interface FuelEstimationResult {
  status: string;
  disclaimer: string;
  vessel_id: string;
  vessel_name: string;
  vessel_type: string;
  fuel_id: string;
  fuel_name: string;
  distance_nm: number;
  speed_knots: number;
  sea_state: number;
  cargo_weight_tonnes: number;
  travel_time_hours: number;
  travel_time_days: number;
  fuel_consumption_rate_tonnes_per_hour: number;
  fuel_consumption_tonnes: number;
  currency: string;
  fuel_price_per_tonne: number;
  fuel_cost: number;
  operational_co2_tonnes: number;
  lifecycle_ghg_tonnes?: number | null;
  fuel_per_nm_kg: number;
  fuel_per_tonne_cargo_kg: number;
  fuel_per_tonne_nm_grams: number;
  co2_per_tonne_nm_grams: number;
  vessel_utilization_percent: number;
  breakdown?: FuelConsumptionBreakdown;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  expected_behavior: string;
  request: FuelEstimationRequest;
}
