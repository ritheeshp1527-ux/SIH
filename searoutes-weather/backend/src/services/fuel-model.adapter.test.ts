import { FuelModelAdapter } from './fuel-model.adapter';
import { RoutePlan, EnvironmentalPoint, RouteOptimizationMetadata } from '../models/routePlan.model';
import { VoyageRequest } from '../models/request.model';

describe('FuelModelAdapter', () => {
  let adapter: FuelModelAdapter;

  beforeEach(() => {
    adapter = new FuelModelAdapter();
  });

  const mockDate = 1700000000000;
  
  const createMockRoutePlan = (): RoutePlan => {
    return {
      id: 'route-123',
      isPrimary: true,
      distance: 18520, // 10 nautical miles
      duration: 3600000, // 1 hour
      geometry: { type: 'LineString', coordinates: [[0,0], [1,1]] },
      metadata: {},
      optimization: {
        score: 100,
        rank: 1,
        distanceScore: 10,
        windScore: 20,
        waveScore: 30,
        currentScore: 40,
        riskScore: 0,
        stormPenalty: 0,
        marineCoverageRatio: 0.8,
        weatherCoverageRatio: 1.0,
        explanation: 'Test'
      },
      environmentalPoints: [
        {
          latitude: 0,
          longitude: 0,
          timestamp: new Date(mockDate).toISOString(),
          windSpeed: 15,
          windDirection: 180,
          waveHeight: 2.5,
          waveDirection: 90,
          wavePeriod: 6,
          oceanCurrentVelocity: 1.2,
          oceanCurrentDirection: 270,
          seaState: 4,
          alongTrackCurrent: 0.5,
          stormFlag: false,
          weatherRiskLevel: 'MODERATE'
        },
        {
          latitude: 1,
          longitude: 1,
          timestamp: new Date(mockDate + 3600000).toISOString(),
          windSpeed: undefined,
          windDirection: undefined,
          waveHeight: undefined,
          waveDirection: undefined,
          wavePeriod: undefined,
          oceanCurrentVelocity: undefined,
          oceanCurrentDirection: undefined,
          seaState: undefined,
          alongTrackCurrent: undefined,
          stormFlag: undefined,
          weatherRiskLevel: undefined
        }
      ]
    };
  };

  const createMockRequest = (): VoyageRequest => {
    return {
      sourcePort: 'USNYC',
      destinationPort: 'NLRTM',
      vesselSpeed: 10,
      vesselDraft: 8,
      departureTimestamp: new Date(mockDate).toISOString()
    };
  };

  it('transforms RoutePlan and VoyageRequest correctly', () => {
    const route = createMockRoutePlan();
    const req = createMockRequest();

    const result = adapter.createHandoff(route, req);

    // Voyage Level Properties
    expect(result.sourcePort).toBe('USNYC');
    expect(result.destinationPort).toBe('NLRTM');
    expect(result.routeId).toBe('route-123');
    expect(result.distanceNm).toBe(10);
    expect(result.durationHours).toBe(1);
    expect(result.vesselSpeedKts).toBe(10);
    expect(result.vesselDraftM).toBe(8);
    expect(result.marineForecastHorizonDays).toBe(8);
    expect(result.marineCoverageRatio).toBe(0.8);
    expect(result.weatherCoverageRatio).toBe(1.0);
    expect(result.routeOptimizationScore).toBe(100);

    // Timestamps
    expect(result.departureTime).toBe(new Date(mockDate).toISOString());
    expect(result.estimatedArrivalTime).toBe(new Date(mockDate + 3600000).toISOString());

    // Array length preserved exactly
    expect(result.environmentalPoints.length).toBe(2);

    // Field mappings - Point 1 (Full Data)
    const pt1 = result.environmentalPoints[0];
    expect(pt1.latitude).toBe(0);
    expect(pt1.longitude).toBe(0);
    expect(pt1.timestamp).toBe(new Date(mockDate).toISOString());
    expect(pt1.windSpeed).toBe(15);
    expect(pt1.windDirection).toBe(180);
    expect(pt1.significantWaveHeight).toBe(2.5); // mapped from waveHeight
    expect(pt1.seaState).toBe(4);
    expect(pt1.oceanCurrentSpeed).toBe(1.2); // mapped from oceanCurrentVelocity
    expect(pt1.oceanCurrentDirection).toBe(270);
    expect(pt1.alongTrackCurrent).toBe(0.5);
    expect(pt1.visibility).toBeNull(); // hardcoded null
    expect(pt1.stormFlag).toBe(false);
    expect(pt1.weatherRiskLevel).toBe('MODERATE');

    // Field mappings - Point 2 (Undefined Data becomes Null)
    const pt2 = result.environmentalPoints[1];
    expect(pt2.windSpeed).toBeNull();
    expect(pt2.significantWaveHeight).toBeNull();
    expect(pt2.seaState).toBeNull();
    expect(pt2.oceanCurrentSpeed).toBeNull();
    expect(pt2.alongTrackCurrent).toBeNull();
    expect(pt2.visibility).toBeNull();
    expect(pt2.stormFlag).toBeNull();
    expect(pt2.weatherRiskLevel).toBeNull();
  });
});
