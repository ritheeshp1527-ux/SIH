import React, { useState, useEffect, useId } from 'react';
import {
  Vessel,
  MaritimeRoute,
  WeatherScenarioPreset,
  RouteEnvironmentalAssessmentResponse,
} from '../types';
import {
  fetchVessels,
  fetchRoutes,
  fetchWeatherScenarios,
  assessRouteEnvironmentalImpact,
} from '../services/api';

interface WeatherImpactExplorerProps {
  initialRouteId?: string;
  initialVesselId?: string;
  onApplyToFuelCalculator?: (distanceNm: number, weatherFactor: number, vesselId: string) => void;
}

export const WeatherImpactExplorer: React.FC<WeatherImpactExplorerProps> = ({
  initialRouteId,
  initialVesselId,
  onApplyToFuelCalculator,
}) => {
  const [routes, setRoutes] = useState<MaritimeRoute[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [scenarios, setScenarios] = useState<WeatherScenarioPreset[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialRouteId || 'RT-SG-RTM-SUEZ');
  const [selectedVesselId, setSelectedVesselId] = useState<string>(initialVesselId || 'VES-001');
  const [commandedSpeedKnots, setCommandedSpeedKnots] = useState<number>(14.0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('nominal');

  const [assessment, setAssessment] = useState<RouteEnvironmentalAssessmentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const routeSelectId = useId();
  const vesselSelectId = useId();
  const speedInputId = useId();

  // Load baseline options
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [rList, vList, sList] = await Promise.all([
          fetchRoutes(),
          fetchVessels(),
          fetchWeatherScenarios(),
        ]);
        setRoutes(rList);
        setVessels(vList);
        setScenarios(sList);

        if (!initialRouteId && rList.length > 0) {
          setSelectedRouteId(rList[0].id);
        }
        if (!initialVesselId && vList.length > 0) {
          setSelectedVesselId(vList[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load weather catalog');
      }
    }
    loadCatalog();
  }, [initialRouteId, initialVesselId]);

  // Run assessment
  const handleAssessRoute = async (scenarioOverride?: string) => {
    if (!selectedRouteId || !selectedVesselId) return;
    setLoading(true);
    setError(null);
    try {
      const activeScenario = scenarioOverride !== undefined ? scenarioOverride : selectedScenarioId;
      const res = await assessRouteEnvironmentalImpact({
        route_id: selectedRouteId,
        vessel_id: selectedVesselId,
        speed_knots: commandedSpeedKnots,
        scenario_id: activeScenario === 'nominal' ? undefined : activeScenario,
      });
      setAssessment(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Environmental assessment failed');
    } finally {
      setLoading(false);
    }
  };

  // Trigger evaluation on initial load or route/vessel changes
  useEffect(() => {
    if (selectedRouteId && selectedVesselId) {
      handleAssessRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId, selectedVesselId, commandedSpeedKnots, selectedScenarioId]);

  const handleSelectScenario = (scId: string) => {
    setSelectedScenarioId(scId);
    if (scId !== 'nominal') {
      const target = scenarios.find((s) => s.id === scId);
      if (target) {
        setSelectedRouteId(target.route_id);
        setSelectedVesselId(target.vessel_id);
        setCommandedSpeedKnots(target.speed_knots);
      }
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MODERATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Notice Banner */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
        <div className="flex items-start sm:items-center gap-2.5">
          <span className="text-base">🌊</span>
          <div>
            <div className="font-semibold uppercase tracking-wider text-amber-300">
              SIMULATED WEATHER &amp; OCEAN DATA — DEMONSTRATION ONLY
            </div>
            <div className="text-[11px] text-amber-200/90 mt-0.5">
              <strong className="text-amber-300">DEMO ENVIRONMENTAL FUEL FACTOR — NOT CALIBRATED ON REAL OPERATIONAL DATA.</strong>{' '}
              Simulated sensitivity multiplier representing the illustrative effect of environmental conditions; not a validated hydrodynamic model.
            </div>
          </div>
        </div>
        <span className="self-start sm:self-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] whitespace-nowrap">
          SIMULATED HEURISTIC
        </span>
      </div>

      {/* Header & Scenario Selector */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>🌦️</span> Weather &amp; Ocean Dynamic Impact Explorer
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Evaluate segment-level currents, wave resistance, and navigational speed over ground (SOG).
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            {loading && (
              <span className="text-xs text-cyan-400 font-mono animate-pulse">
                Evaluating dynamics...
              </span>
            )}
            <div>
              <span className="text-xs text-slate-400">Computational Contract:</span>{' '}
              <span className="text-xs font-mono text-cyan-400">SOG = STW + c_along</span>
            </div>
          </div>
        </div>

        {/* Preset Scenarios */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2 block">
            Presentation Weather Scenarios (A – E)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            <button
              onClick={() => handleSelectScenario('nominal')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedScenarioId === 'nominal'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="text-xs font-semibold">Nominal Baseline</div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Standard seasonal weather with nominal currents.
              </div>
            </button>

            {scenarios.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              const isStorm = sc.id.includes('storm');
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? isStorm
                        ? 'bg-rose-500/20 border-rose-400 text-white shadow-lg shadow-rose-500/10'
                        : 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{sc.title.split(':')[0]}</span>
                    {isStorm && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/30 text-rose-300 rounded font-semibold">
                        Gale
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sc.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
          <div>
            <label htmlFor={routeSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Candidate Maritime Passage
            </label>
            <select
              id={routeSelectId}
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.total_distance_nm} NM)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={vesselSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Operating Vessel
            </label>
            <select
              id={vesselSelectId}
              value={selectedVesselId}
              onChange={(e) => setSelectedVesselId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={speedInputId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Commanded Speed Through Water (STW)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={speedInputId}
                type="number"
                step="0.5"
                min="8.0"
                max="24.0"
                value={commandedSpeedKnots}
                onChange={(e) => setCommandedSpeedKnots(parseFloat(e.target.value) || 14.0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-slate-400 font-mono">kts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Assessment Results */}
      {assessment && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Speed Comparison */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="text-xs uppercase tracking-wider text-slate-400">Navigational Speed</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-mono">
                  {(assessment.total_distance_nm / assessment.weather_adjusted_travel_time_hours).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-mono">kts (avg SOG)</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Commanded STW:</span>
                <span className="font-mono text-cyan-400">{assessment.vessel_speed_knots.toFixed(1)} kts</span>
              </div>
            </div>

            {/* Travel Time & Delta */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="text-xs uppercase tracking-wider text-slate-400">Weather-Adjusted Voyage Time</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-mono">
                  {assessment.weather_adjusted_travel_time_days.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">days ({assessment.weather_adjusted_travel_time_hours.toFixed(0)} hrs)</span>
              </div>
              <div className="text-xs mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-400">Calm Baseline Delta:</span>
                <span
                  className={`font-mono font-semibold ${
                    assessment.time_delta_hours < 0
                      ? 'text-emerald-400'
                      : assessment.time_delta_hours > 0
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {assessment.time_delta_hours > 0 ? `+${assessment.time_delta_hours.toFixed(1)}` : assessment.time_delta_hours.toFixed(1)} hrs
                </span>
              </div>
            </div>

            {/* Aggregate Demo Environmental Fuel Factor */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-slate-400">Demo Environmental Fuel Factor</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono" title="Simulated sensitivity factor for prototype demonstration; not calibrated on real vessel data.">
                  Demo
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    (assessment.aggregate_demo_environmental_fuel_factor ?? assessment.aggregate_weather_fuel_factor ?? 1.0) > 1.05
                      ? 'text-amber-400'
                      : (assessment.aggregate_demo_environmental_fuel_factor ?? assessment.aggregate_weather_fuel_factor ?? 1.0) < 0.98
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {(assessment.aggregate_demo_environmental_fuel_factor ?? assessment.aggregate_weather_fuel_factor ?? 1.0).toFixed(3)}x
                </span>
                <span className="text-xs text-slate-400 font-mono">f_env (demo)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 italic">
                Simulated sensitivity factor; not calibrated on real vessel operational data.
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Passage Distance:</span>
                <span className="font-mono text-slate-300">{assessment.total_distance_nm.toLocaleString()} NM</span>
              </div>
            </div>

            {/* Feasibility & Risk Badge */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Route Feasibility Status</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      assessment.is_feasible
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {assessment.is_feasible ? '✓ FEASIBLE' : '✗ INFEASIBLE'}
                  </span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(
                      assessment.overall_risk_level
                    )}`}
                  >
                    {assessment.overall_risk_level} RISK
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                {assessment.segment_assessments.length} Segments Assessed
              </div>
            </div>
          </div>

          {/* Infeasibility / Safety Diagnostic Banner */}
          {!assessment.is_feasible && assessment.infeasibility_reasons.length > 0 && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <span>⛔</span> SAFETY &amp; NAVIGATIONAL INFEASIBILITY DETECTED:
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-200">
                {assessment.infeasibility_reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Banner */}
          {assessment.warnings.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
                <span>⚠️</span> Navigational Advisories &amp; High Swell Warnings:
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
                {assessment.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Segment-by-Segment Environmental Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🗺️</span> Segment-Level Environmental Assessment
              </h3>
              <span className="text-xs text-slate-400">
                Ordered checkpoints along {assessment.route_name}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 font-mono border-b border-slate-800">
                    <th className="py-3 px-4">Segment / Corridor</th>
                    <th className="py-3 px-3 text-right">Dist (NM)</th>
                    <th className="py-3 px-3 text-right">STW (kts)</th>
                    <th className="py-3 px-3 text-right">Along-Track Current</th>
                    <th className="py-3 px-3 text-right">Eff. SOG</th>
                    <th className="py-3 px-3 text-right">Waves (Hs)</th>
                    <th className="py-3 px-3 text-center">Sea State</th>
                    <th className="py-3 px-3 text-right" title="Demo Environmental Fuel Factor — simulated sensitivity multiplier; not calibrated on real data">
                      Demo Env Factor
                    </th>
                    <th className="py-3 px-4 text-center">Feasibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {assessment.segment_assessments.map((s) => {
                    const isAssisting = s.effective_current_knots > 0;
                    const isOpposing = s.effective_current_knots < 0;
                    const envFactor = s.demo_environmental_fuel_factor ?? s.weather_fuel_factor ?? 1.0;
                    return (
                      <tr
                        key={s.segment_id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          !s.is_feasible ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-slate-200">{s.segment_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.segment_id}</div>
                        </td>
                        <td className="py-3 px-3 text-right">{s.distance_nm.toFixed(0)}</td>
                        <td className="py-3 px-3 text-right">{s.vessel_speed_knots.toFixed(1)}</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={
                              isAssisting
                                ? 'text-emerald-400 font-semibold'
                                : isOpposing
                                ? 'text-amber-400 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {isAssisting ? '▲ +' : isOpposing ? '▼ ' : ''}
                            {s.effective_current_knots.toFixed(1)} kts
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          {s.effective_speed_knots.toFixed(1)} kts
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={
                              s.condition.significant_wave_height_m > 4.0
                                ? 'text-rose-400 font-bold'
                                : s.condition.significant_wave_height_m > 2.5
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }
                          >
                            {s.condition.significant_wave_height_m.toFixed(1)}m
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            State {s.condition.sea_state}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={
                              envFactor > 1.15
                                ? 'text-amber-400 font-semibold'
                                : envFactor < 0.98
                                ? 'text-emerald-400 font-semibold'
                                : 'text-slate-300'
                            }
                            title="Simulated sensitivity factor; not calibrated on real operational data"
                          >
                            {envFactor.toFixed(3)}x
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              s.is_feasible
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {s.is_feasible ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Row: Hand off to Phase 1 Fuel Intelligence Playground */}
          {onApplyToFuelCalculator && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚓</span> Transfer Demo Environmental Factor to Fuel Calculator
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Inject the passage distance ({assessment.total_distance_nm.toLocaleString()} NM) and demo environmental sensitivity factor ({(assessment.aggregate_demo_environmental_fuel_factor ?? assessment.aggregate_weather_fuel_factor ?? 1.0).toFixed(3)}x) into the Phase 1 Fuel Intelligence Playground.
                </p>
              </div>
              <button
                onClick={() =>
                  onApplyToFuelCalculator(
                    assessment.total_distance_nm,
                    assessment.aggregate_demo_environmental_fuel_factor ?? assessment.aggregate_weather_fuel_factor ?? 1.0,
                    assessment.vessel_id
                  )
                }
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Calculate Fuel with Demo Environmental Factor</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
