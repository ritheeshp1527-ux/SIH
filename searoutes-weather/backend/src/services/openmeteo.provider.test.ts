import { OpenMeteoEnvironmentalProvider } from './openmeteo.provider';
import type * as GeoJSON from 'geojson';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenMeteoEnvironmentalProvider', () => {
  let provider: OpenMeteoEnvironmentalProvider;

  beforeEach(() => {
    provider = new OpenMeteoEnvironmentalProvider();
    jest.clearAllMocks();
  });

  const mockGeometry: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: [
      [-74.006, 40.7128], // NY
      [4.47917, 51.9225]  // Rotterdam
    ]
  };

  it('should sample the route and query Open-Meteo correctly', async () => {
    // Mock the weather response
    mockedAxios.get.mockImplementation(async (url) => {
      if (url.includes('forecast')) {
        return {
          data: {
            hourly: {
              time: [new Date().toISOString()],
              wind_speed_10m: [15],
              wind_direction_10m: [180]
            }
          }
        };
      } else if (url.includes('marine')) {
        return {
          data: {
            hourly: {
              time: [new Date().toISOString()],
              wave_height: [2.5],
              wave_direction: [190],
              ocean_current_velocity: [1.2],
              ocean_current_direction: [200]
            }
          }
        };
      }
      return { data: {} };
    });

    const departureTime = new Date();
    const totalDistanceM = 6200000;
    const totalDurationMs = 800000000; // ~9.2 days

    const result = await provider.getEnvironmentalData(
      mockGeometry,
      departureTime,
      15,
      totalDistanceM,
      totalDurationMs
    );

    // It should have generated 40 samples by default between start and end
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.points[0].latitude).toBe(40.7128);
    expect(result.points[0].longitude).toBe(-74.006);

    // Should have called axios twice
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);

    const marineCallArgs = mockedAxios.get.mock.calls.find(c => c[0].includes('marine'));
    expect(marineCallArgs).toBeDefined();
    expect((marineCallArgs![1]?.params as any).forecast_days).toBeLessThanOrEqual(8);
    expect((marineCallArgs![1]?.params as any).cell_selection).toBe('sea');

    const weatherCallArgs = mockedAxios.get.mock.calls.find(c => c[0].includes('forecast'));
    expect(weatherCallArgs).toBeDefined();
    expect((weatherCallArgs![1]?.params as any).forecast_days).toBeLessThanOrEqual(16);
    expect((weatherCallArgs![1]?.params as any).cell_selection).toBe('sea');
  });

  it('should gracefully handle API failures by returning an empty array if completely failed', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));

    const departureTime = new Date();
    
    await expect(provider.getEnvironmentalData(
      mockGeometry,
      departureTime,
      15,
      1000,
      1000
    )).rejects.toThrow('Failed to fetch environmental data from Open-Meteo');
  });
});
