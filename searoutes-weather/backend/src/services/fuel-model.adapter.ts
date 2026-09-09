import { RoutePlan, EnvironmentalPoint } from '../models/routePlan.model';
import { VoyageRequest } from '../models/request.model';
import { FuelModelInput, FuelModelRouteInput } from '../models/fuelModel.model';

export class FuelModelAdapter {
  /**
   * Transforms a primary RoutePlan into the exact input schema expected by the fuel model.
   * Performs deterministic transformation with NO external API calls.
   */
  public createHandoff(route: RoutePlan, request: VoyageRequest): FuelModelRouteInput {
    const departureTimeMs = request.departureTimestamp ? new Date(request.departureTimestamp).getTime() : Date.now();
    const durationMs = route.duration || 0;
    
    const departureTime = new Date(departureTimeMs).toISOString();
    const estimatedArrivalTime = new Date(departureTimeMs + durationMs).toISOString();

    const distanceNm = route.distance / 1852;
    const durationHours = durationMs / 3600000;

    const marineForecastHorizonDays = 8; // Project-level constraint
    
    let marineCoverageRatio = 0;
    let weatherCoverageRatio = 0;
    let routeOptimizationScore: number | null = null;
    
    if (route.optimization) {
      marineCoverageRatio = route.optimization.marineCoverageRatio;
      weatherCoverageRatio = route.optimization.weatherCoverageRatio;
      routeOptimizationScore = route.optimization.score;
    }

    const environmentalPoints: FuelModelInput[] = route.environmentalPoints.map((pt) => {
      return this.transformEnvironmentalPoint(pt);
    });

    return {
      sourcePort: request.sourcePort,
      destinationPort: request.destinationPort,
      routeId: route.id,
      departureTime,
      estimatedArrivalTime,
      distanceNm,
      durationHours,
      vesselSpeedKts: request.vesselSpeed || null,
      vesselDraftM: request.vesselDraft || null,
      environmentalPoints,
      marineForecastHorizonDays,
      marineCoverageRatio,
      weatherCoverageRatio,
      routeOptimizationScore
    };
  }

  private transformEnvironmentalPoint(pt: EnvironmentalPoint): FuelModelInput {
    // Helper function to safely convert undefined to null, leaving zero and other falsy numbers intact.
    const toNullIfUndefined = (val: number | undefined | null): number | null => {
      return (val !== undefined && val !== null) ? val : null;
    };

    return {
      latitude: pt.latitude,
      longitude: pt.longitude,
      timestamp: pt.timestamp, // Already ISO-8601
      
      windSpeed: toNullIfUndefined(pt.windSpeed),
      windDirection: toNullIfUndefined(pt.windDirection),
      
      significantWaveHeight: toNullIfUndefined(pt.waveHeight),
      seaState: toNullIfUndefined(pt.seaState),
      
      oceanCurrentSpeed: toNullIfUndefined(pt.oceanCurrentVelocity),
      oceanCurrentDirection: toNullIfUndefined(pt.oceanCurrentDirection),
      
      alongTrackCurrent: toNullIfUndefined(pt.alongTrackCurrent),
      
      visibility: null, // Hardcoded per requirements (no visibility provider yet)
      
      stormFlag: (pt.stormFlag !== undefined && pt.stormFlag !== null) ? pt.stormFlag : null,
      weatherRiskLevel: (pt.weatherRiskLevel !== undefined && pt.weatherRiskLevel !== null) ? pt.weatherRiskLevel : null,
    };
  }
}
