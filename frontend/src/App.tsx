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

  // 7-Stage Guided Workflow Shell State
  const [activeStage, setActiveStage] = useState<number>(1);
  const [maxUnlockedStage, setMaxUnlockedStage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'staged' | 'classic'>('staged');

  // Stage 01: Voyage Input State
  const [voyageConfig, setVoyageConfig] = useState<VoyageFormValues>({
    sourcePort: '',
    destPort: '',
    cargoWeight: 0,
    departureDate: '',
    deadlineDate: '',
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

  // Cross-phase integration
  const [selectedRouteDistance, setSelectedRouteDistance] = useState<number | null>(null);
  const [selectedRouteVesselId, setSelectedRouteVesselId] = useState<string | null>(null);
  const [selectedRouteWeatherFactor, setSelectedRouteWeatherFactor] = useState<number | null>(null);

  const STAGES_CONFIG = [
    {
      id: 1,
      number: '01',
      name: 'Voyage Details',
      shortName: 'Voyage',
      title: 'Stage 01 — Voyage Details',
      icon: '🧭',
      badge: 'Maritime Corridors',
      summary: 'Define origin/destination ports, cargo payload weight, departure timestamp, schedule arrival deadlines, and canal transit draft limits.',
      details: 'Evaluates physical canal draft constraints and generates feasible candidate routes between commercial maritime hubs.'
    },
    {
      id: 2,
      number: '02',
      name: 'Fleet Selection',
      shortName: 'Fleet',
      title: 'Stage 02 — Fleet Selection',
      icon: '🚢',
      badge: 'Vessel & Fuel Intelligence',
      summary: 'Review fleet vessels, Deadweight Tonnage (DWT) capacities, speed limits, engine ratings, and alternative bunker fuel compatibility.',
      details: 'Calculates baseline calm-water fuel burn rates, energy densities (MJ/kg), and well-to-wake lifecycle GHG emission factors.'
    },
    {
      id: 3,
      number: '03',
      name: 'Environmental Data',
      shortName: 'Environment',
      title: 'Stage 03 — Environmental Data',
      icon: '🌊',
      badge: 'Ocean & Weather Modeling',
      summary: 'Assess oceanographic conditions along candidate route segments, including significant wave height, sea state, and ocean current drift.',
      details: 'Computes navigational Speed Over Ground (SOG = STW + c_along) and hydrodynamic added wave resistance fuel factors.'
    },
    {
      id: 4,
      number: '04',
      name: 'Classical Optimization',
      shortName: 'Classical',
      title: 'Stage 04 — Classical Baseline',
      icon: '💻',
      badge: 'Exhaustive Baseline',
      summary: 'Execute the exhaustive discrete combinatorial optimizer across Vessel × Route × Speed × Fuel decision variables.',
      details: 'Enforces hard physical constraints (draft, deadweight capacity, speed bounds, schedule deadlines) and identifies exact cost and time optima.'
    },
    {
      id: 5,
      number: '05',
      name: 'Quantum-Inspired',
      shortName: 'Quantum',
      title: 'Stage 05 — Quantum-Inspired QUBO',
      icon: '⚛️',
      badge: 'QUBO & Simulated Annealing',
      summary: 'Formulate the voyage optimization problem as a Quadratic Unconstrained Binary Optimization (QUBO) model with one-hot encoding.',
      details: 'Executes classical Simulated Annealing across cooling temperature schedules to discover low-energy top-K candidate configurations.'
    },
    {
      id: 6,
      number: '06',
      name: 'Comparative Analysis',
      shortName: 'Compare',
      title: 'Stage 06 — Comparative Decision Analysis',
      icon: '⚖️',
      badge: 'Comparative Decision Analysis',
      summary: 'Perform multi-objective comparative evaluation between Classical exact baseline and Quantum-Inspired solutions.',
      details: 'Analyzes strict Pareto dominance, Cost vs Time vs Fuel trade-offs, radar profiles, and solver performance telemetry.'
    },
    {
      id: 7,
      number: '07',
      name: 'Results & Decision',
      shortName: 'Decision',
      title: 'Stage 07 — Executive Decision',
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
    setSelectedRouteDistance(null);
    setSelectedRouteVesselId(null);
    setSelectedRouteWeatherFactor(null);
    scrollToTop();
  };

  // Authoritative Stage 01 Voyage state invalidation:
  // When voyageConfig parameters are modified, purge all downstream stage results
  useEffect(() => {
    setEnvironmentResult(null);
    setClassicalResult(null);
    setQiResult(null);
    setComparativeResult(null);
    setSelectedRouteDistance(null);
    setSelectedRouteVesselId(null);
    setSelectedRouteWeatherFactor(null);
  }, [
    voyageConfig.sourcePort,
    voyageConfig.destPort,
    voyageConfig.cargoWeight,
    voyageConfig.departureDate,
    voyageConfig.deadlineDate,
  ]);

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Subtle watercolor ocean mist background layer */}
      <div className="watercolor-wave-bg" />

      <Header status={backendStatus} version={health?.version || '0.1.0'} />

      <main className="container" style={{ flex: 1, paddingBottom: '3.5rem', position: 'relative', zIndex: 1 }}>
        {/* Main Dashboard Hero Banner */}
        <section style={{ marginBottom: '1.75rem' }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem 2rem',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top decorative subtle watercolor wash gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '380px',
              height: '100%',
              background: 'radial-gradient(ellipse at 80% 20%, rgba(221, 242, 236, 0.5) 0%, rgba(220, 239, 248, 0.3) 50%, transparent 80%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-cyan">Problem Statement: SIH26138</span>
                  <span className="badge badge-emerald">
                    🍃 7-Stage Guided Optimization Workflow
                  </span>
                  <span className="badge badge-purple">Deterministic Simulation Mode</span>
                </div>

                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '0.4rem', letterSpacing: '-0.025em' }}>
                  Maritime Fleet Optimization
                </h2>

                <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: 1.55 }}>
                  Optimize voyages for lower cost, lower emissions and a healthier planet using hybrid classical and quantum-inspired algorithmic intelligence.
                </p>
              </div>

              {/* Right Decorative Badge / Action */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.85rem',
                  background: 'var(--accent-teal-subtle)',
                  border: '1px solid #C5E9DD',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--accent-teal-dark)',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  <span>🍃</span>
                  <span>Safer Seas &bull; Greener Tomorrows</span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <a
                    href="http://127.0.0.1:8000/docs"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.95rem',
                      background: 'var(--accent-ocean)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span>FastAPI Swagger UI</span>
                    <span>↗</span>
                  </a>

                  <button
                    onClick={checkHealthAndMeta}
                    style={{
                      padding: '0.45rem 0.95rem',
                      background: '#FFFFFF',
                      color: 'var(--accent-ocean)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <span>Health Check</span>
                    {lastCheckTime && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({lastCheckTime})</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* View Mode Switcher */}
        <section style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1.15rem',
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem' }}>🧭</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                  padding: '0.4rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: viewMode === 'staged' ? 'var(--accent-ocean)' : 'var(--border-subtle)',
                  background: viewMode === 'staged' ? 'var(--accent-blue-subtle)' : '#FFFFFF',
                  color: viewMode === 'staged' ? 'var(--accent-ocean)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
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
                  padding: '0.4rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: viewMode === 'classic' ? 'var(--accent-purple)' : 'var(--border-subtle)',
                  background: viewMode === 'classic' ? 'var(--accent-purple-light)' : '#FFFFFF',
                  color: viewMode === 'classic' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
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
          <section id="guided-workflow-shell" style={{ marginBottom: '2.5rem' }}>
            {/* Redesigned Workflow Stepper Matching Reference Design */}
            <div className="workflow-stepper" role="tablist" aria-label="7-Stage Workflow Stepper" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
              overflowX: 'auto',
              gap: '0.5rem',
            }}>
              {STAGES_CONFIG.map((stage, idx) => {
                const isAllStagesCompleted = comparativeResult !== null && activeStage === 7;
                const isCurrent = stage.id === activeStage;
                const isCompleted = stage.id < activeStage || (isAllStagesCompleted && stage.id === 7);
                const isLocked = stage.id > maxUnlockedStage;

                let stateClass = 'locked';
                let stateLabel = 'Locked';

                if (isCurrent) {
                  stateClass = 'current';
                  stateLabel = isAllStagesCompleted && stage.id === 7 ? 'Decision ✓' : 'Active';
                } else if (isCompleted) {
                  stateClass = 'completed';
                  stateLabel = 'Completed';
                } else if (!isLocked) {
                  stateClass = 'completed';
                  stateLabel = 'Unlocked';
                }

                return (
                  <React.Fragment key={stage.id}>
                    <button
                      type="button"
                      role="tab"
                      id={`stepper-stage-${stage.number}`}
                      aria-selected={isCurrent}
                      disabled={isLocked}
                      onClick={() => handleStepClick(stage.id)}
                      className={`workflow-step-btn ${stateClass}`}
                      title={isLocked ? `Stage ${stage.number} is locked. Complete preceding stages to unlock.` : `Go to Stage ${stage.number} (${stage.name})`}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '0.65rem 0.5rem',
                        background: isCurrent ? 'var(--accent-blue-subtle)' : isCompleted ? '#F7FCFA' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        border: isCurrent ? '1px solid #BEDDF0' : isCompleted ? '1px solid #D5EFE7' : '1px solid transparent',
                        transition: 'all var(--transition-fast)',
                        position: 'relative',
                        cursor: isLocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {/* Numbered / Checked Circular Badge */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '0.35rem',
                        background: isCurrent
                          ? 'var(--accent-ocean)'
                          : isCompleted
                          ? 'var(--accent-teal)'
                          : '#E2EEF5',
                        color: isCurrent || isCompleted ? '#FFFFFF' : 'var(--text-muted)',
                        boxShadow: isCurrent ? '0 2px 8px rgba(31, 90, 133, 0.3)' : 'none',
                        transition: 'all var(--transition-fast)'
                      }}>
                        {isCompleted ? '✓' : stage.id}
                      </div>

                      {/* Stage Name */}
                      <div className="workflow-step-title" style={{
                        fontSize: '0.82rem',
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? 'var(--accent-ocean)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                        lineHeight: 1.2
                      }}>
                        {stage.shortName}
                      </div>

                      <div className="workflow-step-status-tag" style={{
                        fontSize: '0.65rem',
                        marginTop: '0.2rem',
                        color: isCurrent ? 'var(--accent-ocean)' : isCompleted ? 'var(--accent-teal)' : 'var(--text-muted)'
                      }}>
                        {stateLabel}
                      </div>
                    </button>

                    {/* Connecting Line between steps */}
                    {idx < STAGES_CONFIG.length - 1 && (
                      <div style={{
                        width: '20px',
                        height: '2px',
                        background: stage.id < activeStage ? 'var(--accent-teal)' : '#DCE9F2',
                        flexShrink: 0,
                        transition: 'background var(--transition-fast)'
                      }} />
                    )}
                  </React.Fragment>
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
                      <span className="badge badge-purple">
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
                    padding: '0.45rem 0.9rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)'
                  }}>
                    Status: <strong style={{ color: 'var(--accent-ocean)' }}>Stage {activeStage} Active</strong>
                  </div>
                </div>

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
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-ocean)' }}>
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
        {/* MODE 2: Classic All-Modules View                              */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'classic' && (
          <div id="classic-modules-view">
            {/* Navigation Quick-Jump Bar */}
            <nav style={{
              display: 'flex',
              gap: '0.6rem',
              marginBottom: '2.5rem',
              padding: '0.75rem 1rem',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
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
                background: '#FFFFFF',
                borderLeft: '4px solid var(--accent-ocean)',
                borderTop: '1px solid var(--border-subtle)',
                borderRight: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--accent-ocean)' }}>
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

        {/* Bottom 3 Sustainability & Performance Cards (From Reference Design) */}
        <section style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            {/* Card 1: Lower Emissions */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--accent-teal-subtle)',
                border: '1px solid #C5E9DD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: 'var(--accent-teal-dark)',
                flexShrink: 0
              }}>
                🍃
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Lower Emissions
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.35 }}>
                  Choose cleaner fuels and emission-optimized candidate routes
                </p>
              </div>
            </div>

            {/* Card 2: Cost Efficient */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--accent-blue-subtle)',
                border: '1px solid #BEDDF0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: 'var(--accent-ocean)',
                flexShrink: 0
              }}>
                🛢️
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Cost Efficient
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.35 }}>
                  Optimize vessel speed, routing and bunker fuel combinations
                </p>
              </div>
            </div>

            {/* Card 3: Safer Journeys */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--accent-purple-light)',
                border: '1px solid #D8DDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: 'var(--accent-purple)',
                flexShrink: 0
              }}>
                🛡️
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Safer Journeys
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.35 }}>
                  Real-time environmental awareness and draft limit adherence
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '1.25rem 0',
        background: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>GreenFleet AI &bull; SIH26138 Maritime Optimization Engine &bull; 7-Stage Guided Optimization Workflow</div>
          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Sustainable Shipping, Stronger Tomorrow. 🌊
          </div>
        </div>
      </footer>
    </div>
  );
};
