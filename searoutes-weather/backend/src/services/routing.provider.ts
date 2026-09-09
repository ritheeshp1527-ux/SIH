import type { VoyageRequest } from '../models/request.model';

export interface RouteResult {
  source: string;
  destination: string;
  distance: number; // in nautical miles
  duration: number; // in milliseconds
  geometry: GeoJSON.LineString;
  provider: string;
  metadata?: any;
}

export interface IRoutingProvider {
  getRoute(request: VoyageRequest): Promise<RouteResult>;
  getAlternatives?(request: VoyageRequest, k?: number): Promise<RouteResult[]>;
}
