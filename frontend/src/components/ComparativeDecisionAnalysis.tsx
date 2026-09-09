import React, { useState, useEffect } from 'react';
import { 
  ComparativeAnalysisRequest, 
  ComparativeAnalysisResponse,
  DecisionPriority,
  Recommendation
} from '../types';
import { runComparativeAnalysis, fetchSampleOptimizationRequest } from '../services/api';

const formatNum = (num: number, decimals = 1) => 
  num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatMoney = (num: number) => 
  '$' + Math.round(num).toLocaleString();

const formatPct = (num: number) => 
  (num > 0 ? '+' : '') + num.toFixed(2) + '%';

function ParetoScatterPlot({ 
  paretoFront, 
  classicalOpt, 
  qiOpt, 
  recommendedId 
}: { 
  paretoFront: any[];
  classicalOpt?: string | null;
  qiOpt?: string | null;
  recommendedId?: string;
}) {
  if (!paretoFront || paretoFront.length === 0) return null;
  
  const times = paretoFront.map(c => c.total_voyage_time_hours);
  const costs = paretoFront.map(c => c.total_voyage_cost_usd);
  
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  const padding = 55;
  const width = 640;
  const height = 300;

  const getX = (time: number) => padding + ((time - minTime) / (maxTime - minTime || 1)) * (width - 2 * padding);
  const getY = (cost: number) => height - padding - ((cost - minCost) / (maxCost - minCost || 1)) * (height - 2 * padding);

  // Sort pareto solutions by time ascending to trace the non-dominated frontier curve
  const sortedFront = [...paretoFront].sort((a, b) => a.total_voyage_time_hours - b.total_voyage_time_hours);
  const frontierPath = sortedFront.length > 1 
    ? sortedFront.map((c, i) => `${i === 0 ? 'M' : 'L'} ${getX(c.total_voyage_time_hours).toFixed(1)} ${getY(c.total_voyage_cost_usd).toFixed(1)}`).join(' ')
    : '';

  const midTime = (minTime + maxTime) / 2;
  const midCost = (minCost + maxCost) / 2;

  return (
    <div style={{
      width: '100%',
      background: 'rgba(11, 19, 38, 0.85)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
          Cost vs. Time Pareto Trade-off Curve ({paretoFront.length} Non-Dominated Solutions)
        </h4>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Frontier Bounds: Cost [{formatMoney(minCost)} – {formatMoney(maxCost)}] &bull; Time [{formatNum(minTime)}h – {formatNum(maxTime)}h]
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="250" style={{ overflow: 'visible' }}>
        {/* Subtle background grid lines */}
        <line x1={padding} y1={getY(midCost)} x2={width - padding} y2={getY(midCost)} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="3 3" />
        <line x1={getX(midTime)} y1={padding} x2={getX(midTime)} y2={height - padding} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="3 3" />

        {/* Primary Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.25)" strokeWidth={1.5} />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.25)" strokeWidth={1.5} />

        {/* Axis Ticks & Values */}
        {/* X Ticks */}
        <line x1={padding} y1={height - padding} x2={padding} y2={height - padding + 5} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={padding} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="var(--text-muted)">{formatNum(minTime, 0)}h</text>

        <line x1={getX(midTime)} y1={height - padding} x2={getX(midTime)} y2={height - padding + 5} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={getX(midTime)} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="var(--text-muted)">{formatNum(midTime, 0)}h</text>

        <line x1={width - padding} y1={height - padding} x2={width - padding} y2={height - padding + 5} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={width - padding} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="var(--text-muted)">{formatNum(maxTime, 0)}h</text>

        {/* Y Ticks */}
        <line x1={padding - 5} y1={height - padding} x2={padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={padding - 8} y={height - padding + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">{formatMoney(minCost)}</text>

        <line x1={padding - 5} y1={getY(midCost)} x2={padding} y2={getY(midCost)} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={padding - 8} y={getY(midCost) + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">{formatMoney(midCost)}</text>

        <line x1={padding - 5} y1={padding} x2={padding} y2={padding} stroke="rgba(255, 255, 255, 0.3)" />
        <text x={padding - 8} y={padding + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">{formatMoney(maxCost)}</text>

        {/* Trade-off Frontier Connection Line */}
        {frontierPath && (
          <path 
            d={frontierPath} 
            fill="none" 
            stroke="rgba(0, 229, 255, 0.45)" 
            strokeWidth={1.75} 
            strokeDasharray="4 3" 
          />
        )}

        {/* Pareto Candidates */}
        {paretoFront.map((c, i) => {
          const isRec = c.decision_id === recommendedId;
          const isClass = c.decision_id === classicalOpt;
          const isQI = c.decision_id === qiOpt;
          
          let fill = '#64748b'; // default slate
          let r = 5;
          let stroke = 'rgba(255, 255, 255, 0.4)';
          let strokeWidth = 1;

          if (isClass) { fill = '#38bdf8'; r = 7; stroke = '#0284c7'; strokeWidth = 2; }
          if (isQI) { fill = '#c084fc'; r = 7; stroke = '#9333ea'; strokeWidth = 2; }
          if (isRec) { fill = '#10b981'; r = 9; stroke = '#059669'; strokeWidth = 2.5; }

          return (
            <circle 
              key={i}
              cx={getX(c.total_voyage_time_hours)}
              cy={getY(c.total_voyage_cost_usd)}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
            >
              <title>{`${c.decision_id}\nCost: ${formatMoney(c.total_voyage_cost_usd)}\nTime: ${formatNum(c.total_voyage_time_hours)}h\nFuel: ${formatNum(c.fuel_consumption_tonnes)}t\nCO2: ${formatNum(c.operational_co2_tonnes)}t`}</title>
            </circle>
          );
        })}

        {/* Axis Titles */}
        <text x={width / 2} y={height - 2} fontSize="11" textAnchor="middle" fill="var(--text-muted)" fontWeight="600">
          Transit Duration (hours) →
        </text>
        <text x={14} y={height / 2} fontSize="11" textAnchor="middle" fill="var(--text-muted)" fontWeight="600" transform={`rotate(-90 14 ${height / 2})`}>
          Total Voyage Cost (USD) →
        </text>
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', fontSize: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '1px solid #fff' }} />
          <strong>Selected Recommendation</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', border: '1px solid #fff' }} />
          Classical Optimum
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c084fc', border: '1px solid #fff' }} />
          Quantum-Inspired Top
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }} />
          Pareto Non-Dominated
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <div style={{ width: 18, height: 2, background: 'var(--accent-cyan)', borderTop: '1px dashed #00e5ff' }} />
          Non-Dominated Trade-off Frontier
        </span>
      </div>
    </div>
  );
}

export interface ComparativeDecisionAnalysisProps {
  initialAnalysis?: ComparativeAnalysisResponse | null;
  initialLoading?: boolean;
  initialError?: string | null;
  autoFetch?: boolean;
}

export const ComparativeDecisionAnalysis: React.FC<ComparativeDecisionAnalysisProps> = ({
  initialAnalysis = null,
  initialLoading = false,
  initialError = null,
  autoFetch = true
}) => {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [analysis, setAnalysis] = useState<ComparativeAnalysisResponse | null>(initialAnalysis);
  const [priority, setPriority] = useState<DecisionPriority>(DecisionPriority.BALANCED);
  const [topK, setTopK] = useState<number>(5);

  const fetchAnalysis = async (p: DecisionPriority, k: number) => {
    setLoading(true);
    setError(null);
    try {
      const sampleReq = await fetchSampleOptimizationRequest();
      const compReq: ComparativeAnalysisRequest = {
        voyage_request: sampleReq,
        priority: p,
        top_k: k
      };
      const res = await runComparativeAnalysis(compReq);
      setAnalysis(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Comparative analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && !initialAnalysis) {
      fetchAnalysis(priority, topK);
    }
  }, []);

  const handlePriorityChange = (p: DecisionPriority) => {
    setPriority(p);
    fetchAnalysis(p, topK);
  };

  const handleTopKChange = (k: number) => {
    setTopK(k);
    fetchAnalysis(priority, k);
  };

  const activeRec: Recommendation | undefined = analysis?.recommendations[priority] || 
    (analysis?.recommendations ? Object.values(analysis.recommendations)[0] : undefined);

  const classicalBestId = analysis?.classical?.best_decision_id || analysis?.classical_summary?.best_decision_id;
  const qiBestId = analysis?.quantum_inspired?.best_decision_id || analysis?.quantum_inspired_summary?.best_decision_id;

  const priorityLabels: Record<DecisionPriority, { label: string; icon: string; desc: string }> = {
    [DecisionPriority.BALANCED]: { label: 'Balanced', icon: '🎯', desc: 'Normalized Euclidean distance to ideal point' },
    [DecisionPriority.COST]: { label: 'Min Cost', icon: '💰', desc: 'Lowest total voyage expenditure' },
    [DecisionPriority.TIME]: { label: 'Min Time', icon: '⏱️', desc: 'Fastest sailing duration & max margin' },
    [DecisionPriority.FUEL]: { label: 'Min Fuel', icon: '⛽', desc: 'Lowest bunker fuel consumption' },
    [DecisionPriority.CO2]: { label: 'Min CO₂', icon: '🌿', desc: 'Lowest operational combustion CO2' },
    [DecisionPriority.GHG]: { label: 'Min GHG', icon: '🌍', desc: 'Lowest well-to-wake lifecycle GHG' }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              Phase 6 Decision Analysis
            </span>
            <span className="badge badge-cyan">
              Post-Optimization Intelligence
            </span>
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Comparative Decision Analysis &amp; Green Fleet Trade-offs
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '820px' }}>
            Synthesizes Classical Exact (Phase 4) and Quantum-Inspired Simulated Annealing (Phase 5) results.
            Identifies non-dominated Pareto alternatives, evaluates trade-offs, and provides defensible recommendations.
          </p>
        </div>

        <button
          onClick={() => fetchAnalysis(priority, topK)}
          disabled={loading}
          style={{
            padding: '0.65rem 1.25rem',
            background: loading ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)',
            color: loading ? 'var(--text-muted)' : '#080d1a',
            fontWeight: 700,
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(0, 229, 255, 0.25)'
          }}
        >
          <span>{loading ? 'Analyzing Alternatives...' : 'Re-Run Comparative Analysis'}</span>
          <span>↻</span>
        </button>
      </div>

      {/* Scientific Transparency Notice */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.08)',
        borderLeft: '4px solid var(--accent-cyan)',
        borderTop: '1px solid var(--border-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        padding: '0.75rem 1rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        marginBottom: '1.75rem'
      }}>
        <strong>Scientific Neutrality Notice:</strong> Evaluations compare Classical Exact Enumeration with Quantum-Inspired Simulated Annealing running on classical CPU hardware. <strong>No quantum advantage is claimed. No quantum superiority is claimed. No quantum speedup is claimed.</strong>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          padding: '2.5rem',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px dashed var(--border-subtle)'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Running multi-objective comparative decision analysis...</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Evaluating Classical baseline and Quantum-Inspired QUBO trajectories over identical decision space.
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#fca5a5',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>Analysis Failed:</strong> {error}
          </div>
          <button
            onClick={() => fetchAnalysis(priority, topK)}
            style={{
              padding: '0.4rem 0.8rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !analysis && !error && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No comparative analysis data available. Click &quot;Re-Run Comparative Analysis&quot; to begin.
        </div>
      )}

      {analysis && (
        <>
          {/* SECTION A: Request Summary & Controls */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                Section A &bull; Voyage Request &amp; Operational Decision Context
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Top-K QI Candidates:</span>
                <select
                  value={topK}
                  onChange={(e) => handleTopKChange(parseInt(e.target.value, 10))}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Origin Port</span>
                <strong style={{ color: 'var(--text-primary)' }}>{analysis.request.source_port_id} (Singapore)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Destination Port</span>
                <strong style={{ color: 'var(--text-primary)' }}>{analysis.request.destination_port_id} (Rotterdam)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Cargo Payload</span>
                <strong style={{ color: 'var(--text-primary)' }}>{analysis.request.cargo_weight_tonnes.toLocaleString()} MT</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Delivery Deadline</span>
                <strong style={{ color: 'var(--text-primary)' }}>{new Date(analysis.request.deadline_datetime).toLocaleDateString()} UTC</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Available Fleet Context</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>3 Vessels (Panamax, Capesize, Dual-Fuel)</strong>
              </div>
            </div>

            {/* Operational Decision Priority Buttons */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Select Decision Priority:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.values(DecisionPriority).map((p) => {
                  const isSelected = priority === p;
                  const info = priorityLabels[p];
                  return (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={info.desc}
                    >
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PRIMARY OPERATIONAL DECISION SPOTLIGHT */}
          {activeRec && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '2px solid rgba(16, 185, 129, 0.45)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.75rem',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.12)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      ★ Primary Operational Recommendation
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      {priorityLabels[priority]?.icon} {priorityLabels[priority]?.label} Priority Selection
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {activeRec.candidate.vessel_name} &bull; {activeRec.candidate.route_name}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: activeRec.candidate.weather_risk_level === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: activeRec.candidate.weather_risk_level === 'LOW' ? '#34d399' : '#fbbf24',
                    border: '1px solid currentColor'
                  }}>
                    Risk: {activeRec.candidate.weather_risk_level}
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid #38bdf8'
                  }}>
                    Speed: {activeRec.candidate.cruising_speed_knots} kts ({activeRec.candidate.fuel_name})
                  </span>
                </div>
              </div>

              {/* Large High-Impact Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Voyage Cost</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {formatMoney(activeRec.candidate.total_voyage_cost_usd)}
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Voyage Duration</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatNum(activeRec.candidate.total_voyage_time_hours)}h
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bunker Fuel</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                    {formatNum(activeRec.candidate.fuel_consumption_tonnes)}t
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operational CO₂</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {formatNum(activeRec.candidate.operational_co2_tonnes)}t
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifecycle GHG</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>
                    {formatNum(activeRec.candidate.lifecycle_ghg_tonnes)}t
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deadline Margin</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: activeRec.candidate.deadline_margin_hours > 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                    {formatNum(activeRec.candidate.deadline_margin_hours)}h
                  </div>
                </div>
              </div>

              {/* Justification summary */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Operational Rationale: </strong>
                  {activeRec.reasons.join(' • ')}
                </div>
                {priority === DecisionPriority.BALANCED && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontStyle: 'italic' }}>
                    * Multi-objective compromise selected via normalized Euclidean distance D(c) across Pareto frontier.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION B: Classical vs Quantum-Inspired Comparison */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Section B &bull; Classical Exact vs. Quantum-Inspired Simulated Annealing
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Head-to-head comparison on identical operational request under primary cost objective.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-cyan">Classical Exact</span>
                <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  Quantum-Inspired Simulated Annealing
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Operational Metric</th>
                    <th style={{ padding: '0.75rem' }}>Classical Exact</th>
                    <th style={{ padding: '0.75rem' }}>Quantum-Inspired Simulated Annealing</th>
                    <th style={{ padding: '0.75rem' }}>Difference (QI &minus; Classical)</th>
                    <th style={{ padding: '0.75rem' }}>Relative Gap (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Total Voyage Cost</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {formatMoney(analysis.classical?.best_cost_usd || analysis.classical_summary?.best_cost_usd || 0)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#c084fc' }}>
                      {formatMoney(analysis.quantum_inspired?.best_cost_usd || analysis.quantum_inspired_summary?.best_cost_usd || 0)}
                    </td>
                    <td style={{ padding: '0.75rem', color: analysis.tradeoffs.cost_delta_usd === 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                      {formatMoney(analysis.tradeoffs.cost_delta_usd)}
                    </td>
                    <td style={{ padding: '0.75rem', color: analysis.tradeoffs.cost_delta_pct === 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                      {formatPct(analysis.tradeoffs.cost_delta_pct)}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Travel Time</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.classical?.best_time_hours || analysis.classical_summary?.best_time_hours || 0)} hrs
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.quantum_inspired?.best_time_hours || analysis.quantum_inspired_summary?.best_time_hours || 0)} hrs
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.tradeoffs.time_delta_hours)} hrs
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatPct(analysis.tradeoffs.time_delta_pct)}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Fuel Consumption</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.classical?.fuel_consumption_tonnes || analysis.classical_summary?.fuel_consumption_tonnes || 0)} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.quantum_inspired?.fuel_consumption_tonnes || analysis.quantum_inspired_summary?.fuel_consumption_tonnes || 0)} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.tradeoffs.fuel_delta_tonnes)} t
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>&mdash;</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Operational CO₂</td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.classical?.operational_co2_tonnes || analysis.classical_summary?.operational_co2_tonnes || 0)} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.quantum_inspired?.operational_co2_tonnes || analysis.quantum_inspired_summary?.operational_co2_tonnes || 0)} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.tradeoffs.co2_delta_tonnes)} t
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>&mdash;</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Lifecycle GHG</td>
                    <td style={{ padding: '0.75rem' }}>
                      {analysis.comparison?.classical_candidate ? formatNum(analysis.comparison.classical_candidate.lifecycle_GHG) : '—'} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {analysis.comparison?.quantum_inspired_candidate ? formatNum(analysis.comparison.quantum_inspired_candidate.lifecycle_GHG) : '—'} t
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {formatNum(analysis.tradeoffs.ghg_delta_tonnes)} t
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>&mdash;</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Deadline Margin</td>
                    <td style={{ padding: '0.75rem' }}>
                      {analysis.comparison?.classical_candidate ? `${formatNum(analysis.comparison.classical_candidate.deadline_margin)} hrs` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {analysis.comparison?.quantum_inspired_candidate ? `${formatNum(analysis.comparison.quantum_inspired_candidate.deadline_margin)} hrs` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {analysis.comparison ? `${formatNum(analysis.comparison.deadline_margin_difference)} hrs` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>&mdash;</td>
                  </tr>

                  <tr>
                    <td style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Solver Execution Runtime</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {formatNum(analysis.classical?.runtime_ms || analysis.classical_summary?.runtime_ms || 0)} ms
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {formatNum(analysis.quantum_inspired?.runtime_ms || analysis.quantum_inspired_summary?.runtime_ms || 0)} ms
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {analysis.comparison ? `${formatNum(analysis.comparison.runtime_difference)} ms` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>&mdash;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION C: Recommendations Grid */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Section C &bull; Priority-Driven Recommendations
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Deterministic selections across all 6 operational criteria over the feasible Pareto set.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {Object.entries(priorityLabels).map(([key, info]) => {
                const recCandidate = analysis.recommendations[key];
                const isCurrentPriority = priority === key;
                if (!recCandidate) return null;
                const c = recCandidate.candidate;

                return (
                  <div
                    key={key}
                    style={{
                      background: isCurrentPriority 
                        ? 'rgba(16, 185, 129, 0.08)' 
                        : (key === DecisionPriority.BALANCED ? 'rgba(168, 85, 247, 0.05)' : 'var(--bg-card)'),
                      border: isCurrentPriority 
                        ? '2px solid var(--accent-emerald)' 
                        : (key === DecisionPriority.BALANCED ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-subtle)'),
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: isCurrentPriority ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                          <span>{info.icon}</span>
                          <span>{`${info.label} Recommendation`}</span>
                        </span>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {key === DecisionPriority.BALANCED && (
                            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Multi-Objective Compromise</span>
                          )}
                          {isCurrentPriority && (
                            <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Active Priority</span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Vessel:</span> <strong style={{ color: 'var(--text-primary)' }}>{c.vessel_name}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Route:</span> <strong style={{ color: 'var(--text-primary)' }}>{c.route_name}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Speed:</span> <strong style={{ color: 'var(--text-primary)' }}>{c.cruising_speed_knots} kts</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Fuel:</span> <strong style={{ color: 'var(--text-primary)' }}>{c.fuel_name}</strong></div>
                      </div>

                      {/* Key Metrics */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.6rem 0.75rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.4rem',
                        fontSize: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div>Cost: <strong style={{ color: 'var(--accent-cyan)' }}>{formatMoney(c.total_voyage_cost_usd)}</strong></div>
                        <div>Time: <strong style={{ color: 'var(--text-primary)' }}>{formatNum(c.total_voyage_time_hours)} hrs</strong></div>
                        <div>Fuel: <strong style={{ color: 'var(--text-primary)' }}>{formatNum(c.fuel_consumption_tonnes)} t</strong></div>
                        <div>CO₂: <strong style={{ color: 'var(--accent-emerald)' }}>{formatNum(c.operational_co2_tonnes)} t</strong></div>
                        <div>GHG: <strong style={{ color: '#c084fc' }}>{formatNum(c.lifecycle_ghg_tonnes)} t</strong></div>
                        <div>Margin: <strong style={{ color: c.deadline_margin_hours > 0 ? 'var(--accent-emerald)' : '#ef4444' }}>{formatNum(c.deadline_margin_hours)} hrs</strong></div>
                      </div>

                      {/* Justifications */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Backend Justification:</div>
                        <ul style={{ margin: 0, paddingLeft: '1rem', lineHeight: 1.4 }}>
                          {recCandidate.reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                        {key === DecisionPriority.BALANCED && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                            * Decision-support heuristic (Euclidean distance to ideal point); not a universal optimality guarantee.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION D: Pareto Front */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Section D &bull; Non-Dominated Pareto Efficient Alternatives ({analysis.pareto_front.length} Candidates)
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No candidate in this set is strictly inferior across all 5 minimization objectives (Cost, Time, Fuel, Operational CO₂, Lifecycle GHG).
              </div>
            </div>

            {/* Scatter Plot */}
            <div style={{ marginBottom: '1.5rem' }}>
              <ParetoScatterPlot
                paretoFront={analysis.pareto_front}
                classicalOpt={classicalBestId}
                qiOpt={qiBestId}
                recommendedId={activeRec?.candidate.decision_id}
              />
            </div>

            {/* Pareto Table */}
            <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Decision ID</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vessel</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Route</th>
                    <th style={{ padding: '0.5rem' }}>Speed</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fuel</th>
                    <th style={{ padding: '0.5rem' }}>Cost</th>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                    <th style={{ padding: '0.5rem' }}>Fuel (t)</th>
                    <th style={{ padding: '0.5rem' }}>CO₂ (t)</th>
                    <th style={{ padding: '0.5rem' }}>GHG (t)</th>
                    <th style={{ padding: '0.5rem' }}>Margin</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.pareto_front.map((c) => {
                    const isRec = c.decision_id === activeRec?.candidate.decision_id;
                    const isClass = c.decision_id === classicalBestId;
                    const isQI = c.decision_id === qiBestId;

                    return (
                      <tr 
                        key={c.decision_id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isRec ? 'rgba(16, 185, 129, 0.12)' : (isClass ? 'rgba(56, 189, 248, 0.08)' : (isQI ? 'rgba(168, 85, 247, 0.08)' : 'transparent'))
                        }}
                      >
                        <td style={{ padding: '0.5rem', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {isRec && <span title="Recommended" style={{ color: '#10b981' }}>★</span>}
                            {c.decision_id}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{c.vessel_name}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{c.route_name}</td>
                        <td style={{ padding: '0.5rem' }}>{c.cruising_speed_knots} kts</td>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>{c.fuel_name}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{formatMoney(c.total_voyage_cost_usd)}</td>
                        <td style={{ padding: '0.5rem' }}>{formatNum(c.total_voyage_time_hours)} hrs</td>
                        <td style={{ padding: '0.5rem' }}>{formatNum(c.fuel_consumption_tonnes)}</td>
                        <td style={{ padding: '0.5rem' }}>{formatNum(c.operational_co2_tonnes)}</td>
                        <td style={{ padding: '0.5rem' }}>{formatNum(c.lifecycle_ghg_tonnes)}</td>
                        <td style={{ padding: '0.5rem', color: c.deadline_margin_hours > 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                          {formatNum(c.deadline_margin_hours)} hrs
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background: c.weather_risk_level === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: c.weather_risk_level === 'LOW' ? '#34d399' : '#fbbf24'
                          }}>
                            {c.weather_risk_level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION E: Tradeoff Summary (Schedule & Environment) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Schedule Reliability */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                📅 Schedule Buffer Analysis (Active Recommendation)
              </h4>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Departure (UTC):</span>
                  <span>{new Date(analysis.schedule_analysis.departure_datetime).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Arrival (UTC):</span>
                  <span>{new Date(analysis.schedule_analysis.arrival_datetime).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target Deadline (UTC):</span>
                  <span>{new Date(analysis.schedule_analysis.deadline_datetime).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Deadline Safety Margin:</span>
                  <strong style={{ color: analysis.schedule_analysis.is_safe ? 'var(--accent-emerald)' : '#ef4444' }}>
                    {formatNum(analysis.schedule_analysis.deadline_margin_hours)} hours
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Schedule Feasibility:</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: analysis.schedule_analysis.status === 'Safe' ? 'rgba(16, 185, 129, 0.2)' : (analysis.schedule_analysis.status === 'Tight' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                    color: analysis.schedule_analysis.status === 'Safe' ? '#34d399' : (analysis.schedule_analysis.status === 'Tight' ? '#fbbf24' : '#f87171')
                  }}>
                    {analysis.schedule_analysis.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Environmental Impact */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.75rem' }}>
                🌿 Environmental Impact Analysis
              </h4>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Bunker Fuel:</span>
                  <strong>{formatNum(analysis.environmental_analysis.fuel_consumption_tonnes)} metric tons</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Operational CO₂:</span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Direct tailpipe combustion emissions</div>
                  </div>
                  <strong>{formatNum(analysis.environmental_analysis.operational_co2_tonnes)} tonnes</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Lifecycle GHG (Well-to-Wake):</span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Upstream extraction + transport + combustion</div>
                  </div>
                  <strong style={{ color: '#c084fc' }}>{formatNum(analysis.environmental_analysis.lifecycle_ghg_tonnes)} t CO₂e</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION F: Assumptions & Limitations */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            fontSize: '0.8rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚠️</span>
              <span>Section F &bull; Decision-Analysis Assumptions &amp; Methodological Boundaries</span>
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {analysis.assumptions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
