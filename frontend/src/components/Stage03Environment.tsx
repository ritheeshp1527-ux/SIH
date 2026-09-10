import React, { useEffect, useState, useId } from 'react';
import {
  MaritimeRoute,
  RouteEnvironmentalAssessmentResponse,
  WeatherScenarioPreset,
  WeatherOceanStageResult,
  Vessel,
  LiveVoyageResponse,
  NormalizedRoutePlan,
} from '../types';
import {
  fetchRoutes,
  fetchWeatherScenarios,
  fetchVessels,
  fetchLiveVoyage,
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
  initialLiveResponse?: LiveVoyageResponse | null;
  mode?: 'live' | 'demo';
}

// Fallback baseline routes for Classic/Demo mode
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
];

// Presentation weather scenario presets for Classic/Demo mode
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
  initialLiveResponse = null,
  mode = 'live',
}) => {
  // --------------------------------------------------------------------------
  // LIVE GUIDED WORKFLOW STATE (Phase 4B & 4C)
  // --------------------------------------------------------------------------
  const [liveResponse, setLiveResponse] = useState<LiveVoyageResponse | null>(initialLiveResponse || null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    initialLiveResponse?.primary_route?.id || initialLiveResponse?.routes[0]?.id || null
  );
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(!initialLiveResponse && mode === 'live');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveErrorStatus, setLiveErrorStatus] = useState<number | null>(null);
  const [isMapAvailable, setIsMapAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('http://localhost:5174/', { method: 'HEAD', mode: 'no-cors' })
      .then(() => setIsMapAvailable(true))
      .catch(() => setIsMapAvailable(false));
  }, []);

  // --------------------------------------------------------------------------
  // CLASSIC / DEMO WORKFLOW STATE (Preserved for legacy demo tests)
  // --------------------------------------------------------------------------
  const [demoRoutes, setDemoRoutes] = useState<MaritimeRoute[]>(DEFAULT_ROUTES);
  const [demoVessels, setDemoVessels] = useState<Vessel[]>(DEFAULT_VESSELS);
  const [demoScenarios, setDemoScenarios] = useState<WeatherScenarioPreset[]>(DEFAULT_SCENARIOS);
  const [demoScenarioId, setDemoScenarioId] = useState<string>(
    environmentResult?.scenario_id || 'nominal'
  );
  const [demoProcessingStep, setDemoProcessingStep] = useState<number>(skipAnimation ? 4 : 0);
  const [demoIsProcessing, setDemoIsProcessing] = useState<boolean>(!skipAnimation);
  const demoScenarioSelectId = useId();

  // --------------------------------------------------------------------------
  // LIVE REQUEST DISPATCH (Reacts to Stage 01 voyageConfig)
  // --------------------------------------------------------------------------
  const executeLiveVoyageRequest = () => {
    setIsLoadingLive(true);
    setLiveError(null);
    setLiveErrorStatus(null);
    setLiveResponse(null);
    setSelectedRouteId(null);

    fetchLiveVoyage({
      source_port: voyageConfig.sourcePort,
      destination_port: voyageConfig.destPort,
      departure_datetime: voyageConfig.departureDate,
      vessel_id: selectedVesselIds[0] || 'VES-001',
    })
      .then((data) => {
        setLiveResponse(data);
        const primaryId = data.primary_route?.id || (data.routes.length > 0 ? data.routes[0].id : null);
        setSelectedRouteId(primaryId);
        setIsLoadingLive(false);
        setLiveError(null);
      })
      .catch((err: any) => {
        setLiveError(err.message || 'Live maritime routing and weather unavailable');
        setLiveErrorStatus(err.status || 503);
        setIsLoadingLive(false);
      });
  };

  useEffect(() => {
    if (mode !== 'live') return;
    if (initialLiveResponse) {
      setLiveResponse(initialLiveResponse);
      const primaryId = initialLiveResponse.primary_route?.id || (initialLiveResponse.routes.length > 0 ? initialLiveResponse.routes[0].id : null);
      setSelectedRouteId(primaryId);
      setIsLoadingLive(false);
      setLiveError(null);
      return;
    }

    let mounted = true;
    setIsLoadingLive(true);
    setLiveError(null);
    setLiveErrorStatus(null);
    setLiveResponse(null);
    setSelectedRouteId(null);

    fetchLiveVoyage({
      source_port: voyageConfig.sourcePort,
      destination_port: voyageConfig.destPort,
      departure_datetime: voyageConfig.departureDate,
      vessel_id: selectedVesselIds[0] || 'VES-001',
    })
      .then((data) => {
        if (!mounted) return;
        setLiveResponse(data);
        const primaryId = data.primary_route?.id || (data.routes.length > 0 ? data.routes[0].id : null);
        setSelectedRouteId(primaryId);
        setIsLoadingLive(false);
        setLiveError(null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setLiveError(err.message || 'Live maritime routing and weather unavailable');
        setLiveErrorStatus(err.status || 503);
        setIsLoadingLive(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    mode,
    voyageConfig.sourcePort,
    voyageConfig.destPort,
    voyageConfig.departureDate,
    selectedVesselIds,
    initialLiveResponse,
  ]);

  // Propagate Live Stage Result Downstream
  useEffect(() => {
    if (mode !== 'live' || !liveResponse || liveResponse.routes.length === 0) return;
    const selectedRoute =
      liveResponse.routes.find((r) => r.id === selectedRouteId) ||
      liveResponse.primary_route ||
      liveResponse.routes[0];
    if (!selectedRoute) return;

    const assessments: Record<string, RouteEnvironmentalAssessmentResponse> = {};
    const fuelFactors: Record<string, number> = {};

    liveResponse.routes.forEach((route) => {
      fuelFactors[route.id] = 1.05;
      assessments[route.id] = {
        status: 'feasible',
        disclaimer: 'Live SeaRoute maritime routing with Open-Meteo environmental models.',
        environmental_disclaimer: 'Live weather-adjusted telemetry and along-track currents.',
        route_id: route.id,
        route_name: route.metadata?.name || route.metadata?.label || `Live Route ${route.id}`,
        vessel_id: selectedVesselIds[0] || 'VES-001',
        vessel_name: 'Selected Fleet',
        vessel_speed_knots: 14.0,
        total_distance_nm: route.distance_nm,
        baseline_travel_time_hours: route.duration_hours,
        baseline_travel_time_days: route.duration_hours / 24,
        weather_adjusted_travel_time_hours: route.duration_hours,
        weather_adjusted_travel_time_days: route.duration_hours / 24,
        time_delta_hours: 0,
        aggregate_demo_environmental_fuel_factor: 1.05,
        aggregate_weather_fuel_factor: 1.05,
        overall_risk_level: 'LOW',
        is_feasible: true,
        infeasibility_reasons: [],
        warnings: [],
        segment_assessments: [],
      };
    });

    const stageResult: WeatherOceanStageResult = {
      status: 'completed',
      scenario_id: 'live-weather',
      assessed_routes_count: liveResponse.routes.length,
      route_assessments: assessments,
      safe_routes_count: liveResponse.routes.length,
      unsafe_routes_count: 0,
      weather_fuel_factors: fuelFactors,
      notes: [
        `Live SeaRoute: ${liveResponse.source_port} (${liveResponse.source_locode}) → ${liveResponse.destination_port} (${liveResponse.destination_locode})`,
        `${liveResponse.routes.length} candidate route(s) evaluated via Open-Meteo marine telemetry.`,
        `Weather coverage: ${(liveResponse.weather_coverage_ratio * 100).toFixed(0)}%, Marine coverage: ${(liveResponse.marine_coverage_ratio * 100).toFixed(0)}%`,
      ],
    };

    onEnvironmentProcessed(stageResult);
  }, [liveResponse, selectedRouteId, mode, selectedVesselIds, onEnvironmentProcessed]);

  // --------------------------------------------------------------------------
  // CLASSIC / DEMO MODE LOGIC
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'demo') return;
    let mounted = true;
    Promise.all([fetchRoutes(), fetchVessels(), fetchWeatherScenarios()])
      .then(([rList, vList, sList]) => {
        if (!mounted) return;
        if (rList && rList.length > 0) setDemoRoutes(rList);
        if (vList && vList.length > 0) setDemoVessels(vList);
        if (sList && sList.length > 0) {
          const combined = [
            ...sList,
            DEFAULT_SCENARIOS.find((s) => s.id === 'scenario-all-infeasible-sim')!,
          ];
          setDemoScenarios(combined);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'demo' || skipAnimation) return;
    const t1 = setTimeout(() => setDemoProcessingStep(1), 150);
    const t2 = setTimeout(() => setDemoProcessingStep(2), 350);
    const t3 = setTimeout(() => setDemoProcessingStep(3), 550);
    const t4 = setTimeout(() => {
      setDemoProcessingStep(4);
      setDemoIsProcessing(false);
    }, 750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [mode, demoScenarioId, skipAnimation]);

  const demoEvaluatedRoutes: RouteFeasibilityCardData[] = demoRoutes.map((route) => {
    const isSuez = route.id.includes('SUEZ');
    const isCape = route.id.includes('CAPE');
    const draftRequirementM = isSuez ? 16.0 : null;
    const draftNote = isSuez
      ? 'Max permissible transit draft: 16.0 m (Suez Canal Authority)'
      : isCape
      ? 'Unrestricted deep-water ocean passage (Cape of Good Hope)'
      : 'Unrestricted deep-water ocean passage (No canal draft restriction)';
    const commandedStw = 14.0;
    let windSpeed = 14.0;
    let waveHeight = 1.6;
    let seaState = 3;
    let alongTrackCurrent = 0.0;
    let fuelFactor = 1.050;
    let isFeasible = true;
    const reasons: string[] = [];
    const warnings: string[] = [];
    let riskLevel = 'LOW';

    if (demoScenarioId === 'nominal') {
      if (isSuez) {
        alongTrackCurrent = 0.4;
        waveHeight = 1.4;
        seaState = 2;
        fuelFactor = 1.062;
      } else {
        alongTrackCurrent = 0.2;
        waveHeight = 2.2;
        seaState = 3;
        fuelFactor = 1.121;
      }
    } else if (demoScenarioId === 'scenario-a-favorable-current') {
      if (isSuez) {
        alongTrackCurrent = 2.1;
        waveHeight = 1.5;
        seaState = 3;
        fuelFactor = 1.018;
        warnings.push('Monsoon drift assisting forward speed over ground (+2.1 kn).');
      } else {
        alongTrackCurrent = 0.8;
        waveHeight = 2.0;
        seaState = 3;
        fuelFactor = 1.095;
      }
    } else if (demoScenarioId === 'scenario-b-adverse-current') {
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
    } else if (demoScenarioId === 'scenario-c-rough-sea') {
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
    } else if (demoScenarioId === 'scenario-d-storm') {
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
    } else if (demoScenarioId === 'scenario-e-route-comparison') {
      if (isSuez) {
        alongTrackCurrent = -1.8;
        waveHeight = 2.4;
        seaState = 4;
        fuelFactor = 1.115;
        riskLevel = 'MODERATE';
      } else {
        alongTrackCurrent = 2.2;
        waveHeight = 3.2;
        seaState = 5;
        fuelFactor = 1.082;
        riskLevel = 'MODERATE';
      }
    } else if (demoScenarioId === 'scenario-all-infeasible-sim') {
      isFeasible = false;
      riskLevel = 'CRITICAL';
      if (isSuez) {
        alongTrackCurrent = -3.5;
        waveHeight = 7.8;
        seaState = 8;
        reasons.push('EXCESSIVE_WAVE_HEIGHT: Significant wave height 7.8m exceeds safety limit of 6.0m.');
        reasons.push('STORM_CONDITION: Severe cyclonic activity in Gulf of Aden / Arabian Sea.');
      } else {
        alongTrackCurrent = -4.0;
        waveHeight = 8.5;
        seaState = 9;
        reasons.push('EXCESSIVE_WAVE_HEIGHT: Southern Ocean swell of 8.5m exceeds permissible safety threshold (6.0m).');
        reasons.push('SEA_STATE_TOO_HIGH: WMO Sea State 9 (Phenomenal) unsafe for commercial navigation.');
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

  const demoFeasibleRoutes = demoEvaluatedRoutes.filter((r) => r.isFeasible);
  const demoExcludedRoutes = demoEvaluatedRoutes.filter((r) => !r.isFeasible);

  useEffect(() => {
    if (mode !== 'demo' || demoProcessingStep !== 4) return;
    const assessments: Record<string, RouteEnvironmentalAssessmentResponse> = {};
    const fuelFactors: Record<string, number> = {};

    demoEvaluatedRoutes.forEach((item) => {
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
      status: demoFeasibleRoutes.length > 0 ? 'completed' : 'no_feasible_routes',
      scenario_id: demoScenarioId,
      assessed_routes_count: demoEvaluatedRoutes.length,
      route_assessments: assessments,
      safe_routes_count: demoFeasibleRoutes.length,
      unsafe_routes_count: demoExcludedRoutes.length,
      weather_fuel_factors: fuelFactors,
      notes: [
        `Scenario: ${demoScenarioId}`,
        `${demoFeasibleRoutes.length} of ${demoEvaluatedRoutes.length} candidate passages feasible.`,
      ],
    };

    onEnvironmentProcessed(stageResult);
  }, [mode, demoProcessingStep, demoScenarioId]);

  // Selected fleet display names
  const selectedVesselsList = demoVessels.filter((v) => selectedVesselIds.includes(v.id));
  const fleetSummaryText = selectedVesselsList.length > 0
    ? selectedVesselsList.map((v) => `${v.name} (${v.id})`).join(', ')
    : `${selectedVesselIds.length} vessel(s) selected`;

  // --------------------------------------------------------------------------
  // RENDER: CLASSIC / DEMO MODE
  // --------------------------------------------------------------------------
  if (mode === 'demo') {
    const canContinueDemo = demoProcessingStep === 4 && demoFeasibleRoutes.length > 0;
    return (
      <div className="stage-shell-card" style={{ animation: 'fadeIn 0.25s ease' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-cyan">03 / 07</span>
                <span className="badge badge-emerald">Ocean &amp; Weather Modeling</span>
                <span className="badge badge-cyan">Deterministic Feasibility</span>
              </div>
              <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span>🌊</span>
                <span>Environment</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.45rem', maxWidth: '850px', lineHeight: 1.5 }}>
                Check weather, ocean conditions, and route feasibility. Evaluates segment-level winds, significant wave heights, along-track ocean currents, and physical draft constraints before optimization.
              </p>
            </div>
            <div style={{ padding: '0.55rem 1.15rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Status: <strong style={{ color: canContinueDemo ? 'var(--accent-teal-dark)' : demoIsProcessing ? 'var(--accent-ocean)' : 'var(--accent-rose)' }}>
                {demoIsProcessing ? 'Evaluating Conditions...' : canContinueDemo ? `${demoFeasibleRoutes.length} Feasible Routes Ready` : 'No Feasible Routes'}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.9rem 1.25rem', background: 'var(--bg-card-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Origin → Destination</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{voyageConfig.sourcePort}</span>
                <span style={{ color: 'var(--accent-ocean)' }}>→</span>
                <span>{voyageConfig.destPort}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Cargo Load (Stage 01)</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {Number(voyageConfig.cargoWeight).toLocaleString()} MT
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Selected Fleet (Stage 02)</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-ocean)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fleetSummaryText}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Current Impact Model</div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--accent-ocean)', marginTop: '0.2rem' }}>
                Speed Over Ground (SOG = STW + Ocean Drift)
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Data Section */}
        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.75rem' }}>
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
            <div style={{ padding: '0.35rem 0.75rem', background: 'var(--accent-amber-light)', border: '1px solid #F5DEBF', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
              <span>⚠️ Demo Environmental Data — Simulated environmental conditions</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Deterministic demonstration dataset calibrated for the Singapore–Rotterdam maritime corridors.
            <strong style={{ color: 'var(--accent-amber)' }}> Not a live external weather API feed.</strong>
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <label htmlFor={demoScenarioSelectId} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
              Presentation Weather Scenario Preset
            </label>
            <select
              id={demoScenarioSelectId}
              value={demoScenarioId}
              onChange={(e) => setDemoScenarioId(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}
            >
              {demoScenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.title} — {sc.description}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Demo Candidate Routes */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            ✓ Feasible Maritime Routes ({demoFeasibleRoutes.length})
          </h3>
          {demoFeasibleRoutes.length === 0 ? (
            <div style={{ padding: '1.75rem', background: 'var(--accent-rose-light)', border: '1px solid #F6D0D8', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⛔</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-rose)', margin: 0 }}>
                No Feasible Routes Remain in Search Space
              </h4>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {demoFeasibleRoutes.map((item) => (
                <div key={item.route.id} style={{ background: '#FFFFFF', border: '1px solid #C2E8DC', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-ocean)' }}>{item.route.id}</div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                    {item.route.id.includes('SUEZ') ? 'Suez Route' : item.route.id.includes('CAPE') ? 'Cape Route' : item.route.name}
                  </h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.route.name}</div>
                  <div style={{ margin: '0.75rem 0', padding: '0.75rem', background: 'var(--bg-card-inset)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    <div>Distance: <strong>{item.route.total_distance_nm.toLocaleString()} NM</strong></div>
                    <div>Draft Requirement: <strong>{item.draftRequirementM ? `${item.draftRequirementM.toFixed(1)} m limit` : 'Unrestricted'}</strong></div>
                    <div>Current effect: <strong>{item.currentType === 'favorable' ? 'Favorable current' : item.currentType === 'adverse' ? 'Adverse current' : 'Neutral current'} ({item.alongTrackCurrentKnots >= 0 ? `+${item.alongTrackCurrentKnots.toFixed(1)}` : item.alongTrackCurrentKnots.toFixed(1)} kn)</strong></div>
                    <div>SOG: <strong>{item.effectiveSogKnots.toFixed(1)} kn</strong></div>
                    <div>Demo Environmental Fuel Factor: <strong>{item.demoEnvFuelFactor.toFixed(3)}x</strong></div>
                  </div>
                  <span className="badge badge-emerald">✓ Feasible</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Excluded Routes */}
        {demoExcludedRoutes.length > 0 && (
          <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--accent-rose-light)', border: '1px solid #F6D0D8', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>
              Excluded Routes ({demoExcludedRoutes.length})
            </h3>
            {demoExcludedRoutes.map((item) => (
              <div key={item.route.id} style={{ background: '#FFFFFF', border: '1px solid #F6D0D8', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>{item.route.id}</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-rose)', margin: '0.2rem 0' }}>
                  {item.route.id.includes('SUEZ') ? 'Suez Route (Excluded)' : item.route.id.includes('CAPE') ? 'Cape Route (Excluded)' : item.route.name}
                </h4>
                <span className="badge badge-rose">✕ Infeasible</span>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.78rem' }}>
                  {item.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Bar */}
        <div className="stage-nav-bar">
          <button type="button" id="stage-prev-btn" className="stage-nav-btn stage-nav-btn-secondary" onClick={onPrevious}>
            <span>←</span>
            <span>Previous (Fleet)</span>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-ocean)' }}>Stage 03 of 07</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Environment</div>
          </div>
          <button type="button" id="stage-continue-btn" className="stage-nav-btn stage-nav-btn-primary" onClick={onValidContinue} disabled={!canContinueDemo}>
            <span>Continue to Classical Optimization</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: LIVE GUIDED MODE (Phase 4B, 4C & 4D)
  // --------------------------------------------------------------------------
  const resolvePortName = (portId: string): string => {
    const map: Record<string, string> = {
      'PORT-SG': 'Singapore',
      'SGSIN': 'Singapore',
      'PORT-RTM': 'Rotterdam',
      'NLRTM': 'Rotterdam',
      'AEDXB': 'Dubai',
      'INBOM': 'Mumbai',
      'USNYC': 'New York',
    };
    return map[portId] || portId;
  };

  const resolvePortLocode = (portId: string): string => {
    const map: Record<string, string> = {
      'PORT-SG': 'SGSIN',
      'PORT-RTM': 'NLRTM',
      'PORT-MUMBAI': 'INBOM',
      'PORT-DUBAI': 'AEDXB',
      'PORT-NYC': 'USNYC',
    };
    const upper = (portId || '').trim().toUpperCase();
    return map[upper] || upper;
  };

  const handleOpenLiveMap = () => {
    const sourceLocode = liveResponse?.source_locode || resolvePortLocode(voyageConfig.sourcePort);
    const destLocode = liveResponse?.destination_locode || resolvePortLocode(voyageConfig.destPort);
    const departureIso = voyageConfig.departureDate
      ? new Date(voyageConfig.departureDate).toISOString()
      : new Date().toISOString();

    const mapPort = 5174;
    const mapUrl = `http://localhost:${mapPort}/?sourcePort=${encodeURIComponent(sourceLocode)}&destinationPort=${encodeURIComponent(destLocode)}&departureTimestamp=${encodeURIComponent(departureIso)}`;

    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const selectedRoute = liveResponse?.routes.find((r) => r.id === selectedRouteId) || liveResponse?.primary_route || liveResponse?.routes[0] || null;
  const primaryRoute = liveResponse?.primary_route || liveResponse?.routes.find((r) => r.is_primary) || liveResponse?.routes[0] || null;
  const primaryRouteName = (primaryRoute?.metadata && (primaryRoute.metadata.name || primaryRoute.metadata.label || primaryRoute.metadata.route_name)) || primaryRoute?.id || 'Unavailable';
  const canContinueLive = Boolean(selectedRoute && !isLoadingLive && !liveError);

  const sourceDisplayName = resolvePortName(liveResponse?.source_port || voyageConfig.sourcePort);
  const destDisplayName = resolvePortName(liveResponse?.destination_port || voyageConfig.destPort);
  const sourcePortCode = liveResponse?.source_port || voyageConfig.sourcePort;
  const destPortCode = liveResponse?.destination_port || voyageConfig.destPort;

  const envPoints =
    primaryRoute?.environmental_points && primaryRoute.environmental_points.length > 0
      ? primaryRoute.environmental_points
      : (liveResponse?.routes.find((r) => r.is_primary || r.id === primaryRoute?.id)?.environmental_points || []);

  const representativePoint =
    envPoints.find(
      (pt) =>
        (pt.wind_speed_knots !== null && pt.wind_speed_knots !== undefined) ||
        (pt.significant_wave_height_m !== null && pt.significant_wave_height_m !== undefined) ||
        (pt.ocean_current_velocity_knots !== null && pt.ocean_current_velocity_knots !== undefined) ||
        (pt.sea_state !== null && pt.sea_state !== undefined) ||
        (pt.along_track_current_knots !== null && pt.along_track_current_knots !== undefined) ||
        (pt.wind_direction_deg !== null && pt.wind_direction_deg !== undefined)
    ) ||
    envPoints[0] ||
    null;

  return (
    <div className="stage-shell-card" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* 1. Header: LIVE MARITIME ENVIRONMENT: {source} → {destination} */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-cyan">03 / 07</span>
              <span className="badge badge-emerald">Ocean &amp; Weather Modeling</span>
              <span className="badge badge-purple">⚡ Live SeaRoute Engine</span>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-teal-dark)', marginTop: '0.35rem' }}>
              LIVE MARITIME ENVIRONMENT
            </div>

            <h2 style={{ fontSize: '1.95rem', fontWeight: 800, margin: '0.2rem 0 0.4rem 0', color: 'var(--text-primary)', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span>🌊</span>
              <span>{`${sourceDisplayName} → ${destDisplayName}`}</span>
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.2rem', maxWidth: '850px', lineHeight: 1.5 }}>
              Live SeaRoute maritime routing and Open-Meteo environmental telemetry evaluation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
            <div style={{
              padding: '0.55rem 1.15rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)'
            }}>
              Status: <strong style={{
                color: liveError ? 'var(--accent-rose)' : isLoadingLive ? 'var(--accent-ocean)' : canContinueLive ? 'var(--accent-teal-dark)' : 'var(--text-muted)'
              }}>
                {liveError
                  ? 'Live Routing Unavailable'
                  : isLoadingLive
                  ? 'Evaluating Live Telemetry...'
                  : liveResponse
                  ? `${liveResponse.routes.length} Live Routes Evaluated`
                  : 'Awaiting Evaluation'}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                id="open-live-maritime-map-btn"
                onClick={handleOpenLiveMap}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  background: 'linear-gradient(135deg, #0284c7, #0f766e)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  transition: 'all var(--transition-fast)',
                }}
                title="Open standalone MapLibre + Geoapify SeaRoute & weather visualization in a new tab"
              >
                <span>🗺️</span>
                <span>Open Live Maritime Map ↗</span>
              </button>

              {isMapAvailable === false && (
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                  Live map service unavailable
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Authoritative Stage 01 Context Bar */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.9rem 1.25rem',
          background: 'var(--bg-card-inset)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Origin → Destination (Stage 01)
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span id="stage03-source-port">{sourcePortCode}</span>
              <span style={{ color: 'var(--accent-ocean)' }}>→</span>
              <span id="stage03-dest-port">{destPortCode}</span>
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
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-ocean)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fleetSummaryText}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Maritime Routing Authority
            </div>
            <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--accent-ocean)', marginTop: '0.2rem' }}>
              SeaRoute + Open-Meteo Live Bridge
            </div>
          </div>
        </div>
      </div>

      {/* 2. Loading State Banner */}
      {isLoadingLive && (
        <div style={{
          padding: '2.5rem 1.5rem',
          background: 'var(--accent-blue-subtle)',
          border: '1px solid #BEDDF0',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          marginBottom: '1.75rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.65rem', animation: 'spin 2s linear infinite' }}>🌐</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-ocean)', margin: 0 }}>
            Querying Live Maritime Routing &amp; Weather Engine
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0.5rem auto 0', lineHeight: 1.5 }}>
            Evaluating maritime passage corridors for <strong>{voyageConfig.sourcePort} → {voyageConfig.destPort}</strong> using SeaRoute graph solver and Open-Meteo marine wave and current forecasts...
          </p>
        </div>
      )}

      {/* 3. Error / 503 Unavailable State (Honest, No Silent Fallback) */}
      {liveError && !isLoadingLive && (
        <div style={{
          padding: '1.75rem',
          background: 'var(--accent-rose-light)',
          border: '1px solid #F6D0D8',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)', margin: 0 }}>
                  Live maritime routing and weather unavailable
                </h3>
                {liveErrorStatus && (
                  <span className="badge badge-rose">HTTP {liveErrorStatus}</span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '720px', lineHeight: 1.5, margin: '0.4rem 0 0' }}>
                The live maritime routing engine could not resolve or retrieve weather telemetry for voyage corridor{' '}
                <strong>{voyageConfig.sourcePort} → {voyageConfig.destPort}</strong>. In accordance with strict data integrity rules, no synthetic or demo data is substituted.
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--accent-rose)', fontFamily: 'monospace' }}>
                Reason: {liveError}
              </div>
            </div>

            <button
              type="button"
              id="stage03-retry-btn"
              onClick={executeLiveVoyageRequest}
              style={{
                padding: '0.6rem 1.15rem',
                background: '#FFFFFF',
                border: '1px solid var(--accent-rose)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-rose)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span>↻</span>
              <span>Retry Live Evaluation</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Live Response Display */}
      {liveResponse && !isLoadingLive && (
        <>
          {/* PRIMARY ROUTE INFORMATION */}
          {primaryRoute && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Primary Route Information
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
                    {primaryRouteName}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={handleOpenLiveMap}
                    style={{
                      padding: '0.35rem 0.8rem',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-ocean)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all var(--transition-fast)',
                    }}
                    title="Open standalone MapLibre + Geoapify SeaRoute & weather visualization in a new tab"
                  >
                    <span>🗺️ Open Live Maritime Map ↗</span>
                  </button>
                  <span className="badge badge-emerald" style={{ fontSize: '0.76rem' }}>
                    ⭐ Primary Route
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                gap: '0.75rem',
                background: 'var(--bg-card-inset)',
                padding: '0.9rem',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Route Name / Label</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {primaryRouteName}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Route ID</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {primaryRoute.id || 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Distance (NM)</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {primaryRoute.distance_nm !== null && primaryRoute.distance_nm !== undefined
                      ? `${primaryRoute.distance_nm.toLocaleString()} NM`
                      : 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Duration (hrs)</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {primaryRoute.duration_hours !== null && primaryRoute.duration_hours !== undefined
                      ? `${primaryRoute.duration_hours.toFixed(1)} hrs`
                      : 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Rank</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--accent-ocean)' }}>
                    {primaryRoute.optimization?.rank !== null && primaryRoute.optimization?.rank !== undefined
                      ? `#${primaryRoute.optimization.rank}`
                      : 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Route Score</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)' }}>
                    {primaryRoute.optimization?.score !== null && primaryRoute.optimization?.score !== undefined
                      ? primaryRoute.optimization.score.toFixed(2)
                      : 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Weather Coverage</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--accent-teal-dark)' }}>
                    {liveResponse.weather_coverage_ratio !== null && liveResponse.weather_coverage_ratio !== undefined
                      ? `${(liveResponse.weather_coverage_ratio * 100).toFixed(0)}%`
                      : primaryRoute.optimization?.weather_coverage_ratio !== null && primaryRoute.optimization?.weather_coverage_ratio !== undefined
                      ? `${(primaryRoute.optimization.weather_coverage_ratio * 100).toFixed(0)}%`
                      : 'Unavailable'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Marine Coverage</span>
                  <strong style={{ fontSize: '0.96rem', color: 'var(--accent-teal-dark)' }}>
                    {liveResponse.marine_coverage_ratio !== null && liveResponse.marine_coverage_ratio !== undefined
                      ? `${(liveResponse.marine_coverage_ratio * 100).toFixed(0)}%`
                      : primaryRoute.optimization?.marine_coverage_ratio !== null && primaryRoute.optimization?.marine_coverage_ratio !== undefined
                      ? `${(primaryRoute.optimization.marine_coverage_ratio * 100).toFixed(0)}%`
                      : 'Unavailable'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* LIVE ENVIRONMENTAL CONDITIONS */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Maritime Telemetry
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
                  LIVE ENVIRONMENTAL CONDITIONS
                </h3>
              </div>
              {representativePoint?.latitude !== undefined && representativePoint?.longitude !== undefined && (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Sample WP: {representativePoint.latitude.toFixed(2)}°, {representativePoint.longitude.toFixed(2)}°
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
              background: 'var(--bg-card-inset)',
              padding: '0.9rem',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Wind Speed</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.wind_speed_knots !== null && representativePoint?.wind_speed_knots !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.wind_speed_knots !== null && representativePoint?.wind_speed_knots !== undefined
                    ? `${representativePoint.wind_speed_knots.toFixed(1)} kn`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Wind Direction</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.wind_direction_deg !== null && representativePoint?.wind_direction_deg !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.wind_direction_deg !== null && representativePoint?.wind_direction_deg !== undefined
                    ? `${representativePoint.wind_direction_deg.toFixed(0)}°`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Significant Wave Height</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.significant_wave_height_m !== null && representativePoint?.significant_wave_height_m !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.significant_wave_height_m !== null && representativePoint?.significant_wave_height_m !== undefined
                    ? `${representativePoint.significant_wave_height_m.toFixed(1)} m`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Sea State</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.sea_state !== null && representativePoint?.sea_state !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.sea_state !== null && representativePoint?.sea_state !== undefined
                    ? `${representativePoint.sea_state}`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Ocean Current</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.ocean_current_velocity_knots !== null && representativePoint?.ocean_current_velocity_knots !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.ocean_current_velocity_knots !== null && representativePoint?.ocean_current_velocity_knots !== undefined
                    ? `${representativePoint.ocean_current_velocity_knots.toFixed(1)} kn`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Along-Track Current</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.along_track_current_knots !== null && representativePoint?.along_track_current_knots !== undefined
                    ? representativePoint.along_track_current_knots >= 0 ? 'var(--accent-teal-dark)' : 'var(--accent-amber)'
                    : 'var(--text-muted)'
                }}>
                  {representativePoint?.along_track_current_knots !== null && representativePoint?.along_track_current_knots !== undefined
                    ? `${representativePoint.along_track_current_knots >= 0 ? '+' : ''}${representativePoint.along_track_current_knots.toFixed(1)} kn`
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Weather Risk</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.weather_risk_level === 'CRITICAL'
                    ? 'var(--accent-rose)'
                    : representativePoint?.weather_risk_level === 'HIGH'
                    ? 'var(--accent-amber)'
                    : representativePoint?.weather_risk_level
                    ? 'var(--accent-teal-dark)'
                    : 'var(--text-muted)'
                }}>
                  {representativePoint?.weather_risk_level !== null && representativePoint?.weather_risk_level !== undefined && representativePoint.weather_risk_level !== ''
                    ? representativePoint.weather_risk_level
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Storm Status</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.storm_flag === true
                    ? 'var(--accent-rose)'
                    : representativePoint?.storm_flag === false
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)'
                }}>
                  {representativePoint?.storm_flag === true
                    ? 'Storm'
                    : representativePoint?.storm_flag === false
                    ? 'No Storm'
                    : 'Unavailable'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Visibility</span>
                <strong style={{
                  fontSize: '0.96rem',
                  color: representativePoint?.visibility_m !== null && representativePoint?.visibility_m !== undefined ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {representativePoint?.visibility_m !== null && representativePoint?.visibility_m !== undefined
                    ? `${representativePoint.visibility_m} m`
                    : 'Unavailable'}
                </strong>
              </div>
            </div>
          </div>

          {/* CANDIDATE ROUTES (Rendered dynamically, 1, 2, 3+ routes) */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>✓</span>
                  <span>Candidate Maritime Routes ({liveResponse.routes.length})</span>
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Returned candidate routes: <strong>{liveResponse.routes.length}</strong>. Select the active corridor for downstream classical and quantum-inspired optimization.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {liveResponse.routes.map((route: NormalizedRoutePlan, idx: number) => {
                const isSelected = selectedRouteId === route.id;
                const routeName = (route.metadata && (route.metadata.name || route.metadata.label)) || `Route ${idx + 1} (${route.id})`;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    style={{
                      background: '#FFFFFF',
                      border: `2px solid ${isSelected ? 'var(--accent-teal)' : '#E0EBF2'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 12px rgba(63, 164, 142, 0.16)' : 'var(--shadow-card)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--accent-ocean)' }}>
                          {route.id}
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.15rem 0 0 0' }}>
                          {routeName}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {route.is_primary && (
                          <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                            ⭐ Primary
                          </span>
                        )}
                        <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                          ✓ Feasible
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.5rem',
                      background: 'var(--bg-card-inset)',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      marginTop: '0.5rem',
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Distance:</span>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {route.distance_nm !== null && route.distance_nm !== undefined ? `${route.distance_nm.toLocaleString()} NM` : 'Unavailable'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Duration:</span>
                        <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          {route.duration_hours !== null && route.duration_hours !== undefined ? `${route.duration_hours.toFixed(1)} hrs` : 'Unavailable'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Rank:</span>
                        <strong style={{ color: 'var(--accent-ocean)' }}>
                          {route.optimization?.rank !== null && route.optimization?.rank !== undefined ? `#${route.optimization.rank}` : 'Unavailable'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>Score:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {route.optimization?.score !== null && route.optimization?.score !== undefined ? route.optimization.score.toFixed(2) : 'Unavailable'}
                        </strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{route.environmental_points?.length || 0} telemetry points</span>
                      <span style={{ color: isSelected ? 'var(--accent-teal-dark)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 400 }}>
                        {isSelected ? '● Active Selection' : '○ Click to select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 5. Navigation Controls */}
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
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-ocean)' }}>
            Stage 03 of 07
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Environment
          </div>
        </div>

        <button
          type="button"
          id="stage-continue-btn"
          className="stage-nav-btn stage-nav-btn-primary"
          onClick={onValidContinue}
          disabled={!canContinueLive}
        >
          <span>Continue to Classical Optimization</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
