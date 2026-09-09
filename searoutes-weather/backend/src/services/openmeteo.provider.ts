import axios from 'axios';
import { IEnvironmentalProvider } from './environmental.provider';
import { EnvironmentalPoint } from '../models/routePlan.model';
import type * as GeoJSON from 'geojson';
import {
  deriveSeaState,
  calculateAlongTrackCurrent,
  deriveStormFlag,
  deriveWeatherRiskLevel,
  calculateBearing
} from './environmental.intelligence';

export class OpenMeteoEnvironmentalProvider implements IEnvironmentalProvider {
  private readonly MAX_SAMPLES = 40;
  private readonly WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
  private readonly MARINE_API_URL = 'https://marine-api.open-meteo.com/v1/marine';

  public async getEnvironmentalData(
    geometry: GeoJSON.LineString,
    departureTime: Date,
    vesselSpeedKts: number | undefined,
    totalDistanceM: number,
    totalDurationMs: number
  ): Promise<{ points: EnvironmentalPoint[], rawData: any }> {
    
    // 1. Sample the route
    const sampledPoints = this.sampleRoute(geometry, totalDistanceM, totalDurationMs, departureTime);

    if (sampledPoints.length === 0) {
      return { points: [], rawData: null };
    }

    // 2. Calculate Forecast Horizons
    const totalDaysNeeded = Math.ceil((departureTime.getTime() - Date.now() + totalDurationMs) / 86400000);
    const weatherForecastDays = Math.max(1, Math.min(totalDaysNeeded, 16));
    const marineForecastDays = Math.max(1, Math.min(totalDaysNeeded, 8));

    // Prepare arrays for batch query
    const latitudes = sampledPoints.map(p => p.lat).join(',');
    const longitudes = sampledPoints.map(p => p.lon).join(',');

    let weatherResponse = null;
    let marineResponse = null;

    // 3. Perform API Requests in parallel
    try {
      const [weatherRes, marineRes] = await Promise.all([
        axios.get(this.WEATHER_API_URL, {
          params: {
            latitude: latitudes,
            longitude: longitudes,
            hourly: 'wind_speed_10m,wind_direction_10m',
            forecast_days: weatherForecastDays,
            cell_selection: 'sea'
          }
        }),
        axios.get(this.MARINE_API_URL, {
          params: {
            latitude: latitudes,
            longitude: longitudes,
            hourly: 'wave_height,wave_direction,ocean_current_velocity,ocean_current_direction',
            forecast_days: marineForecastDays,
            cell_selection: 'sea'
          }
        })
      ]);
      weatherResponse = weatherRes.data;
      marineResponse = marineRes.data;
    } catch (error) {
      console.error('Open-Meteo API Error:', error);
      throw new Error('Failed to fetch environmental data from Open-Meteo');
    }

    // 4. Normalize
    const normalizedPoints: EnvironmentalPoint[] = [];

    // Open-Meteo returns an array of objects if multiple coordinates are passed, 
    // OR a single object if only 1 coordinate is passed.
    const weatherList = Array.isArray(weatherResponse) ? weatherResponse : [weatherResponse];
    const marineList = Array.isArray(marineResponse) ? marineResponse : [marineResponse];

    for (let i = 0; i < sampledPoints.length; i++) {
      const sample = sampledPoints[i];
      const wData = weatherList[i]?.hourly;
      const mData = marineList[i]?.hourly;

      const point: EnvironmentalPoint = {
        latitude: sample.lat,
        longitude: sample.lon,
        timestamp: sample.timestamp.toISOString(),
      };

      // Match time for weather (16 days)
      if (wData && wData.time) {
        const timeIndex = this.findClosestTimeIndex(wData.time, sample.timestamp);
        if (timeIndex !== -1) {
          point.windSpeed = wData.wind_speed_10m[timeIndex] ?? undefined;
          point.windDirection = wData.wind_direction_10m[timeIndex] ?? undefined;
        }
      }

      // Match time for marine (8 days)
      if (mData && mData.time) {
        const timeIndex = this.findClosestTimeIndex(mData.time, sample.timestamp);
        if (timeIndex !== -1) {
          point.waveHeight = mData.wave_height[timeIndex] ?? undefined;
          point.waveDirection = mData.wave_direction[timeIndex] ?? undefined;
          point.oceanCurrentVelocity = mData.ocean_current_velocity[timeIndex] ?? undefined;
          point.oceanCurrentDirection = mData.ocean_current_direction[timeIndex] ?? undefined;
        }
      }

      // Calculate local bearing
      let localBearing: number | null = null;
      if (i < sampledPoints.length - 1) {
        localBearing = calculateBearing(sample.lat, sample.lon, sampledPoints[i+1].lat, sampledPoints[i+1].lon);
      } else if (i > 0) {
        localBearing = calculateBearing(sampledPoints[i-1].lat, sampledPoints[i-1].lon, sample.lat, sample.lon);
      }

      // Phase 6 Derived Fields
      point.seaState = deriveSeaState(point.waveHeight);
      point.alongTrackCurrent = calculateAlongTrackCurrent(point.oceanCurrentVelocity, point.oceanCurrentDirection, localBearing);
      point.stormFlag = deriveStormFlag(point.windSpeed, point.waveHeight);
      point.weatherRiskLevel = deriveWeatherRiskLevel(point.stormFlag, point.windSpeed, point.waveHeight, point.alongTrackCurrent);
      point.visibility = null;

      normalizedPoints.push(point);
    }

    return {
      points: normalizedPoints,
      rawData: { weatherResponse, marineResponse }
    };
  }

  private sampleRoute(
    geometry: GeoJSON.LineString, 
    totalDistanceM: number, 
    totalDurationMs: number, 
    departureTime: Date
  ): { lat: number, lon: number, distanceM: number, timestamp: Date }[] {
    const coords = geometry.coordinates;
    if (!coords || coords.length === 0) return [];

    const numSamples = Math.min(this.MAX_SAMPLES, coords.length);
    const intervalM = totalDistanceM / Math.max(1, numSamples - 1);

    const samples: { lat: number, lon: number, distanceM: number, timestamp: Date }[] = [];
    
    // Always include start
    samples.push({
      lat: coords[0][1],
      lon: coords[0][0],
      distanceM: 0,
      timestamp: new Date(departureTime.getTime())
    });

    if (coords.length === 1) return samples;

    let currentDistanceM = 0;
    let nextTargetDistanceM = intervalM;
    let sampleCount = 1;

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const segmentDistM = this.haversineDistance(p1[1], p1[0], p2[1], p2[0]);

      while (currentDistanceM + segmentDistM >= nextTargetDistanceM && sampleCount < numSamples - 1) {
        const ratio = (nextTargetDistanceM - currentDistanceM) / segmentDistM;
        const interpLon = p1[0] + (p2[0] - p1[0]) * ratio;
        const interpLat = p1[1] + (p2[1] - p1[1]) * ratio;
        
        const timestampMs = departureTime.getTime() + (nextTargetDistanceM / totalDistanceM) * totalDurationMs;
        
        samples.push({
          lat: interpLat,
          lon: interpLon,
          distanceM: nextTargetDistanceM,
          timestamp: new Date(timestampMs)
        });

        nextTargetDistanceM += intervalM;
        sampleCount++;
      }
      currentDistanceM += segmentDistM;
    }

    // Always include end
    const lastCoord = coords[coords.length - 1];
    samples.push({
      lat: lastCoord[1],
      lon: lastCoord[0],
      distanceM: totalDistanceM,
      timestamp: new Date(departureTime.getTime() + totalDurationMs)
    });

    return samples;
  }

  private findClosestTimeIndex(timeArray: string[], targetTime: Date): number {
    const targetMs = targetTime.getTime();
    let minDiff = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < timeArray.length; i++) {
      const tMs = new Date(timeArray[i]).getTime();
      const diff = Math.abs(tMs - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = i;
      } else if (diff > minDiff) {
        // Since array is sorted, if diff starts increasing, we found the closest
        break;
      }
    }

    // If the closest time is more than 2 hours away, consider it out of horizon/missing.
    if (minDiff > 2 * 60 * 60 * 1000) {
      return -1;
    }

    return bestIndex;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
