export interface Vessel {
  id: string;
  name: string;
  type: string;
  capacity_tonnes: number;
  min_speed_knots: number;
  max_speed_knots: number;
  engine_power_kw: number;
  fuel_options: string[];
  design_draft_m: number;
}
