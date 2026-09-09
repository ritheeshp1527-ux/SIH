import React, { useState, useEffect, useId } from 'react';
import {
  Vessel,
  Fuel,
  ScenarioPreset,
  FuelEstimationRequest,
  FuelEstimationResult,
} from '../types';
import {
  fetchVessels,
  fetchFuels,
  fetchScenarios,
  estimateFuel,
} from '../services/api';

const SEA_STATE_LABELS: Record<number, string> = {
  0: '0 — Calm (Glassy, wave 0m)',
  1: '1 — Calm (Rippled, wave 0.1m)',
  2: '2 — Smooth (Wavelets, 0.2-0.5m)',
  3: '3 — Slight (0.5-1.25m)',
  4: '4 — Moderate (1.25-2.5m)',
  5: '5 — Rough (2.5-4.0m)',
  6: '6 — Very Rough (4.0-6.0m)',
  7: '7 — High (6.0-9.0m)',
  8: '8 — Very High (9.0-14.0m)',
  9: '9 — Phenomenal (>14.0m)',
};

interface FuelIntelligencePlaygroundProps {
  externalDistance?: number | null;
  externalVesselId?: string | null;
  externalWeatherFactor?: number | null;
}

export const FuelIntelligencePlayground: React.FC<FuelIntelligencePlaygroundProps> = ({
  externalDistance,
  externalVesselId,
  externalWeatherFactor,
}) => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  const [vesselId, setVesselId] = useState<string>('');
  const [fuelId, setFuelId] = useState<string>('');
  const [distanceNm, setDistanceNm] = useState<number>(3000);
  const [speedKnots, setSpeedKnots] = useState<number>(14.0);
  const [cargoWeightTonnes, setCargoWeightTonnes] = useState<number>(60000);
  const [seaState, setSeaState] = useState<number>(2);
  const [bunkerPort, setBunkerPort] = useState<string>('SGSIN');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FuelEstimationResult | null>(null);

  // Sync external distance or vessel from Route Explorer / Weather Explorer
  useEffect(() => {
    if (externalDistance && externalDistance > 0) {
      setDistanceNm(externalDistance);
      setSelectedScenarioId('');
    }
    if (externalVesselId) {
      setVesselId(externalVesselId);
    }
  }, [externalDistance, externalVesselId]);


  // Generate unique accessible element IDs
  const vesselSelectId = useId();
  const fuelSelectId = useId();
  const distanceInputId = useId();
  const speedInputId = useId();
  const cargoInputId = useId();
  const seaStateSelectId = useId();
  const portSelectId = useId();

  // Load initial options
  useEffect(() => {
    async function loadData() {
      try {
        const [vList, fList, sList] = await Promise.all([
          fetchVessels(),
          fetchFuels(),
          fetchScenarios(),
        ]);
        setVessels(vList);
        setFuels(fList);
        setScenarios(sList);

        if (vList.length > 0) {
          setVesselId(vList[0].id);
          // Pick first compatible fuel
          const initialFuel = vList[0].fuel_options[0] || (fList[0]?.id ?? '');
          setFuelId(initialFuel);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to initialize catalog data');
      }
    }
    loadData();
  }, []);

  // Recalculate on input change
  useEffect(() => {
    if (!vesselId || !fuelId) return;

    const timeoutId = setTimeout(() => {
      runEstimate();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [vesselId, fuelId, distanceNm, speedKnots, cargoWeightTonnes, seaState]);

  const handlePortChange = async (newPort: string) => {
    setBunkerPort(newPort);
    try {
      const updatedFuels = await fetchFuels(newPort);
      setFuels(updatedFuels);
    } catch {
      // Retain active fuel catalog
    }
  };

  const selectedVessel = vessels.find((v) => v.id === vesselId);
  const selectedFuel = fuels.find((f) => f.id === fuelId);

  // Filter compatible fuels for selected vessel
  const compatibleFuels = fuels.filter((f) =>
    selectedVessel ? selectedVessel.fuel_options.includes(f.id) : true
  );

  const handleVesselChange = (newVesselId: string) => {
    setVesselId(newVesselId);
    setSelectedScenarioId('');
    const v = vessels.find((x) => x.id === newVesselId);
    if (v) {
      // Adjust cargo if exceeding capacity
      if (cargoWeightTonnes > v.capacity_tonnes) {
        setCargoWeightTonnes(Math.round(v.capacity_tonnes * 0.75));
      }
      // Adjust speed if out of limits
      if (speedKnots < v.min_speed_knots) setSpeedKnots(v.min_speed_knots);
      if (speedKnots > v.max_speed_knots) setSpeedKnots(v.max_speed_knots);
      // Ensure compatible fuel
      if (!v.fuel_options.includes(fuelId)) {
        setFuelId(v.fuel_options[0] || '');
      }
    }
  };

  const handleScenarioSelect = (scenario: ScenarioPreset) => {
    setSelectedScenarioId(scenario.id);
    setVesselId(scenario.request.vessel_id);
    setFuelId(scenario.request.fuel_id);
    setDistanceNm(scenario.request.distance_nm);
    setSpeedKnots(scenario.request.speed_knots);
    setCargoWeightTonnes(scenario.request.cargo_weight_tonnes);
    setSeaState(scenario.request.sea_state);
  };

  const runEstimate = async () => {
    if (!vesselId || !fuelId) return;
    setLoading(true);
    setError(null);
    try {
      const req: FuelEstimationRequest = {
        vessel_id: vesselId,
        fuel_id: fuelId,
        cargo_weight_tonnes: Number(cargoWeightTonnes),
        distance_nm: Number(distanceNm),
        speed_knots: Number(speedKnots),
        sea_state: Number(seaState),
      };
      const res = await estimateFuel(req);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Calculation error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-emerald">Phase 1 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              POST /api/v1/fuel/estimate
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Ship & Fuel Intelligence Calculator
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Deterministic simulation engine estimating vessel fuel burn rate, voyage totals, bunker expenditure, and emissions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {loading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Recalculating...
            </span>
          )}
          <div className="badge badge-amber" style={{ padding: '0.4rem 0.8rem' }}>
            Simulated Heuristic Model
          </div>
        </div>
      </div>

      {/* Cross-Phase Demo Environmental Factor Injection Notice */}
      {externalWeatherFactor && (
        <div style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🌊</span>
            <div>
              <strong style={{ color: 'var(--accent-cyan)' }}>Demo Environmental Factor Connected:</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                Passage distance set to <strong>{distanceNm.toLocaleString()} NM</strong> with demo environmental sensitivity factor of{' '}
                <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{externalWeatherFactor.toFixed(3)}x</strong>{' '}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(simulated sensitivity factor; not calibrated on real operational data)</span>.
              </span>
            </div>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            f_env (demo) = {externalWeatherFactor.toFixed(3)}
          </span>
        </div>
      )}

      {/* Scenario Presets Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Deterministic Scenario Quick-Load:
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {scenarios.map((s) => {
            const isSelected = selectedScenarioId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleScenarioSelect(s)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
                title={`${s.description} — Expected: ${s.expected_behavior}`}
              >
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Interactive Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            Voyage & Vessel Parameters
          </h3>

          {/* Vessel Selection */}
          <div>
            <label htmlFor={vesselSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Select Fleet Vessel
            </label>
            <select
              id={vesselSelectId}
              value={vesselId}
              onChange={(e) => handleVesselChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem'
              }}
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type}) — {v.capacity_tonnes.toLocaleString()} DWT
                </option>
              ))}
            </select>
            {selectedVessel && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                Power: {selectedVessel.engine_power_kw.toLocaleString()} kW | Limits: {selectedVessel.min_speed_knots} - {selectedVessel.max_speed_knots} knots
              </div>
            )}
          </div>

          {/* Bunkering Port Selection */}
          <div>
            <label htmlFor={portSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Bunker Pricing Port (stage7_bunker_prices.csv)
            </label>
            <select
              id={portSelectId}
              value={bunkerPort}
              onChange={(e) => handlePortChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem'
              }}
            >
              <option value="SGSIN">Singapore (SGSIN) — Observed: HFO ($648), MDO ($1371), LNG ($821.95)</option>
              <option value="NLRTM">Rotterdam (NLRTM) — Observed: HFO ($590), LNG ($790)</option>
              <option value="INBOM">Mumbai (INBOM) — Observed: HFO ($660), LNG ($845)</option>
              <option value="AEDXB">Dubai (AEDXB) — Fallback Reference</option>
              <option value="USNYC">New York (USNYC) — Fallback Reference</option>
            </select>
          </div>

          {/* Fuel Selection */}
          <div>
            <label htmlFor={fuelSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Select Bunker Fuel (Compatible with Vessel)
            </label>
            <select
              id={fuelSelectId}
              value={fuelId}
              onChange={(e) => {
                setFuelId(e.target.value);
                setSelectedScenarioId('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem'
              }}
            >
              {compatibleFuels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — ${f.price_per_tonne}/t ({f.energy_density_mj_per_kg} MJ/kg)
                </option>
              ))}
            </select>
            {selectedFuel && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                CO₂ Factor: {selectedFuel.emission_factor_kg_co2_per_tonne} kg/t | Lifecycle GHG: {selectedFuel.lifecycle_ghg_factor_kg_co2e_per_tonne || 'N/A'} kg/t
                {selectedFuel.price_date && (
                  <span style={{ marginLeft: '0.35rem', color: selectedFuel.is_observed_market_price ? '#10b981' : '#f59e0b' }}>
                    | {selectedFuel.is_observed_market_price ? `✓ Observed Market (${selectedFuel.price_date})` : '⚠ Fallback Reference'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Distance Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label htmlFor={distanceInputId} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Voyage Distance (Nautical Miles)
              </label>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {distanceNm.toLocaleString()} NM
              </span>
            </div>
            <input
              id={distanceInputId}
              type="number"
              min="100"
              max="25000"
              step="100"
              value={distanceNm}
              onChange={(e) => {
                setDistanceNm(Math.max(1, Number(e.target.value)));
                setSelectedScenarioId('');
              }}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          {/* Speed Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label htmlFor={speedInputId} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cruising Speed (Knots)
              </label>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {speedKnots.toFixed(1)} knots
              </span>
            </div>
            <input
              id={speedInputId}
              type="range"
              min={selectedVessel?.min_speed_knots || 10.0}
              max={selectedVessel?.max_speed_knots || 22.0}
              step="0.2"
              value={speedKnots}
              onChange={(e) => {
                setSpeedKnots(Number(e.target.value));
                setSelectedScenarioId('');
              }}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Min: {selectedVessel?.min_speed_knots || 10} kn</span>
              <span>Ref: 14.0 kn</span>
              <span>Max: {selectedVessel?.max_speed_knots || 22} kn</span>
            </div>
          </div>

          {/* Cargo Payload Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label htmlFor={cargoInputId} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cargo Weight (Metric Tons)
              </label>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                {cargoWeightTonnes.toLocaleString()} t ({selectedVessel ? Math.round((cargoWeightTonnes / selectedVessel.capacity_tonnes) * 100) : 0}% DWT)
              </span>
            </div>
            <input
              id={cargoInputId}
              type="range"
              min="1000"
              max={selectedVessel?.capacity_tonnes || 120000}
              step="1000"
              value={cargoWeightTonnes}
              onChange={(e) => {
                setCargoWeightTonnes(Number(e.target.value));
                setSelectedScenarioId('');
              }}
              style={{ width: '100%', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
            />
          </div>

          {/* WMO Sea State Selector */}
          <div>
            <label htmlFor={seaStateSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Environmental / Sea State Condition
            </label>
            <select
              id={seaStateSelectId}
              value={seaState}
              onChange={(e) => {
                setSeaState(Number(e.target.value));
                setSelectedScenarioId('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              {Object.entries(SEA_STATE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Output Intelligence Dashboard */}
        <div>
          {/* Transparency Disclaimer */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.75rem',
            color: '#fde68a',
            lineHeight: 1.4
          }}>
            <strong>SIMULATED DEMONSTRATION ESTIMATES:</strong> Values are derived from a deterministic cubic speed and displacement model for architecture demonstration. Not trained on real operational marine telemetry.
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fda4af',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <strong>Validation Error:</strong> {error}
            </div>
          )}

          {result && (
            <div>
              {/* Primary Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Total Fuel */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  position: 'relative'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Voyage Fuel
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '0.25rem 0' }}>
                    {result.fuel_consumption_tonnes.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>tonnes</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Rate: {result.fuel_consumption_rate_tonnes_per_hour} t/hour
                  </div>
                </div>

                {/* Voyage Cost */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bunker Fuel Expenditure
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0.25rem 0' }}>
                    ${result.fuel_cost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    @ ${result.fuel_price_per_tonne}/t ({result.fuel_id})
                  </div>
                </div>

                {/* Travel Time */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Transit Duration
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0.25rem 0' }}>
                    {result.travel_time_days} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>days</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {result.travel_time_hours} hours @ {result.speed_knots} kn
                  </div>
                </div>

                {/* Emissions */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Operational CO₂
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: '0.25rem 0' }}>
                    {result.operational_co2_tonnes.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>tonnes</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {result.lifecycle_ghg_tonnes ? `Lifecycle: ${result.lifecycle_ghg_tonnes.toLocaleString()} t CO2e` : 'Lifecycle factor pending'}
                  </div>
                </div>
              </div>

              {/* Efficiency & Intensity Metrics */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Transport Intensity & Efficiency Indicators
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fuel per Nautical Mile</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {result.fuel_per_nm_kg} <span style={{ fontSize: '0.75rem' }}>kg/NM</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fuel per Cargo Tonne</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>
                      {result.fuel_per_tonne_cargo_kg} <span style={{ fontSize: '0.75rem' }}>kg/t</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Transport Work Intensity</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                      {result.fuel_per_tonne_nm_grams} <span style={{ fontSize: '0.75rem' }}>g/t-NM</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Vessel DWT Utilization</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                      {result.vessel_utilization_percent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Factors Breakdown */}
              {result.breakdown && (
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Deterministic Factor Breakdown:
                  </div>
                  <div>• Base Engine Rate: {result.breakdown.base_hourly_rate_tonnes} t/h (at 14 kn)</div>
                  <div>• Speed Multiplier (v/14)³: {result.breakdown.speed_factor}x</div>
                  <div>• Cargo Displacement Factor: {result.breakdown.load_factor}x</div>
                  <div>• Sea State Resistance: {result.breakdown.weather_factor}x</div>
                  <div>• Fuel Energy Ratio (41.2 / LHV): {result.breakdown.fuel_energy_factor}x</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
