export interface Checkpoint {
  name: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
}

export interface Route {
  id: string;
  name: string;
  source: string;
  destination: string;
  distance: number;
  checkpoints: Checkpoint[];
  is_canal_route?: boolean;
  estimated_transit_hours?: number;
}
