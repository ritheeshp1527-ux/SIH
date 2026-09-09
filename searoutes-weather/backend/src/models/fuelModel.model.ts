export interface FuelModelInput {
  latitude: number;
  longitude: number;
  timestamp: string;

  windSpeed: number | null;
  windDirection: number | null;

  significantWaveHeight: number | null;
  seaState: number | null;

  oceanCurrentSpeed: number | null;
  oceanCurrentDirection: number | null;

  alongTrackCurrent: number | null;

  visibility: number | null;
  stormFlag: boolean | null;

  weatherRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null;
}

export interface FuelModelRouteInput {
  sourcePort: string;
  destinationPort: string;

  routeId: string;

  departureTime: string;
  estimatedArrivalTime: string;

  distanceNm: number;
  durationHours: number;

  vesselSpeedKts: number | null;
  vesselDraftM: number | null;

  environmentalPoints: FuelModelInput[];

  marineForecastHorizonDays: number;
  marineCoverageRatio: number;
  weatherCoverageRatio: number;

  routeOptimizationScore: number | null;
}
