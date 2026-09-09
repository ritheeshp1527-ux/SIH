import React, { useState, useEffect, useId } from 'react';
import {
  Port,
  Vessel,
  WeatherScenarioPreset,
  VoyageOptimizationRequest,
  ClassicalOptimizationResponse,
  VoyageCandidate,
} from '../types';
import {
  fetchPorts,
  fetchVessels,
  fetchWeatherScenarios,
  runClassicalOptimization,
  fetchSampleOptimizationRequest,
} from '../services/api';

interface ClassicalVoyageOptimizerProps {
  onSelectCandidateForPlan?: (candidate: VoyageCandidate) => void;
}

export const ClassicalVoyageOptimizer: React.FC<ClassicalVoyageOptimizerProps> = ({
  onSelectCandidateForPlan,
}) => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [scenarios, setScenarios] = useState<WeatherScenarioPreset[]>([]);

  const [sourcePortId, setSourcePortId] = useState<string>('PORT-SG');
  const [destPortId, setDestPortId] = useState<string>('PORT-RTM');
  const [cargoWeightTonnes, setCargoWeightTonnes] = useState<number>(60000);
  const [departureStr, setDepartureStr] = useState<string>('');
  const [deadlineStr, setDeadlineStr] = useState<string>('');
  const [selectedVesselFilter, setSelectedVesselFilter] = useState<string>('all');
  const [speedGridStep, setSpeedGridStep] = useState<number>(0.5);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('nominal');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ClassicalOptimizationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'cost' | 'time'>('cost');

  const sourceSelectId = useId();
  const destSelectId = useId();
  const cargoInputId = useId();
  const depInputId = useId();
  const deadInputId = useId();
  const vesselSelectId = useId();
  const stepSelectId = useId();
  const scenarioSelectId = useId();

  // Load initial form parameters and sample request
  useEffect(() => {
    async function initData() {
      try {
        const [portList, vesselList, scenarioList, sampleReq] = await Promise.all([
          fetchPorts(),
          fetchVessels(),
          fetchWeatherScenarios(),
          fetchSampleOptimizationRequest(),
        ]);
        setPorts(portList);
        setVessels(vesselList);
        setScenarios(scenarioList);

        if (sampleReq) {
          setSourcePortId(sampleReq.source_port_id);
          setDestPortId(sampleReq.destination_port_id);
          setCargoWeightTonnes(sampleReq.cargo_weight_tonnes);

          const depDate = new Date(sampleReq.departure_datetime);
          const deadDate = new Date(sampleReq.deadline_datetime);

          // Format for datetime-local input (YYYY-MM-DDTHH:mm)
          const formatDT = (d: Date) => d.toISOString().slice(0, 16);
          setDepartureStr(formatDT(depDate));
          setDeadlineStr(formatDT(deadDate));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to initialize optimizer data');
      }
    }
    initData();
  }, []);

  const handleRunOptimization = async () => {
    if (!sourcePortId || !destPortId || !departureStr || !deadlineStr) return;
    setLoading(true);
    setError(null);
    try {
      const depISO = new Date(departureStr).toISOString();
      const deadISO = new Date(deadlineStr).toISOString();

      const req: VoyageOptimizationRequest = {
        source_port_id: sourcePortId,
        destination_port_id: destPortId,
        cargo_weight_tonnes: cargoWeightTonnes,
        departure_datetime: depISO,
        deadline_datetime: deadISO,
        vessel_ids: selectedVesselFilter === 'all' ? null : [selectedVesselFilter],
        speed_grid_step_knots: speedGridStep,
        currency: 'USD',
        scenario_id: selectedScenarioId === 'nominal' ? null : selectedScenarioId,
      };

      const res = await runClassicalOptimization(req);
      setResponse(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Classical optimization failed');
    } finally {
      setLoading(false);
    }
  };

  const adjustDeadlineToDays = (days: number) => {
    if (!departureStr) return;
    const dep = new Date(departureStr);
    const newDead = new Date(dep.getTime() + days * 24 * 3600 * 1000);
    setDeadlineStr(newDead.toISOString().slice(0, 16));
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Notice Banner */}
      <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-cyan-200">
        <div className="flex items-start sm:items-center gap-2.5">
          <span className="text-base">⚙️</span>
          <div>
            <div className="font-semibold uppercase tracking-wider text-cyan-300">
              SIMULATED CLASSICAL OPTIMIZATION BASELINE — DEMONSTRATION ONLY
            </div>
            <div className="text-[11px] text-cyan-200/90 mt-0.5">
              Exact discrete enumeration across <span className="font-mono text-cyan-300">Vessel × Route × Speed × Fuel</span>.
              Establishes rigorous ground truth for Phase 5 Quantum-Inspired benchmarking.
            </div>
          </div>
        </div>
        <span className="self-start sm:self-center px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] whitespace-nowrap">
          PHASE 4 ACTIVE
        </span>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>🧭</span> Classical Voyage Optimizer
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Exact classical enumeration finding cost-efficient and time-efficient operating points under weather and deadline constraints.
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            {loading && (
              <span className="text-xs text-cyan-400 font-mono animate-pulse">
                Evaluating candidate space...
              </span>
            )}
            <button
              onClick={handleRunOptimization}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Optimizing...' : 'Run Classical Optimizer'}</span>
              <span>⚡</span>
            </button>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
          <div>
            <label htmlFor={sourceSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Origin Port
            </label>
            <select
              id={sourceSelectId}
              value={sourcePortId}
              onChange={(e) => setSourcePortId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={destSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Destination Port
            </label>
            <select
              id={destSelectId}
              value={destPortId}
              onChange={(e) => setDestPortId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={cargoInputId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Cargo Payload (tonnes)
            </label>
            <input
              id={cargoInputId}
              type="number"
              step="1000"
              min="1000"
              value={cargoWeightTonnes}
              onChange={(e) => setCargoWeightTonnes(parseFloat(e.target.value) || 60000)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label htmlFor={vesselSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Fleet Availability Filter
            </label>
            <select
              id={vesselSelectId}
              value={selectedVesselFilter}
              onChange={(e) => setSelectedVesselFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Fleet Vessels (3 available)</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule & Grid Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label htmlFor={depInputId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Scheduled Departure (UTC)
            </label>
            <input
              id={depInputId}
              type="datetime-local"
              value={departureStr}
              onChange={(e) => setDepartureStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={deadInputId} className="text-xs font-medium text-slate-400 block">
                Delivery Deadline (UTC)
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => adjustDeadlineToDays(22)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                  title="Tight schedule (22 days)"
                >
                  22d
                </button>
                <button
                  type="button"
                  onClick={() => adjustDeadlineToDays(28)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                  title="Standard schedule (28 days)"
                >
                  28d
                </button>
                <button
                  type="button"
                  onClick={() => adjustDeadlineToDays(34)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                  title="Relaxed schedule (34 days)"
                >
                  34d
                </button>
              </div>
            </div>
            <input
              id={deadInputId}
              type="datetime-local"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label htmlFor={stepSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Speed Discretization Step
            </label>
            <select
              id={stepSelectId}
              value={speedGridStep}
              onChange={(e) => setSpeedGridStep(parseFloat(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
            >
              <option value="0.5">0.5 knots (High resolution: ~270 combinations)</option>
              <option value="1.0">1.0 knots (Standard resolution: ~140 combinations)</option>
            </select>
          </div>

          <div>
            <label htmlFor={scenarioSelectId} className="text-xs font-medium text-slate-400 mb-1.5 block">
              Environmental Scenario Override
            </label>
            <select
              id={scenarioSelectId}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="nominal">Nominal Baseline Weather</option>
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results Dashboard */}
      {response && (
        <div className="space-y-6">
          {/* SECTION 3: Global Recommendations Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Global Lowest Cost */}
            {response.cost_efficient.global_best ? (
              <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-bl-lg">
                  🏆 LOWEST COST
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Cost-Efficient Optimum</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    ${(response.cost_efficient.global_best.total_voyage_cost_usd / 1000).toFixed(1)}k
                  </span>
                  <span className="text-xs text-slate-400">USD total</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-slate-400">Vessel:</span>{' '}
                    <strong className="text-white">{response.cost_efficient.global_best.vessel_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Route &amp; Speed:</span>{' '}
                    <span className="font-mono text-emerald-400">
                      {response.cost_efficient.global_best.route_name.split('via')[1] || 'Suez'} @ {response.cost_efficient.global_best.cruising_speed_knots} kts ({response.cost_efficient.global_best.fuel_name})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Duration:</span>{' '}
                    <span className="font-mono text-slate-300">
                      {(response.cost_efficient.global_best.total_voyage_time_hours / 24).toFixed(1)} days ({response.cost_efficient.global_best.deadline_margin_hours.toFixed(1)}h margin)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-md">
                <div className="text-xs uppercase tracking-wider text-rose-400 font-bold">No Feasible Cost Solution</div>
                <div className="text-xs text-slate-400 mt-2">All candidates missed deadlines or violated constraints.</div>
              </div>
            )}

            {/* Global Fastest Feasible */}
            {response.time_efficient.global_best ? (
              <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-bl-lg">
                  ⚡ FASTEST FEASIBLE
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Time-Efficient Optimum</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    {(response.time_efficient.global_best.total_voyage_time_hours / 24).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">days ({response.time_efficient.global_best.total_voyage_time_hours.toFixed(0)} hrs)</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-slate-400">Vessel:</span>{' '}
                    <strong className="text-white">{response.time_efficient.global_best.vessel_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Route &amp; Speed:</span>{' '}
                    <span className="font-mono text-cyan-400">
                      {response.time_efficient.global_best.route_name.split('via')[1] || 'Suez'} @ {response.time_efficient.global_best.cruising_speed_knots} kts ({response.time_efficient.global_best.fuel_name})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Cost:</span>{' '}
                    <span className="font-mono text-slate-300">
                      ${(response.time_efficient.global_best.total_voyage_cost_usd / 1000).toFixed(1)}k USD
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-md">
                <div className="text-xs uppercase tracking-wider text-rose-400 font-bold">No Feasible Time Solution</div>
                <div className="text-xs text-slate-400 mt-2">No combination met all navigational constraints.</div>
              </div>
            )}

            {/* Informational Lowest Fuel */}
            {response.informational_best_fuel ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                <div className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>🌿 Lowest Fuel (Info)</span>
                  <span className="text-[10px] text-slate-500">Non-Primary</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    {response.informational_best_fuel.fuel_consumption_tonnes.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">tonnes</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-slate-400">Candidate:</span>{' '}
                    <span className="font-mono text-slate-200">
                      {response.informational_best_fuel.vessel_name} @ {response.informational_best_fuel.cruising_speed_knots} kts
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Cost:</span>{' '}
                    <span className="font-mono text-slate-300">
                      ${(response.informational_best_fuel.total_voyage_cost_usd / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Informational Lowest Emissions */}
            {response.informational_best_emissions ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
                <div className="text-xs uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>📉 Lowest CO2 (Info)</span>
                  <span className="text-[10px] text-slate-500">Non-Primary</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    {response.informational_best_emissions.operational_co2_tonnes.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">t CO2</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-0.5 border-t border-slate-800 pt-2">
                  <div>
                    <span className="text-slate-400">Fuel Alternative:</span>{' '}
                    <strong className="text-cyan-300">{response.informational_best_emissions.fuel_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Lifecycle GHG:</span>{' '}
                    <span className="font-mono text-slate-300">
                      {response.informational_best_emissions.lifecycle_ghg_tonnes.toFixed(1)} t CO2e
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('cost')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'cost'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                Section 1: Cost-Efficient Operating Points (Per Vessel)
              </button>
              <button
                onClick={() => setActiveTab('time')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'time'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                Section 2: Time-Efficient Operating Points (Per Vessel)
              </button>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Mode: {activeTab === 'cost' ? 'min(Fuel Cost + Tolls)' : 'min(Voyage Duration)'}
            </span>
          </div>

          {/* SECTION 1 & 2: Per-Vessel Results Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🚢</span>{' '}
                {activeTab === 'cost'
                  ? 'Cost-Efficient Solutions by Available Vessel'
                  : 'Time-Efficient Solutions by Available Vessel'}
              </h3>
              <span className="text-xs text-slate-400">
                {Object.keys(response[activeTab === 'cost' ? 'cost_efficient' : 'time_efficient'].per_vessel_best).length} Feasible Vessels Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-sans">Vessel / Type</th>
                    <th className="py-3 px-3">Selected Route</th>
                    <th className="py-3 px-3">Bunker Fuel</th>
                    <th className="py-3 px-3 text-right">STW</th>
                    <th className="py-3 px-3 text-right">Eff. SOG</th>
                    <th className="py-3 px-3 text-right">Voyage Time</th>
                    <th className="py-3 px-3 text-right">Deadline Margin</th>
                    <th className="py-3 px-3 text-right">Fuel (t)</th>
                    <th className="py-3 px-3 text-right">Fuel Cost</th>
                    <th className="py-3 px-3 text-right">Route Tolls</th>
                    <th className="py-3 px-3 text-right">Total Cost</th>
                    <th className="py-3 px-3 text-right">CO2 (t)</th>
                    <th className="py-3 px-4 text-center font-sans">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.values(
                    response[activeTab === 'cost' ? 'cost_efficient' : 'time_efficient'].per_vessel_best
                  ).map((cand) => (
                    <tr key={cand.decision_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-200">{cand.vessel_name}</div>
                        <div className="text-[10px] text-slate-400">{cand.vessel_type}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200">{cand.route_name.split('via')[1] || cand.route_name}</div>
                        <div className="text-[10px] text-slate-400">{cand.distance_nm.toLocaleString()} NM</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px]">
                          {cand.fuel_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">{cand.cruising_speed_knots.toFixed(1)} kn</td>
                      <td className="py-3 px-3 text-right text-slate-400">{cand.effective_speed_knots.toFixed(1)} kn</td>
                      <td className="py-3 px-3 text-right">
                        {(cand.total_voyage_time_hours / 24).toFixed(1)} d
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-emerald-400 font-semibold">
                          +{cand.deadline_margin_hours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">{cand.fuel_consumption_tonnes.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right">${(cand.fuel_cost_usd / 1000).toFixed(1)}k</td>
                      <td className="py-3 px-3 text-right">${(cand.route_cost_usd / 1000).toFixed(1)}k</td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        ${(cand.total_voyage_cost_usd / 1000).toFixed(1)}k
                      </td>
                      <td className="py-3 px-3 text-right">{cand.operational_co2_tonnes.toFixed(1)}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        {onSelectCandidateForPlan && (
                          <button
                            onClick={() => onSelectCandidateForPlan(cand)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-semibold transition-colors"
                          >
                            Select Plan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Classical Solver Benchmark Statistics */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📊</span> Section 4 — Classical Solver Benchmark Statistics
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transparent search metrics establishing the baseline for Phase 5 Quantum-Inspired benchmarking.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                ⚡ Runtime: {response.benchmark.runtime_ms} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Combinations Evaluated</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {response.benchmark.total_candidates_evaluated}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {response.benchmark.unique_vessels_count} Vessels × {response.benchmark.unique_routes_count} Routes × {response.benchmark.unique_fuels_count} Fuels
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Feasible States</div>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                  {response.benchmark.feasible_candidates_count}
                </div>
                <div className="text-[10px] text-emerald-500 mt-1">
                  {response.benchmark.feasibility_rate_pct}% Feasibility Rate
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Infeasible / Pruned</div>
                <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                  {response.benchmark.infeasible_candidates_count}
                </div>
                <div className="text-[10px] text-rose-500 mt-1">Constraint Violations</div>
              </div>

              <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Speed Discretization</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {response.benchmark.speed_grid_step_knots} kn
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Exact Grid Increment</div>
              </div>
            </div>

            {/* Constraint Rejection Breakdown */}
            <div className="pt-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Infeasibility Pruning Breakdown by Constraint
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(response.benchmark.rejection_breakdown).map(([category, count]) => (
                  <div
                    key={category}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs flex items-center gap-2"
                  >
                    <span className="text-slate-400 capitalize">{category.replace('_', ' ')}:</span>
                    <span className={`font-mono font-bold ${count > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 5: Decision Space Handoff for Phase 5 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔗</span> Section 5 — Decision Space Handoff (Phase 5 QUBO Interface Contract)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {response.benchmark.total_candidates_evaluated} Binary Variable Slots
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Each discrete combination represents a mutually exclusive decision variable in the global search space.
              Phase 5&apos;s Quantum-Inspired Optimizer will directly consume these deterministic decision keys:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
              {response.candidate_decision_space_preview.slice(0, 8).map((dec) => (
                <div
                  key={dec.decision_id}
                  className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 truncate"
                  title={dec.decision_id}
                >
                  <div className="text-cyan-400 font-bold truncate">{dec.decision_id}</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    {dec.vessel_id} &bull; {dec.route_id.split('RTM-')[1]} &bull; {dec.fuel_id} &bull; {dec.speed_knots}kn
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
