import { EnvironmentalPoint } from '../models/routePlan.model';
import type * as GeoJSON from 'geojson';

export interface IEnvironmentalProvider {
  /**
   * Retrieves environmental data along a specified route.
   * 
   * @param geometry The generated maritime route geometry
   * @param departureTime The voyage departure timestamp
   * @param vesselSpeedKts The vessel speed in knots (if available)
   * @param totalDistanceM The total distance of the route in meters
   * @param totalDurationMs The total duration of the route in milliseconds
   */
  getEnvironmentalData(
    geometry: GeoJSON.LineString,
    departureTime: Date,
    vesselSpeedKts: number | undefined,
    totalDistanceM: number,
    totalDurationMs: number
  ): Promise<{ points: EnvironmentalPoint[], rawData: any }>;
}
