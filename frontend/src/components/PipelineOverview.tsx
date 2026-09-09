import React from 'react';
import { PipelineStage } from '../types';

interface PipelineOverviewProps {
  stages: PipelineStage[];
}

export const PipelineOverview: React.FC<PipelineOverviewProps> = ({ stages }) => {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Target Maritime Pipeline Architecture
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Multi-stage workflow designed for pluggable model replacement from Phase 0 to Phase 6
          </p>
        </div>
        <span className="badge badge-emerald">Strict Contract Decoupling</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {stages.map((stage) => {
          const isFoundationReady = stage.order <= 7;
          return (
            <div
              key={stage.order}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: isFoundationReady
                  ? 'linear-gradient(90deg, #00e5ff, #10b981)'
                  : 'rgba(255, 255, 255, 0.1)'
              }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 700
                  }}>
                    STAGE {String(stage.order).padStart(2, '0')}
                  </span>
                  <span className={`badge ${isFoundationReady ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                    {isFoundationReady ? 'Ready' : 'Upcoming'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  {stage.name}
                </h3>
              </div>

              <div style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                Status: <span style={{ color: 'var(--text-secondary)' }}>{stage.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
