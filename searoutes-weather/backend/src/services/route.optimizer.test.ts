import { RouteOptimizer } from './route.optimizer';
import { RoutePlan, EnvironmentalPoint } from '../models/routePlan.model';

describe('RouteOptimizer', () => {
  let optimizer: RouteOptimizer;

  beforeEach(() => {
    optimizer = new RouteOptimizer();
  });

  const createCandidate = (id: string, distanceM: number, envPoints: Partial<EnvironmentalPoint>[]): RoutePlan => {
    return {
      id,
      isPrimary: false,
      distance: distanceM,
      duration: 100000,
      geometry: { type: 'LineString', coordinates: [] },
      environmentalPoints: envPoints as EnvironmentalPoint[],
      metadata: {}
    };
  };

  it('ranks candidates and sets one to isPrimary=true', () => {
    const c1 = createCandidate('1', 3000 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: 0, stormFlag: false, weatherRiskLevel: 'LOW' }]);
    const c2 = createCandidate('2', 2900 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: 0, stormFlag: false, weatherRiskLevel: 'LOW' }]);
    const c3 = createCandidate('3', 3100 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: 0, stormFlag: false, weatherRiskLevel: 'LOW' }]);

    const ranked = optimizer.rankCandidates([c1, c2, c3]);
    
    expect(ranked.length).toBe(3);
    expect(ranked[0].id).toBe('2'); // c2 is shortest, identical weather
    expect(ranked[0].isPrimary).toBe(true);
    expect(ranked[1].isPrimary).toBe(false);
    expect(ranked[2].isPrimary).toBe(false);
    
    expect(ranked[0].optimization?.rank).toBe(1);
    expect(ranked[1].optimization?.rank).toBe(2);
    expect(ranked[2].optimization?.rank).toBe(3);
  });

  it('favorable current improves the score (lower score is better)', () => {
    const neutral = createCandidate('neutral', 1000 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: 0 }]);
    const favorable = createCandidate('favorable', 1000 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: 2 }]);
    const adverse = createCandidate('adverse', 1000 * 1852, [{ windSpeed: 10, waveHeight: 1, alongTrackCurrent: -2 }]);

    const ranked = optimizer.rankCandidates([neutral, favorable, adverse]);
    
    expect(ranked[0].id).toBe('favorable'); // Best
    expect(ranked[1].id).toBe('neutral'); // Middle
    expect(ranked[2].id).toBe('adverse'); // Worst

    // Check specific scores
    const favScore = ranked.find(r => r.id === 'favorable')?.optimization?.score!;
    const neuScore = ranked.find(r => r.id === 'neutral')?.optimization?.score!;
    const advScore = ranked.find(r => r.id === 'adverse')?.optimization?.score!;
    
    expect(favScore).toBeLessThan(neuScore);
    expect(advScore).toBeGreaterThan(neuScore);
  });

  it('higher wave height worsens the score', () => {
    const lowWaves = createCandidate('low', 1000 * 1852, [{ waveHeight: 1 }]);
    const highWaves = createCandidate('high', 1000 * 1852, [{ waveHeight: 5 }]);

    const ranked = optimizer.rankCandidates([lowWaves, highWaves]);
    expect(ranked[0].id).toBe('low');
    
    const lowScore = ranked.find(r => r.id === 'low')?.optimization?.score!;
    const highScore = ranked.find(r => r.id === 'high')?.optimization?.score!;
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('stormFlag applies a significant penalty', () => {
    const noStorm = createCandidate('safe', 1000 * 1852, [{ stormFlag: false }]);
    const storm = createCandidate('storm', 900 * 1852, [{ stormFlag: true }]); // Even if shorter distance

    const ranked = optimizer.rankCandidates([noStorm, storm]);
    expect(ranked[0].id).toBe('safe'); // Should win despite longer distance
  });

  it('missing wave/current data does NOT become zero and marine coverage ratio is correct', () => {
    // 2 points total. One has marine data, one does not.
    const partialMarine = createCandidate('partial', 1000 * 1852, [
      { windSpeed: 10, waveHeight: 2, alongTrackCurrent: 0 },
      { windSpeed: 10 } // Missing marine data
    ]);

    const ranked = optimizer.rankCandidates([partialMarine]);
    const opt = ranked[0].optimization;
    
    expect(opt).toBeDefined();
    expect(opt?.marineCoverageRatio).toBe(0.5); // 1 out of 2 points
    expect(opt?.weatherCoverageRatio).toBe(1.0); // 2 out of 2 points
    
    // Wave score should only be based on the valid point (2 * 200 = 400), rather than averaging 2 and 0.
    expect(opt?.waveScore).toBe(400); 
  });

  it('handles routes with absolutely no environmental data securely', () => {
    const noData = createCandidate('nodata', 1000 * 1852, []); // 0 points
    const ranked = optimizer.rankCandidates([noData]);
    
    expect(ranked.length).toBe(1);
    expect(ranked[0].isPrimary).toBe(true); // Automatically becomes primary as it's the only one
    expect(ranked[0].optimization).toBeUndefined(); // Cannot optimize
  });
});
