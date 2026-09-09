import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PipelineOverview } from './components/PipelineOverview';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { FuelIntelligencePlayground } from './components/FuelIntelligencePlayground';
import { MaritimeRouteExplorer } from './components/MaritimeRouteExplorer';
import { WeatherImpactExplorer } from './components/WeatherImpactExplorer';
import { ClassicalVoyageOptimizer } from './components/ClassicalVoyageOptimizer';
import { QuantumInspiredOptimizer } from './components/QuantumInspiredOptimizer';
import { ComparativeDecisionAnalysis } from './components/ComparativeDecisionAnalysis';
import { EndToEndWorkflowOptimizer } from './components/EndToEndWorkflowOptimizer';
import { Stage01Voyage, VoyageFormValues } from './components/Stage01Voyage';
import { Stage02Fleet } from './components/Stage02Fleet';
import { Stage03Environment } from './components/Stage03Environment';
import { Stage04Classical } from './components/Stage04Classical';
import { Stage05QuantumInspired } from './components/Stage05QuantumInspired';
import { Stage06Compare } from './components/Stage06Compare';
import { Stage07Decision } from './components/Stage07Decision';
import { fetchHealth, fetchPipelineMeta } from './services/api';
import {
  HealthStatus,
  PipelineStage,
  WeatherOceanStageResult,
  ClassicalOptimizationResponse,
  QuantumInspiredOptimizationResponse,
  ComparativeAnalysisResponse,
} from './types';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'checking' | 'disconnected'>('checking');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // Phase 10B, 10C, 10D, 10E, 10F, 10G, 10H: 7-Stage Guided Workflow Shell State
  const [activeStage, setActiveStage] = useState<number>(1);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'staged' | 'classic'>('staged');

  // Stage 01: Voyage Input State
  const [voyageConfig, setVoyageConfig] = useState<VoyageFormValues>({
    sourcePort: 'PORT-SG',
    destPort: 'PORT-RTM',
    cargoWeight: 60000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-29T12:00',
  });

  // Stage 02: Fleet Selection State
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>(['VES-001', 'VES-002', 'VES-003']);

  // Stage 03: Environmental Feasibility State
  const [environmentResult, setEnvironmentResult] = useState<WeatherOceanStageResult | null>(null);

  // Stage 04: Classical Baseline Optimization State
  const [classicalResult, setClassicalResult] = useState<ClassicalOptimizationResponse | null>(null);

  // Stage 05: Quantum-Inspired Optimization State
  const [qiResult, setQiResult] = useState<QuantumInspiredOptimizationResponse | null>(null);

  // Stage 06: Comparative Decision Analysis State
  const [comparativeResult, setComparativeResult] = useState<ComparativeAnalysisResponse | null>(null);

  // Cross-phase integration: pass selected route distance, vessel, and weather multiplier to fuel intelligence
  const [selectedRouteDistance, setSelectedRouteDistance] = useState<number | null>(null);
  const [selectedRouteVesselId, setSelectedRouteVesselId] = useState<string | null>(null);
  const [selectedRouteWeatherFactor, setSelectedRouteWeatherFactor] = useState<number | null>(null);



  const STAGES_CONFIG = [
    {
      id: 1,
      number: '01',
      name: 'Voyage',
      title: 'Stage 01 — Voyage',
      icon: '🧭',
      badge: 'Maritime Corridors',
      summary: 'Define origin/destination ports, cargo payload weight, departure timestamp, schedule arrival deadlines, and canal transit draft limits.',
      details: 'Evaluates physical canal draft constraints and generates feasible candidate routes between commercial maritime hubs.'
    },
    {
      id: 2,
      number: '02',
      name: 'Fleet',
      title: 'Stage 02 — Fleet',
      icon: '🚢',
      badge: 'Vessel & Fuel Intelligence',
      summary: 'Review fleet vessels, Deadweight Tonnage (DWT) capacities, speed limits, engine ratings, and alternative bunker fuel compatibility.',
      details: 'Calculates baseline calm-water fuel burn rates, energy densities (MJ/kg), and well-to-wake lifecycle GHG emission factors.'
    },
    {
      id: 3,
      number: '03',
      name: 'Environment',
      title: 'Stage 03 — Environment',
      icon: '🌊',
      badge: 'Ocean & Weather Modeling',
      summary: 'Assess oceanographic conditions along candidate route segments, including significant wave height, sea state, and ocean current drift.',
      details: 'Computes navigational Speed Over Ground (SOG = STW + c_along) and hydrodynamic added wave resistance fuel factors.'
    },
    {
      id: 4,
      number: '04',
      name: 'Classical',
      title: 'Stage 04 — Classical',
      icon: '💻',
      badge: 'Exhaustive Baseline',
      summary: 'Execute the exhaustive discrete combinatorial optimizer across Vessel × Route × Speed × Fuel decision variables.',
      details: 'Enforces hard physical constraints (draft, deadweight capacity, speed bounds, schedule deadlines) and identifies exact cost and time optima.'
    },
    {
      id: 5,
      number: '05',
      name: 'Quantum-Inspired',
      title: 'Stage 05 — Quantum-Inspired',
      icon: '⚛️',
      badge: 'QUBO & Simulated Annealing',
      summary: 'Formulate the voyage optimization problem as a Quadratic Unconstrained Binary Optimization (QUBO) model with one-hot encoding.',
      details: 'Executes classical Simulated Annealing across cooling temperature schedules to discover low-energy top-K candidate configurations.'
    },
    {
      id: 6,
      number: '06',
      name: 'Compare',
      title: 'Stage 06 — Compare',
      icon: '⚖️',
      badge: 'Comparative Decision Analysis',
      summary: 'Perform multi-objective comparative evaluation between Classical exact baseline and Quantum-Inspired solutions.',
      details: 'Analyzes strict Pareto dominance, Cost vs Time vs Fuel trade-offs, radar profiles, and solver performance telemetry.'
    },
    {
      id: 7,
      number: '07',
      name: 'Decision',
      title: 'Stage 07 — Decision',
      icon: '🎯',
      badge: 'Executive Recommendation',
      summary: 'Review final executive recommendation, recommended vessel-route-speed-fuel plan, and transparent decision justifications.',
      details: 'Synthesizes defensible operational directives based on selected organizational priorities (Balanced, Cost, Time, Fuel, CO2, GHG).'
    },
  ];

  const currentStageInfo = STAGES_CONFIG.find((s) => s.id === activeStage) || STAGES_CONFIG[0];

  const scrollToTop = () => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (activeStage > 1) {
      setActiveStage(activeStage - 1);
      scrollToTop();
    }
  };

  const handleContinue = () => {
    if (activeStage < STAGES_CONFIG.length) {
      const next = activeStage + 1;
      setActiveStage(next);
      setMaxUnlockedStage((prev) => Math.max(prev, next));
      scrollToTop();
    }
  };

  const handleStepClick = (stageId: number) => {
    // Only permit navigation to current or unlocked/completed stages
    if (stageId <= maxUnlockedStage) {
      setActiveStage(stageId);
      scrollToTop();
    }
  };

  const handleResetWorkflow = () => {
    setActiveStage(1);
    setMaxUnlockedStage(1);
    setVoyageConfig({
      sourcePort: 'PORT-SG',
      destPort: 'PORT-RTM',
      cargoWeight: 60000,
      departureDate: '2026-10-01T12:00',
      deadlineDate: '2026-10-29T12:00',
    });
    setSelectedVesselIds(['VES-001', 'VES-002', 'VES-003']);
    setEnvironmentResult(null);
    setClassicalResult(null);
    setQiResult(null);
    setComparativeResult(null);
    scrollToTop();
  };

  const checkHealthAndMeta = async () => {
    try {
      setBackendStatus('checking');
      const [healthData, metaData] = await Promise.all([
        fetchHealth(),
        fetchPipelineMeta(),
      ]);
      setHealth(healthData);
      setStages(metaData.pipeline);
      setBackendStatus('connected');
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkHealthAndMeta();
    const interval = setInterval(checkHealthAndMeta, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRouteHandoff = (dist: number, vId?: string) => {
    setSelectedRouteDistance(dist);
    if (vId) setSelectedRouteVesselId(vId);
    const weatherElement = document.getElementById('weather-intelligence-section');
    if (weatherElement) {
      weatherElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApplyWeatherToFuel = (dist: number, factor: number, vId: string) => {
    setSelectedRouteDistance(dist);
    setSelectedRouteWeatherFactor(factor);
    if (vId) setSelectedRouteVesselId(vId);
    const fuelElement = document.getElementById('fuel-intelligence-section');
    if (fuelElement) {
      fuelElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header status={backendStatus} version={health?.version || '0.1.0'} />

      <main className="container" style={{ flex: 1, paddingBottom: '4rem' }}>
        {/* Hero Section */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{
            background: 'radial-gradient(ellipse at top left, rgba(0, 229, 255, 0.12), transparent 70%), var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.25rem',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan">Problem Statement: SIH26138</span>
              <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                7-Stage Guided Optimization Workflow
              </span>
              <span className="badge badge-amber">Deterministic Simulation Mode</span>
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '0.85rem', letterSpacing: '-0.03em' }}>
              Quantum-Inspired Fuel Consumption Prediction &amp; Green Fleet Optimization
            </h2>

            <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', maxWidth: '850px', lineHeight: 1.6 }}>
              A presentation-ready prototype engineering a hybrid computational framework for maritime voyage optimization,
              bunker fuel transition, and carbon footprint reduction. Navigated through a structured 7-stage guided operational workflow.
            </p>

            <div style={{
              display: 'flex',
              gap: '1.25rem',
              marginTop: '1.5rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  background: 'linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)',
                  color: '#080d1a',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 15px rgba(0, 229, 255, 0.3)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>FastAPI Swagger UI</span>
                <span>↗</span>
              </a>

              <button
                onClick={checkHealthAndMeta}
                style={{
                  padding: '0.55rem 1.15rem',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>Health Check</span>
                {lastCheckTime && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({lastCheckTime})</span>}
              </button>
            </div>
          </div>
        </section>

        {/* View Mode Toggle Bar */}
        <section style={{ marginBottom: '1.75rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(8px)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1rem' }}>🧭</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Application View:
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {viewMode === 'staged' ? 'Guided 7-Stage Workflow Shell' : 'Classic All-Modules Explorer'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                id="view-staged-btn"
                onClick={() => setViewMode('staged')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: viewMode === 'staged' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: viewMode === 'staged' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                  color: viewMode === 'staged' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>⚡</span>
                <span>Guided 7-Stage Workflow</span>
              </button>

              <button
                type="button"
                id="view-classic-btn"
                onClick={() => setViewMode('classic')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: viewMode === 'classic' ? 'var(--accent-purple)' : 'var(--border-subtle)',
                  background: viewMode === 'classic' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: viewMode === 'classic' ? '#c084fc' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📦</span>
                <span>Classic All-Modules View</span>
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODE 1: Guided 7-Stage Workflow Shell                         */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'staged' && (
          <section id="guided-workflow-shell" style={{ marginBottom: '3rem' }}>
            {/* Horizontal 7-Stage Stepper with 3 States: completed, current, locked */}
            <div className="workflow-stepper" role="tablist" aria-label="7-Stage Workflow Stepper">
              {STAGES_CONFIG.map((stage) => {
                const isAllStagesCompleted = comparativeResult !== null && activeStage === 7;
                const isCurrent = stage.id === activeStage;
                const isCompleted = stage.id < activeStage || (isAllStagesCompleted && stage.id === 7);
                const isLocked = stage.id > maxUnlockedStage;

                let stateClass = 'locked';
                let stateLabel = 'Locked';
                let iconSymbol = '🔒';

                if (isCurrent) {
                  stateClass = 'current';
                  stateLabel = isAllStagesCompleted && stage.id === 7 ? 'Decision ✓' : 'Current';
                  iconSymbol = isAllStagesCompleted && stage.id === 7 ? '✓' : '●';
                } else if (isCompleted) {
                  stateClass = 'completed';
                  stateLabel = 'Completed';
                  iconSymbol = '✓';
                } else if (!isLocked) {
                  stateClass = 'completed'; // Unlocked / ready
                  stateLabel = 'Unlocked';
                  iconSymbol = '○';
                }

                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    id={`stepper-stage-${stage.number}`}
                    aria-selected={isCurrent}
                    disabled={isLocked}
                    onClick={() => handleStepClick(stage.id)}
                    className={`workflow-step-btn ${stateClass}`}
                    title={isLocked ? `Stage ${stage.number} is locked. Complete preceding stages to unlock.` : `Go to Stage ${stage.number} (${stage.name})`}
                  >
                    <div className="workflow-step-badge">
                      <span>{iconSymbol}</span>
                      <span>STAGE {stage.number}</span>
                    </div>
                    <div className="workflow-step-title">{stage.name}</div>
                    <div className="workflow-step-status-tag" style={{
                      color: isCurrent ? 'var(--accent-cyan)' : isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)'
                    }}>
                      {stateLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stage Content Area (Only ONE stage visible at a time) */}
            {activeStage === 1 ? (
              <Stage01Voyage
                values={voyageConfig}
                onChange={setVoyageConfig}
                onValidContinue={() => {
                  setActiveStage(2);
                  setMaxUnlockedStage((prev) => Math.max(prev, 2));
                  scrollToTop();
                }}
                onValuesModified={() => {
                  // Invalidate downstream unlocked stages if voyage inputs are modified
                  setMaxUnlockedStage(1);
                  setEnvironmentResult(null);
                  setClassicalResult(null);
                  setQiResult(null);
                  setComparativeResult(null);
                }}
              />
            ) : activeStage === 2 ? (
              <Stage02Fleet
                voyageConfig={voyageConfig}
                selectedVesselIds={selectedVesselIds}
                onSelectionChange={(vesselIds) => {
                  setSelectedVesselIds(vesselIds);
                  // Invalidate downstream stage 03, 04, 05, and 06 results if fleet changes
                  setEnvironmentResult(null);
                  setClassicalResult(null);
                  setQiResult(null);
                  setComparativeResult(null);
                  setMaxUnlockedStage((prev) => Math.min(prev, 2));
                }}
                onValidContinue={() => {
                  setActiveStage(3);
                  setMaxUnlockedStage((prev) => Math.max(prev, 3));
                  scrollToTop();
                }}
                onPrevious={() => {
                  setActiveStage(1);
                  scrollToTop();
                }}
              />
            ) : activeStage === 3 ? (
              <Stage03Environment
                voyageConfig={voyageConfig}
                selectedVesselIds={selectedVesselIds}
                environmentResult={environmentResult}
                onEnvironmentProcessed={(result) => {
                  setEnvironmentResult(result);
                  // Invalidate downstream classical, QI, and comparison results if environment conditions are re-run
                  setClassicalResult(null);
                  setQiResult(null);
                  setComparativeResult(null);
                  setMaxUnlockedStage((prev) => Math.min(prev, 3));
                }}
                onValidContinue={() => {
                  setActiveStage(4);
                  setMaxUnlockedStage((prev) => Math.max(prev, 4));
                  scrollToTop();
                }}
                onPrevious={() => {
                  setActiveStage(2);
                  scrollToTop();
                }}
              />
            ) : activeStage === 4 ? (
              <Stage04Classical
                voyageConfig={voyageConfig}
                selectedVesselIds={selectedVesselIds}
                environmentResult={environmentResult}
                classicalResult={classicalResult}
                onClassicalOptimized={(result) => {
                  setClassicalResult(result);
                  // Invalidate downstream QI and comparison results if classical settings are re-run
                  setQiResult(null);
                  setComparativeResult(null);
                  setMaxUnlockedStage(5);
                }}
                onValidContinue={() => {
                  setActiveStage(5);
                  setMaxUnlockedStage((prev) => Math.max(prev, 5));
                  scrollToTop();
                }}
                onPrevious={() => {
                  setActiveStage(3);
                  scrollToTop();
                }}
              />
            ) : activeStage === 5 ? (
              <Stage05QuantumInspired
                voyageConfig={voyageConfig}
                selectedVesselIds={selectedVesselIds}
                environmentResult={environmentResult}
                classicalResult={classicalResult}
                qiResult={qiResult}
                onQiOptimized={(result) => {
                  setQiResult(result);
                  // Invalidate downstream comparison and decision results if QI is re-run
                  setComparativeResult(null);
                  setMaxUnlockedStage(6);
                }}
                onValidContinue={() => {
                  setActiveStage(6);
                  setMaxUnlockedStage((prev) => Math.max(prev, 6));
                  scrollToTop();
                }}
                onPrevious={() => {
                  setActiveStage(4);
                  scrollToTop();
                }}
              />
            ) : activeStage === 6 ? (
              <Stage06Compare
                voyageConfig={voyageConfig}
                selectedVesselIds={selectedVesselIds}
                environmentResult={environmentResult}
                classicalResult={classicalResult}
                qiResult={qiResult}
                comparativeResult={comparativeResult}
                onComparativeAnalyzed={(result) => {
                  setComparativeResult(result);
                  setMaxUnlockedStage((prev) => Math.max(prev, 7));
                }}
                onValidContinue={() => {
                  setActiveStage(7);
                  setMaxUnlockedStage((prev) => Math.max(prev, 7));
                  scrollToTop();
                }}
                onPrevious={() => {
                  setActiveStage(5);
                  scrollToTop();
                }}
              />
            ) : activeStage === 7 ? (
              <Stage07Decision
                voyageConfig={voyageConfig}
                comparativeResult={comparativeResult}
                classicalResult={classicalResult}
                qiResult={qiResult}
                onPrevious={() => {
                  setActiveStage(6);
                  scrollToTop();
                }}
                onResetWorkflow={handleResetWorkflow}
              />
            ) : (
              <div className="stage-shell-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                      <span className="badge badge-cyan">
                        {currentStageInfo.number} / 07
                      </span>
                      <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        {currentStageInfo.badge}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span>{currentStageInfo.icon}</span>
                      <span>{currentStageInfo.title}</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '850px', lineHeight: 1.5 }}>
                      {currentStageInfo.summary}
                    </p>
                  </div>

                  <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)'
                  }}>
                    Status: <strong style={{ color: 'var(--accent-cyan)' }}>Stage {activeStage} Active</strong>
                  </div>
                </div>

                {/* Stage Placeholder Content Area */}
                <div
                  style={{
                    minHeight: '260px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 23, 42, 0.45)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2.5rem',
                    textAlign: 'center',
                    margin: '1.5rem 0',
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {currentStageInfo.icon}
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {currentStageInfo.title}
                  </h3>
                  <p style={{ maxWidth: '620px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {currentStageInfo.details}
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.85rem',
                    background: 'rgba(0, 229, 255, 0.08)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.78rem',
                    color: 'var(--accent-cyan)'
                  }}>
                    <span>⚡ Shell Ready for Component Integration (Upcoming Phase)</span>
                  </div>
                </div>

                {/* Previous & Continue Navigation Controls */}
                <div className="stage-nav-bar">
                  <button
                    type="button"
                    id="stage-prev-btn"
                    className="stage-nav-btn stage-nav-btn-secondary"
                    onClick={handlePrevious}
                    disabled={activeStage === 1}
                  >
                    <span>←</span>
                    <span>Previous</span>
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      Stage {currentStageInfo.number} of {STAGES_CONFIG.length}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {currentStageInfo.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    id="stage-continue-btn"
                    className="stage-nav-btn stage-nav-btn-primary"
                    onClick={handleContinue}
                    disabled={activeStage === STAGES_CONFIG.length}
                  >
                    <span>{activeStage === STAGES_CONFIG.length ? 'Final Stage Reached' : 'Continue'}</span>
                    {activeStage < STAGES_CONFIG.length && <span>→</span>}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE 2: Classic All-Modules View (Preserves 100% of features)  */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'classic' && (
          <div id="classic-modules-view">
            {/* Navigation Quick-Jump Bar */}
            <nav style={{
              display: 'flex',
              gap: '0.6rem',
              marginBottom: '2.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(8px)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-card)',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.25rem', letterSpacing: '0.04em' }}>
                OPTIMIZATION MODULES:
              </span>
              <a href="#end-to-end-workflow-section" className="nav-pill active-pill">
                ⚡ Primary Workflow
              </a>
              <a href="#fuel-intelligence-section" className="nav-pill">
                Phase 1: Ship &amp; Fuel
              </a>
              <a href="#maritime-network-section" className="nav-pill">
                Phase 2: Routes
              </a>
              <a href="#weather-intelligence-section" className="nav-pill">
                Phase 3: Weather
              </a>
              <a href="#classical-optimization-section" className="nav-pill">
                Phase 4: Classical Baseline
              </a>
              <a href="#quantum-inspired-optimization-section" className="nav-pill">
                Phase 5: Quantum-Inspired
              </a>
              <a href="#comparative-decision-analysis-section" className="nav-pill">
                Phase 6: Decision Support
              </a>
            </nav>

            {/* Phase 7: End-to-End Orchestrated Voyage Optimization Pipeline */}
            <EndToEndWorkflowOptimizer />

            {/* Phase 2: Maritime Network & Candidate Route Modeling */}
            <section id="maritime-network-section" style={{ marginBottom: '3rem' }}>
              <MaritimeRouteExplorer onSelectRouteForFuel={handleRouteHandoff} />
            </section>

            {/* Phase 3: Weather & Ocean Dynamic Impact Modeling */}
            <section id="weather-intelligence-section" style={{ marginBottom: '3rem' }}>
              <WeatherImpactExplorer
                onApplyToFuelCalculator={handleApplyWeatherToFuel}
              />
            </section>

            {/* Phase 1: Interactive Ship & Fuel Intelligence Playground */}
            <section id="fuel-intelligence-section" style={{ marginBottom: '3rem' }}>
              <FuelIntelligencePlayground
                externalDistance={selectedRouteDistance}
                externalVesselId={selectedRouteVesselId}
                externalWeatherFactor={selectedRouteWeatherFactor}
              />
            </section>

            {/* Phase 4: Classical Voyage Optimization Baseline */}
            <section id="classical-optimization-section" style={{ marginBottom: '3rem' }}>
              <ClassicalVoyageOptimizer />
            </section>

            {/* Phase 5: Quantum-Inspired Optimization (QUBO & Simulated Annealing) */}
            <section id="quantum-inspired-optimization-section" style={{ marginBottom: '3rem' }}>
              <QuantumInspiredOptimizer />
            </section>

            {/* Phase 6: Comparative Decision Analysis */}
            <section id="comparative-decision-analysis-section" style={{ marginBottom: '3rem' }}>
              <ComparativeDecisionAnalysis />
            </section>

            {/* Prototype Rules & Non-Fabrication Notice */}
            <section style={{ marginBottom: '3rem' }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderLeft: '4px solid var(--accent-cyan)',
                borderTop: '1px solid var(--border-subtle)',
                borderRight: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                    Prototype Architecture Principles &amp; Transparency
                  </strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  All vessel catalogs, bunker fuel prices, and weather conditions are <strong>explicitly simulated demo fixtures</strong>.
                  No fabricated claims of live satellite AIS feeds or proprietary marine APIs are made. The interface contracts (ABCs) enforce strict
                  pluggability so hydrodynamic machine learning models and QUBO quantum solvers seamlessly integrate into the optimization pipeline.
                </p>
              </div>
            </section>

            {/* Architecture Viewer */}
            <ArchitectureViewer health={health} />

            {/* Pipeline Overview */}
            <PipelineOverview stages={stages} />
          </div>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.5rem 0',
        background: 'var(--bg-primary)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>SIH26138 Maritime Optimization Engine &bull; 7-Stage Guided Optimization Workflow</div>
        </div>
      </footer>
    </div>
  );
};


