import React, { useState } from 'react';
import { HealthStatus } from '../types';

interface ArchitectureViewerProps {
  health: HealthStatus | null;
}

export const ArchitectureViewer: React.FC<ArchitectureViewerProps> = ({ health }) => {
  const [activeTab, setActiveTab] = useState<'interfaces' | 'schemas' | 'diagnostics'>('interfaces');

  const schemas = [
    {
      name: 'Shipment',
      description: 'Customer cargo requirements & constraints',
      fields: ['source: str', 'destination: str', 'cargo_weight: float', 'deadline: datetime', 'priority: str?']
    },
    {
      name: 'Vessel',
      description: 'Fleet specifications & propulsion limits',
      fields: ['id: str', 'name: str', 'type: str', 'capacity: float', 'max_speed: float', 'min_speed: float', 'fuel_options: list[str]']
    },
    {
      name: 'Fuel',
      description: 'Bunker fuel profiles, cost & emissions',
      fields: ['id: str', 'name: str', 'price: float (USD/t)', 'emission_factor: float (tCO2/tFuel)', 'energy_density: float']
    },
    {
      name: 'Route',
      description: 'Maritime navigational candidate waypoints',
      fields: ['id: str', 'name: str', 'source: str', 'destination: str', 'distance: float (NM)', 'checkpoints: list[Checkpoint]']
    },
    {
      name: 'WeatherCondition',
      description: 'Oceanographic & atmospheric modifiers',
      fields: ['timestamp: datetime', 'wind: float (knots)', 'wave: float (m)', 'current: float (knots)', 'sea_state: int (0-9)', 'risk: str']
    }
  ];

  return (
    <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Phase 0 Architectural Foundation</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Strict interface boundaries enforcing zero-rewrite future model transitions
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: '0.25rem'
        }}>
          <button
            onClick={() => setActiveTab('interfaces')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'interfaces' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: activeTab === 'interfaces' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === 'interfaces' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            Decoupled Interfaces
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'schemas' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: activeTab === 'schemas' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === 'schemas' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            Core Schemas
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'diagnostics' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
              color: activeTab === 'diagnostics' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === 'diagnostics' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            Live Health Diagnostics
          </button>
        </div>
      </div>

      {activeTab === 'interfaces' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[
            {
              title: 'Fuel Consumption Model',
              abstract: 'FuelConsumptionModelBase (ABC)',
              current: 'DemoFuelModel (Heuristic Baseline)',
              future: 'RealFuelModel (ML / Hydrodynamics)'
            },
            {
              title: 'Maritime Route Network',
              abstract: 'RouteProviderBase (ABC)',
              current: 'DemoRouteProvider (Local Seed JSON)',
              future: 'RealRouteProvider (GIS / SeaRoutes API)'
            },
            {
              title: 'Oceanographic Weather',
              abstract: 'WeatherProviderBase (ABC)',
              current: 'DemoWeatherProvider (Simulated Sea State)',
              future: 'RealWeatherProvider (Copernicus / NOAA)'
            },
            {
              title: 'Quantum-Inspired Solver',
              abstract: 'VoyageOptimizerBase (ABC)',
              current: 'DemoQuantumOptimizer (Interface Skeleton)',
              future: 'RealQuantumInspiredOptimizer (QUBO / QA)'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {item.title}
              </h4>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                {item.abstract}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Phase 0:</span> {item.current}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Future:</span> {item.future}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'schemas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {schemas.map((s, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {s.name}
                </h4>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Pydantic v2</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {s.description}
              </p>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                {s.fields.map((f, fIdx) => (
                  <div key={fIdx} style={{ color: '#cbd5e1' }}>• {f}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <pre style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--accent-cyan)',
            overflowX: 'auto',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 'var(--radius-sm)'
          }}>
            {health ? JSON.stringify(health, null, 2) : 'Connecting to API server...'}
          </pre>
        </div>
      )}
    </section>
  );
};
