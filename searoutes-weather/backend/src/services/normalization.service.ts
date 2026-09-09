import { VoyageRequest } from '../models/request.model';
import { RouteResponse, RoutePlan, EnvironmentalPoint } from '../models/routePlan.model';
import { RawSeaRoutesRoutingResponse, RawSeaRoutesWeatherResponse } from '../models/rawData.model';
import * as crypto from 'crypto';

export class NormalizationService {
  public createRouteResponse(
    request: VoyageRequest,
    routingData: RawSeaRoutesRoutingResponse,
    weatherData: RawSeaRoutesWeatherResponse
  ): RouteResponse {
    
    const routes: RoutePlan[] = [];

    if (routingData.features && routingData.features.length > 0) {
      // For MVP, we use the first returned feature as the primary route
      const primaryFeature = routingData.features[0];
      
      const environmentalPoints: EnvironmentalPoint[] = weatherData.data?.map(pt => ({
        latitude: pt.lat,
        longitude: pt.lon,
        // Depending on SeaRoutes API time might be timestamp or string
        timestamp: typeof pt.time === 'number' ? new Date(pt.time).toISOString() : new Date(pt.time as string).toISOString(),
        windSpeed: pt.windSpeed,
        windDirection: pt.windDir,
        waveHeight: pt.waveHeight,
        waveDirection: pt.waveDir,
        wavePeriod: pt.wavePeriod,
        oceanCurrentSpeed: pt.currentSpeed,
        oceanCurrentDirection: pt.currentDir
      })) || [];

      // Clean up properties for metadata, excluding standard fields
      const { distance, duration, ...metadata } = primaryFeature.properties || {};

      const routePlan: RoutePlan = {
        id: crypto.randomUUID(),
        isPrimary: true,
        distance: distance || 0,
        duration: duration || 0,
        geometry: primaryFeature.geometry,
        environmentalPoints: environmentalPoints,
        metadata: metadata
      };

      routes.push(routePlan);
    }

    return {
      voyageRequest: request,
      routes: routes,
      rawProviderData: {
        routingResponse: routingData,
        weatherResponse: weatherData
      }
    };
  }
}
