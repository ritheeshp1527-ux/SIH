export const STRONG_ADVERSE_CURRENT = -2.0;
export const MEANINGFUL_ADVERSE_CURRENT = -0.5;

/**
 * Derives Sea State (0-9) from wave height based on standard Douglas Sea Scale mapping.
 */
export function deriveSeaState(waveHeight: number | undefined | null): number | null {
  if (waveHeight === undefined || waveHeight === null) {
    return null;
  }
  
  if (waveHeight === 0) return 0;
  if (waveHeight <= 0.1) return 1;
  if (waveHeight <= 0.5) return 2;
  if (waveHeight <= 1.25) return 3;
  if (waveHeight <= 2.5) return 4;
  if (waveHeight <= 4) return 5;
  if (waveHeight <= 6) return 6;
  if (waveHeight <= 9) return 7;
  if (waveHeight <= 14) return 8;
  return 9;
}

/**
 * Calculates the along-track ocean current component.
 * Positive = favorable/following current
 * Negative = opposing current
 * 
 * @param oceanCurrentVelocity Speed of current in knots
 * @param oceanCurrentDirection Direction current is flowing TO (degrees)
 * @param routeBearing Direction vessel is travelling TO (degrees)
 */
export function calculateAlongTrackCurrent(
  oceanCurrentVelocity: number | undefined | null,
  oceanCurrentDirection: number | undefined | null,
  routeBearing: number | undefined | null
): number | null {
  if (
    oceanCurrentVelocity === undefined || oceanCurrentVelocity === null ||
    oceanCurrentDirection === undefined || oceanCurrentDirection === null ||
    routeBearing === undefined || routeBearing === null
  ) {
    return null;
  }

  // Convert to radians
  const currentDirRad = (oceanCurrentDirection * Math.PI) / 180;
  const routeBearingRad = (routeBearing * Math.PI) / 180;

  // Project current vector onto route bearing
  // Math.cos(angle diff) gives 1 for same direction, -1 for opposite
  const angleDiff = currentDirRad - routeBearingRad;
  const alongTrack = oceanCurrentVelocity * Math.cos(angleDiff);

  // Round to 2 decimal places to avoid floating point noise near zero
  return Math.round(alongTrack * 100) / 100;
}

/**
 * This is an application-derived operational indicator, not an official meteorological storm warning.
 */
export function deriveStormFlag(
  windSpeed: number | undefined | null,
  waveHeight: number | undefined | null
): boolean {
  const hasWind = windSpeed !== undefined && windSpeed !== null;
  const hasWave = waveHeight !== undefined && waveHeight !== null;

  if (hasWind && windSpeed >= 34) {
    return true;
  }
  
  if (hasWave && waveHeight >= 6) {
    return true;
  }

  return false;
}

export type WeatherRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/**
 * Derives a discrete operational risk level based on environmental conditions.
 */
export function deriveWeatherRiskLevel(
  stormFlag: boolean,
  windSpeed: number | undefined | null,
  waveHeight: number | undefined | null,
  alongTrackCurrent: number | undefined | null
): WeatherRiskLevel | null {
  const hasWind = windSpeed !== undefined && windSpeed !== null;
  const hasWave = waveHeight !== undefined && waveHeight !== null;

  // CRITICAL
  if (stormFlag || (hasWave && waveHeight >= 6)) {
    return 'CRITICAL';
  }

  // HIGH
  if (
    (hasWind && windSpeed > 30) ||
    (hasWave && waveHeight > 3) ||
    (alongTrackCurrent !== null && alongTrackCurrent <= STRONG_ADVERSE_CURRENT)
  ) {
    return 'HIGH';
  }

  // MODERATE
  if (
    (hasWind && windSpeed >= 20) ||
    (hasWave && waveHeight >= 1.5) ||
    (alongTrackCurrent !== null && alongTrackCurrent <= MEANINGFUL_ADVERSE_CURRENT)
  ) {
    return 'MODERATE';
  }

  // LOW
  // If we don't have enough data to be confident it's LOW, return null.
  if (!hasWind && !hasWave) {
    return null;
  }

  return 'LOW';
}

/**
 * Calculates the initial bearing from point 1 to point 2.
 * @returns Bearing in degrees (0 to 360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}
