import React, { useState } from 'react';
import {
  WorkflowOptimizationRequest,
  WorkflowOptimizationResponse,
  DecisionPriority,
  VoyageOptimizationRequest,
} from '../types';
import { runEndToEndWorkflow, fetchSampleWorkflowRequest } from '../services/api';
import { ComparativeDecisionAnalysis } from './ComparativeDecisionAnalysis';
import { SihDecisionStory } from './SihDecisionStory';

const formatNum = (num: number, decimals = 1) =>
  num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatMoney = (num: number) =>
  '$' + Math.round(num).toLocaleString();

const STAGES = [
  { key: 'fuel_intelligence', label: 'Ship & Fuel Intelligence', phase: 'Phase 1' },
  { key: 'maritime_network', label: 'Maritime Network', phase: 'Phase 2' },
  { key: 'weather_ocean', label: 'Weather & Ocean', phase: 'Phase 3' },
  { key: 'classical_optimization', label: 'Classical Optimization', phase: 'Phase 4' },
  { key: 'quantum_inspired', label: 'Quantum-Inspired Optimization', phase: 'Phase 5' },
  { key: 'comparative_analysis', label: 'Comparative Decision Analysis', phase: 'Phase 6' },
] as const;

export const EndToEndWorkflowOptimizer: React.FC = () => {
  // Form State
  const [sourcePort, setSourcePort] = useState('PORT-SG');
  const [destPort, setDestPort] = useState('PORT-RTM');
  const [cargoWeight, setCargoWeight] = useState(60000);
  const [departureDate, setDepartureDate] = useState('2026-10-01T12:00');
  const [deadlineDate, setDeadlineDate] = useState('2026-10-29T12:00');
  const [speedGridStep, setSpeedGridStep] = useState(0.5);
  const [priority, setPriority] = useState<DecisionPriority>(DecisionPriority.BALANCED);
  const [topK, setTopK] = useState(5);
  const [randomSeed, setRandomSeed] = useState(42);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Execution State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ stage?: string; message: string } | null>(null);
  const [workflowResult, setWorkflowResult] = useState<WorkflowOptimizationResponse | null>(null);

  // Transit window calculation in days
  const departureTime = new Date(departureDate).getTime();
  const deadlineTime = new Date(deadlineDate).getTime();
  const transitDays = !isNaN(departureTime) && !isNaN(deadlineTime) && deadlineTime > departureTime
    ? ((deadlineTime - departureTime) / (1000 * 60 * 60 * 24)).toFixed(1)
    : null;

  const handleRunWorkflow = async () => {
    setLoading(true);
    setError(null);
    setWorkflowResult(null);

    try {
      const departure = new Date(departureDate).toISOString();
      const deadline = new Date(deadlineDate).toISOString();

      const voyageReq: VoyageOptimizationRequest = {
        source_port_id: sourcePort,
        destination_port_id: destPort,
        cargo_weight_tonnes: cargoWeight,
        departure_datetime: departure,
        deadline_datetime: deadline,
        vessel_ids: null,
        route_ids: null,
        speed_grid_step_knots: speedGridStep,
        currency: 'USD',
      };

      const workflowReq: WorkflowOptimizationRequest = {
        voyage_request: voyageReq,
        priority: priority,
        top_k: topK,
        solver_config: {
          initial_temperature: 10.0,
          final_temperature: 0.001,
          cooling_rate: 0.95,
          iterations_per_temperature: 50,
          number_of_runs: 5,
          random_seed: randomSeed,
        },
      };

      const response = await runEndToEndWorkflow(workflowReq);
      setWorkflowResult(response);
    } catch (err: any) {
      const msg = err.message || 'Workflow execution failed.';
      let failedStage = 'Pipeline Execution';
      if (msg.includes('port') || msg.includes('route')) failedStage = 'Phase 2: Maritime Network';
      else if (msg.includes('vessel') || msg.includes('fuel')) failedStage = 'Phase 1: Ship & Fuel Intelligence';
      else if (msg.includes('No feasible candidates')) failedStage = 'Phase 4: Classical Optimization';

      setError({
        stage: failedStage,
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWorkflowResult(null);
    setError(null);
    setLoading(false);
  };

  const handleLoadSample = async () => {
    try {
      const sample = await fetchSampleWorkflowRequest();
      if (sample?.voyage_request) {
        setSourcePort(sample.voyage_request.source_port_id);
        setDestPort(sample.voyage_request.destination_port_id);
        setCargoWeight(sample.voyage_request.cargo_weight_tonnes);
        if (sample.voyage_request.departure_datetime) {
          setDepartureDate(sample.voyage_request.departure_datetime.slice(0, 16));
        }
        if (sample.voyage_request.deadline_datetime) {
          setDeadlineDate(sample.voyage_request.deadline_datetime.slice(0, 16));
        }
        setSpeedGridStep(sample.voyage_request.speed_grid_step_knots || 0.5);
      }
    } catch {
      setSourcePort('PORT-SG');
      setDestPort('PORT-RTM');
      setCargoWeight(60000);
      setDepartureDate('2026-10-01T12:00');
      setDeadlineDate('2026-10-29T12:00');
      setSpeedGridStep(0.5);
    }
    setPriority(DecisionPriority.BALANCED);
    setTopK(5);
    setRandomSeed(42);
    setError(null);
  };

  return (
    <div
      id="end-to-end-workflow-section"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.25rem',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '3rem',
      }}
    >
      {/* Visual Conceptual Flow Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0.85rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: 'var(--radius-full)',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📋</span>
          <span>1. Voyage Request</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>➔</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>⚙️</span>
          <span>2. Six Optimization Stages</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>➔</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📊</span>
          <span>3. Comparative Decision Analysis</span>
        </span>
      </div>

      {/* Header & Identity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
              Phase 7 &bull; Unified Pipeline
            </span>
            <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.75rem' }}>
              POST /api/v1/workflow/optimize
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
              Deterministic Execution Mode
            </span>
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            End-to-End Voyage Optimization Workflow
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem', maxWidth: '850px', lineHeight: 1.5 }}>
            Automate the entire computational sequence with a single command. The pipeline verifies fleet fuel compatibility,
            discovers navigational corridors, applies hydrodynamic weather resistance, establishes the exact classical baseline,
            executes quantum-inspired QUBO annealing, and formulates defensible multi-objective trade-offs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleLoadSample}
            type="button"
            id="load-sih-demo-btn"
            style={{
              padding: '0.6rem 1.15rem',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 180, 216, 0.25) 100%)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
            title="Populate verified Singapore to Rotterdam 60,000 MT voyage scenario"
          >
            <span>🎯</span>
            <span>Load SIH Demo Scenario</span>
          </button>
          {workflowResult && (
            <button
              onClick={handleReset}
              type="button"
              id="reset-workflow-btn"
              style={{
                padding: '0.6rem 1.1rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Reset / Run Again
            </button>
          )}
        </div>
      </div>

      {/* Voyage Request Form - Grouped by Operational Logic */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>1.</span>
          <span>Voyage Parameters &amp; Operational Constraints</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Card Group 1: Corridor & Cargo Payload */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Corridor &amp; Cargo
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Origin Port
                </label>
                <select
                  value={sourcePort}
                  onChange={(e) => setSourcePort(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="PORT-SG">Port of Singapore (PORT-SG)</option>
                  <option value="PORT-RTM">Port of Rotterdam (PORT-RTM)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Destination Port
                </label>
                <select
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value="PORT-RTM">Port of Rotterdam (PORT-RTM)</option>
                  <option value="PORT-SG">Port of Singapore (PORT-SG)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Cargo Payload
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Metric Tonnes
                  </span>
                </div>
                <input
                  type="number"
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(Number(e.target.value))}
                  disabled={loading}
                  min={1000}
                  max={150000}
                  step={1000}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Card Group 2: Schedule & Speed Envelope */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Schedule &amp; Transit Envelope
              </span>
              {transitDays && (
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                  Window: {transitDays} days
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Departure Datetime (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Arrival Deadline (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Speed Grid Resolution
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Knots Grid Step
                  </span>
                </div>
                <select
                  value={speedGridStep}
                  onChange={(e) => setSpeedGridStep(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value={0.5}>0.5 knots (High resolution &bull; Exhaustive search)</option>
                  <option value={1.0}>1.0 knot (Standard demonstration resolution)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card Group 3: Operational Priority & Top-K */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '1.1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
              Decision Priority &amp; Top-K
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Decision Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as DecisionPriority)}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}
                >
                  <option value={DecisionPriority.BALANCED}>🎯 Balanced (Multi-Objective Ideal Compromise)</option>
                  <option value={DecisionPriority.COST}>💰 Minimum Cost (USD)</option>
                  <option value={DecisionPriority.TIME}>⏱️ Minimum Transit Time (Hours)</option>
                  <option value={DecisionPriority.FUEL}>⛽ Minimum Bunker Fuel (Tonnes)</option>
                  <option value={DecisionPriority.CO2}>🌿 Minimum Operational CO₂ (Tonnes)</option>
                  <option value={DecisionPriority.GHG}>🌍 Minimum Lifecycle GHG (Tonnes CO₂e)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Top-K Solutions to Retain
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600 }}>
                    {topK} Alternatives
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  disabled={loading}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
              </div>

              {/* Advanced toggle */}
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{showAdvanced ? '▾' : '▸'}</span>
                  <span>{showAdvanced ? 'Hide Annealing Seed Settings' : 'Configure Simulated Annealing Seed'}</span>
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: '0.65rem', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Random Seed (Reproducibility)
                    </label>
                    <input
                      type="number"
                      value={randomSeed}
                      onChange={(e) => setRandomSeed(Number(e.target.value))}
                      disabled={loading}
                      style={{ width: '100%', padding: '0.35rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA Area */}
        <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunWorkflow}
            disabled={loading}
            type="button"
            style={{
              padding: '0.85rem 2.25rem',
              background: loading ? 'rgba(0, 229, 255, 0.2)' : 'linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)',
              color: '#080d1a',
              fontWeight: 800,
              fontSize: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(0, 229, 255, 0.35)',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(8, 13, 26, 0.3)', borderTopColor: '#080d1a', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span>Executing Complete 6-Stage Pipeline...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>Run End-to-End Optimization</span>
              </>
            )}
          </button>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Single unified API execution &bull; <code>POST /api/v1/workflow/optimize</code>
          </span>
        </div>
      </div>

      {/* Six-Stage Progression Tracker (Strictly Honest - No Fake Timer) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.35rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            2. Six-Stage Pipeline Verification Status:
          </span>
          {workflowResult && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
              ✓ All 6 Stages Completed in {formatNum(workflowResult.workflow_metadata.total_runtime_ms, 0)} ms
            </span>
          )}
          {loading && (
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              ⚡ Backend Processing in Progress...
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
          {STAGES.map((stg) => {
            const isCompleted = workflowResult
              ? workflowResult.workflow_metadata.stage_completion_status[stg.key] === 'completed'
              : false;
            const isFailed = error && error.stage?.toLowerCase().includes(stg.phase.toLowerCase());
            const isRunning = loading;

            let statusLabel = 'Pending';
            let badgeBg = 'rgba(255, 255, 255, 0.02)';
            let borderColor = 'rgba(255, 255, 255, 0.05)';
            let icon = '○';
            let textColor = 'var(--text-muted)';

            if (isCompleted) {
              statusLabel = 'Completed';
              badgeBg = 'rgba(16, 185, 129, 0.12)';
              borderColor = 'rgba(16, 185, 129, 0.4)';
              icon = '✓';
              textColor = '#34d399';
            } else if (isFailed) {
              statusLabel = 'Failed';
              badgeBg = 'rgba(239, 68, 68, 0.15)';
              borderColor = '#ef4444';
              icon = '✖';
              textColor = '#ef4444';
            } else if (isRunning) {
              statusLabel = 'Evaluating...';
              badgeBg = 'rgba(0, 229, 255, 0.12)';
              borderColor = 'var(--accent-cyan)';
              icon = '⚡';
              textColor = 'var(--accent-cyan)';
            }

            return (
              <div
                key={stg.key}
                style={{
                  padding: '0.9rem',
                  background: badgeBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: textColor }}>
                    {stg.phase}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: textColor }}>
                    {icon}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isCompleted || isRunning ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.3 }}>
                  {stg.label}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '0.35rem', color: textColor }}>
                  {statusLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error State Banner with Anti-Fabrication Safeguard */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderLeft: '4px solid #ef4444',
            borderTop: '1px solid rgba(239, 68, 68, 0.3)',
            borderRight: '1px solid rgba(239, 68, 68, 0.3)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            padding: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#ef4444', fontWeight: 800 }}>✖ Workflow Halted:</span>
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>{error.stage || 'Pipeline Failure'}</span>
          </div>
          <div style={{ color: '#fecaca', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {error.message}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong>Safety Protocol:</strong> Optimization pipeline halted immediately upon constraint or parameter violation. Downstream stages were not executed, and zero synthetic results were fabricated.
          </div>
          <button
            onClick={handleRunWorkflow}
            type="button"
            style={{
              marginTop: '0.75rem',
              padding: '0.45rem 0.95rem',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Retry Execution
          </button>
        </div>
      )}

      {/* Execution Results */}
      {workflowResult && (
        <div>
          {/* SIH DEMONSTRATION SCENARIO & DECISION STORY (Dominant Executive View) */}
          <div id="sih-decision-story-container" style={{ marginBottom: '2.5rem' }}>
            <SihDecisionStory workflowResult={workflowResult} priority={priority} />
          </div>

          {/* Executive Telemetry KPI Strip */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.35rem 1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>
              Execution Telemetry &amp; Provenance
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workflow Identifier</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                  {workflowResult.workflow_metadata.workflow_id}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Execution Verdict</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                  {workflowResult.workflow_metadata.execution_status.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Wall-Clock Latency</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {formatNum(workflowResult.workflow_metadata.total_runtime_ms, 1)} ms
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reproducibility Seed</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c084fc', marginTop: '0.2rem' }}>
                  Deterministic (Seed: {randomSeed})
                </div>
              </div>
            </div>
          </div>

          {/* Compact Stage Telemetry KPI Cards */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>
              Intermediate Stage Telemetry &amp; Analytical Artifacts (Phases 1–5)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem' }}>
              {/* Phase 1 KPI Card */}
              {workflowResult.stages.fuel_intelligence && (
                <div className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Phase 1 &bull; Ship &amp; Fuel</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Verified</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Fleet: <strong>{workflowResult.stages.fuel_intelligence.available_vessels_count} Vessels</strong> &bull; Fuels: <strong>{workflowResult.stages.fuel_intelligence.available_fuels_count} Types</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Selected Context: <strong>{workflowResult.stages.fuel_intelligence.selected_vessel_context?.name}</strong> ({workflowResult.stages.fuel_intelligence.selected_fuel_context?.id})
                  </div>

                  {/* MANDATORY WARNING: Phase 1 Representative Fuel Estimate vs Final Optimized */}
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      <span>⚠️</span>
                      <span>Phase 1 Representative Fuel Estimate</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      <strong style={{ color: '#fcd34d' }}>Note: This is NOT the optimized voyage fuel consumption.</strong>
                      <br />
                      Calculated for representative vessel at nominal speed over 1,000 NM calm water before optimization.
                    </div>
                    {workflowResult.stages.fuel_intelligence.representative_fuel_estimate && (
                      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Est. Fuel: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatNum(workflowResult.stages.fuel_intelligence.representative_fuel_estimate.fuel_consumption_tonnes, 1)}t</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Est. Cost: </span>
                          <strong style={{ color: 'var(--accent-cyan)' }}>{formatMoney(workflowResult.stages.fuel_intelligence.representative_fuel_estimate.fuel_cost)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 2 KPI Card */}
              {workflowResult.stages.maritime_network && (
                <div className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Phase 2 &bull; Maritime Network</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Verified</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Origin: <strong>{workflowResult.stages.maritime_network.origin_port_id}</strong> &rarr; Destination: <strong>{workflowResult.stages.maritime_network.destination_port_id}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Feasible Corridors: <strong style={{ color: '#34d399' }}>{workflowResult.stages.maritime_network.feasible_routes_count} / {workflowResult.stages.maritime_network.candidate_routes_count}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Physical draft and canal transit restrictions verified across Suez and Cape corridors.
                  </div>
                </div>
              )}

              {/* Phase 3 KPI Card */}
              {workflowResult.stages.weather_ocean && (
                <div className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Phase 3 &bull; Weather &amp; Ocean</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Assessed</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Safe Corridors: <strong style={{ color: '#34d399' }}>{workflowResult.stages.weather_ocean.safe_routes_count}</strong> &bull; Unsafe: <strong>{workflowResult.stages.weather_ocean.unsafe_routes_count}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Dynamic along-track current offsets evaluated for Speed Over Ground (SOG).
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Scenario: {workflowResult.stages.weather_ocean.scenario_id}
                  </div>
                </div>
              )}

              {/* Phase 4 KPI Card */}
              {workflowResult.stages.classical_optimization && (
                <div className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Phase 4 &bull; Classical Baseline</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Exact Optimum</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Combinations Evaluated: <strong>{workflowResult.stages.classical_optimization.total_evaluated_combinations}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Feasible Candidates: <strong style={{ color: '#38bdf8' }}>{workflowResult.stages.classical_optimization.feasible_solutions_count}</strong> (Latency: {formatNum(workflowResult.stages.classical_optimization.runtime_ms, 1)} ms)
                  </div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Best Cost: {workflowResult.stages.classical_optimization.best_cost_candidate_id}
                  </div>
                </div>
              )}

              {/* Phase 5 KPI Card */}
              {workflowResult.stages.quantum_inspired && (
                <div className="kpi-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>Phase 5 &bull; Quantum-Inspired QUBO</span>
                    <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.65rem' }}>Annealed</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    QUBO Binary Variables: <strong>{workflowResult.stages.quantum_inspired.qubo_variable_count}</strong> (One-Hot Selection)
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Simulated Annealing Latency: <strong style={{ color: '#c084fc' }}>{formatNum(workflowResult.stages.quantum_inspired.solver_runtime_ms, 1)} ms</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#c084fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Top-K Solutions: {workflowResult.stages.quantum_inspired.top_k_solutions_count} discovered
                  </div>
                </div>
              )}
            </div>

            {/* Benchmark Evidence Section */}
            {workflowResult.stages.comparative_analysis && workflowResult.stages.classical_optimization && workflowResult.stages.quantum_inspired && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Benchmark Evidence
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="kpi-card" style={{ padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classical Baseline — Runtime</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>{formatNum(workflowResult.stages.classical_optimization.runtime_ms, 1)} ms</div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantum-Inspired (Simulated Annealing) — Runtime</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc', marginTop: '0.3rem' }}>{formatNum(workflowResult.stages.quantum_inspired.solver_runtime_ms, 1)} ms</div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classical Baseline — Objective</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.3rem' }}>{formatMoney(workflowResult.stages.comparative_analysis.full_response.classical?.best_cost_usd || workflowResult.stages.comparative_analysis.full_response.classical_summary?.best_cost_usd || 0)}</div>
                  </div>
                  <div className="kpi-card" style={{ padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantum-Inspired (Simulated Annealing) — Objective</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc', marginTop: '0.3rem' }}>{formatMoney(workflowResult.stages.comparative_analysis.full_response.quantum_inspired?.best_cost_usd || workflowResult.stages.comparative_analysis.full_response.quantum_inspired_summary?.best_cost_usd || 0)}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: '0 0 0.25rem 0' }}>Both methods use the same feasible decision space.</p>
                  <p style={{ margin: 0 }}>Quantum-inspired optimization is simulated on a classical CPU; this prototype does not claim quantum hardware advantage.</p>
                </div>
              </div>
            )}
          </div>

          {/* Phase 6 Final Decision Analysis Dashboard (Dominant Section) */}
          {workflowResult.stages.comparative_analysis && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>3.</span>
                <span>Final Comparative Decision Support &amp; Pareto Analysis Dashboard</span>
              </div>
              <ComparativeDecisionAnalysis
                initialAnalysis={workflowResult.stages.comparative_analysis.full_response}
                autoFetch={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
