export interface Port {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  draft_limit_m: number;
  max_vessel_capacity_tonnes: number;
  fuel_availability: string[];
  shore_power_available: boolean;
  port_cost: number;
  typical_wait_hours: number;
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waypoint_type: 'port' | 'strait' | 'canal' | 'sea' | 'ocean' | 'checkpoint';
  navigational_notes?: string;
}

export interface RouteSegment {
  id: string;
  from_node: string;
  to_node: string;
  distance_nm: number;
  minimum_speed_knots: number;
  maximum_speed_knots: number;
  draft_limit_m?: number | null;
  route_restriction?: string | null;
  transit_cost: number;
  notes?: string;
}

export interface MaritimeRoute {
  id: string;
  name: string;
  origin_port_id: string;
  destination_port_id: string;
  origin_port?: Port;
  destination_port?: Port;
  waypoint_ids: string[];
  waypoints?: Waypoint[];
  segment_ids: string[];
  segments?: RouteSegment[];
  total_distance_nm: number;
  estimated_transit_hours: number;
  estimated_transit_days: number;
  route_cost: number;
  restrictions: string[];
  feasibility_status: 'feasible' | 'infeasible';
  infeasibility_reasons: string[];
  route_type: 'canal_transit' | 'open_ocean';
  disclaimer: string;
}

export interface CandidateRouteRequest {
  origin_port_id: string;
  destination_port_id: string;
  vessel_id?: string;
  cargo_weight_tonnes?: number;
}

export interface CandidateRouteResponse {
  status: string;
  disclaimer: string;
  origin_port: Port;
  destination_port: Port;
  vessel_id?: string | null;
  vessel_name?: string | null;
  cargo_weight_tonnes?: number | null;
  candidate_routes: MaritimeRoute[];
  total_candidates: number;
  feasible_candidates: number;
}
