import React, { useEffect, useState } from 'react';
import { fetchVessels } from '../services/api';
import { Vessel } from '../types';
import { VoyageFormValues } from './Stage01Voyage';

export interface Stage02FleetProps {
  voyageConfig: VoyageFormValues;
  selectedVesselIds: string[];
  onSelectionChange: (vesselIds: string[]) => void;
  onValidContinue: () => void;
  onPrevious: () => void;
  skipAnimation?: boolean;
}

const DEFAULT_VESSELS: Vessel[] = [
  {
    id: 'VES-001',
    name: 'Poseidon Leader',
    type: 'Ultra Large Container Vessel (ULCV)',
    capacity_tonnes: 120000.0,
    min_speed_knots: 10.0,
    max_speed_knots: 22.0,
    engine_power_kw: 45000.0,
    fuel_options: ['HFO', 'MDO', 'LNG', 'METHANOL'],
    design_draft_m: 15.5,
  },
  {
    id: 'VES-002',
    name: 'Green Horizon',
    type: 'Post-Panamax Bulk Carrier',
    capacity_tonnes: 82000.0,
    min_speed_knots: 9.0,
    max_speed_knots: 18.0,
    engine_power_kw: 22000.0,
    fuel_options: ['HFO', 'MDO', 'LNG', 'AMMONIA'],
    design_draft_m: 14.0,
  },
  {
    id: 'VES-003',
    name: 'Oceanic Pioneer',
    type: 'Aframax Product Tanker',
    capacity_tonnes: 115000.0,
    min_speed_knots: 9.5,
    max_speed_knots: 16.5,
    engine_power_kw: 18500.0,
    fuel_options: ['HFO', 'MDO', 'LNG'],
    design_draft_m: 14.8,
  },
  {
    id: 'VES-004',
    name: 'Proto Gas Carrier (Ref Profile)',
    type: 'LNG Carrier (Q-Flex Class)',
    capacity_tonnes: 95000.0,
    min_speed_knots: 11.0,
    max_speed_knots: 20.0,
    engine_power_kw: 32000.0,
    fuel_options: ['LNG', 'MDO'],
    design_draft_m: 12.5,
  },
  {
    id: 'VES-005',
    name: 'Proto Ro-Ro Voyager (Ref Profile)',
    type: 'Pure Car & Truck Carrier / Ro-Ro',
    capacity_tonnes: 25000.0,
    min_speed_knots: 10.0,
    max_speed_knots: 19.0,
    engine_power_kw: 15000.0,
    fuel_options: ['MDO', 'HFO'],
    design_draft_m: 9.5,
  },
  {
    id: 'VES-006',
    name: 'Proto Feeder Express (Ref Profile)',
    type: 'Regional Feeder Container Vessel',
    capacity_tonnes: 35000.0,
    min_speed_knots: 10.0,
    max_speed_knots: 19.5,
    engine_power_kw: 18000.0,
    fuel_options: ['MDO', 'METHANOL'],
    design_draft_m: 11.0,
  },
];

export const Stage02Fleet: React.FC<Stage02FleetProps> = ({
  voyageConfig,
  selectedVesselIds,
  onSelectionChange,
  onValidContinue,
  onPrevious,
  skipAnimation = false,
}) => {
  const [vessels, setVessels] = useState<Vessel[]>(DEFAULT_VESSELS);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchVessels()
      .then((loaded) => {
        if (mounted && loaded && loaded.length > 0) {
          setVessels(loaded);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_VESSELS
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Format deadline date for read-only header
  const formattedDeadline = (() => {
    try {
      const d = new Date(voyageConfig.deadlineDate);
      return isNaN(d.getTime()) ? voyageConfig.deadlineDate : d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return voyageConfig.deadlineDate;
    }
  })();

  // Port label helper
  const formatPortName = (portId: string) => {
    if (portId === 'PORT-SG') return 'Singapore (PORT-SG)';
    if (portId === 'PORT-RTM') return 'Rotterdam (PORT-RTM)';
    if (portId === 'SGSIN') return 'Singapore (SGSIN)';
    if (portId === 'NLRTM') return 'Rotterdam (NLRTM)';
    if (portId === 'INBOM') return 'Mumbai (INBOM)';
    if (portId === 'AEDXB') return 'Dubai (AEDXB)';
    if (portId === 'USNYC') return 'New York (USNYC)';
    return portId;
  };

  // Check cargo compatibility
  const checkCompatibility = (vessel: Vessel) => {
    const isCompatible = vessel.capacity_tonnes >= voyageConfig.cargoWeight;
    const utilization = isCompatible && vessel.capacity_tonnes > 0
      ? ((voyageConfig.cargoWeight / vessel.capacity_tonnes) * 100).toFixed(1)
      : null;
    return { isCompatible, utilization };
  };

  const handleToggleVessel = (vessel: Vessel) => {
    const { isCompatible } = checkCompatibility(vessel);
    if (!isCompatible) return; // Incompatible vessels cannot be selected

    if (selectedVesselIds.includes(vessel.id)) {
      onSelectionChange(selectedVesselIds.filter((id) => id !== vessel.id));
    } else {
      onSelectionChange([...selectedVesselIds, vessel.id]);
    }
  };

  const handleUseDemoFleet = () => {
    // Select all vessels that have sufficient capacity for this voyage
    const compatibleIds = vessels
      .filter((v) => v.capacity_tonnes >= voyageConfig.cargoWeight)
      .map((v) => v.id);
    onSelectionChange(compatibleIds);
  };

  // Validation: at least one vessel selected, and all selected vessels must be cargo compatible
  const compatibleVessels = vessels.filter((v) => v.capacity_tonnes >= voyageConfig.cargoWeight);
  const allSelectedAreCompatible =
    selectedVesselIds.length > 0 &&
    selectedVesselIds.every((id) => {
      const v = vessels.find((item) => item.id === id);
      return v && v.capacity_tonnes >= voyageConfig.cargoWeight;
    });

  const canContinue = allSelectedAreCompatible && !processingStatus;

  const handleContinueClick = () => {
    if (!canContinue) return;

    if (skipAnimation) {
      onValidContinue();
      return;
    }

    setProcessingStatus('Evaluating vessel capacity and voyage constraints...');
    setTimeout(() => {
      setProcessingStatus('Fleet options ready.');
      setTimeout(() => {
        setProcessingStatus(null);
        onValidContinue();
      }, 300);
    }, 450);
  };

  return (
    <div className="stage-shell-card" style={{ maxWidth: '980px', margin: '0 auto 2.5rem' }}>
      {/* 1. Stage Header with Read-Only Context Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
              Stage 02
            </span>
            <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.75rem' }}>
              Fleet Availability
            </span>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Fleet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.35rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Select the vessels available for this voyage.
          </p>
        </div>

        {/* Demo Fleet Button */}
        <div>
          <button
            type="button"
            id="use-demo-fleet-btn"
            onClick={handleUseDemoFleet}
            style={{
              padding: '0.65rem 1.15rem',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 180, 216, 0.25) 100%)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
            title="Select all supported vessels compatible with the requested cargo"
          >
            <span>🚢</span>
            <span>Use Demo Fleet</span>
          </button>
        </div>
      </div>

      {/* Read-Only Voyage Context Banner */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Voyage Corridor</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {formatPortName(voyageConfig.sourcePort)} ➔ {formatPortName(voyageConfig.destPort)}
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cargo Payload</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.15rem' }}>
              {voyageConfig.cargoWeight.toLocaleString()} MT
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Delivery Deadline</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {formattedDeadline}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Read-only context from Stage 01
        </div>
      </div>

      {/* Processing State Banner */}
      {processingStatus && (
        <div style={{
          background: 'rgba(0, 229, 255, 0.12)',
          border: '1px solid var(--accent-cyan)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: 'var(--accent-cyan)',
          fontWeight: 700,
          fontSize: '0.85rem',
        }}>
          <span>⚡</span>
          <span>{processingStatus}</span>
        </div>
      )}

      {/* 2 & 3. Available Vessel Selection Grid */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Available Fleet Catalog ({selectedVesselIds.length} of {vessels.length} Selected)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {compatibleVessels.length} of {vessels.length} vessels compatible with {voyageConfig.cargoWeight.toLocaleString()} MT cargo
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem' }}>
          {vessels.map((vessel) => {
            const isSelected = selectedVesselIds.includes(vessel.id);
            const { isCompatible, utilization } = checkCompatibility(vessel);

            return (
              <div
                key={vessel.id}
                id={`vessel-card-${vessel.id}`}
                onClick={() => handleToggleVessel(vessel)}
                style={{
                  background: isSelected
                    ? 'rgba(0, 229, 255, 0.08)'
                    : isCompatible
                    ? 'rgba(15, 23, 42, 0.7)'
                    : 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid',
                  borderColor: isSelected
                    ? 'var(--accent-cyan)'
                    : isCompatible
                    ? 'var(--border-subtle)'
                    : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  cursor: isCompatible ? 'pointer' : 'not-allowed',
                  opacity: isCompatible ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 15px rgba(0, 229, 255, 0.18)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Header: Checkbox + Name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `1.5px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#080d1a',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && '✓'}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {vessel.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.1rem' }}>
                        {vessel.id}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isCompatible ? (isSelected ? 'badge-cyan' : 'badge-emerald') : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                    {isCompatible ? (isSelected ? 'Selected' : 'Available') : 'Capacity Limit'}
                  </span>
                </div>

                {/* Vessel Type */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  {vessel.type}
                </div>

                {/* Cargo Compatibility Indicator */}
                <div style={{
                  padding: '0.65rem 0.85rem',
                  background: isCompatible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCompatible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.85rem',
                }}>
                  {isCompatible ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>
                          ✓ Cargo compatible
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {utilization}% Utilization
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Capacity: <strong>{vessel.capacity_tonnes.toLocaleString()} MT</strong> &bull; Required: {voyageConfig.cargoWeight.toLocaleString()} MT
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>
                        ✕ Insufficient capacity
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                        Capacity: <strong>{vessel.capacity_tonnes.toLocaleString()} MT</strong> &bull; Required: {voyageConfig.cargoWeight.toLocaleString()} MT
                      </div>
                    </div>
                  )}
                </div>

                {/* Decision-Relevant Technical Specs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Speed Range: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{vessel.min_speed_knots}–{vessel.max_speed_knots} kn</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Draft: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{vessel.design_draft_m} m</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Engine Power: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{Math.round(vessel.engine_power_kw).toLocaleString()} kW</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Fuels: </span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{vessel.fuel_options.join(', ')}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Summary Warning / Status */}
      <div style={{
        background: selectedVesselIds.length > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${selectedVesselIds.length > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{selectedVesselIds.length > 0 ? '✓' : '⚠️'}</span>
          <span style={{ fontSize: '0.82rem', color: selectedVesselIds.length > 0 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
            {selectedVesselIds.length > 0
              ? `${selectedVesselIds.length} vessel${selectedVesselIds.length > 1 ? 's' : ''} assigned to voyage fleet.`
              : 'Select at least one compatible vessel from the fleet above to proceed.'}
          </span>
        </div>
        {selectedVesselIds.length > 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            IDs: {selectedVesselIds.join(', ')}
          </span>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="stage-nav-bar">
        <button
          type="button"
          id="stage-prev-btn"
          className="stage-nav-btn stage-nav-btn-secondary"
          onClick={onPrevious}
          disabled={!!processingStatus}
        >
          <span>←</span>
          <span>Previous (Voyage)</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            Stage 02 of 07
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Fleet Selection
          </div>
        </div>

        <button
          type="button"
          id="stage-continue-btn"
          className="stage-nav-btn stage-nav-btn-primary"
          onClick={handleContinueClick}
          disabled={!canContinue}
          style={{
            opacity: canContinue ? 1 : 0.45,
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
          title={canContinue ? 'Confirm fleet selection and proceed to Stage 03 (Environment)' : 'Select at least one compatible vessel to continue'}
        >
          <span>{processingStatus ? 'Processing...' : 'Continue'}</span>
          {!processingStatus && <span>→</span>}
        </button>
      </div>
    </div>
  );
};
