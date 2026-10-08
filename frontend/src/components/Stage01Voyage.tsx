import React, { useEffect, useState } from 'react';
import { fetchPorts, fetchGlobalPorts, fetchSampleWorkflowRequest } from '../services/api';
import { Port } from '../types';

export interface VoyageFormValues {
  sourcePort: string;
  destPort: string;
  cargoWeight: number;
  departureDate: string;
  deadlineDate: string;
}

interface Stage01VoyageProps {
  values: VoyageFormValues;
  onChange: (newValues: VoyageFormValues) => void;
  onValidContinue: () => void;
  onValuesModified?: () => void;
}

const DEFAULT_PORTS: Port[] = [
  {
    id: 'SGSIN',
    name: 'Port of Singapore',
    country: 'Singapore',
    latitude: 1.29027,
    longitude: 103.851959,
    draft_limit_m: 21.0,
    max_vessel_capacity_tonnes: 250000.0,
    fuel_availability: ['HFO', 'MDO', 'LNG'],
    shore_power_available: true,
    port_cost: 15000.0,
    typical_wait_hours: 6.0,
  },
  {
    id: 'NLRTM',
    name: 'Port of Rotterdam',
    country: 'Netherlands',
    latitude: 51.92442,
    longitude: 4.477733,
    draft_limit_m: 24.0,
    max_vessel_capacity_tonnes: 300000.0,
    fuel_availability: ['HFO', 'LNG'],
    shore_power_available: true,
    port_cost: 22000.0,
    typical_wait_hours: 8.0,
  },
  {
    id: 'INBOM',
    name: 'Port of Mumbai (Nhava Sheva)',
    country: 'India',
    latitude: 18.95,
    longitude: 72.95,
    draft_limit_m: 15.5,
    max_vessel_capacity_tonnes: 180000.0,
    fuel_availability: ['HFO', 'LNG'],
    shore_power_available: false,
    port_cost: 14000.0,
    typical_wait_hours: 6.0,
  },
  {
    id: 'AEDXB',
    name: 'Port of Jebel Ali (Dubai)',
    country: 'United Arab Emirates',
    latitude: 25.01,
    longitude: 55.06,
    draft_limit_m: 17.0,
    max_vessel_capacity_tonnes: 220000.0,
    fuel_availability: ['HFO', 'MDO', 'LNG'],
    shore_power_available: true,
    port_cost: 16000.0,
    typical_wait_hours: 5.0,
  },
  {
    id: 'USNYC',
    name: 'Port of New York and New Jersey',
    country: 'United States',
    latitude: 40.68,
    longitude: -74.04,
    draft_limit_m: 16.5,
    max_vessel_capacity_tonnes: 200000.0,
    fuel_availability: ['HFO', 'MDO', 'LNG'],
    shore_power_available: true,
    port_cost: 25000.0,
    typical_wait_hours: 7.0,
  },
  {
    id: 'PORT-SG',
    name: 'Port of Singapore (Demo Alias)',
    country: 'Singapore',
    latitude: 1.29027,
    longitude: 103.851959,
    draft_limit_m: 21.0,
    max_vessel_capacity_tonnes: 250000.0,
    fuel_availability: ['HFO', 'MDO', 'LNG'],
    shore_power_available: true,
    port_cost: 15000.0,
    typical_wait_hours: 6.0,
  },
  {
    id: 'PORT-RTM',
    name: 'Port of Rotterdam (Demo Alias)',
    country: 'Netherlands',
    latitude: 51.92442,
    longitude: 4.477733,
    draft_limit_m: 24.0,
    max_vessel_capacity_tonnes: 300000.0,
    fuel_availability: ['HFO', 'LNG'],
    shore_power_available: true,
    port_cost: 22000.0,
    typical_wait_hours: 8.0,
  },
];

export const Stage01Voyage: React.FC<Stage01VoyageProps> = ({
  values,
  onChange,
  onValidContinue,
  onValuesModified,
}) => {
  const [ports, setPorts] = useState<Port[]>(DEFAULT_PORTS);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [demoLoadedNotification, setDemoLoadedNotification] = useState(false);

  const [sourcePortSearch, setSourcePortSearch] = useState('');
  const [destPortSearch, setDestPortSearch] = useState('');

  // Sync internal search state with values if they differ initially (e.g. demo load)
  useEffect(() => {
    if (values.sourcePort && ports.length > 0) {
      const p = ports.find(p => p.id === values.sourcePort);
      if (p) setSourcePortSearch(`${p.name} (${p.id})`);
    }
  }, [values.sourcePort, ports]);

  useEffect(() => {
    if (values.destPort && ports.length > 0) {
      const p = ports.find(p => p.id === values.destPort);
      if (p) setDestPortSearch(`${p.name} (${p.id})`);
    }
  }, [values.destPort, ports]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchPorts(), fetchGlobalPorts()])
      .then(([backendPorts, globalPorts]) => {
        if (!mounted) return;
        const merged = new Map<string, Port>();
        // Add global ports first
        globalPorts.forEach(p => merged.set(p.id, p));
        // Overwrite/add backend ports (preserves custom metadata like draft_limit_m, port_cost)
        backendPorts.forEach(p => merged.set(p.id, p));
        
        const finalPorts = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (finalPorts.length > 0) {
          setPorts(finalPorts);
        }
      })
      .catch(() => {
        // Fallback to default demo ports
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Validation Logic
  const errors: {
    sourcePort?: string;
    destPort?: string;
    cargoWeight?: string;
    departureDate?: string;
    deadlineDate?: string;
  } = {};

  if (!values.sourcePort) {
    errors.sourcePort = 'Source port is required. Please select a valid port from the list.';
  }

  if (!values.destPort) {
    errors.destPort = 'Destination port is required. Please select a valid port from the list.';
  } else if (values.sourcePort && values.sourcePort === values.destPort) {
    errors.destPort = 'Destination port must be different from source port.';
  }

  if (typeof values.cargoWeight !== 'number' || isNaN(values.cargoWeight) || values.cargoWeight <= 0) {
    errors.cargoWeight = 'Cargo load must be greater than 0 MT.';
  }

  const departureMs = new Date(values.departureDate).getTime();
  const deadlineMs = new Date(values.deadlineDate).getTime();

  if (!values.departureDate || isNaN(departureMs)) {
    errors.departureDate = 'Preferred departure date and time is required.';
  } else if (!isNaN(deadlineMs) && departureMs >= deadlineMs) {
    errors.departureDate = 'Departure must occur before the delivery deadline.';
  }

  if (!values.deadlineDate || isNaN(deadlineMs)) {
    errors.deadlineDate = 'Delivery deadline must be a valid date and time.';
  } else if (!isNaN(departureMs) && deadlineMs <= departureMs) {
    errors.deadlineDate = 'Delivery deadline must be later than the departure datetime.';
  }

  const isFormValid = Object.keys(errors).length === 0;

  // Transit window calculation in days
  const transitDays =
    !isNaN(departureMs) && !isNaN(deadlineMs) && deadlineMs > departureMs
      ? ((deadlineMs - departureMs) / (1000 * 60 * 60 * 24)).toFixed(1)
      : null;

  const handleFieldChange = (field: keyof VoyageFormValues, val: any) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const updated = { ...values, [field]: val };
    onChange(updated);
    if (onValuesModified) {
      onValuesModified();
    }
  };

  const handlePortSearchChange = (field: 'sourcePort' | 'destPort', val: string) => {
    if (field === 'sourcePort') setSourcePortSearch(val);
    if (field === 'destPort') setDestPortSearch(val);

    setTouched((prev) => ({ ...prev, [field]: true }));
    
    // Strict validation: Attempt to match the exact string or ID
    const matched = ports.find(p => `${p.name} (${p.id})` === val || p.id === val);
    const resolvedId = matched ? matched.id : '';
    
    const updated = { ...values, [field]: resolvedId };
    onChange(updated);
    if (onValuesModified) onValuesModified();
  };

  const handleLoadDemo = async () => {
    try {
      const sample = await fetchSampleWorkflowRequest();
      if (sample?.voyage_request) {
        const departureIso = sample.voyage_request.departure_datetime
          ? sample.voyage_request.departure_datetime.slice(0, 16)
          : '2026-10-01T12:00';
        const deadlineIso = sample.voyage_request.deadline_datetime
          ? sample.voyage_request.deadline_datetime.slice(0, 16)
          : '2026-10-29T12:00';

        onChange({
          sourcePort: sample.voyage_request.source_port_id || 'PORT-SG',
          destPort: sample.voyage_request.destination_port_id || 'PORT-RTM',
          cargoWeight: sample.voyage_request.cargo_weight_tonnes || 60000,
          departureDate: departureIso,
          deadlineDate: deadlineIso,
        });
      }
    } catch {
      onChange({
        sourcePort: 'PORT-SG',
        destPort: 'PORT-RTM',
        cargoWeight: 60000,
        departureDate: '2026-10-01T12:00',
        deadlineDate: '2026-10-29T12:00',
      });
    }

    setTouched({
      sourcePort: true,
      destPort: true,
      cargoWeight: true,
      departureDate: true,
      deadlineDate: true,
    });
    setDemoLoadedNotification(true);
    setTimeout(() => setDemoLoadedNotification(false), 3000);

    if (onValuesModified) {
      onValuesModified();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      sourcePort: true,
      destPort: true,
      cargoWeight: true,
      departureDate: true,
      deadlineDate: true,
    });

    if (isFormValid) {
      onValidContinue();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stage-shell-card" style={{ maxWidth: '980px', margin: '0 auto 2.5rem' }}>
      {/* Stage Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
              Stage 01
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
              Shipment Definition
            </span>
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Voyage
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.35rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Define the shipment you want to optimize: origin, destination, cargo weight, and operational deadlines.
          </p>
        </div>

        {/* Load SIH Demo Preset Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <button
            type="button"
            id="load-sih-demo-btn"
            onClick={handleLoadDemo}
            style={{
              padding: '0.65rem 1.15rem',
              background: 'var(--accent-teal-subtle)',
              border: '1px solid #BCE5D7',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-teal-dark)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Populate verified Singapore to Rotterdam 60,000 MT voyage scenario"
          >
            <span>🎯</span>
            <span>Load SIH Demo Scenario</span>
          </button>
          {demoLoadedNotification && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-teal-dark)', fontWeight: 600 }}>
              ✓ SIH Demo values populated
            </span>
          )}
        </div>
      </div>

      {/* Primary Input Fields Card */}
      <div style={{
        background: 'var(--bg-card-inset)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.75rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          {/* 1. Source Port */}
          <div>
            <label htmlFor="voyage-source-port" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
              Source Port <span style={{ color: '#D44A61' }}>*</span>
            </label>
            <input
              id="voyage-source-port"
              list="ports-list"
              value={sourcePortSearch}
              onChange={(e) => handlePortSearchChange('sourcePort', e.target.value)}
              placeholder="Search origin port..."
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: '#FFFFFF',
                border: `1px solid ${touched.sourcePort && errors.sourcePort ? '#D44A61' : 'var(--border-medium)'}`,
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <datalist id="ports-list">
              {ports.map((p) => (
                <option key={`src-${p.id}`} value={`${p.name} (${p.id})`} />
              ))}
            </datalist>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Commercial port of departure with verified bunker availability.
            </div>
            {touched.sourcePort && errors.sourcePort && (
              <div style={{ fontSize: '0.78rem', color: '#D44A61', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠️</span>
                <span>{errors.sourcePort}</span>
              </div>
            )}
          </div>

          {/* 2. Destination Port */}
          <div>
            <label htmlFor="voyage-dest-port" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
              Destination Port <span style={{ color: '#D44A61' }}>*</span>
            </label>
            <input
              id="voyage-dest-port"
              list="ports-list"
              value={destPortSearch}
              onChange={(e) => handlePortSearchChange('destPort', e.target.value)}
              placeholder="Search destination port..."
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: '#FFFFFF',
                border: `1px solid ${touched.destPort && errors.destPort ? '#D44A61' : 'var(--border-medium)'}`,
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Discharge port for vessel berthing and cargo unloading.
            </div>
            {touched.destPort && errors.destPort && (
              <div style={{ fontSize: '0.78rem', color: '#D44A61', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠️</span>
                <span>{errors.destPort}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* 3. Cargo Load (MT) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label htmlFor="voyage-cargo-load" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cargo Load <span style={{ color: '#D44A61' }}>*</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-ocean)', fontWeight: 700 }}>
                Metric Tonnes (MT)
              </span>
            </div>
            <input
              id="voyage-cargo-load"
              type="number"
              min={0}
              step={500}
              value={isNaN(values.cargoWeight) ? '' : values.cargoWeight}
              onChange={(e) => handleFieldChange('cargoWeight', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 60000"
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: '#FFFFFF',
                border: `1px solid ${touched.cargoWeight && errors.cargoWeight ? '#D44A61' : 'var(--border-medium)'}`,
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Total shipment weight to be transported (determines vessel displacement and draft).
            </div>
            {touched.cargoWeight && errors.cargoWeight && (
              <div style={{ fontSize: '0.78rem', color: '#D44A61', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠️</span>
                <span>{errors.cargoWeight}</span>
              </div>
            )}
          </div>

          {/* 4. Preferred Departure Date & Time */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label htmlFor="voyage-departure-date" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Preferred Departure Date &amp; Time <span style={{ color: '#D44A61' }}>*</span>
              </label>
            </div>
            <input
              id="voyage-departure-date"
              type="datetime-local"
              value={values.departureDate}
              onChange={(e) => handleFieldChange('departureDate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: '#FFFFFF',
                border: `1px solid ${touched.departureDate && errors.departureDate ? '#D44A61' : 'var(--border-medium)'}`,
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Scheduled departure time from origin (UTC).
            </div>
            {touched.departureDate && errors.departureDate && (
              <div style={{ fontSize: '0.78rem', color: '#D44A61', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠️</span>
                <span>{errors.departureDate}</span>
              </div>
            )}
          </div>

          {/* 5. Delivery Deadline */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label htmlFor="voyage-delivery-deadline" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Delivery Deadline <span style={{ color: '#D44A61' }}>*</span>
              </label>
              {transitDays && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal-dark)', fontWeight: 700 }}>
                  Transit: {transitDays} days
                </span>
              )}
            </div>
            <input
              id="voyage-delivery-deadline"
              type="datetime-local"
              value={values.deadlineDate}
              onChange={(e) => handleFieldChange('deadlineDate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                background: '#FFFFFF',
                border: `1px solid ${touched.deadlineDate && errors.deadlineDate ? '#D44A61' : 'var(--border-medium)'}`,
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.92rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Required arrival time at destination (relative to reference departure: {values.departureDate.replace('T', ' ')} UTC).
            </div>
            {touched.deadlineDate && errors.deadlineDate && (
              <div style={{ fontSize: '0.78rem', color: '#D44A61', marginTop: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚠️</span>
                <span>{errors.deadlineDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voyage Scenario Summary Badge */}
      <div style={{
        background: isFormValid ? 'var(--accent-teal-subtle)' : 'var(--accent-amber-light)',
        border: `1px solid ${isFormValid ? '#C2E8DC' : '#F5DEBF'}`,
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
          <span style={{ fontSize: '1rem' }}>{isFormValid ? '✓' : 'ℹ️'}</span>
          <span style={{ fontSize: '0.82rem', color: isFormValid ? 'var(--accent-teal-dark)' : 'var(--accent-amber)', fontWeight: 600 }}>
            {isFormValid
              ? `Shipment Configured: ${values.sourcePort} ➔ ${values.destPort} &bull; ${values.cargoWeight.toLocaleString()} MT`
              : 'Complete the required voyage parameters above to unlock Stage 02 (Fleet).'}
          </span>
        </div>
        {isFormValid && transitDays && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Allowed Window: {transitDays} days ({Math.round(parseFloat(transitDays) * 24)}h)
          </span>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="stage-nav-bar">
        <button
          type="button"
          id="stage-prev-btn"
          className="stage-nav-btn stage-nav-btn-secondary"
          disabled={true}
          title="This is the first stage in the workflow."
        >
          <span>←</span>
          <span>Previous</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-ocean)' }}>
            Stage 01 of 07
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Voyage Configuration
          </div>
        </div>

        <button
          type="submit"
          id="stage-continue-btn"
          className="stage-nav-btn stage-nav-btn-primary"
          disabled={!isFormValid}
          style={{
            opacity: isFormValid ? 1 : 0.45,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
          }}
          title={isFormValid ? 'Save voyage configuration and proceed to Stage 02 (Fleet)' : 'Resolve validation errors to continue'}
        >
          <span>Continue</span>
          <span>→</span>
        </button>
      </div>
    </form>
  );
};
