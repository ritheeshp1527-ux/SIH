import React, { useState, useEffect } from 'react';
import {
  VoyageOptimizationRequest,
  QuantumInspiredOptimizationResponse,
  OptimizationComparisonResponse,
  QuantumInspiredSolution,
  SimulatedAnnealingConfig,
} from '../types';
import {
  fetchSampleOptimizationRequest,
  runQuantumInspiredOptimization,
  runOptimizationComparison,
} from '../services/api';

export const QuantumInspiredOptimizer: React.FC = () => {
  // State
  const [voyageRequest, setVoyageRequest] = useState<VoyageOptimizationRequest | null>(null);
  const [objectiveMode, setObjectiveMode] = useState<'cost' | 'time'>('cost');
  const [topK, setTopK] = useState<number>(5);
  
  // Solver Config
  const [solverConfig, setSolverConfig] = useState<SimulatedAnnealingConfig>({
    initial_temperature: 10.0,
    final_temperature: 0.001,
    cooling_rate: 0.95,
    iterations_per_temperature: 50,
    number_of_runs: 5,
    random_seed: 42,
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [qiResponse, setQiResponse] = useState<QuantumInspiredOptimizationResponse | null>(null);
  const [comparisonResponse, setComparisonResponse] = useState<OptimizationComparisonResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'top_k' | 'qubo_matrix' | 'comparison'>('top_k');
  const [selectedSolution, setSelectedSolution] = useState<QuantumInspiredSolution | null>(null);

  // Load sample request on mount
  useEffect(() => {
    fetchSampleOptimizationRequest()
      .then((data) => {
        setVoyageRequest(data);
      })
      .catch((err) => {
        setError(`Failed to load default optimization request: ${err.message}`);
      });
  }, []);

  const handleRunQuantumInspired = async () => {
    if (!voyageRequest) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await runQuantumInspiredOptimization({
        voyage_request: voyageRequest,
        objective_mode: objectiveMode,
        top_k: topK,
        solver_config: solverConfig,
      });
      setQiResponse(resp);
      if (resp.top_k_solutions.length > 0) {
        setSelectedSolution(resp.top_k_solutions[0]);
      }
      setActiveTab('top_k');
    } catch (err: any) {
      setError(err.message || 'Quantum-Inspired optimization run failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (!voyageRequest) return;
    setLoading(true);
    setError(null);
    try {
      const comp = await runOptimizationComparison({
        voyage_request: voyageRequest,
        objective_mode: objectiveMode,
        top_k: topK,
        solver_config: solverConfig,
      });
      setComparisonResponse(comp);
      setQiResponse(comp.quantum_inspired_full_response);
      if (comp.quantum_inspired_full_response.top_k_solutions.length > 0) {
        setSelectedSolution(comp.quantum_inspired_full_response.top_k_solutions[0]);
      }
      setActiveTab('comparison');
    } catch (err: any) {
      setError(err.message || 'Optimization comparison run failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(168, 85, 247, 0.15), transparent 70%), var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            Phase 5: Quantum-Inspired Optimization
          </span>
          <span className="badge badge-cyan">QUBO Formulation</span>
          <span className="badge badge-emerald">Classical Simulated Annealing</span>
          <span className="badge badge-amber">No Hardware Claims</span>
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem', color: '#f8fafc' }}>
          Quantum-Inspired Voyage Optimization &amp; QUBO Formulation
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '900px', lineHeight: 1.6 }}>
          Transforms the exact discrete maritime candidate decision space (<em>Vessel &times; Route &times; Speed &times; Fuel</em>) into an
          inspectable Quadratic Unconstrained Binary Optimization (QUBO) Hamiltonian. Solved using classical Simulated Annealing with
          strict random seed reproducibility, one-hot selection penalty guarantees, and revalidated against maritime hydrodynamic constraints.
        </p>

        {/* QUBO Formulation Level Notice */}
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(168, 85, 247, 0.08)',
          borderLeft: '4px solid #c084fc',
          borderTop: '1px solid rgba(168, 85, 247, 0.2)',
          borderRight: '1px solid rgba(168, 85, 247, 0.2)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.85rem',
          color: '#e2e8f0',
          lineHeight: 1.5,
        }}>
          The current prototype uses a feasible-decision selection QUBO. Each binary variable represents one complete feasible Vessel &times; Route &times; Speed &times; Fuel combination generated by the classical maritime evaluation layer. This demonstrates QUBO formulation and quantum-inspired optimization methodology, but does not claim quantum computational advantage.
        </div>
      </div>

      {/* QUBO Workflow Pipeline Visualization */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔄</span> End-to-End Quantum-Inspired Optimization Architecture
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          alignItems: 'stretch',
        }}>
          {[
            { step: '1. Candidate Space', icon: '🚢', desc: 'Vessel × Route × Speed × Fuel tuples' },
            { step: '2. Binary Encoding', icon: '0️⃣1️⃣', desc: 'x_i ∈ {0, 1} per feasible candidate' },
            { step: '3. QUBO Formulation', icon: '🧮', desc: 'P(Σ x_i - 1)² + min-max normalized obj' },
            { step: '4. Simulated Annealing', icon: '🌡️', desc: 'Multi-seed classical cooling schedule' },
            { step: '5. Binary Decoding', icon: '🔍', desc: 'Extract selected one-hot variable index' },
            { step: '6. Maritime Revalidation', icon: '🛡️', desc: 'Confirm weather, draft & deadline safety' },
            { step: '7. Top-K Ranked Plans', icon: '🏆', desc: 'Unique feasible solutions with energy' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.step}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Controls & Parameter Configuration */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Problem Definition Panel */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
            📦 Maritime Shipment Parameters (Phase 4 Input)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Origin Port:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>PORT-SG (Singapore)</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Destination Port:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>PORT-RTM (Rotterdam)</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Cargo Payload:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{voyageRequest?.cargo_weight_tonnes?.toLocaleString() || '60,000'} MT</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Delivery Deadline:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>+28 Days from Dep</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Speed Resolution:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{voyageRequest?.speed_grid_step_knots || 0.5} knots</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Candidate Space:</span>
              <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Exact Phase 4 Shared</div>
            </div>
          </div>
        </div>

        {/* QUBO & Solver Configuration Panel */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#c084fc' }}>
            ⚙️ QUBO &amp; Annealing Solver Configuration
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Objective Mode</label>
              <select
                value={objectiveMode}
                onChange={(e) => setObjectiveMode(e.target.value as 'cost' | 'time')}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="cost">Cost (Min USD)</option>
                <option value="time">Time (Min Hours)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Random Seed</label>
              <input
                type="number"
                value={solverConfig.random_seed}
                onChange={(e) => setSolverConfig({ ...solverConfig, random_seed: parseInt(e.target.value) || 42 })}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Seeded Runs</label>
              <input
                type="number"
                min={1}
                max={20}
                value={solverConfig.number_of_runs}
                onChange={(e) => setSolverConfig({ ...solverConfig, number_of_runs: parseInt(e.target.value) || 5 })}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Steps / Temp</label>
              <input
                type="number"
                min={10}
                max={200}
                value={solverConfig.iterations_per_temperature}
                onChange={(e) => setSolverConfig({ ...solverConfig, iterations_per_temperature: parseInt(e.target.value) || 50 })}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Cooling Rate (α)</label>
              <input
                type="number"
                step={0.01}
                min={0.8}
                max={0.99}
                value={solverConfig.cooling_rate}
                onChange={(e) => setSolverConfig({ ...solverConfig, cooling_rate: parseFloat(e.target.value) || 0.95 })}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Top K Plans</label>
              <select
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleRunQuantumInspired}
          disabled={loading || !voyageRequest}
          style={{
            padding: '0.75rem 1.75rem',
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
            opacity: loading ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{loading ? '⏳ Optimizing...' : '⚡ Solve via Simulated Annealing (QUBO)'}</span>
        </button>

        <button
          onClick={handleRunComparison}
          disabled={loading || !voyageRequest}
          style={{
            padding: '0.75rem 1.75rem',
            background: 'linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)',
            color: '#080d1a',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)',
            opacity: loading ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚖️ Compare Classical Exact vs Quantum-Inspired</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* QUBO Model Diagnostics Banner (When response exists) */}
      {qiResponse && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              📊 Inspectable QUBO Model &amp; Solver Diagnostics
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-purple">Variables: {qiResponse.qubo_summary.num_variables}</span>
              <span className="badge badge-cyan">Non-Zero Terms: {qiResponse.qubo_summary.num_nonzero_coefficients}</span>
              <span className="badge badge-amber">Penalty P: {qiResponse.qubo_summary.penalty_magnitude.toFixed(2)}</span>
              {comparisonResponse && (
                <span className={`badge ${comparisonResponse.classical_optimum_found ? 'badge-emerald' : 'badge-amber'}`}>
                  Optimum Found: {comparisonResponse.successful_runs_ratio}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Raw Combinations:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{qiResponse.raw_decision_space_size} evaluated</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Encoded QUBO Variables:</span>
              <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{qiResponse.feasible_candidate_space_size} binary bits</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Objective Span (Δ):</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                {objectiveMode === 'cost' ? `$${qiResponse.qubo_summary.normalization_scale.scale_delta.toLocaleString()}` : `${qiResponse.qubo_summary.normalization_scale.scale_delta.toFixed(1)} hrs`}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Solver Annealing Time:</span>
              <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{qiResponse.solver_runtime_ms} ms ({qiResponse.number_of_runs_executed} runs)</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Total Pipeline Time:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{qiResponse.total_runtime_ms} ms</div>
            </div>
          </div>

          {/* Granular Timing Breakdown */}
          {qiResponse.timing_breakdown && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.78rem',
            }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                ⏱️ Latency Decomposition Breakdown:
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)' }}>
                <span>Phase 4 Evaluation: <strong style={{ color: 'var(--text-primary)' }}>{qiResponse.timing_breakdown.candidate_evaluation_runtime_ms} ms</strong></span>
                <span>&bull;</span>
                <span>QUBO Compilation: <strong style={{ color: 'var(--text-primary)' }}>{qiResponse.timing_breakdown.qubo_construction_runtime_ms} ms</strong></span>
                <span>&bull;</span>
                <span>Simulated Annealing: <strong style={{ color: 'var(--accent-emerald)' }}>{qiResponse.timing_breakdown.solver_runtime_ms} ms</strong></span>
                <span>&bull;</span>
                <span>Decoding &amp; Revalidation: <strong style={{ color: 'var(--text-primary)' }}>{qiResponse.timing_breakdown.decoding_validation_runtime_ms} ms</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      {qiResponse && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('top_k')}
              style={{
                padding: '0.65rem 1.25rem',
                background: activeTab === 'top_k' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: activeTab === 'top_k' ? '#c084fc' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: activeTab === 'top_k' ? '2px solid #a855f7' : '2px solid transparent',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Top-{topK} Quantum-Inspired Plans
            </button>

            {comparisonResponse && (
              <button
                onClick={() => setActiveTab('comparison')}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: activeTab === 'comparison' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                  color: activeTab === 'comparison' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeTab === 'comparison' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ⚖️ Classical vs Quantum-Inspired Comparison
              </button>
            )}

            <button
              onClick={() => setActiveTab('qubo_matrix')}
              style={{
                padding: '0.65rem 1.25rem',
                background: activeTab === 'qubo_matrix' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                color: activeTab === 'qubo_matrix' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: activeTab === 'qubo_matrix' ? '2px solid var(--accent-amber)' : '2px solid transparent',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              🧮 QUBO Matrix &amp; Variables Inspector
            </button>
          </div>

          {/* TAB 1: Top-K Ranked Plans */}
          {activeTab === 'top_k' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {qiResponse.top_k_solutions.map((sol) => {
                  const isSelected = selectedSolution?.decision_id === sol.decision_id;
                  return (
                    <div
                      key={sol.decision_id}
                      onClick={() => setSelectedSolution(sol)}
                      style={{
                        background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-card)',
                        border: isSelected ? '2px solid #a855f7' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span
                          style={{
                            background: sol.rank === 1 ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          RANK #{sol.rank}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Energy: {sol.qubo_energy.toFixed(4)}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                        {sol.vessel_name} ({sol.vessel_id})
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {sol.route_name} &bull; {sol.speed_knots} kts &bull; {sol.fuel_name}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Total Cost:</span>
                          <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>${sol.total_cost_usd.toLocaleString()}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Transit Hours:</span>
                          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{sol.total_duration_hours.toFixed(1)} hrs</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Fuel Consumed:</span>
                          <div style={{ fontWeight: 600 }}>{sol.fuel_consumption_tonnes.toFixed(1)} MT</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Deadline Margin:</span>
                          <div style={{ fontWeight: 600, color: sol.deadline_margin_hours >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                            +{sol.deadline_margin_hours.toFixed(1)} hrs
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Solution Detail View */}
              {selectedSolution && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>
                      📋 Selected Plan Specification (Rank #{selectedSolution.rank})
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="badge badge-emerald">Feasibility: PASS</span>
                      <span className="badge badge-cyan">One-Hot State: VALID</span>
                      <span className="badge badge-purple">Seed: {selectedSolution.solver_seed}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Decision Key:</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#f8fafc', wordBreak: 'break-all' }}>
                        {selectedSolution.decision_id}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Vessel &amp; Route:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {selectedSolution.vessel_name} via {selectedSolution.route_name}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Speed Over Ground (SOG):</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {selectedSolution.candidate.effective_speed_knots.toFixed(2)} kts (STW: {selectedSolution.speed_knots} kts)
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Operational CO2:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {selectedSolution.operational_co2_tonnes.toFixed(1)} MT CO2
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Lifecycle GHG (Well-to-Wake):</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {selectedSolution.lifecycle_ghg_tonnes.toFixed(1)} MT CO2e
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Canal Tolls &amp; Port Dues:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        ${selectedSolution.candidate.route_cost_usd.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Classical vs Quantum-Inspired Comparison */}
          {activeTab === 'comparison' && comparisonResponse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Scientific Discipline Alert */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderLeft: '4px solid var(--accent-cyan)',
                  padding: '1.25rem',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                  🛡️ Scientific Fairness &amp; Neutral Terminology
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {comparisonResponse.scientific_summary}
                </p>
              </div>

              {/* Stochastic Runs & Success Rate Card */}
              {comparisonResponse.stochastic_run_stats && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c084fc', margin: 0 }}>
                      🎲 Multi-Run Stochastic Convergence &amp; Recovery Statistics
                    </h4>
                    <span className={`badge ${comparisonResponse.stochastic_run_stats.classical_optimum_found ? 'badge-emerald' : 'badge-amber'}`}>
                      {comparisonResponse.successful_runs_ratio}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Optimum Found:</span>
                      <div style={{ fontWeight: 700, color: comparisonResponse.stochastic_run_stats.classical_optimum_found ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {comparisonResponse.stochastic_run_stats.classical_optimum_found ? 'YES (Global Match)' : 'NO (Near-Optimum Found)'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Best Run Gap:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {comparisonResponse.stochastic_run_stats.best_objective_gap_pct !== null && comparisonResponse.stochastic_run_stats.best_objective_gap_pct !== undefined ? `${comparisonResponse.stochastic_run_stats.best_objective_gap_pct >= 0 ? '+' : ''}${comparisonResponse.stochastic_run_stats.best_objective_gap_pct.toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Median Run Gap:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {comparisonResponse.stochastic_run_stats.median_objective_gap_pct !== null && comparisonResponse.stochastic_run_stats.median_objective_gap_pct !== undefined ? `${comparisonResponse.stochastic_run_stats.median_objective_gap_pct >= 0 ? '+' : ''}${comparisonResponse.stochastic_run_stats.median_objective_gap_pct.toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Worst Run Gap:</span>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {comparisonResponse.stochastic_run_stats.worst_objective_gap_pct !== null && comparisonResponse.stochastic_run_stats.worst_objective_gap_pct !== undefined ? `${comparisonResponse.stochastic_run_stats.worst_objective_gap_pct >= 0 ? '+' : ''}${comparisonResponse.stochastic_run_stats.worst_objective_gap_pct.toFixed(2)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Metrics Table */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>Metric</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--accent-cyan)' }}>Classical Exact Baseline</th>
                      <th style={{ padding: '0.85rem 1rem', color: '#c084fc' }}>Quantum-Inspired Annealing</th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>Relative Objective Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Best Total Cost (USD)</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        ${comparisonResponse.classical.best_cost_usd?.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        ${comparisonResponse.quantum_inspired.best_cost_usd?.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${comparisonResponse.cost_gap_percent === 0 ? 'badge-emerald' : 'badge-amber'}`}>
                          {comparisonResponse.cost_gap_percent !== null ? `${comparisonResponse.cost_gap_percent >= 0 ? '+' : ''}${comparisonResponse.cost_gap_percent.toFixed(2)}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Best Voyage Duration (Hours)</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.classical.best_time_hours?.toFixed(1)} hrs
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.quantum_inspired.best_time_hours?.toFixed(1)} hrs
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${comparisonResponse.time_gap_percent === 0 ? 'badge-emerald' : 'badge-amber'}`}>
                          {comparisonResponse.time_gap_percent !== null ? `${comparisonResponse.time_gap_percent >= 0 ? '+' : ''}${comparisonResponse.time_gap_percent.toFixed(2)}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Fuel Consumed (MT)</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.classical.fuel_consumption_tonnes?.toFixed(1)} MT
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.quantum_inspired.fuel_consumption_tonnes?.toFixed(1)} MT
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-cyan">
                          {comparisonResponse.fuel_gap_percent !== null ? `${comparisonResponse.fuel_gap_percent >= 0 ? '+' : ''}${comparisonResponse.fuel_gap_percent.toFixed(2)}%` : '0.00%'}
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Operational CO2 (MT)</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.classical.operational_co2_tonnes?.toFixed(1)} MT
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.quantum_inspired.operational_co2_tonnes?.toFixed(1)} MT
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-cyan">
                          {comparisonResponse.co2_gap_percent !== null ? `${comparisonResponse.co2_gap_percent >= 0 ? '+' : ''}${comparisonResponse.co2_gap_percent.toFixed(2)}%` : '0.00%'}
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Runtime (ms)</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.classical.runtime_ms} ms (Exact Enumeration)
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {comparisonResponse.quantum_inspired.runtime_ms} ms (Total Pipeline)
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        Solver: {comparisonResponse.quantum_inspired.details.solver_runtime_ms} ms
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Optimal Decision Key</td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {comparisonResponse.classical.best_decision_id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {comparisonResponse.quantum_inspired.best_decision_id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {comparisonResponse.classical.best_decision_id === comparisonResponse.quantum_inspired.best_decision_id ? (
                          <span className="badge badge-emerald">EXACT MATCH</span>
                        ) : (
                          <span className="badge badge-amber">DIFFERENT CANDIDATE</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: QUBO Matrix Inspector */}
          {activeTab === 'qubo_matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.75rem' }}>
                  Mathematical Formulation Details
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', lineHeight: 1.6 }}>
                  <div>Objective: minimize  H(x) = xᵀ Q x + P</div>
                  <div>Where:</div>
                  <div>  &bull; x_i ∈ {'{0, 1}'} for candidate i ∈ [0, {qiResponse.qubo_summary.num_variables - 1}]</div>
                  <div>  &bull; Diagonal Terms (Q_ii): w_i - P  (w_i = normalized objective in [0, 1])</div>
                  <div>  &bull; Off-Diagonal Terms (Q_ij, i &lt; j): 2P = {(2 * qiResponse.qubo_summary.penalty_magnitude).toFixed(2)}</div>
                  <div>  &bull; Constant Offset: P = {qiResponse.qubo_summary.penalty_magnitude.toFixed(2)}</div>
                  <div>  &bull; Selection Penalty: P(Σ x_i - 1)² = P[-Σ x_i + 2 Σ_{'{i<j}'} x_i x_j + 1]</div>
                </div>
              </div>

              {/* Sample Variable Mapping Preview */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  overflowX: 'auto',
                }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                  Sample Binary Variable Mappings (First {qiResponse.qubo_summary.variable_mappings_preview.length} of {qiResponse.qubo_summary.num_variables})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Bit</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Decision ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Vessel</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Route</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Speed</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Fuel</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Raw Value</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Normalized (w_i)</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Q_ii (w_i - P)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qiResponse.qubo_summary.variable_mappings_preview.map((m) => {
                      const q_ii = m.normalized_objective_value - qiResponse.qubo_summary.penalty_magnitude;
                      return (
                        <tr key={m.variable_index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                            {m.variable_id}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {m.decision_id}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>{m.vessel_id}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{m.route_id}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{m.speed_knots} kts</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{m.fuel_id}</td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)' }}>
                            {objectiveMode === 'cost' ? `$${m.raw_objective_value.toLocaleString()}` : `${m.raw_objective_value.toFixed(1)} hrs`}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                            {m.normalized_objective_value.toFixed(4)}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                            {q_ii.toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
