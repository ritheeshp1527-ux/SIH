import { Request, Response } from 'express';
import { RoutingService } from '../services/routing.service';
import { EurostatProvider } from '../services/eurostat.provider';
import { WeatherService } from '../services/weather.service';
import { OpenMeteoEnvironmentalProvider } from '../services/openmeteo.provider';
import { RouteOptimizer } from '../services/route.optimizer';
import { FuelModelAdapter } from '../services/fuel-model.adapter';
import { VoyageRequest } from '../models/request.model';
import { RoutePlan, RouteResponse, EnvironmentalPoint } from '../models/routePlan.model';
import * as crypto from 'crypto';

export class VoyageController {
  // Keeping the old providers intact for potential future use
  private legacyRoutingService = new RoutingService();
  private weatherService = new WeatherService();
  
  // Active providers
  private activeRoutingProvider = new EurostatProvider();
  private envProvider = new OpenMeteoEnvironmentalProvider();
  private routeOptimizer = new RouteOptimizer();
  private fuelModelAdapter = new FuelModelAdapter();

  public getVoyage = async (req: Request, res: Response): Promise<void> => {
    try {
      const voyageRequest: VoyageRequest = req.body;

      if (!voyageRequest.sourcePort || !voyageRequest.destinationPort) {
        res.status(400).json({ error: 'sourcePort and destinationPort are required' });
        return;
      }
      if (voyageRequest.sourcePort === voyageRequest.destinationPort) {
        res.status(400).json({ error: 'source and destination cannot be identical' });
        return;
      }

      // 1. Get the maritime route candidates (alternatives)
      let routeResults = [];
      if (this.activeRoutingProvider.getAlternatives) {
        routeResults = await this.activeRoutingProvider.getAlternatives(voyageRequest, 3);
      } else {
        const singleRoute = await this.activeRoutingProvider.getRoute(voyageRequest);
        routeResults = [singleRoute];
      }

      const departureTime = voyageRequest.departureTimestamp 
        ? new Date(voyageRequest.departureTimestamp) 
        : new Date();

      const candidates: RoutePlan[] = [];

      // 2. Fetch Environmental Data for each candidate independently
      for (let i = 0; i < routeResults.length; i++) {
        const routeResult = routeResults[i];
        const distanceM = routeResult.distance * 1852;
        const durationMs = routeResult.duration;

        let envPoints: EnvironmentalPoint[] = [];
        let envRawData: any = null;

        try {
          const envResult = await this.envProvider.getEnvironmentalData(
            routeResult.geometry,
            departureTime,
            voyageRequest.vesselSpeed,
            distanceM,
            durationMs
          );
          envPoints = envResult.points;
          envRawData = envResult.rawData;
        } catch (envError) {
          console.warn(`Environmental provider failed for candidate ${i}, preserving route without environmental data:`, envError);
        }

        const routePlan: RoutePlan = {
          id: crypto.randomUUID(),
          isPrimary: false, // Will be set by optimizer
          distance: distanceM,
          duration: durationMs,
          geometry: routeResult.geometry,
          environmentalPoints: envPoints,
          metadata: {
            provider: routeResult.provider,
            ...routeResult.metadata
          }
        };

        candidates.push(routePlan);
      }

      // 3. Score and rank the candidates
      let finalRoutes = this.routeOptimizer.rankCandidates(candidates);

      // 4. Defensive fallback if ALL candidates failed environmental optimization completely
      // rankCandidates returns empty optimization blocks if no points exist
      // If none of the routes got an optimization block, ensure the first is marked primary
      if (finalRoutes.length > 0 && !finalRoutes.some(r => r.optimization)) {
        finalRoutes[0].isPrimary = true;
      }

      const primaryRoute = finalRoutes.find(r => r.isPrimary);
      let fuelModelInput = undefined;
      if (primaryRoute) {
        fuelModelInput = this.fuelModelAdapter.createHandoff(primaryRoute, voyageRequest);
      }

      const routeResponse: RouteResponse = {
        voyageRequest,
        routes: finalRoutes,
        fuelModelInput,
        rawProviderData: {
          routingResponse: routeResults, // Keeping raw reference
          weatherResponse: null // Omitted to avoid bloating response with up to 3x payload
        }
      };

      res.status(200).json(routeResponse);
    } catch (error: any) {
      console.error('VoyageController Error:', error);
      res.status(400).json({ error: error.message });
    }
  };
}
