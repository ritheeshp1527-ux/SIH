import { EurostatProvider } from './eurostat.provider';
import { VoyageRequest } from '../models/request.model';

describe('EurostatProvider', () => {
  let provider: EurostatProvider;

  beforeEach(() => {
    provider = new EurostatProvider();
  });

  it('should generate a valid route between USNYC and NLRTM', async () => {
    const request: VoyageRequest = {
      sourcePort: 'USNYC',
      destinationPort: 'NLRTM',
      vesselSpeed: 15
    };

    const result = await provider.getRoute(request);

    expect(result).toBeDefined();
    expect(result.source).toBe('USNYC');
    expect(result.destination).toBe('NLRTM');
    
    expect(result.geometry.type).toBe('LineString');
    expect(Array.isArray(result.geometry.coordinates)).toBe(true);
    expect(result.geometry.coordinates.length).toBeGreaterThan(0);

    expect(result.distance).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should throw an error for identical origin and destination', async () => {
    const request: VoyageRequest = {
      sourcePort: 'USNYC',
      destinationPort: 'usnyc '
    };

    await expect(provider.getRoute(request)).rejects.toThrow('source and destination cannot be identical');
  });

  it('should throw an error for unknown or invalid UN/LOCODE', async () => {
    const request: VoyageRequest = {
      sourcePort: 'INVALID123',
      destinationPort: 'NLRTM'
    };

    await expect(provider.getRoute(request)).rejects.toThrow();
  });

  it('should ignore impossible constraints and still return a route', async () => {
    const request: VoyageRequest = {
      sourcePort: 'USNYC',
      destinationPort: 'NLRTM',
      vesselDraft: 1000 
    };

    const result = await provider.getRoute(request);
    expect(result).toBeDefined();
  });
});
