export interface WeatherCondition {
  timestamp: string;
  wind: number;
  wave: number;
  current: number;
  sea_state: number;
  risk: 'low' | 'moderate' | 'high';
  location_name?: string;
}
