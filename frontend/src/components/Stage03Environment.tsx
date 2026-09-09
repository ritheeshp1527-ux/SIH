import React, { useEffect, useState, useId } from 'react';
import {
  MaritimeRoute,
  RouteEnvironmentalAssessmentResponse,
  WeatherScenarioPreset,
  WeatherOceanStageResult,
  Vessel,
} from '../types';
import {
  fetchRoutes,
  fetchWeatherScenarios,
  assessRouteEnvironmentalImpact,
  fetchVessels,
} from '../services/api';
import { VoyageFormValues } from './Stage01Voyage';

export interface Stage03EnvironmentProps {
  voyageConfig: VoyageFormValues;
  selectedVesselIds: string[];
  environmentResult: WeatherOceanStageResult | null;
  onEnvironmentProcessed: (result: WeatherOceanStageResult) => void;
  onValidContinue: () => void;
  onPrevious: () => void;
  skipAnimation?: boolean;
}

// Fallback baseline routes matching backend data/demo_maritime_routes.json
const DEFAULT_ROUTES: MaritimeRoute[] = [
  {
    id: 'RT-SG-RTM-SUEZ',
    name: 'Singapore to Rotterdam via Suez Canal',
    origin_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    waypoint_ids: [
      'PORT-SG', 'WP-MALACCA', 'WP-INDIAN-OCEAN', 'WP-ARABIAN-SEA', 'WP-GULF-ADEN',
      'WP-RED-SEA', 'WP-SUEZ', 'WP-MED-SEA', 'WP-GIBRALTAR', 'WP-ATLANTIC', 'PORT-RTM'
    ],
    segment_ids: [
      'SEG-SG-MALACCA', 'SEG-MALACCA-INDIAN', 'SEG-INDIAN-ARABIAN', 'SEG-ARABIAN-GULF-ADEN',
      'SEG-GULF-ADEN-RED-SEA', 'SEG-RED-SEA-SUEZ', 'SEG-SUEZ-TRANSIT', 'SEG-MED-GIBRALTAR',
      'SEG-GIBRALTAR-ATLANTIC', 'SEG-ATLANTIC-RTM'
    ],
    total_distance_nm: 8280.0,
    estimated_transit_hours: 591.4,
    estimated_transit_days: 24.6,
    route_cost: 387000.0,
    restrictions: ['CANAL_TRANSIT', 'TSS_COMPLIANCE', 'HRA_SECURITY', 'CONGESTED_STRAIT', 'ECA_EMISSION_CONTROL'],
    route_type: 'canal_transit',
    feasibility_status: 'feasible',
    infeasibility_reasons: [],
    disclaimer: 'Simulated demo maritime route corridor.',
  },
  {
    id: 'RT-SG-RTM-CAPE',
    name: 'Singapore to Rotterdam via Cape of Good Hope',
    origin_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    waypoint_ids: [
      'PORT-SG', 'WP-MALACCA', 'WP-INDIAN-OCEAN', 'WP-CAPE', 'WP-MID-ATLANTIC', 'WP-ATLANTIC', 'PORT-RTM'
    ],
    segment_ids: [
      'SEG-SG-MALACCA', 'SEG-MALACCA-INDIAN', 'SEG-INDIAN-CAPE', 'SEG-CAPE-MID-ATLANTIC',
      'SEG-MID-ATLANTIC-ATLANTIC', 'SEG-ATLANTIC-RTM'
    ],
    total_distance_nm: 11720.0,
    estimated_transit_hours: 837.1,
    estimated_transit_days: 34.9,
    route_cost: 37000.0,
    restrictions: ['TSS_COMPLIANCE', 'ECA_EMISSION_CONTROL'],
    route_type: 'open_ocean',
    feasibility_status: 'feasible',
    infeasibility_reasons: [],
    disclaimer: 'Simulated demo maritime route corridor.',
  },
];

const DEFAULT_VESSELS: Vessel[] = [
  {
    id: 'VES-001',
    name: 'Poseidon Leader',
    type: 'Ultra Large Container Vessel (ULCV)',
    capacity_tonnes: 120000.0,
    min_speed_knots: 10.0,
    max_speed_knots: 22.0,
    engine_power_kw: 45000.0,
    fuel_options: ['VLSFO', 'LNG'],
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
    fuel_options: ['VLSFO', 'MGO', 'BIO-B20'],
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
    fuel_options: ['VLSFO', 'MGO'],
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
    fuel_options: ['LNG', 'MGO'],
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
    fuel_options: ['MGO', 'VLSFO'],
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
    fuel_options: ['MGO', 'VLSFO'],
    design_draft_m: 11.0,
  },
];

// Presentation weather scenario presets
const DEFAULT_SCENARIOS: WeatherScenarioPreset[] = [
  {
    id: 'nominal',
    title: 'Nominal Baseline',
    description: 'Standard seasonal weather with nominal currents along major corridors.',
    expected_behavior: 'Both Suez and Cape corridors feasible; standard baseline fuel factors.',
    route_id: 'RT-SG-RTM-SUEZ',
    vessel_id: 'VES-001',
    speed_knots: 14.0,
  },
  {
    id: 'scenario-a-favorable-current',
    title: 'Scenario A: Assisting Currents',
    description: 'Favorable monsoon drift surface currents accelerate vessel progress.',
    expected_behavior: 'Effective SOG increases by +1.5 to +2.5 kts; voyage time shortened.',
    route_id: 'RT-SG-RTM-SUEZ',
    vessel_id: 'VES-001',
    speed_knots: 14.0,
  },
  {
    id: 'scenario-b-adverse-current',
    title: 'Scenario B: Adverse Currents',
    description: 'Head-currents and strong opposing winds in the Red Sea and Bab-el-Mandeb.',
    expected_behavior: 'Effective SOG drops below STW; hydrodynamic resistance increases fuel multiplier.',
    route_id: 'RT-SG-RTM-SUEZ',
    vessel_id: 'VES-001',
    speed_knots: 14.0,
  },
  {
    id: 'scenario-c-rough-sea',
    title: 'Scenario C: Rough Sea State',
    description: 'High seasonal swell across Bay of Biscay and Cape approaches (Hs ~ 4.5m).',
    expected_behavior: 'Routes remain feasible with navigational swell advisories.',
    route_id: 'RT-SG-RTM-CAPE',
    vessel_id: 'VES-002',
    speed_knots: 14.0,
  },
  {
    id: 'scenario-d-storm',
    title: 'Scenario D: Severe Cyclone / Storm Breach',
    description: 'Severe cyclonic storm in Arabian Sea: 7.5m waves, Sea State 8, storm flag active.',
    expected_behavior: 'Suez corridor fails safety check; eliminated from candidate search space.',
    route_id: 'RT-SG-RTM-SUEZ',
    vessel_id: 'VES-001',
    speed_knots: 14.0,
  },
  {
    id: 'scenario-e-route-comparison',
    title: 'Scenario E: Route Comparison',
    description: 'Suez headwinds vs Cape Agulhas tail current assistance trade-off.',
    expected_behavior: 'Cape route gains +2.2 kts Agulhas jet while Suez faces resistance.',
    route_id: 'RT-SG-RTM-CAPE',
    vessel_id: 'VES-001',
    speed_knots: 15.0,
  },
  {
    id: 'scenario-all-infeasible-sim',
    title: 'Simulate: All Routes Infeasible',
    description: 'Simulated extreme multi-basin superstorm arresting all candidate corridors.',
    expected_behavior: 'All routes eliminated; Continue button is safely blocked with alert.',
    route_id: 'RT-SG-RTM-SUEZ',
    vessel_id: 'VES-001',
    speed_knots: 14.0,
  },
];

interface RouteFeasibilityCardData {
  route: MaritimeRoute;
  draftRequirementM: number | null;
  draftNote: string;
  isFeasible: boolean;
  statusTag: 'feasible' | 'constrained' | 'infeasible';
  reasons: string[];
  warnings: string[];
  windSpeedKnots: number;
  significantWaveM: number;
  seaState: number;
  alongTrackCurrentKnots: number;
  currentType: 'favorable' | 'adverse' | 'neutral';
  commandedStwKnots: number;
  effectiveSogKnots: number;
  demoEnvFuelFactor: number;
  riskLevel: string;
}

export const Stage03Environment: React.FC<Stage03EnvironmentProps> = ({
  voyageConfig,
  selectedVesselIds,
  environmentResult,
  onEnvironmentProcessed,
  onValidContinue,
  onPrevious,
  skipAnimation = false,
}) => {
  const [routes, setRoutes] = useState<MaritimeRoute[]>(DEFAULT_ROUTES);
  const [vessels, setVessels] = useState<Vessel[]>(DEFAULT_VESSELS);
  const [scenarios, setScenarios] = useState<WeatherScenarioPreset[]>(DEFAULT_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    environmentResult?.scenario_id || 'nominal'
  );

  // Processing sequence state: 0 = unstarted, 1 = corridor, 2 = weather, 3 = safety, 4 = complete
  const [processingStep, setProcessingStep] = useState<number>(skipAnimation ? 4 : 0);
  const [isProcessing, setIsProcessing] = useState<boolean>(!skipAnimation);

  const scenarioSelectId = useId();

  // Load baseline routes, vessels, and scenarios
  useEffect(() => {
    let mounted = true;
    Promise.all([fetchRoutes(), fetchVessels(), fetchWeatherScenarios()])
      .then(([rList, vList, sList]) => {
        if (!mounted) return;
        if (rList && rList.length > 0) setRoutes(rList);
        if (vList && vList.length > 0) setVessels(vList);
        if (sList && sList.length > 0) {
          // Merge with all-infeasible simulation option
          const combined = [
            ...sList,
            DEFAULT_SCENARIOS.find((s) => s.id === 'scenario-all-infeasible-sim')!,
          ];
          setScenarios(combined);
        }
      })
      .catch(() => {
        // Fallback to default presets
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Background check for backend assessment API
  useEffect(() => {
    if (selectedVesselIds.length > 0 && routes.length > 0 && selectedScenarioId !== 'scenario-all-infeasible-sim') {
      assessRouteEnvironmentalImpact({
        route_id: routes[0].id,
        vessel_id: selectedVesselIds[0],
        speed_knots: 14.0,
        scenario_id: selectedScenarioId === 'nominal' ? undefined : selectedScenarioId,
      }).catch(() => {
        // Fallback to deterministic model
      });
    }
  }, [routes, selectedVesselIds, selectedScenarioId]);

  // Compute evaluation results for all candidate routes
  const evaluatedRoutes: RouteFeasibilityCardData[] = routes.map((route) => {
    const isSuez = route.id.includes('SUEZ');
    const isCape = route.id.includes('CAPE');

    // Route draft requirement (Suez canal transit limit is 16.0m, Cape has no canal draft limit)
    const draftRequirementM = isSuez ? 16.0 : null;
    const draftNote = isSuez
      ? 'Max permissible transit draft: 16.0 m (Suez Canal Authority)'
      : isCape
      ? 'Unrestricted deep-water ocean passage (Cape of Good Hope)'
      : 'Unrestricted deep-water ocean passage (No canal draft restriction)';

    // Command speed baseline
    const commandedStw = 14.0;

    // Environmental metrics based on selected scenario
    let windSpeed = 14.0;
    let waveHeight = 1.6;
    let seaState = 3;
    let alongTrackCurrent = 0.0;
    let fuelFactor = 1.050;
    let isFeasible = true;
    const reasons: string[] = [];
    const warnings: string[] = [];
    let riskLevel = 'LOW';

    if (selectedScenarioId === 'nominal') {
      if (isSuez) {
        alongTrackCurrent = 0.4;
        waveHeight = 1.4;
        seaState = 2;
        fuelFactor = 1.062;
        riskLevel = 'LOW';
      } else {
        alongTrackCurrent = 0.2;
        waveHeight = 2.2;
        seaState = 3;
        fuelFactor = 1.121;
        riskLevel = 'LOW';
      }
    } else if (selectedScenarioId === 'scenario-a-favorable-current') {
      if (isSuez) {
        alongTrackCurrent = 2.1;
        waveHeight = 1.5;
        seaState = 3;
        fuelFactor = 1.018;
        riskLevel = 'LOW';
        warnings.push('Monsoon drift assisting forward speed over ground (+2.1 kn).');
      } else {
        alongTrackCurrent = 0.8;
        waveHeight = 2.0;
        seaState = 3;
        fuelFactor = 1.095;
      }
    } else if (selectedScenarioId === 'scenario-b-adverse-current') {
      if (isSuez) {
        alongTrackCurrent = -1.9;
        waveHeight = 2.8;
        seaState = 5;
        windSpeed = 28.0;
        fuelFactor = 1.145;
        riskLevel = 'MODERATE';
        warnings.push('Headwinds and adverse currents in Red Sea bottleneck (-1.9 kn).');
      } else {
        alongTrackCurrent = -0.4;
        waveHeight = 2.4;
        seaState = 4;
        fuelFactor = 1.135;
      }
    } else if (selectedScenarioId === 'scenario-c-rough-sea') {
      if (isSuez) {
        alongTrackCurrent = 0.1;
        waveHeight = 2.2;
        seaState = 4;
        fuelFactor = 1.085;
      } else {
        alongTrackCurrent = -0.5;
        waveHeight = 4.6;
        seaState = 6;
        windSpeed = 34.0;
        fuelFactor = 1.282;
        riskLevel = 'HIGH';
        warnings.push('Elevated swell (4.6m) and rough Sea State 6 near Cape of Good Hope.');
      }
    } else if (selectedScenarioId === 'scenario-d-storm') {
      if (isSuez) {
        alongTrackCurrent = -3.2;
        waveHeight = 7.5;
        seaState = 8;
        windSpeed = 58.0;
        fuelFactor = 1.450;
        riskLevel = 'CRITICAL';
        isFeasible = false;
        reasons.push('EXCESSIVE_WAVE_HEIGHT: Significant wave height 7.5m exceeds permissible safety limit of 6.0m in Arabian Sea corridor.');
        reasons.push('SEA_STATE_TOO_HIGH: WMO Sea State 8 exceeds navigational threshold of 7.');
        reasons.push('STORM_CONDITION: Active severe tropical cyclone / gale flag present in passage.');
      } else {
        alongTrackCurrent = -0.6;
        waveHeight = 2.8;
        seaState = 4;
        fuelFactor = 1.140;
        riskLevel = 'MODERATE';
        warnings.push('Open ocean passage remains clear of Arabian Sea cyclonic depression.');
      }
    } else if (selectedScenarioId === 'scenario-e-route-comparison') {
      if (isSuez) {
        alongTrackCurrent = -1.8;
        waveHeight = 2.4;
        seaState = 4;
        fuelFactor = 1.115;
        riskLevel = 'MODERATE';
        warnings.push('Opposing head-currents decelerating transit.');
      } else {
        alongTrackCurrent = 2.2;
        waveHeight = 3.2;
        seaState = 5;
        fuelFactor = 1.082;
        riskLevel = 'MODERATE';
        warnings.push('Strong assisting Agulhas current (+2.2 kn) accelerating transit.');
      }
    } else if (selectedScenarioId === 'scenario-all-infeasible-sim') {
      // Both routes disqualified to demonstrate safety blocking behavior
      isFeasible = false;
      riskLevel = 'CRITICAL';
      if (isSuez) {
        alongTrackCurrent = -3.5;
        waveHeight = 7.8;
        seaState = 8;
        windSpeed = 62.0;
        reasons.push('EXCESSIVE_WAVE_HEIGHT: Significant wave height 7.8m exceeds safety limit of 6.0m.');
        reasons.push('STORM_CONDITION: Severe cyclonic activity in Gulf of Aden / Arabian Sea.');
      } else {
        alongTrackCurrent = -4.0;
        waveHeight = 8.5;
        seaState = 9;
        windSpeed = 65.0;
        reasons.push('EXCESSIVE_WAVE_HEIGHT: Southern Ocean swell of 8.5m exceeds permissible safety threshold (6.0m).');
        reasons.push('SEA_STATE_TOO_HIGH: WMO Sea State 9 (Phenomenal) unsafe for commercial navigation.');
      }
    }

    // Check vessel draft constraints if applicable
    const selectedVesselObjects = vessels.filter((v) => selectedVesselIds.includes(v.id));
    if (draftRequirementM !== null) {
      const draftingOverVessels = selectedVesselObjects.filter((v) => v.design_draft_m > draftRequirementM);
      if (draftingOverVessels.length === selectedVesselObjects.length && selectedVesselObjects.length > 0) {
        isFeasible = false;
        reasons.push(`VESSEL_DRAFT_RESTRICTION: All selected vessels (${draftingOverVessels.map(v => `${v.name} [${v.design_draft_m}m]`).join(', ')}) exceed maximum route draft limit of ${draftRequirementM}m.`);
      }
    }

    const effectiveSog = Math.max(0.1, commandedStw + alongTrackCurrent);
    const currentType = alongTrackCurrent > 0.1 ? 'favorable' : alongTrackCurrent < -0.1 ? 'adverse' : 'neutral';
    const statusTag = !isFeasible ? 'infeasible' : warnings.length > 0 ? 'constrained' : 'feasible';

    return {
      route,
      draftRequirementM,
      draftNote,
      isFeasible,
      statusTag,
      reasons,
      warnings,
      windSpeedKnots: windSpeed,
      significantWaveM: waveHeight,
      seaState,
      alongTrackCurrentKnots: alongTrackCurrent,
      currentType,
      commandedStwKnots: commandedStw,
      effectiveSogKnots: effectiveSog,
      demoEnvFuelFactor: fuelFactor,
      riskLevel,
    };
  });

  const feasibleRoutes = evaluatedRoutes.filter((r) => r.isFeasible);
  const excludedRoutes = evaluatedRoutes.filter((r) => !r.isFeasible);

  // Processing animation timer
  useEffect(() => {
    if (skipAnimation) {
      setProcessingStep(4);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    const t1 = setTimeout(() => setProcessingStep(2), 250);
    const t2 = setTimeout(() => setProcessingStep(3), 500);
    const t3 = setTimeout(() => {
      setProcessingStep(4);
      setIsProcessing(false);
    }, 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [selectedScenarioId, skipAnimation]);

  // Synchronize stage result to parent workflow shell whenever evaluation changes and processing completes
  useEffect(() => {
    if (processingStep === 4) {
      const assessments: Record<string, RouteEnvironmentalAssessmentResponse> = {};
      const fuelFactors: Record<string, number> = {};

      evaluatedRoutes.forEach((item) => {
        fuelFactors[item.route.id] = item.demoEnvFuelFactor;
        assessments[item.route.id] = {
          status: item.isFeasible ? 'feasible' : 'infeasible',
          disclaimer: 'Simulated demo environmental conditions.',
          environmental_disclaimer: 'Demo environmental fuel factor — simulated sensitivity multiplier; not calibrated on real data.',
          route_id: item.route.id,
          route_name: item.route.name,
          vessel_id: selectedVesselIds[0] || 'VES-001',
          vessel_name: 'Selected Fleet',
          vessel_speed_knots: item.commandedStwKnots,
          total_distance_nm: item.route.total_distance_nm,
          baseline_travel_time_hours: item.route.estimated_transit_hours,
          baseline_travel_time_days: item.route.estimated_transit_days,
          weather_adjusted_travel_time_hours: item.route.total_distance_nm / item.effectiveSogKnots,
          weather_adjusted_travel_time_days: (item.route.total_distance_nm / item.effectiveSogKnots) / 24,
          time_delta_hours: (item.route.total_distance_nm / item.effectiveSogKnots) - item.route.estimated_transit_hours,
          aggregate_demo_environmental_fuel_factor: item.demoEnvFuelFactor,
          aggregate_weather_fuel_factor: item.demoEnvFuelFactor,
          overall_risk_level: item.riskLevel,
          is_feasible: item.isFeasible,
          infeasibility_reasons: item.reasons,
          warnings: item.warnings,
          segment_assessments: [],
        };
      });

      const stageResult: WeatherOceanStageResult = {
        status: feasibleRoutes.length > 0 ? 'completed' : 'no_feasible_routes',
        scenario_id: selectedScenarioId,
        assessed_routes_count: evaluatedRoutes.length,
        route_assessments: assessments,
        safe_routes_count: feasibleRoutes.length,
        unsafe_routes_count: excludedRoutes.length,
        weather_fuel_factors: fuelFactors,
        notes: [
          `Scenario: ${selectedScenarioId}`,
          `${feasibleRoutes.length} of ${evaluatedRoutes.length} candidate passages feasible.`,
        ],
      };

      onEnvironmentProcessed(stageResult);
    }
  }, [processingStep, selectedScenarioId]);

  // Selected fleet display names
  const selectedVesselsList = vessels.filter((v) => selectedVesselIds.includes(v.id));
  const fleetSummaryText = selectedVesselsList.length > 0
    ? selectedVesselsList.map((v) => `${v.name} (${v.id})`).join(', ')
    : `${selectedVesselIds.length} vessels selected`;

  const canContinue = processingStep === 4 && feasibleRoutes.length > 0;

  return (
    <div className="stage-shell-card" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. STAGE HEADER & VOYAGE CONTEXT BAR                          */}
      {/* ------------------------------------------------------------- */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-cyan">03 / 07</span>
              <span className="badge badge-purple" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                Ocean &amp; Weather Modeling
              </span>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                Deterministic Feasibility
              </span>
            </div>

            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span>🌊</span>
              <span>Environment</span>
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.45rem', maxWidth: '850px', lineHeight: 1.5 }}>
              Check weather, ocean conditions, and route feasibility. Evaluates segment-level winds, significant wave heights, along-track ocean currents, and physical draft constraints before optimization.
            </p>
          </div>

          <div style={{
            padding: '0.55rem 1.15rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}>
            Status: <strong style={{ color: canContinue ? '#34d399' : isProcessing ? 'var(--accent-cyan)' : '#f87171' }}>
              {isProcessing ? 'Evaluating Conditions...' : canContinue ? `${feasibleRoutes.length} Feasible Routes Ready` : 'No Feasible Routes'}
            </strong>
          </div>
        </div>

        {/* Read-Only Voyage & Fleet Context Bar */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.9rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Origin → Destination
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{voyageConfig.sourcePort}</span>
              <span style={{ color: 'var(--accent-cyan)' }}>→</span>
              <span>{voyageConfig.destPort}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Cargo Load (Stage 01)
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {Number(voyageConfig.cargoWeight).toLocaleString()} MT
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Selected Fleet (Stage 02)
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fleetSummaryText}>
              {fleetSummaryText}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Current Impact Model
            </div>
            <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#38bdf8', marginTop: '0.2rem' }}>
              Speed Over Ground (SOG = STW + Ocean Drift)
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ENVIRONMENTAL DATA SOURCE & HONESTY LABEL                   */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🌦️</span>
              <span>Environmental Data</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Corridor oceanographic conditions, wave regimes, and directional surface currents.
            </div>
          </div>

          {/* Honest Source Label */}
          <div style={{
            padding: '0.35rem 0.75rem',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
          }}>
            <span>⚠️</span>
            <span>Demo Environmental Data — Simulated environmental conditions</span>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
          Deterministic demonstration dataset calibrated for the Singapore–Rotterdam maritime corridors.
          <strong style={{ color: '#fbbf24' }}> Not a live external weather API feed.</strong> All along-track currents, significant wave heights (Hs), and demo environmental fuel factors (<em>f_env</em>) are simulated sensitivity models engineered for reproducible SIH evaluation.
        </p>

        {/* Presentation Scenario Selector */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <label htmlFor={scenarioSelectId} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
            Presentation Weather Scenario Preset
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              id={scenarioSelectId}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              style={{
                flex: '1 1 300px',
                padding: '0.55rem 0.85rem',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title} — {sc.description}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setProcessingStep(0);
                setTimeout(() => setProcessingStep(4), skipAnimation ? 0 : 600);
              }}
              style={{
                padding: '0.55rem 1rem',
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-cyan)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>↻</span>
              <span>Re-Evaluate Environment</span>
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
            Expected behavior:{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {scenarios.find((s) => s.id === selectedScenarioId)?.expected_behavior || 'Evaluates physical constraints.'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PROCESSING SEQUENCE BANNER                                 */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.55)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem', fontWeight: 700 }}>
          Environmental Feasibility Sequence
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
          {/* Step 1: Corridor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: processingStep >= 1 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(15, 23, 42, 0.3)',
            border: `1px solid ${processingStep >= 1 ? 'rgba(0, 229, 255, 0.25)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ color: processingStep >= 1 ? '#34d399' : 'var(--text-muted)', fontSize: '0.95rem' }}>
              {processingStep >= 1 ? '✓' : '○'}
            </span>
            <span style={{ fontSize: '0.78rem', color: processingStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
              Load voyage corridor
            </span>
          </div>

          {/* Step 2: Weather */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: processingStep >= 2 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(15, 23, 42, 0.3)',
            border: `1px solid ${processingStep >= 2 ? 'rgba(0, 229, 255, 0.25)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ color: processingStep >= 2 ? '#34d399' : processingStep === 1 ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
              {processingStep >= 2 ? '✓' : processingStep === 1 ? '●' : '○'}
            </span>
            <span style={{ fontSize: '0.78rem', color: processingStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
              Evaluate weather &amp; ocean
            </span>
          </div>

          {/* Step 3: Safety */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: processingStep >= 3 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(15, 23, 42, 0.3)',
            border: `1px solid ${processingStep >= 3 ? 'rgba(0, 229, 255, 0.25)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ color: processingStep >= 3 ? '#34d399' : processingStep === 2 ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
              {processingStep >= 3 ? '✓' : processingStep === 2 ? '●' : '○'}
            </span>
            <span style={{ fontSize: '0.78rem', color: processingStep >= 3 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
              Check route safety &amp; draft
            </span>
          </div>

          {/* Step 4: Prune Infeasible */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: processingStep >= 4 ? 'rgba(0, 229, 255, 0.08)' : 'rgba(15, 23, 42, 0.3)',
            border: `1px solid ${processingStep >= 4 ? 'rgba(0, 229, 255, 0.25)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
          }}>
            <span style={{ color: processingStep >= 4 ? (feasibleRoutes.length > 0 ? '#34d399' : '#f87171') : processingStep === 3 ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
              {processingStep >= 4 ? (feasibleRoutes.length > 0 ? '✓' : '✕') : processingStep === 3 ? '●' : '○'}
            </span>
            <span style={{ fontSize: '0.78rem', color: processingStep >= 4 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
              Filter infeasible paths
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SCHEMATIC ROUTE CORRIDOR VISUALIZATION                      */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🗺️</span>
            <span>Maritime Passage Corridors: Singapore (PORT-SG) → Rotterdam (PORT-RTM)</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            2 Candidate Routes Evaluated
          </span>
        </div>

        {/* Lightweight SVG Corridor Schematic */}
        <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(10, 15, 30, 0.7)', borderRadius: 'var(--radius-sm)', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <svg viewBox="0 0 840 180" style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="suezFeasibleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="capeFeasibleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Singapore Origin Node */}
            <circle cx="70" cy="90" r="10" fill="#00e5ff" />
            <text x="70" y="118" fill="#00e5ff" fontSize="11" fontWeight="700" textAnchor="middle">PORT-SG</text>
            <text x="70" y="132" fill="#94a3b8" fontSize="9" textAnchor="middle">Singapore</text>

            {/* Rotterdam Destination Node */}
            <circle cx="770" cy="90" r="10" fill="#34d399" />
            <text x="770" y="118" fill="#34d399" fontSize="11" fontWeight="700" textAnchor="middle">PORT-RTM</text>
            <text x="770" y="132" fill="#94a3b8" fontSize="9" textAnchor="middle">Rotterdam</text>

            {/* Route 1: Suez Corridor (Upper arc via Malacca, Red Sea, Suez Canal, Mediterranean) */}
            {(() => {
              const suezInfo = evaluatedRoutes.find((r) => r.route.id.includes('SUEZ'));
              const isFeas = suezInfo ? suezInfo.isFeasible : true;
              return (
                <g>
                  <path
                    d="M 70 90 Q 240 25, 420 40 T 770 90"
                    fill="none"
                    stroke={isFeas ? 'url(#suezFeasibleGrad)' : '#f87171'}
                    strokeWidth={isFeas ? '3.5' : '2'}
                    strokeDasharray={isFeas ? 'none' : '5,5'}
                  />
                  {/* Waypoint markers on Suez */}
                  <circle cx="250" cy="40" r="4.5" fill={isFeas ? '#38bdf8' : '#f87171'} />
                  <text x="250" y="30" fill="#cbd5e1" fontSize="9" textAnchor="middle">WP-MALACCA</text>
                  <circle cx="420" cy="40" r="5.5" fill={isFeas ? '#f59e0b' : '#f87171'} />
                  <text x="420" y="28" fill="#fbbf24" fontSize="10" fontWeight="700" textAnchor="middle">Suez Canal (16m Draft)</text>
                  <circle cx="580" cy="55" r="4.5" fill={isFeas ? '#38bdf8' : '#f87171'} />
                  <text x="580" y="45" fill="#cbd5e1" fontSize="9" textAnchor="middle">WP-GIBRALTAR</text>
                  <text x="420" y="62" fill={isFeas ? '#34d399' : '#f87171'} fontSize="10" fontWeight="700" textAnchor="middle">
                    Suez Corridor — 8,280 NM {isFeas ? '(✓ Feasible)' : '(✕ Excluded)'}
                  </text>
                </g>
              );
            })()}

            {/* Route 2: Cape of Good Hope Corridor (Lower arc via Indian Ocean, Cape, Atlantic) */}
            {(() => {
              const capeInfo = evaluatedRoutes.find((r) => r.route.id.includes('CAPE'));
              const isFeas = capeInfo ? capeInfo.isFeasible : true;
              return (
                <g>
                  <path
                    d="M 70 90 Q 240 165, 420 155 T 770 90"
                    fill="none"
                    stroke={isFeas ? 'url(#capeFeasibleGrad)' : '#f87171'}
                    strokeWidth={isFeas ? '3.5' : '2'}
                    strokeDasharray={isFeas ? 'none' : '5,5'}
                  />
                  {/* Waypoint markers on Cape */}
                  <circle cx="280" cy="148" r="4.5" fill={isFeas ? '#c084fc' : '#f87171'} />
                  <text x="280" y="165" fill="#cbd5e1" fontSize="9" textAnchor="middle">WP-INDIAN-OCEAN</text>
                  <circle cx="420" cy="155" r="5.5" fill={isFeas ? '#c084fc' : '#f87171'} />
                  <text x="420" y="174" fill="#c084fc" fontSize="10" fontWeight="700" textAnchor="middle">Cape of Good Hope (Open Ocean)</text>
                  <circle cx="580" cy="135" r="4.5" fill={isFeas ? '#c084fc' : '#f87171'} />
                  <text x="580" y="152" fill="#cbd5e1" fontSize="9" textAnchor="middle">WP-ATLANTIC</text>
                  <text x="420" y="140" fill={isFeas ? '#34d399' : '#f87171'} fontSize="10" fontWeight="700" textAnchor="middle">
                    Cape Route — 11,720 NM {isFeas ? '(✓ Feasible)' : '(✕ Excluded)'}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. FEASIBLE CANDIDATE ROUTES (Passed Environmental Checks)    */}
      {/* ------------------------------------------------------------- */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✓</span>
              <span>Feasible Maritime Routes ({feasibleRoutes.length})</span>
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Corridors satisfying navigational wave thresholds, sea state limits, and vessel draft constraints.
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600 }}>
            {feasibleRoutes.length} of {evaluatedRoutes.length} available for optimization
          </span>
        </div>

        {feasibleRoutes.length === 0 ? (
          <div style={{
            padding: '1.75rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⛔</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', margin: 0 }}>
              No Feasible Routes Remain in Search Space
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0.5rem auto 0', lineHeight: 1.5 }}>
              All candidate corridors fail physical draft restrictions or critical environmental safety limits under the current scenario. Switch the weather scenario above or modify voyage parameters in Stage 01 to proceed.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {feasibleRoutes.map((item) => {
              const isSuez = item.route.id.includes('SUEZ');
              return (
                <div
                  key={item.route.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                          {item.route.id}
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                          {isSuez ? 'Suez Route' : 'Cape Route'}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {item.route.name}
                        </div>
                      </div>

                      <span style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        whiteSpace: 'nowrap',
                      }}>
                        ✓ Feasible
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.65rem',
                      background: 'rgba(10, 15, 30, 0.6)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.85rem',
                      fontSize: '0.8rem',
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Distance:</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                          {item.route.total_distance_nm.toLocaleString()} NM
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Draft Requirement:</span>
                        <strong style={{ color: item.draftRequirementM ? '#38bdf8' : '#94a3b8', fontSize: '0.85rem' }}>
                          {item.draftRequirementM ? `${item.draftRequirementM.toFixed(1)} m limit` : 'Unrestricted'}
                        </strong>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Transit Time (Calm):</span>
                        <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {item.route.estimated_transit_days.toFixed(1)} days ({item.route.estimated_transit_hours.toFixed(0)}h)
                        </span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block' }}>Route Type:</span>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {item.route.route_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Environmental Conditions Summary */}
                    <div style={{
                      padding: '0.75rem 0.85rem',
                      background: 'rgba(0, 229, 255, 0.04)',
                      border: '1px solid rgba(0, 229, 255, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.85rem',
                      fontSize: '0.78rem',
                    }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>🌊</span>
                        <span>Environmental Condition Summary:</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <div>Wind: <strong style={{ color: 'var(--text-primary)' }}>{item.windSpeedKnots.toFixed(1)} kts</strong></div>
                        <div>Waves (Hs): <strong style={{ color: item.significantWaveM > 3.0 ? '#fbbf24' : 'var(--text-primary)' }}>{item.significantWaveM.toFixed(1)} m</strong></div>
                        <div>Sea State: <strong style={{ color: 'var(--text-primary)' }}>WMO State {item.seaState}</strong></div>
                        <div>Risk Level: <strong style={{ color: item.riskLevel === 'LOW' ? '#34d399' : '#fbbf24' }}>{item.riskLevel}</strong></div>
                      </div>

                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          Current effect:{' '}
                          <strong style={{ color: item.currentType === 'favorable' ? '#34d399' : item.currentType === 'adverse' ? '#fbbf24' : 'var(--text-muted)' }}>
                            {item.currentType === 'favorable' ? 'Favorable current' : item.currentType === 'adverse' ? 'Adverse current' : 'Neutral current'}
                            {' '}({item.alongTrackCurrentKnots >= 0 ? `+${item.alongTrackCurrentKnots.toFixed(1)}` : item.alongTrackCurrentKnots.toFixed(1)} kn)
                          </strong>
                        </div>
                        <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>
                          SOG: {item.effectiveSogKnots.toFixed(1)} kn
                        </div>
                      </div>

                      <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Demo Environmental Fuel Factor:</span>
                        <strong style={{ color: item.demoEnvFuelFactor > 1.1 ? '#fbbf24' : item.demoEnvFuelFactor < 1.0 ? '#34d399' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {item.demoEnvFuelFactor.toFixed(3)}x
                        </strong>
                      </div>
                    </div>

                    {/* Navigational Advisories / Warnings if any */}
                    {item.warnings.length > 0 && (
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.74rem',
                        color: '#fbbf24',
                        marginBottom: '0.75rem',
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>⚠️ Environmental Advisory:</div>
                        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                          {item.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                    {item.draftNote}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. EXCLUDED / INFEASIBLE ROUTES SECTION                        */}
      {/* ------------------------------------------------------------- */}
      {excludedRoutes.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.25rem',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✕</span>
                <span>Excluded Routes ({excludedRoutes.length})</span>
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Corridors pruned from candidate search space due to environmental safety breaches or vessel draft limits.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
              Pruned Before Optimization
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {excludedRoutes.map((item) => {
              const isSuez = item.route.id.includes('SUEZ');
              return (
                <div
                  key={item.route.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#f87171' }}>
                        {item.route.id}
                      </div>
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#fca5a5', margin: '0.2rem 0 0' }}>
                        {isSuez ? 'Suez Route (Excluded)' : 'Cape Route (Excluded)'}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {item.route.name} ({item.route.total_distance_nm.toLocaleString()} NM)
                      </div>
                    </div>

                    <span style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                    }}>
                      ✕ Infeasible
                    </span>
                  </div>

                  {/* Exclusion Reasons */}
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: '#fca5a5',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>⛔</span>
                      <span>Disqualification Criteria:</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.45 }}>
                      {item.reasons.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Environmental metrics: Waves {item.significantWaveM.toFixed(1)}m, Sea State {item.seaState}, Current {item.alongTrackCurrentKnots.toFixed(1)} kn
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. NAVIGATION CONTROLS                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="stage-nav-bar">
        <button
          type="button"
          id="stage-prev-btn"
          className="stage-nav-btn stage-nav-btn-secondary"
          onClick={onPrevious}
        >
          <span>←</span>
          <span>Previous (Fleet)</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            Stage 03 of 07
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Environmental Feasibility
          </div>
        </div>

        <button
          type="button"
          id="stage-continue-btn"
          className="stage-nav-btn stage-nav-btn-primary"
          onClick={onValidContinue}
          disabled={!canContinue}
          style={{
            opacity: canContinue ? 1 : 0.45,
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
          title={
            !canContinue
              ? isProcessing
                ? 'Processing environmental feasibility checks...'
                : 'Cannot proceed: No feasible route remains in candidate space.'
              : 'Save environmental assessment and unlock Stage 04 (Classical Baseline)'
          }
        >
          <span>{isProcessing ? 'Checking Feasibility...' : 'Continue'}</span>
          {!isProcessing && <span>→</span>}
        </button>
      </div>
    </div>
  );
};
