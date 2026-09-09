import React, { useState } from 'react';
import {
  ComparativeAnalysisResponse,
  DecisionPriority,
  Recommendation,
} from '../types/decision_analysis';
import {
  VoyageCandidate,
  ClassicalOptimizationResponse,
  QuantumInspiredOptimizationResponse,
} from '../types/optimization';
import { VoyageFormValues } from './Stage01Voyage';

export interface Stage07DecisionProps {
  voyageConfig: VoyageFormValues;
  comparativeResult: ComparativeAnalysisResponse | null;
  classicalResult?: ClassicalOptimizationResponse | null;
  qiResult?: QuantumInspiredOptimizationResponse | null;
  onPrevious: () => void;
  onResetWorkflow: () => void;
}

const formatNum = (num?: number | null, decimals = 1): string => {
  if (num == null || isNaN(num)) return '—';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatMoney = (num?: number | null): string => {
  if (num == null || isNaN(num)) return '—';
  return '$' + Math.round(num).toLocaleString('en-US');
};

const formatPct = (num?: number | null): string => {
  if (num == null || isNaN(num)) return '0.0%';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(1)}%`;
};

export const Stage07Decision: React.FC<Stage07DecisionProps> = ({
  voyageConfig,
  comparativeResult,
  classicalResult: _classicalResult,
  qiResult: _qiResult,
  onPrevious,
  onResetWorkflow,
}) => {
  const [inspectedAltKey, setInspectedAltKey] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Fallback / missing prerequisite check
  if (!comparativeResult) {
    return (
      <div className="stage-shell-card" id="stage07-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Prerequisite Incomplete: Comparative Analysis Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Stage 07 requires completed comparative analysis data between the classical baseline and quantum-inspired results. Please navigate back to Stage 06 to complete the comparison.
          </p>
          <button
            type="button"
            id="stage07-back-to-compare-btn"
            className="stage-nav-btn stage-nav-btn-primary"
            onClick={onPrevious}
          >
            ← Back to Stage 06 Compare
          </button>
        </div>
      </div>
    );
  }

  // Extract recommendations from comparativeResult (Single Source of Truth)
  const recs = comparativeResult.recommendations || {};
  const activeRec: Recommendation | undefined =
    recs[DecisionPriority.BALANCED] ||
    recs['balanced'] ||
    (Object.values(recs).length > 0 ? Object.values(recs)[0] : undefined);

  const candidate: VoyageCandidate | undefined = activeRec?.candidate;

  // Extract minimum-cost candidate to evaluate honest trade-offs
  const minCostRec = recs[DecisionPriority.COST] || recs['cost'];
  const minCostCand: VoyageCandidate | undefined =
    minCostRec?.candidate ||
    (comparativeResult.pareto_front && comparativeResult.pareto_front.length > 0
      ? [...comparativeResult.pareto_front].sort(
          (a, b) => a.total_voyage_cost_usd - b.total_voyage_cost_usd
        )[0]
      : undefined);

  // Compute trade-off against minimum cost candidate if candidate is present
  const costDelta = candidate && minCostCand
    ? candidate.total_voyage_cost_usd - minCostCand.total_voyage_cost_usd
    : 0;
  const timeSavedHours = candidate && minCostCand
    ? minCostCand.total_voyage_time_hours - candidate.total_voyage_time_hours
    : 0;
  const co2SavedTonnes = candidate && minCostCand
    ? minCostCand.operational_co2_tonnes - candidate.operational_co2_tonnes
    : 0;
  const fuelSavedTonnes = candidate && minCostCand
    ? minCostCand.fuel_consumption_tonnes - candidate.fuel_consumption_tonnes
    : 0;

  // Alternatives from comparativeResult
  const priorityKeys = [
    { key: DecisionPriority.BALANCED, label: 'Balanced (Cost + Time)' },
    { key: DecisionPriority.COST, label: 'Cost First' },
    { key: DecisionPriority.TIME, label: 'Time First' },
    { key: DecisionPriority.FUEL, label: 'Fuel Priority' },
    { key: DecisionPriority.CO2, label: 'Emissions Priority' },
    { key: DecisionPriority.GHG, label: 'Lifecycle GHG Priority' },
  ];

  const alternativesList = priorityKeys
    .map((item) => {
      const rec = recs[item.key] || recs[item.key.toLowerCase()];
      return rec ? { key: item.key, label: item.label, rec } : null;
    })
    .filter(Boolean) as Array<{ key: string; label: string; rec: Recommendation }>;

  const inspectedAlt = inspectedAltKey
    ? alternativesList.find((a) => a.key === inspectedAltKey)
    : null;

  return (
    <div className="stage-shell-card" id="stage07-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. STAGE HEADER                                               */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '1px solid var(--border-subtle, #E2EDF5)', paddingBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-emerald" style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              07 / 07
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
              Decision
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal, #2C8573)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>✓</span>
              <span>All optimization stages completed</span>
            </span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span>🎯</span>
            <span>Final Decision</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, maxWidth: '820px', lineHeight: 1.5 }}>
            Recommended voyage plan based on the optimization and comparative analysis.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.9rem',
            background: '#E8F6F2',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#2C8573'
          }}>
            <span>✨</span>
            <span>Optimization workflow complete</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Workflow ID: <code style={{ color: 'var(--accent-ocean, #1F5A85)' }}>{comparativeResult.request?.source_port_id || voyageConfig.sourcePort}-{comparativeResult.request?.destination_port_id || voyageConfig.destPort}</code>
          </span>
        </div>
      </div>

      {candidate ? (
        <>
          {/* ------------------------------------------------------------- */}
          {/* 2 & 3. PRIMARY RECOMMENDATION CARD (DOMINANT)                */}
          {/* ------------------------------------------------------------- */}
          <div
            id="primary-recommendation-card"
            style={{
              background: 'linear-gradient(135deg, #E8F6F2 0%, #FFFFFF 100%)',
              border: '2px solid #3FA48E',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: '0 8px 30px rgba(63, 164, 142, 0.12)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Badge & Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', background: '#E8F6F2', border: '1px solid #3FA48E', borderRadius: 'var(--radius-full)', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>★</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2C8573', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recommended Voyage Plan
                  </span>
                </div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  {candidate.vessel_name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Vessel Type: <strong style={{ color: 'var(--text-primary)' }}>{candidate.vessel_type || 'Commercial Bulk Carrier'}</strong> &bull; Vessel ID: <code style={{ color: 'var(--accent-ocean, #1F5A85)' }}>{candidate.vessel_id}</code>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: '#E8F6F2',
                  border: '1px solid #3FA48E',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'right'
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Feasibility Status</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2C8573' }}>
                    {candidate.is_feasible ? 'FEASIBLE & VERIFIED ✓' : 'INFEASIBLE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Core Directives: Vessel, Route, Speed, Fuel */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem',
              background: 'var(--bg-card-inset, #F4FAFC)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle, #E2EDF5)'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1. Deployed Vessel</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {candidate.vessel_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Payload: {`${formatNum(candidate.cargo_tonnes, 0)} MT`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>2. Maritime Route</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-ocean, #1F5A85)', marginTop: '0.2rem' }}>
                  {candidate.route_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Distance: {`${formatNum(candidate.distance_nm, 0)} NM`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>3. Cruising Speed</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber, #B45309)', marginTop: '0.2rem' }}>
                  {`${formatNum(candidate.cruising_speed_knots, 1)} kts`}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Effective SOG: {`${formatNum(candidate.effective_speed_knots || candidate.cruising_speed_knots, 1)} kts`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>4. Bunker Fuel</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6D28D9', marginTop: '0.2rem' }}>
                  {candidate.fuel_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Fuel ID: <code style={{ color: '#6D28D9' }}>{candidate.fuel_id}</code>
                </div>
              </div>
            </div>

            {/* Detailed Operational Values */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.85rem',
            }}>
              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Voyage Cost</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-ocean, #1F5A85)' }}>
                  {formatMoney(candidate.total_voyage_cost_usd)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Bunker + Port/Canal</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Voyage Duration (hrs)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {`${formatNum(candidate.total_voyage_time_hours, 1)} hrs`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  ~{formatNum(candidate.total_voyage_time_hours / 24, 1)} sea days
                </div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fuel Consumption</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber, #B45309)' }}>
                  {`${formatNum(candidate.fuel_consumption_tonnes, 1)} MT`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Hydrodynamically adjusted</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operational CO₂</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-teal, #2C8573)' }}>
                  {`${formatNum(candidate.operational_co2_tonnes, 1)} MT`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Direct combustion</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lifecycle GHG</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6D28D9' }}>
                  {`${formatNum(candidate.lifecycle_ghg_tonnes, 1)} MT`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Well-to-Wake boundary</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Deadline Margin</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: candidate.deadline_margin_hours >= 0 ? 'var(--accent-teal, #2C8573)' : '#DC2626' }}>
                  {candidate.deadline_margin_hours >= 0 ? `+${formatNum(candidate.deadline_margin_hours, 1)} hrs` : `${formatNum(candidate.deadline_margin_hours, 1)} hrs`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Schedule buffer</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cargo Load</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {`${formatNum(candidate.cargo_tonnes, 0)} MT`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Payload delivered</div>
              </div>

              <div className="kpi-card" style={{ padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vessel Utilization</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-ocean, #1F5A85)' }}>
                  {`${formatNum(candidate.cargo_utilization_pct, 1)}%`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Deadweight capacity</div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 4. WHY THIS PLAN?                                             */}
          {/* ------------------------------------------------------------- */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, #E2EDF5)', borderLeft: '4px solid var(--accent-teal, #3FA48E)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Why this plan?
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              The selected voyage plan is derived from deterministic multi-objective evaluation across the feasible decision set.
            </p>

            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7 }}>
              {activeRec?.reasons && activeRec.reasons.length > 0 ? (
                activeRec.reasons.map((reason, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{reason}</strong>
                  </li>
                ))
              ) : (
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    Selected as the balanced trade-off across voyage cost and travel time.
                  </strong>
                </li>
              )}
              <li style={{ marginBottom: '0.35rem' }}>
                Preserves <strong style={{ color: 'var(--accent-teal, #2C8573)' }}>{`${formatNum(candidate.deadline_margin_hours, 1)} hours`}</strong> of schedule buffer ahead of the delivery deadline ({new Date(candidate.deadline_datetime).toLocaleDateString('en-US')}).
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                Navigates via the environmentally verified <strong style={{ color: 'var(--text-primary)' }}>{candidate.route_name}</strong> corridor under <strong style={{ color: candidate.weather_risk_level === 'LOW' ? '#2C8573' : '#B45309' }}>{candidate.weather_risk_level}</strong> weather risk.
              </li>
              <li>
                Cargo payload ({`${formatNum(candidate.cargo_tonnes, 0)} MT`}) is within the vessel DWT limit at <strong style={{ color: 'var(--text-primary)' }}>{`${formatNum(candidate.cargo_utilization_pct, 1)}%`}</strong> deadweight utilization.
              </li>
            </ul>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 5. TRADE-OFF ACCEPTED                                         */}
          {/* ------------------------------------------------------------- */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, #E2EDF5)', borderLeft: '4px solid #F59E0B', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>⚖️</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Trade-Off Accepted
              </h3>
            </div>

            {minCostCand ? (
              costDelta <= 0.05 ? (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The selected plan matches the lowest-cost feasible solution in the current search space ({formatMoney(candidate.total_voyage_cost_usd)}). No cost penalty is incurred to achieve this operational profile.
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Compared with the minimum-cost alternative ({minCostCand.vessel_name} via {minCostCand.route_name} at {formatMoney(minCostCand.total_voyage_cost_usd)}), this plan costs <strong style={{ color: '#B45309' }}>{`${formatMoney(costDelta)} more (${formatPct((costDelta / (minCostCand.total_voyage_cost_usd || 1)) * 100)})`}</strong>
                  {timeSavedHours > 0.05 && (
                    <span> but reduces transit travel time by <strong style={{ color: 'var(--accent-ocean, #1F5A85)' }}>{`${formatNum(timeSavedHours, 1)} hours`}</strong></span>
                  )}
                  {co2SavedTonnes > 0.05 && (
                    <span> and operational CO₂ emissions by <strong style={{ color: 'var(--accent-teal, #2C8573)' }}>{`${formatNum(co2SavedTonnes, 1)} MT`}</strong></span>
                  )}
                  {fuelSavedTonnes > 0.05 && (
                    <span> (saving {`${formatNum(fuelSavedTonnes, 1)} MT`} bunker fuel)</span>
                  )}
                  .
                </div>
              )
            ) : (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                The selected plan represents the evaluated candidate configuration across operational criteria.
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 6. ALTERNATIVES INSPECTION                                    */}
          {/* ------------------------------------------------------------- */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, #E2EDF5)', borderLeft: '4px solid #8B5CF6', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>📋</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Alternative Options
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click any alternative to inspect details without altering the primary recommendation
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Key alternative solutions evaluated during comparative analysis under distinct operational criteria:
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle, #E2EDF5)', background: 'var(--bg-card-inset, #F4FAFC)', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Strategy / Priority</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Vessel</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Route</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Speed</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Fuel</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Cost</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Time</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Fuel Burn</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alternativesList.map((alt) => {
                    const c = alt.rec.candidate;
                    const isPrimary = c.decision_id === candidate.decision_id;
                    const isInspected = inspectedAltKey === alt.key;

                    return (
                      <tr
                        key={alt.key}
                        style={{
                          borderBottom: '1px solid var(--border-subtle, #E2EDF5)',
                          background: isInspected
                            ? '#EDE9FE'
                            : isPrimary
                            ? '#E8F6F2'
                            : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{alt.label}</span>
                            {isPrimary && (
                              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                ★ Primary
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-primary)' }}>{c.vessel_name}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--accent-ocean, #1F5A85)' }}>{c.route_name}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{`${formatNum(c.cruising_speed_knots, 1)} kts`}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{c.fuel_name}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-ocean, #1F5A85)' }}>
                          {formatMoney(c.total_voyage_cost_usd)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{`${formatNum(c.total_voyage_time_hours, 1)} hrs`}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{`${formatNum(c.fuel_consumption_tonnes, 1)} MT`}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="stage-nav-btn"
                            style={{
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.72rem',
                              background: isInspected ? '#DDD6FE' : 'var(--bg-card-inset, #F4FAFC)',
                              border: isInspected ? '1px solid #8B5CF6' : '1px solid var(--border-subtle, #E2EDF5)',
                              color: isInspected ? '#6D28D9' : 'var(--text-primary)',
                            }}
                            onClick={() => setInspectedAltKey(isInspected ? null : alt.key)}
                          >
                            {isInspected ? 'Close' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inspected Alternative Details Box */}
            {inspectedAlt && (
              <div
                id="inspected-alternative-panel"
                style={{
                  background: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginTop: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem', background: '#EDE9FE', color: '#6D28D9' }}>
                      INSPECTING ALTERNATIVE: {inspectedAlt.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      (Official recommendation above remains active)
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
                    onClick={() => setInspectedAltKey(null)}
                  >
                    ✕ Close
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Vessel</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{inspectedAlt.rec.candidate.vessel_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Route</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-ocean, #1F5A85)' }}>{inspectedAlt.rec.candidate.route_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Speed / Fuel</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {`${formatNum(inspectedAlt.rec.candidate.cruising_speed_knots, 1)} kts / ${inspectedAlt.rec.candidate.fuel_name}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cost</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-ocean, #1F5A85)' }}>
                      {formatMoney(inspectedAlt.rec.candidate.total_voyage_cost_usd)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Transit Time</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {`${formatNum(inspectedAlt.rec.candidate.total_voyage_time_hours, 1)} hrs`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Operational CO₂</div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-teal, #2C8573)' }}>
                      {`${formatNum(inspectedAlt.rec.candidate.operational_co2_tonnes, 1)} MT`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 7. OPERATIONAL CHECKLIST                                      */}
          {/* ------------------------------------------------------------- */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, #E2EDF5)', borderLeft: '4px solid var(--accent-ocean, #1F5A85)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.1rem' }}>✓</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Operational Feasibility Checklist
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Verification of physical and regulatory constraints based on evaluated candidate telemetry:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#2C8573', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Cargo capacity satisfied</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Payload ({`${formatNum(candidate.cargo_tonnes, 0)} MT`}) within DWT envelope ({`${formatNum(candidate.cargo_utilization_pct, 1)}%`} utilization).
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#2C8573', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Route environmentally feasible</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {candidate.route_name} verified under sea-state hydrodynamics (Risk: {candidate.weather_risk_level}).
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: candidate.deadline_margin_hours >= 0 ? '#2C8573' : '#DC2626', fontWeight: 800, fontSize: '1rem' }}>
                  {candidate.deadline_margin_hours >= 0 ? '✓' : '✗'}
                </span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Commercial deadline satisfied</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Arrival with {`${formatNum(candidate.deadline_margin_hours, 1)} hours`} of buffer before deadline.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#2C8573', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fuel compatibility confirmed</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Bunker {candidate.fuel_name} compatible with {candidate.vessel_name} main propulsion engine.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#2C8573', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Speed within vessel limits</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Cruising speed {`${formatNum(candidate.cruising_speed_knots, 1)} kts`} within calibrated operational envelope.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-card-inset, #F4FAFC)', border: '1px solid var(--border-subtle, #E2EDF5)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#2C8573', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Emission footprint evaluated</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Direct operational CO₂ ({`${formatNum(candidate.operational_co2_tonnes, 1)} MT`}) and lifecycle GHG ({`${formatNum(candidate.lifecycle_ghg_tonnes, 1)} MT`}) logged.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 8. DECISION NOTES / LIMITATIONS                               */}
          {/* ------------------------------------------------------------- */}
          <div style={{
            background: 'var(--bg-card-inset, #F4FAFC)',
            borderLeft: '4px solid var(--accent-ocean, #1F5A85)',
            borderTop: '1px solid var(--border-subtle, #E2EDF5)',
            borderRight: '1px solid var(--border-subtle, #E2EDF5)',
            borderBottom: '1px solid var(--border-subtle, #E2EDF5)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>ℹ️</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-ocean, #1F5A85)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Decision Notes &amp; Operational Limitations
              </strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6 }}>
              <li>
                <strong>Environmental conditions</strong> are currently based on simulated/demo oceanographic profiles. Real-world voyages require live satellite AIS and dynamic meteorology feeds.
              </li>
              <li>
                <strong>Quantum-inspired optimization</strong> is executed classically via simulated annealing on conventional CPU hardware; this prototype makes no claim of quantum hardware advantage.
              </li>
              <li>
                <strong>Balanced selection</strong> uses the project's multi-objective compromise heuristic across the Pareto front and does not replace operational command judgment.
              </li>
              <li>
                <strong>Operational execution</strong> should verify local port berthing windows, canal transit reservations, and contractual charter-party terms prior to departure.
              </li>
            </ul>
          </div>
        </>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No recommended candidate found in comparative analysis.
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9 & 11. NAVIGATION & RESET ACTIONS                            */}
      {/* ------------------------------------------------------------- */}
      <div className="stage-nav-bar" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          id="stage07-prev-btn"
          className="stage-nav-btn stage-nav-btn-secondary"
          onClick={onPrevious}
        >
          <span>←</span>
          <span>Back to Compare</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-teal, #2C8573)' }}>
            Workflow Stage 07 of 07
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Final Decision Screen
          </div>
        </div>

        {showResetConfirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>Reset all stages?</span>
            <button
              type="button"
              id="stage07-confirm-reset-btn"
              className="stage-nav-btn"
              style={{ background: '#DC2626', color: '#fff', border: '1px solid #B91C1C', padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
              onClick={() => {
                setShowResetConfirm(false);
                onResetWorkflow();
              }}
            >
              Yes, Reset
            </button>
            <button
              type="button"
              className="stage-nav-btn stage-nav-btn-secondary"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            id="stage07-reset-btn"
            className="stage-nav-btn stage-nav-btn-primary"
            style={{
              background: 'linear-gradient(135deg, #1F5A85 0%, #3884C7 100%)',
              border: 'none',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(31, 90, 133, 0.25)',
            }}
            onClick={() => setShowResetConfirm(true)}
          >
            <span>🔄 Start New Optimization</span>
          </button>
        )}
      </div>
    </div>
  );
};
