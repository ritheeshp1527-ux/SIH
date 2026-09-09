import { VoyageRequest } from './request.model';
import { FuelModelRouteInput } from './fuelModel.model';

export interface RouteResponse {
  voyageRequest: VoyageRequest;
  routes: RoutePlan[];
  fuelModelInput?: FuelModelRouteInput;
  rawProviderData: {
    routingResponse: any;
    weatherResponse: any;
  };
}

export interface RouteOptimizationMetadata {
  score: number;
  rank: number;
  distanceScore: number;
  windScore: number;
  waveScore: number | null;
  currentScore: number | null;
  riskScore: number;
  stormPenalty: number;
  marineCoverageRatio: number;
  weatherCoverageRatio: number;
  explanation: string;
}

export interface RoutePlan {
  id: string;
  isPrimary: boolean;
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  environmentalPoints: EnvironmentalPoint[];
  metadata: Record<string, any>;
  optimization?: RouteOptimizationMetadata;
}

export interface EnvironmentalPoint {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO-8601
  windSpeed?: number;
  windDirection?: number;
  waveHeight?: number;
  waveDirection?: number;
  wavePeriod?: number;
  oceanCurrentVelocity?: number;
  oceanCurrentDirection?: number;
  
  // Phase 6 Derived Environmental Fields
  seaState?: number | null;
  alongTrackCurrent?: number | null;
  stormFlag?: boolean;
  weatherRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null;
  visibility?: number | null;
}
