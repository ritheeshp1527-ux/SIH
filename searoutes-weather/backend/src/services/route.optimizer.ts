import type { RoutePlan, RouteOptimizationMetadata } from '../models/routePlan.model';

export class RouteOptimizer {
  public rankCandidates(candidates: RoutePlan[]): RoutePlan[] {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const scoredCandidates = candidates.map(candidate => {
      const optimization = this.evaluateCandidate(candidate);
      if (optimization) {
        return { ...candidate, optimization };
      }
      return { ...candidate };
    });

    // Sort ascending by score (lowest score is best)
    scoredCandidates.sort((a, b) => {
      if (!a.optimization && !b.optimization) return 0;
      if (!a.optimization) return 1;
      if (!b.optimization) return -1;
      return a.optimization.score - b.optimization.score;
    });

    // Assign rank and isPrimary
    return scoredCandidates.map((c, index) => {
      if (c.optimization) {
        c.optimization.rank = index + 1;
      }
      c.isPrimary = index === 0;
      return c;
    });
  }

  private evaluateCandidate(candidate: RoutePlan): RouteOptimizationMetadata | undefined {
    const points = candidate.environmentalPoints;
    if (!points || points.length === 0) {
      // If no environmental data, cannot evaluate intelligently
      return undefined;
    }

    const totalPoints = points.length;
    let marineValidCount = 0;
    let weatherValidCount = 0;

    let sumWind = 0;
    let sumWave = 0;
    let sumAdverseCurrent = 0;
    let sumFavorableCurrent = 0;
    let riskPenaltySum = 0;
    let hasStorm = false;

    for (const p of points) {
      const hasWind = p.windSpeed !== undefined && p.windSpeed !== null;
      const hasWave = p.waveHeight !== undefined && p.waveHeight !== null;
      const hasCurrent = p.alongTrackCurrent !== undefined && p.alongTrackCurrent !== null;

      if (hasWind) {
        weatherValidCount++;
        sumWind += p.windSpeed!;
      }

      if (hasWave) {
        sumWave += p.waveHeight!;
      }
      if (hasCurrent) {
        if (p.alongTrackCurrent! < 0) {
          sumAdverseCurrent += Math.abs(p.alongTrackCurrent!);
        } else if (p.alongTrackCurrent! > 0) {
          sumFavorableCurrent += p.alongTrackCurrent!;
        }
      }
      if (hasWave || hasCurrent) {
        // Technically, marine coverage ratio means any marine data (wave or current)
        marineValidCount++;
      }

      if (p.stormFlag) {
        hasStorm = true;
      }

      if (p.weatherRiskLevel === 'MODERATE') riskPenaltySum += 10;
      if (p.weatherRiskLevel === 'HIGH') riskPenaltySum += 50;
      if (p.weatherRiskLevel === 'CRITICAL') riskPenaltySum += 200;
    }

    const weatherCoverageRatio = weatherValidCount / totalPoints;
    const marineCoverageRatio = marineValidCount / totalPoints;

    // Normalizing scores
    // Distance penalty: roughly 1 point per nautical mile.
    // E.g. 3000 nm = 3000 score. 100 nm = 100 score.
    // wait, distance is in meters inside RoutePlan! (distanceM)
    // distance / 1852 = nautical miles
    const distanceNm = candidate.distance / 1852;
    const distanceScore = distanceNm; 

    // Wind score: penalize high average wind. 
    // Say, average wind * 50
    const avgWind = weatherValidCount > 0 ? (sumWind / weatherValidCount) : 0;
    const windScore = avgWind * 50;

    // Wave score: average wave height * 200
    const avgWave = marineValidCount > 0 ? (sumWave / marineValidCount) : 0;
    const waveScore = marineValidCount > 0 ? avgWave * 200 : null;

    // Current score: 
    // adverse current adds penalty (e.g., avg adverse * 100)
    // favorable current subtracts penalty (e.g., avg favorable * -100)
    let currentScore: number | null = null;
    if (marineValidCount > 0) {
      const avgAdverse = sumAdverseCurrent / marineValidCount;
      const avgFavorable = sumFavorableCurrent / marineValidCount;
      currentScore = (avgAdverse * 100) - (avgFavorable * 100);
    }

    const riskScore = riskPenaltySum;
    const stormPenalty = hasStorm ? 5000 : 0;

    const baseWave = waveScore || 0;
    const baseCurrent = currentScore || 0;

    const totalScore = distanceScore + windScore + baseWave + baseCurrent + riskScore + stormPenalty;

    // Build explanation
    const explanationParts = [];
    if (distanceScore > 0) explanationParts.push(`Distance component: ${Math.round(distanceScore)}`);
    if (windScore > 0) explanationParts.push(`Wind penalty: ${Math.round(windScore)}`);
    if (waveScore !== null) explanationParts.push(`Wave penalty: ${Math.round(waveScore)}`);
    if (currentScore !== null && currentScore < 0) explanationParts.push(`Favorable current benefit: ${Math.round(Math.abs(currentScore))}`);
    if (currentScore !== null && currentScore > 0) explanationParts.push(`Adverse current penalty: ${Math.round(currentScore)}`);
    if (stormPenalty > 0) explanationParts.push(`SEVERE STORM PENALTY APPLIED`);

    const explanation = explanationParts.join(', ') || 'Baseline maritime evaluation';

    return {
      score: totalScore,
      rank: 0, // will be assigned during sort
      distanceScore,
      windScore,
      waveScore,
      currentScore,
      riskScore,
      stormPenalty,
      marineCoverageRatio,
      weatherCoverageRatio,
      explanation
    };
  }
}
