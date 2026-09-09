import React, { useState, useEffect, useId } from 'react';
import {
  Port,
  Vessel,
  CandidateRouteResponse,
} from '../types';
import {
  fetchPorts,
  fetchVessels,
  fetchCandidateRoutes,
} from '../services/api';

interface MaritimeRouteExplorerProps {
  onSelectRouteForFuel?: (distanceNm: number, vesselId?: string) => void;
}

export const MaritimeRouteExplorer: React.FC<MaritimeRouteExplorerProps> = ({
  onSelectRouteForFuel,
}) => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [originPortId, setOriginPortId] = useState<string>('PORT-SG');
  const [destPortId, setDestPortId] = useState<string>('PORT-RTM');
  const [vesselId, setVesselId] = useState<string>('VES-001');
  const [cargoWeightTonnes, setCargoWeightTonnes] = useState<number>(60000);

  const [loading, setLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CandidateRouteResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Generate unique IDs for accessibility
  const originSelectId = useId();
  const destSelectId = useId();
  const vesselSelectId = useId();
  const cargoInputId = useId();

  useEffect(() => {
    async function loadData() {
      try {
        const [portList, vesselList] = await Promise.all([
          fetchPorts(),
          fetchVessels(),
        ]);
        setPorts(portList);
        setVessels(vesselList);

        if (portList.length >= 2) {
          setOriginPortId(portList[0].id);
          setDestPortId(portList[1].id);
        }
        if (vesselList.length > 0) {
          setVesselId(vesselList[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load network ports');
      }
    }
    loadData();
  }, []);

  const handleGenerateRoutes = async () => {
    if (!originPortId || !destPortId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCandidateRoutes({
        origin_port_id: originPortId,
        destination_port_id: destPortId,
        vessel_id: vesselId || undefined,
        cargo_weight_tonnes: Number(cargoWeightTonnes),
      });
      setResponse(res);
      if (res.candidate_routes.length > 0) {
        setSelectedRouteId(res.candidate_routes[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate candidate routes');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (originPortId && destPortId) {
      handleGenerateRoutes();
    }
  }, [originPortId, destPortId, vesselId, cargoWeightTonnes]);

  const selectedVessel = vessels.find((v) => v.id === vesselId);
  const originPort = ports.find((p) => p.id === originPortId);
  const destPort = ports.find((p) => p.id === destPortId);

  return (
    <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-emerald">Phase 2 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              POST /api/v1/routes/candidates
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Maritime Network & Candidate Route Modeling
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Graph-based navigational passage generator evaluating segment distances, canal draft restrictions, and transit tolls.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {loading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              Resolving Graph...
            </span>
          )}
          <div className="badge badge-amber" style={{ padding: '0.4rem 0.8rem' }}>
            Simulated Maritime Network
          </div>
        </div>
      </div>


      {/* Control Bar: Origin, Destination, Vessel, Cargo */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        alignItems: 'flex-end'
      }}>
        {/* Origin Port */}
        <div>
          <label htmlFor={originSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Origin Port (Departure)
          </label>
          <select
            id={originSelectId}
            value={originPortId}
            onChange={(e) => setOriginPortId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            {ports.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
            ))}
          </select>
          {originPort && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              Max Draft: {originPort.draft_limit_m}m | Port Cost: ${originPort.port_cost.toLocaleString()}
            </div>
          )}
        </div>

        {/* Destination Port */}
        <div>
          <label htmlFor={destSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Destination Port (Arrival)
          </label>
          <select
            id={destSelectId}
            value={destPortId}
            onChange={(e) => setDestPortId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            {ports.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
            ))}
          </select>
          {destPort && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              Max Draft: {destPort.draft_limit_m}m | Port Cost: ${destPort.port_cost.toLocaleString()}
            </div>
          )}
        </div>

        {/* Vessel Draft & Capacity Testing */}
        <div>
          <label htmlFor={vesselSelectId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Fleet Vessel (Draft & Capacity)
          </label>
          <select
            id={vesselSelectId}
            value={vesselId}
            onChange={(e) => setVesselId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            {vessels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Draft: {v.design_draft_m}m, {v.capacity_tonnes.toLocaleString()}t DWT)
              </option>
            ))}
          </select>
          {selectedVessel && (
            <div style={{ fontSize: '0.7rem', color: selectedVessel.design_draft_m > 16.0 ? '#f43f5e' : 'var(--accent-emerald)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              {selectedVessel.design_draft_m > 16.0 ? `⚠️ Draft ${selectedVessel.design_draft_m}m > 16m (Suez Canal restricted)` : `✓ Draft ${selectedVessel.design_draft_m}m safe for all corridors`}
            </div>
          )}
        </div>

        {/* Cargo Weight */}
        <div>
          <label htmlFor={cargoInputId} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Cargo Payload (Tonnes)
          </label>
          <input
            id={cargoInputId}
            type="number"
            min="1000"
            max="300000"
            step="5000"
            value={cargoWeightTonnes}
            onChange={(e) => setCargoWeightTonnes(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)'
            }}
          />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Evaluates draft and berth limits
          </div>
        </div>
      </div>

      {/* Schematic Maritime Network Visualizer */}
      <div style={{
        background: 'rgba(10, 16, 30, 0.8)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🗺️</span>
            <span>Schematic Navigational Network Topology</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Segment-by-Segment Topological Graph
          </span>
        </div>

        {/* Visual Flow Representation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Common Departure Trunk */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.4rem 0.8rem', background: '#0284c7', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700 }}>
              ⚓ Singapore (Origin)
            </div>
            <span style={{ color: 'var(--text-muted)' }}>&rarr; 310 NM &rarr;</span>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              Strait of Malacca
            </div>
            <span style={{ color: 'var(--text-muted)' }}>&rarr; 1,280 NM &rarr;</span>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              Central Indian Ocean (Bifurcation Point)
            </div>
          </div>

          {/* Branching Corridors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
            {/* Branch A: Suez Canal */}
            <div style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  Corridor A: Suez Canal Transit
                </strong>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>8,280 NM</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
                Arabian Sea &rarr; Gulf of Aden &rarr; Red Sea &rarr;
                <span style={{ color: '#fbbf24', fontWeight: 700 }}> Suez Canal (Max Draft 16.0m, Toll $350k) </span>
                &rarr; Mediterranean Sea &rarr; Strait of Gibraltar
              </div>
            </div>

            {/* Branch B: Cape of Good Hope */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                  Corridor B: Cape of Good Hope
                </strong>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>11,720 NM</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
                South Indian Ocean &rarr;
                <span style={{ color: '#34d399', fontWeight: 700 }}> Cape of Good Hope (Deep Water, Toll $0) </span>
                &rarr; South Atlantic &rarr; Mid-Atlantic Passage
              </div>
            </div>
          </div>

          {/* Common Arrival Trunk */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>&rarr; Converge &rarr;</span>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              North Atlantic Approach & English Channel (480 NM)
            </div>
            <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
            <div style={{ padding: '0.4rem 0.8rem', background: '#059669', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700 }}>
              ⚓ Rotterdam (Destination)
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          color: '#fda4af',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* Candidate Route Cards */}
      {response && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Generated Candidate Maritime Routes ({response.candidate_routes.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Feasible: <strong style={{ color: 'var(--accent-emerald)' }}>{response.feasible_candidates}</strong> of {response.total_candidates}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {response.candidate_routes.map((route) => {
              const isFeasible = route.feasibility_status === 'feasible';
              const isSelected = selectedRouteId === route.id;

              return (
                <div
                  key={route.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: isSelected
                      ? '2px solid var(--accent-cyan)'
                      : isFeasible
                      ? '1px solid var(--border-subtle)'
                      : '1px solid rgba(244, 63, 94, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 0 20px rgba(0, 229, 255, 0.15)' : 'none'
                  }}
                >
                  <div>
                    {/* Top Status Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className={`badge ${isFeasible ? 'badge-emerald' : 'badge-amber'}`} style={{
                        background: isFeasible ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isFeasible ? '#34d399' : '#f43f5e',
                        border: isFeasible ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.4)',
                      }}>
                        {isFeasible ? '✓ FEASIBLE' : '✕ INFEASIBLE'}
                      </span>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {route.route_type.toUpperCase()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      {route.name}
                    </h4>

                    {/* Infeasibility Reason Alert */}
                    {!isFeasible && route.infeasibility_reasons.length > 0 && (
                      <div style={{
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.6rem 0.8rem',
                        marginBottom: '1rem',
                        fontSize: '0.75rem',
                        color: '#fda4af'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Physical Draft Restriction:</div>
                        {route.infeasibility_reasons.map((reason, idx) => (
                          <div key={idx}>• {reason}</div>
                        ))}
                      </div>
                    )}

                    {/* Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1.25rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Distance</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {route.total_distance_nm.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>NM</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Est. Transit Time</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                          {route.estimated_transit_days} <span style={{ fontSize: '0.75rem' }}>days</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          ({route.estimated_transit_hours} hrs @ 14 kn)
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Canal & Port Tolls</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                          ${route.route_cost.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Segments Count</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {route.segments?.length || route.segment_ids.length} legs
                        </div>
                      </div>
                    </div>

                    {/* Waypoint Sequence Chips */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Navigational Waypoint Sequence:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {route.waypoints?.map((wp, i) => (
                          <span
                            key={wp.id}
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                              background: wp.waypoint_type === 'canal' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: wp.waypoint_type === 'canal' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                              color: wp.waypoint_type === 'canal' ? '#fbbf24' : 'var(--text-secondary)',
                              borderRadius: 'var(--radius-sm)'
                            }}
                          >
                            {i + 1}. {wp.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Integration with Phase 1 */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => {
                        setSelectedRouteId(route.id);
                        if (onSelectRouteForFuel) {
                          onSelectRouteForFuel(route.total_distance_nm, vesselId);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                        border: '1px solid var(--accent-cyan)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <span>⚓ Use Distance in Fuel Calculator ({route.total_distance_nm.toLocaleString()} NM)</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
