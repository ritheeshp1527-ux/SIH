import React from 'react';

interface HeaderProps {
  status: 'connected' | 'checking' | 'disconnected';
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ status, version }) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      padding: '1.25rem 0',
      marginBottom: '2.5rem',
      background: 'rgba(8, 13, 26, 0.8)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00e5ff 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)'
          }}>
            ⚓
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                GreenFleet <span style={{ color: 'var(--accent-cyan)' }}>Quantum</span>
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SIH26138</span>
              <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.65rem' }}>
                End-to-End Optimization Engine
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Quantum-Inspired Maritime Fuel &amp; Fleet Optimization
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem'
          }}>
            <span className={`status-dot ${status === 'connected' ? 'active' : 'pending'}`} />
            <span style={{ color: status === 'connected' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
              Backend: {status.toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            v{version}
          </span>
        </div>
      </div>
    </header>
  );
};
