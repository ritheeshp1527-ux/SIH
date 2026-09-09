import React from 'react';

interface HeaderProps {
  status: 'connected' | 'checking' | 'disconnected';
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ status, version }) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.9rem 0',
      marginBottom: '2rem',
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 10px rgba(19, 50, 75, 0.04)',
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1F5A85 0%, #3FA48E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '1.2rem',
            boxShadow: '0 3px 10px rgba(31, 90, 133, 0.2)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c.6.5 1.2.8 2.5.8 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.3 2.5.8" />
              <path d="M2 17c.6.5 1.2.8 2.5.8 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.3 2.5.8" />
              <path d="M2 7c.6.5 1.2.8 2.5.8 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.3 2.5.8" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>GreenFleet</span>
                <span style={{ color: 'var(--accent-teal)' }}>AI</span>
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                SIH26138
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                Sustainable Maritime Optimization
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem', fontWeight: 500 }}>
              Sustainable Routes. Smarter Seas. &bull; Quantum-Inspired Green Fleet Optimization
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem'
          }}>
            <span className={`status-dot ${status === 'connected' ? 'active' : 'pending'}`} />
            <span style={{ color: status === 'connected' ? 'var(--accent-teal-dark)' : 'var(--accent-amber)', fontWeight: 700 }}>
              {status === 'connected' ? 'Engine Ready' : `Backend: ${status.toUpperCase()}`}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            v{version}
          </span>
        </div>
      </div>
    </header>
  );
};
