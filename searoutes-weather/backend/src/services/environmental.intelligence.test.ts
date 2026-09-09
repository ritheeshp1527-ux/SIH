import {
  deriveSeaState,
  calculateAlongTrackCurrent,
  deriveStormFlag,
  deriveWeatherRiskLevel,
  calculateBearing,
  STRONG_ADVERSE_CURRENT,
  MEANINGFUL_ADVERSE_CURRENT
} from './environmental.intelligence';

describe('Environmental Intelligence', () => {
  describe('deriveSeaState', () => {
    it('returns correct sea state for given wave heights', () => {
      expect(deriveSeaState(0)).toBe(0);
      expect(deriveSeaState(0.05)).toBe(1);
      expect(deriveSeaState(0.3)).toBe(2);
      expect(deriveSeaState(1)).toBe(3);
      expect(deriveSeaState(2)).toBe(4);
      expect(deriveSeaState(3)).toBe(5);
      expect(deriveSeaState(5)).toBe(6);
      expect(deriveSeaState(7)).toBe(7);
      expect(deriveSeaState(10)).toBe(8);
      expect(deriveSeaState(15)).toBe(9);
      expect(deriveSeaState(null)).toBeNull();
      expect(deriveSeaState(undefined)).toBeNull();
    });
  });

  describe('calculateAlongTrackCurrent', () => {
    it('calculates following current (positive)', () => {
      // Current flowing East (90), vessel travelling East (90)
      expect(calculateAlongTrackCurrent(2.0, 90, 90)).toBe(2.0);
    });

    it('calculates opposing current (negative)', () => {
      // Current flowing East (90), vessel travelling West (270)
      expect(calculateAlongTrackCurrent(2.0, 90, 270)).toBe(-2.0);
    });

    it('calculates cross-current (zero)', () => {
      // Current flowing East (90), vessel travelling North (0)
      expect(calculateAlongTrackCurrent(2.0, 90, 0)).toBeCloseTo(0, 2);
    });

    it('returns null when inputs are missing', () => {
      expect(calculateAlongTrackCurrent(null, 90, 90)).toBeNull();
      expect(calculateAlongTrackCurrent(2.0, null, 90)).toBeNull();
      expect(calculateAlongTrackCurrent(2.0, 90, undefined)).toBeNull();
    });
  });

  describe('deriveStormFlag', () => {
    it('returns false for wind below 34', () => {
      expect(deriveStormFlag(33, null)).toBe(false);
    });
    
    it('returns true for wind exactly 34', () => {
      expect(deriveStormFlag(34, null)).toBe(true);
    });
    
    it('returns true for wind above 34', () => {
      expect(deriveStormFlag(40, null)).toBe(true);
    });
    
    it('returns false for wave below 6m', () => {
      expect(deriveStormFlag(null, 5.9)).toBe(false);
    });
    
    it('returns true for wave exactly 6m', () => {
      expect(deriveStormFlag(null, 6)).toBe(true);
    });
    
    it('returns true for wave above 6m', () => {
      expect(deriveStormFlag(null, 7)).toBe(true);
    });
    
    it('returns false for missing values', () => {
      expect(deriveStormFlag(null, undefined)).toBe(false);
    });
  });

  describe('deriveWeatherRiskLevel', () => {
    it('returns LOW for normal conditions', () => {
      expect(deriveWeatherRiskLevel(false, 10, 1.0, 1.0)).toBe('LOW');
    });

    it('returns MODERATE for wind >= 20 or wave >= 1.5 or meaningful adverse current', () => {
      expect(deriveWeatherRiskLevel(false, 20, 1.0, 1.0)).toBe('MODERATE');
      expect(deriveWeatherRiskLevel(false, 10, 1.5, 1.0)).toBe('MODERATE');
      expect(deriveWeatherRiskLevel(false, 10, 1.0, MEANINGFUL_ADVERSE_CURRENT)).toBe('MODERATE');
    });

    it('returns HIGH for wind > 30 or wave > 3 or strong adverse current', () => {
      expect(deriveWeatherRiskLevel(false, 31, 1.0, 1.0)).toBe('HIGH');
      expect(deriveWeatherRiskLevel(false, 10, 3.1, 1.0)).toBe('HIGH');
      expect(deriveWeatherRiskLevel(false, 10, 1.0, STRONG_ADVERSE_CURRENT)).toBe('HIGH');
    });

    it('returns CRITICAL for stormFlag or wave >= 6', () => {
      expect(deriveWeatherRiskLevel(true, 10, 1.0, 1.0)).toBe('CRITICAL');
      expect(deriveWeatherRiskLevel(false, 10, 6.0, 1.0)).toBe('CRITICAL');
    });

    it('returns null for insufficient/missing data', () => {
      expect(deriveWeatherRiskLevel(false, null, undefined, null)).toBeNull();
    });

    it('verifies missing marine data does not automatically become dangerous', () => {
      // Wind is available (15 kts, LOW), wave and current are missing
      expect(deriveWeatherRiskLevel(false, 15, null, null)).toBe('LOW');
      // Wind is available (25 kts, MODERATE), wave and current are missing
      expect(deriveWeatherRiskLevel(false, 25, null, null)).toBe('MODERATE');
    });
  });

  describe('calculateBearing', () => {
    it('calculates correct bearing', () => {
      // North
      expect(calculateBearing(0, 0, 10, 0)).toBeCloseTo(0, 1);
      // East
      expect(calculateBearing(0, 0, 0, 10)).toBeCloseTo(90, 1);
      // South
      expect(calculateBearing(10, 0, 0, 0)).toBeCloseTo(180, 1);
      // West
      expect(calculateBearing(0, 10, 0, 0)).toBeCloseTo(270, 1);
    });
  });
});
