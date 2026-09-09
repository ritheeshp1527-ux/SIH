export interface Fuel {
  id: string;
  name: string;
  price_per_tonne: number;
  emission_factor_kg_co2_per_tonne: number;
  energy_density_mj_per_kg: number;
  lifecycle_ghg_factor_kg_co2e_per_tonne?: number;
  port_id?: string;
  price_date?: string;
  price_currency?: string;
  price_unit?: string;
  is_observed_market_price?: boolean;
  price_source?: string;
}
