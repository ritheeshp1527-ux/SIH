import axios from 'axios';
import type { RawSeaRoutesWeatherResponse } from '../models/rawData.model';

export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.searoutes.com/weather/v2';

  constructor() {
    this.apiKey = process.env.SEAROUTES_API_KEY || '';
  }

  public async getTrackWeather(geometry: GeoJSON.LineString, departureTimestamp: string): Promise<RawSeaRoutesWeatherResponse> {
    if (!this.apiKey) {
      throw new Error('SEAROUTES_API_KEY is not configured.');
    }

    const payload = {
      geometry: geometry,
      departureTime: departureTimestamp
    };

    try {
      const response = await axios.post<RawSeaRoutesWeatherResponse>(`${this.baseUrl}/track`, payload, {
        headers: {
          'x-api-key': this.apiKey,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching weather track from SeaRoutes:', error.response?.data || error.message);
      throw error;
    }
  }
}
