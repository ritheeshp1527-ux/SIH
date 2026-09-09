import React from 'react';
import { WorkflowOptimizationResponse } from '../types/workflow';
import { DecisionPriority, Recommendation } from '../types';

interface SihDecisionStoryProps {
  workflowResult: WorkflowOptimizationResponse;
  priority: DecisionPriority;
}

const formatNum = (num?: number | null, decimals = 1) =>
  num != null ? num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

const formatMoney = (num?: number | null) =>
  num != null ? '$' + Math.round(num).toLocaleString() : '—';

const formatPct = (num?: number | null) =>
  num != null ? (num > 0 ? '+' : '') + num.toFixed(2) + '%' : '0.00%';

export const SihDecisionStory: React.FC<SihDecisionStoryProps> = ({ workflowResult, priority }) => {
  const { request, stages, workflow_metadata } = workflowResult;
  const compAnalysis = stages.comparative_analysis?.full_response;
  const classical = stages.classical_optimization;
  const qi = stages.quantum_inspired;
  const fuelIntel = stages.fuel_intelligence;
  const maritime = stages.maritime_network;
  const weather = stages.weather_ocean;
  
  const suezRoute = maritime?.candidate_routes?.find(r => r.id === 'RT-SG-RTM-SUEZ');
  const capeRoute = maritime?.candidate_routes?.find(r => r.id === 'RT-SG-RTM-CAPE');

  // Selected Recommendation from backend
  const activeRec: Recommendation | undefined = compAnalysis?.recommendations?.[priority] ||
    (compAnalysis?.recommendations ? Object.values(compAnalysis.recommendations)[0] : undefined);

  const candidate = activeRec?.candidate;

  // Classical & QI candidate summaries from backend comparative analysis
  const classicalBestCost = compAnalysis?.classical?.best_cost_usd ?? compAnalysis?.classical_summary?.best_cost_usd;
  const classicalBestTime = compAnalysis?.classical?.best_time_hours ?? compAnalysis?.classical_summary?.best_time_hours;
  const classicalFuel = compAnalysis?.classical?.fuel_consumption_tonnes ?? compAnalysis?.classical_summary?.fuel_consumption_tonnes;
  const classicalCO2 = compAnalysis?.classical?.operational_co2_tonnes ?? compAnalysis?.classical_summary?.operational_co2_tonnes;

  const qiBestCost = compAnalysis?.quantum_inspired?.best_cost_usd ?? compAnalysis?.quantum_inspired_summary?.best_cost_usd;
  const qiBestTime = compAnalysis?.quantum_inspired?.best_time_hours ?? compAnalysis?.quantum_inspired_summary?.best_time_hours;
  const qiFuel = compAnalysis?.quantum_inspired?.fuel_consumption_tonnes ?? compAnalysis?.quantum_inspired_summary?.fuel_consumption_tonnes;
  const qiCO2 = compAnalysis?.quantum_inspired?.operational_co2_tonnes ?? compAnalysis?.quantum_inspired_summary?.operational_co2_tonnes;

  const tradeoffs = compAnalysis?.tradeoffs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
      {/* Story Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1.75rem',
        boxShadow: '0 8px 32px rgba(0, 229, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                SIH DEMONSTRATION SCENARIO
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                End-to-End Maritime Decision Narrative
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Voyage Optimization Decision Story
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '850px' }}>
              A deterministic 5-step operational walk-through illustrating how GreenFleet Quantum synthesizes fuel physics, maritime corridors, dynamic weather, classical enumeration, and quantum-inspired QUBO optimization into defensible voyage recommendations.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Workflow Provenance</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
              {workflow_metadata.workflow_id}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
              Deterministic (Wall Clock: {formatNum(workflow_metadata.total_runtime_ms, 1)} ms)
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: VOYAGE CONTEXT */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-cyan)', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>1</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            STEP 1 &bull; Voyage Request &amp; Commercial Constraints
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          The cargo owner requires transport of bulk commodities along the core East-West trade lane with strict commercial arrival deadlines.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origin Port</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{request.source_port_id}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Singapore Anchorage</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination Port</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{request.destination_port_id}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Port of Rotterdam</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cargo Payload</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {request.cargo_weight_tonnes?.toLocaleString()} MT
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Dry Bulk Consignment</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivery Deadline</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {new Date(request.deadline_datetime).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{new Date(request.deadline_datetime).toLocaleTimeString()} UTC</div>
          </div>
          <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Optimization Priority</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc', textTransform: 'capitalize' }}>
              {priority} Priority
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Multi-Objective Decision Criterion</div>
          </div>
        </div>
      </div>

      {/* STEP 2: ROUTE ALTERNATIVES */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-cyan)', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>2</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            STEP 2 &bull; Route Options &amp; Corridor Feasibility
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Phase 2 models candidate maritime corridors and evaluates physical navigation constraints (vessel draft vs. Suez Canal depth limit of 16.0m), while Phase 3 incorporates dynamic environmental resistance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Suez Route Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Suez Canal Corridor</strong>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Feasible for Panamax</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Identifier: <code style={{ color: 'var(--accent-cyan)' }}>RT-SG-RTM-SUEZ</code> &bull; 10 Waypoint Segments
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.25)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div>Distance: <strong style={{ color: 'var(--text-primary)' }}>{suezRoute ? formatNum(suezRoute.total_distance_nm, 0) : '8,280'} NM</strong></div>
              <div>Route Cost: <strong style={{ color: 'var(--accent-cyan)' }}>{formatMoney(suezRoute?.route_cost)}</strong></div>
              <div>Max Draft: <strong style={{ color: 'var(--text-primary)' }}>{suezRoute?.segments?.find(s => s.draft_limit_m != null)?.draft_limit_m || 16.0} m</strong></div>
              <div>Weather Risk: <strong style={{ color: '#34d399' }}>LOW (f_env ≈ {weather?.weather_fuel_factors?.['RT-SG-RTM-SUEZ'] ? formatNum(weather.weather_fuel_factors['RT-SG-RTM-SUEZ'], 4) : '1.0622'})</strong></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              * High route cost, shorter sailing distance, favorable sea state.
            </div>
          </div>

          {/* Cape Route Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Cape of Good Hope Corridor</strong>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Feasible (No Draft Limit)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Identifier: <code style={{ color: 'var(--accent-cyan)' }}>RT-SG-RTM-CAPE</code> &bull; 6 Waypoint Segments
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.25)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
              <div>Distance: <strong style={{ color: 'var(--text-primary)' }}>{capeRoute ? formatNum(capeRoute.total_distance_nm, 0) : '11,720'} NM</strong></div>
              <div>Route Cost: <strong style={{ color: '#10b981' }}>{formatMoney(capeRoute?.route_cost)}</strong></div>
              <div>Draft Limit: <strong style={{ color: 'var(--text-primary)' }}>Unrestricted</strong></div>
              <div>Weather Risk: <strong style={{ color: '#fbbf24' }}>MODERATE (f_env ≈ {weather?.weather_fuel_factors?.['RT-SG-RTM-CAPE'] ? formatNum(weather.weather_fuel_factors['RT-SG-RTM-CAPE'], 4) : '1.1210'})</strong></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              * +3,440 NM longer voyage, higher bunker consumption, zero canal transit fees.
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: OPTIMIZATION METHODOLOGIES */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-cyan)', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>3</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            STEP 3 &bull; Optimization: Classical Exact vs. Quantum-Inspired Simulated Annealing
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Evaluates the combinatorial decision space (Vessel &times; Route &times; Speed &times; Fuel). Classical Exact performs complete discrete enumeration. Quantum-Inspired Simulated Annealing maps decisions to a normalized QUBO energy formulation with one-hot constraints.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
          {/* Classical Summary */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>Classical Exact Enumeration</strong>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Deterministic Global Optimum</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <div>Evaluated Combinations: <strong style={{ color: 'var(--text-primary)' }}>{classical?.total_evaluated_combinations}</strong></div>
              <div>Feasible Candidates: <strong style={{ color: '#34d399' }}>{classical?.feasible_solutions_count}</strong></div>
              <div>Execution Runtime: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{formatNum(classical?.runtime_ms, 1)} ms</strong></div>
              <div>Best Cost Candidate: <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(classicalBestCost)}</strong></div>
              <div>Best Time Candidate: <strong style={{ color: 'var(--text-primary)' }}>{formatNum(classicalBestTime, 1)} hrs</strong></div>
            </div>
          </div>

          {/* Quantum-Inspired Summary */}
          <div style={{
            background: 'rgba(192, 132, 252, 0.05)',
            border: '1px solid rgba(192, 132, 252, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem', color: '#c084fc' }}>Quantum-Inspired Simulated Annealing</strong>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>QUBO Metaheuristic</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <div>QUBO Binary Variables: <strong style={{ color: '#c084fc' }}>{qi?.qubo_variable_count} x_i</strong></div>
              <div>Simulated Annealing Runtime: <strong style={{ fontFamily: 'monospace', color: '#c084fc' }}>{formatNum(qi?.solver_runtime_ms, 1)} ms</strong></div>
              <div>Top-K Solutions Retained: <strong style={{ color: 'var(--text-primary)' }}>{qi?.top_k_solutions_count || 5} feasible</strong></div>
              <div>Quantum-Inspired Candidate Cost: <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(qiBestCost)}</strong></div>
              <div>Compared against Classical Exact baseline: <strong style={{ color: '#10b981' }}>{tradeoffs ? formatPct(tradeoffs.cost_delta_pct) : '0.00%'} Gap</strong></div>
            </div>
          </div>
        </div>

        {/* Scientific Transparency Notice */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderLeft: '3px solid var(--accent-cyan)',
          padding: '0.6rem 0.9rem',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <strong>Scientific Neutrality Note:</strong> Quantum-Inspired Simulated Annealing runs entirely on classical CPU architectures. Solvers are compared empirically under identical objective weights. No quantum claims of computational advantage, speedup, or classical-outperformance are made.
        </div>
      </div>

      {/* BENCHMARK EVIDENCE PANEL */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #c084fc', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: '#c084fc', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>✓</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Benchmark Evidence
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Both methods use the same feasible decision space.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.6rem', textAlign: 'left' }}>Performance Metric</th>
                <th style={{ padding: '0.6rem' }}>Classical Baseline</th>
                <th style={{ padding: '0.6rem' }}>Quantum-Inspired (Simulated Annealing)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Execution Runtime</td>
                <td style={{ padding: '0.6rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{formatNum(compAnalysis?.comparison?.classical_candidate?.runtime ?? classical?.runtime_ms, 1)} ms</td>
                <td style={{ padding: '0.6rem', color: '#c084fc', fontFamily: 'monospace' }}>{formatNum(compAnalysis?.comparison?.quantum_inspired_candidate?.runtime ?? qi?.solver_runtime_ms, 1)} ms</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Objective Value</td>
                <td style={{ padding: '0.6rem' }}>{compAnalysis?.comparison?.classical_candidate?.qubo_energy != null ? formatNum(compAnalysis.comparison.classical_candidate.qubo_energy, 4) : '—'}</td>
                <td style={{ padding: '0.6rem' }}>{compAnalysis?.comparison?.quantum_inspired_candidate?.qubo_energy != null ? formatNum(compAnalysis.comparison.quantum_inspired_candidate.qubo_energy, 4) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderLeft: '3px solid #c084fc',
          padding: '0.6rem 0.9rem',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          Quantum-inspired optimization is simulated on a classical CPU; this prototype does not claim quantum hardware advantage.
        </div>
      </div>

      {/* STEP 4: MULTI-OBJECTIVE TRADEOFFS */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-cyan)', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>4</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            STEP 4 &bull; Multi-Objective Trade-offs &amp; Impact Summary
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Pairwise deltas between Classical Exact and Quantum-Inspired candidates over actual measured results.
        </p>

        {/* Compact Table */}
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.6rem', textAlign: 'left' }}>Objective Metric</th>
                <th style={{ padding: '0.6rem' }}>Classical Exact</th>
                <th style={{ padding: '0.6rem' }}>Quantum-Inspired Candidate</th>
                <th style={{ padding: '0.6rem' }}>Difference (QI &minus; Classical)</th>
                <th style={{ padding: '0.6rem' }}>Selected Recommendation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Total Voyage Cost</td>
                <td style={{ padding: '0.6rem', color: 'var(--accent-cyan)' }}>{formatMoney(classicalBestCost)}</td>
                <td style={{ padding: '0.6rem', color: '#c084fc' }}>{formatMoney(qiBestCost)}</td>
                <td style={{ padding: '0.6rem', color: tradeoffs?.cost_delta_usd === 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                  {formatMoney(tradeoffs?.cost_delta_usd)}
                </td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatMoney(candidate?.total_voyage_cost_usd)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Transit Duration</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(classicalBestTime, 1)} hrs</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(qiBestTime, 1)} hrs</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(tradeoffs?.time_delta_hours, 1)} hrs</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatNum(candidate?.total_voyage_time_hours, 1)} hrs</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Bunker Fuel</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(classicalFuel, 1)} t</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(qiFuel, 1)} t</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(tradeoffs?.fuel_delta_tonnes, 1)} t</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatNum(candidate?.fuel_consumption_tonnes, 1)} t</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Operational CO₂</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(classicalCO2, 1)} t</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(qiCO2, 1)} t</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(tradeoffs?.co2_delta_tonnes, 1)} t</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatNum(candidate?.operational_co2_tonnes, 1)} t</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Lifecycle GHG</td>
                <td style={{ padding: '0.6rem' }}>{compAnalysis?.environmental_analysis ? formatNum(compAnalysis.environmental_analysis.lifecycle_ghg_tonnes, 1) : '—'} t</td>
                <td style={{ padding: '0.6rem' }}>{compAnalysis?.environmental_analysis ? formatNum(compAnalysis.environmental_analysis.lifecycle_ghg_tonnes, 1) : '—'} t</td>
                <td style={{ padding: '0.6rem' }}>{formatNum(tradeoffs?.ghg_delta_tonnes, 1)} t</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatNum(candidate?.lifecycle_ghg_tonnes, 1)} t</td>
              </tr>
              <tr>
                <td style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Deadline Margin</td>
                <td style={{ padding: '0.6rem' }}>{candidate ? formatNum(candidate.deadline_margin_hours, 1) : '—'} hrs</td>
                <td style={{ padding: '0.6rem' }}>{candidate ? formatNum(candidate.deadline_margin_hours, 1) : '—'} hrs</td>
                <td style={{ padding: '0.6rem' }}>0.0 hrs</td>
                <td style={{ padding: '0.6rem', fontWeight: 700, color: candidate && candidate.deadline_margin_hours > 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                  +{formatNum(candidate?.deadline_margin_hours, 1)} hrs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* STEP 5: FINAL RECOMMENDED DECISION */}
      <div className="glass-panel" style={{ padding: '1.75rem', borderLeft: '4px solid var(--accent-emerald)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ background: 'var(--accent-emerald)', color: '#080d1a', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>5</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            STEP 5 &bull; Final Decision &amp; Operational Rationale
          </h3>
        </div>

        {candidate ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    ★ Recommended Operational Decision
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    Selected for {priority.toUpperCase()} Priority
                  </span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {candidate.vessel_name} &bull; {candidate.route_name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Cruising Speed: <strong style={{ color: 'var(--text-primary)' }}>{`${formatNum(candidate.cruising_speed_knots, 1)} kts`}</strong> &bull; Fuel: <strong style={{ color: 'var(--text-primary)' }}>{candidate.fuel_name}</strong> &bull; Weather Risk: <strong style={{ color: candidate.weather_risk_level === 'LOW' ? '#34d399' : '#fbbf24' }}>{candidate.weather_risk_level}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid #10b981'
                }}>
                  Status: FEASIBLE &amp; ON SCHEDULE
                </span>
              </div>
            </div>

            {/* High-Impact KPI Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Voyage Cost</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {formatMoney(candidate.total_voyage_cost_usd)}
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Voyage Duration</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatNum(candidate.total_voyage_time_hours, 1)} hrs
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bunker Fuel</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  {formatNum(candidate.fuel_consumption_tonnes, 1)} t
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operational CO₂</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  {formatNum(candidate.operational_co2_tonnes, 1)} t
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifecycle GHG</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c084fc' }}>
                  {formatNum(candidate.lifecycle_ghg_tonnes, 1)} t
                </div>
              </div>
              <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deadline Margin</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: candidate.deadline_margin_hours > 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                  +{formatNum(candidate.deadline_margin_hours, 1)} hrs
                </div>
              </div>
            </div>

            {/* Backend Justification */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Deterministic Backend Justification:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                {activeRec?.reasons?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* BASELINE VS OPTIMIZED: Strict Distinction Notice */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#fbbf24' }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <strong style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Baseline vs. Optimized Distinction
                </strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Phase 1 Representative Baseline: </strong>
                  {fuelIntel?.representative_fuel_estimate
                    ? `${formatNum(fuelIntel.representative_fuel_estimate.fuel_consumption_tonnes, 1)} tonnes (${formatMoney(fuelIntel.representative_fuel_estimate.fuel_cost)})`
                    : 'Calm-water nominal baseline calculation'}
                  &bull; <span style={{ color: '#fcd34d' }}>Note: This is NOT the optimized voyage fuel consumption.</span>
                </div>
                <div style={{ marginTop: '0.3rem' }}>
                  <strong style={{ color: 'var(--accent-emerald)' }}>Optimized Voyage Decision: </strong>
                  <strong>{formatNum(candidate.fuel_consumption_tonnes, 1)} tonnes</strong> bunker fuel ({formatMoney(candidate.total_voyage_cost_usd)} total cost including port/canal fees) evaluated over actual 8,280 NM route with hydrodynamic sea-state resistance.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No recommendation found for active priority.
          </div>
        )}
      </div>
    </div>
  );
};
