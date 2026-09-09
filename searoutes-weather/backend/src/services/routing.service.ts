import axios from 'axios';
import type { VoyageRequest } from '../models/request.model';
import type { RawSeaRoutesRoutingResponse } from '../models/rawData.model';

export class RoutingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.searoutes.com/routing/v2';

  constructor() {
    this.apiKey = process.env.SEAROUTES_API_KEY || '';
  }

  public async getSeaRoute(request: VoyageRequest): Promise<RawSeaRoutesRoutingResponse> {
    if (!this.apiKey) {
      throw new Error('SEAROUTES_API_KEY is not configured.');
    }

    const params: any = {};
    
    // Mapping VoyageRequest to SeaRoutes standard query params
    if (request.sourcePort && request.destinationPort) {
        // Determine if they are coordinates or UN/LOCODEs. 
        // For now, assuming standard coordinate pairs "lon,lat;lon,lat" or portList.
        // We will just pass them in portList as a standard approach for ports.
        params.portList = `${request.sourcePort},${request.destinationPort}`;
    }

    if (request.departureTimestamp) {
      params.departureDateTime = request.departureTimestamp;
    }
    if (request.vesselImo) {
      params.imo = request.vesselImo;
    }
    if (request.vesselDraft) {
      params.draft = request.vesselDraft;
    }
    if (request.vesselSpeed) {
      params.speed = request.vesselSpeed;
    }
    if (request.avoidSeca !== undefined) {
      params.avoidSeca = request.avoidSeca;
    }
    if (request.avoidHra !== undefined) {
      params.avoidHra = request.avoidHra;
    }

    try {
      const response = await axios.get<RawSeaRoutesRoutingResponse>(`${this.baseUrl}/sea`, {
        headers: {
          'x-api-key': this.apiKey,
          'accept': 'application/json'
        },
        params
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching route from SeaRoutes:', error.response?.data || error.message);
      throw error;
    }
  }
}
