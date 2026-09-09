import { IRoutingProvider, RouteResult } from './routing.provider';
import { VoyageRequest } from '../models/request.model';
import searoute, { seaRouteAlternatives } from 'searoute-ts';
import 'searoute-ts/ports';

export class EurostatProvider implements IRoutingProvider {
  public async getRoute(request: VoyageRequest): Promise<RouteResult> {
    const { sourcePort, destinationPort, vesselSpeed, vesselDraft } = request;

    if (!sourcePort || !destinationPort) {
      throw new Error('source and destination are required');
    }

    if (sourcePort.trim().toUpperCase() === destinationPort.trim().toUpperCase()) {
      throw new Error('source and destination cannot be identical');
    }

    try {
      const routeFeature = searoute(sourcePort.trim().toUpperCase(), destinationPort.trim().toUpperCase(), {
        suez: true,
        panama: true,
        babelmandeb: true,
        speed_knot: vesselSpeed,
        draft_m: vesselDraft
      } as any);

      if (!routeFeature || !routeFeature.geometry) {
        throw new Error('Routing failure: no path found');
      }

      const distanceNm = routeFeature.properties?.length || 0;
      // @ts-ignore
      let durationHours = routeFeature.properties?.duration || 0;
      
      // Fallback manual calculation if searoute-ts didn't return duration
      if (!durationHours && vesselSpeed && vesselSpeed > 0) {
        durationHours = distanceNm / vesselSpeed;
      }
      
      const durationMs = durationHours * 3600000;

      return {
        source: sourcePort,
        destination: destinationPort,
        distance: distanceNm,
        duration: durationMs,
        // @ts-ignore: Geometry types are compatible for our use case
      geometry: routeFeature.geometry,
        provider: 'Eurostat SeaRoute (searoute-ts)',
        metadata: {
          draft: vesselDraft,
          speed: vesselSpeed,
          ...routeFeature.properties
        }
      };
    } catch (error: any) {
      console.error('EurostatProvider Error:', error);
      throw new Error(`Route generation failed: ${error.message}`);
    }
  }

  public async getAlternatives(request: VoyageRequest, k: number = 3): Promise<RouteResult[]> {
    const { sourcePort, destinationPort, vesselSpeed, vesselDraft } = request;

    if (!sourcePort || !destinationPort) {
      throw new Error('source and destination are required');
    }

    if (sourcePort.trim().toUpperCase() === destinationPort.trim().toUpperCase()) {
      throw new Error('source and destination cannot be identical');
    }

    try {
      const alts = seaRouteAlternatives(sourcePort.trim().toUpperCase(), destinationPort.trim().toUpperCase(), {
        k,
        suez: true,
        panama: true,
        babelmandeb: true,
        speed_knot: vesselSpeed,
        draft_m: vesselDraft
      } as any);

      if (!alts || alts.length === 0) {
        // Fallback to single route if alternatives fail to generate somehow but didn't throw
        const singleRoute = await this.getRoute(request);
        return [singleRoute];
      }

      return alts.map((routeFeature: any, index: number) => {
        const distanceNm = routeFeature.properties?.length || 0;
        let durationHours = routeFeature.properties?.duration || 0;
        
        // Fallback manual calculation if searoute-ts didn't return duration
        if (!durationHours && vesselSpeed && vesselSpeed > 0) {
          durationHours = distanceNm / vesselSpeed;
        }
        
        const durationMs = durationHours * 3600000;

        return {
          source: sourcePort,
          destination: destinationPort,
          distance: distanceNm,
          duration: durationMs,
          geometry: routeFeature.geometry,
          provider: 'Eurostat SeaRoute (searoute-ts)',
          metadata: {
            draft: vesselDraft,
            speed: vesselSpeed,
            candidateIndex: index,
            ...routeFeature.properties
          }
        };
      });
    } catch (error: any) {
      console.warn('EurostatProvider Alternative Routing failed, falling back to standard getRoute:', error);
      const singleRoute = await this.getRoute(request);
      return [singleRoute];
    }
  }
}
