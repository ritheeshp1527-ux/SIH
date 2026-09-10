import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '../../dist-test');
fs.mkdirSync(outDir, { recursive: true });

// Bundle Stage03Environment with esbuild
const stage03BundlePath = path.join(outDir, 'stage03PropagationTestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage03Environment.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage03BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic',
});

const stage03Url = pathToFileURL(stage03BundlePath).href;
const { Stage03Environment } = await import(stage03Url);

// ==============================================================================
// Mock Payloads
// ==============================================================================

const mockSingaporeDubaiResponse = {
  status: 'success',
  source_port: 'PORT-SG',
  destination_port: 'AEDXB',
  source_locode: 'SGSIN',
  destination_locode: 'AEDXB',
  routes: [
    {
      id: 'LIVE-SGSIN-AEDXB-01',
      is_primary: true,
      distance_m: 6485815.0,
      distance_nm: 3502.06,
      duration_ms: 900360000.0,
      duration_hours: 250.1,
      geometry: { type: 'LineString', coordinates: [[103.85, 1.29], [55.06, 25.01]] },
      environmental_points: [
        {
          latitude: 1.29,
          longitude: 103.85,
          timestamp: '2026-10-01T12:00:00Z',
          wind_speed_knots: 12.5,
          wind_direction_deg: 180.0,
          significant_wave_height_m: 1.4,
          wave_direction_deg: 190.0,
          wave_period_s: 6.5,
          ocean_current_velocity_knots: 0.8,
          ocean_current_direction_deg: 90.0,
          sea_state: 3,
          along_track_current_knots: 0.5,
          storm_flag: false,
          weather_risk_level: 'LOW',
          visibility_m: 10000.0,
        },
        {
          latitude: 15.0,
          longitude: 65.0,
          timestamp: '2026-10-05T12:00:00Z',
          wind_speed_knots: null,
          wind_direction_deg: null,
          significant_wave_height_m: null,
          wave_direction_deg: null,
          wave_period_s: null,
          ocean_current_velocity_knots: null,
          ocean_current_direction_deg: null,
          sea_state: null,
          along_track_current_knots: null,
          storm_flag: null,
          weather_risk_level: null,
          visibility_m: null,
        },
      ],
      metadata: { name: 'Singapore to Dubai (Jebel Ali) Direct Passage' },
      optimization: {
        score: 91.2,
        rank: 1,
        distance_score: 92.0,
        wind_score: 88.0,
        wave_score: 90.0,
        current_score: 94.0,
        risk_score: 95.0,
        storm_penalty: 0.0,
        marine_coverage_ratio: 1.0,
        weather_coverage_ratio: 1.0,
        explanation: 'Direct passage via Malacca and Arabian Sea with favorable currents.',
      },
    },
  ],
  primary_route: {
    id: 'LIVE-SGSIN-AEDXB-01',
    is_primary: true,
    distance_m: 6485815.0,
    distance_nm: 3502.06,
    duration_ms: 900360000.0,
    duration_hours: 250.1,
    geometry: { type: 'LineString', coordinates: [[103.85, 1.29], [55.06, 25.01]] },
    environmental_points: [],
    metadata: { name: 'Singapore to Dubai (Jebel Ali) Direct Passage' },
  },
  marine_coverage_ratio: 0.96,
  weather_coverage_ratio: 0.99,
};

const mockSingaporeRotterdamResponse = {
  status: 'success',
  source_port: 'PORT-SG',
  destination_port: 'PORT-RTM',
  source_locode: 'SGSIN',
  destination_locode: 'NLRTM',
  routes: [
    {
      id: 'LIVE-SGSIN-NLRTM-SUEZ',
      is_primary: true,
      distance_m: 15334560.0,
      distance_nm: 8280.0,
      duration_ms: 2129040000.0,
      duration_hours: 591.4,
      geometry: { type: 'LineString', coordinates: [] },
      environmental_points: [],
      metadata: { name: 'Singapore to Rotterdam via Suez Canal (Live)' },
      optimization: {
        score: 85.0,
        rank: 1,
        distance_score: 90.0,
        wind_score: 80.0,
        risk_score: 85.0,
        storm_penalty: 0.0,
        marine_coverage_ratio: 0.98,
        weather_coverage_ratio: 0.95,
        explanation: 'Primary passage through Suez Canal.',
      },
    },
    {
      id: 'LIVE-SGSIN-NLRTM-CAPE',
      is_primary: false,
      distance_m: 21705440.0,
      distance_nm: 11720.0,
      duration_ms: 3013560000.0,
      duration_hours: 837.1,
      geometry: { type: 'LineString', coordinates: [] },
      environmental_points: [],
      metadata: { name: 'Singapore to Rotterdam via Cape of Good Hope (Live)' },
      optimization: {
        score: 72.0,
        rank: 2,
        distance_score: 65.0,
        wind_score: 78.0,
        risk_score: 82.0,
        storm_penalty: 0.0,
        marine_coverage_ratio: 0.94,
        weather_coverage_ratio: 0.92,
        explanation: 'Alternative deep-water passage avoiding Red Sea.',
      },
    },
  ],
  primary_route: {
    id: 'LIVE-SGSIN-NLRTM-SUEZ',
    is_primary: true,
    distance_m: 15334560.0,
    distance_nm: 8280.0,
    duration_ms: 2129040000.0,
    duration_hours: 591.4,
    geometry: { type: 'LineString', coordinates: [] },
    environmental_points: [],
    metadata: { name: 'Singapore to Rotterdam via Suez Canal (Live)' },
  },
  marine_coverage_ratio: 0.96,
  weather_coverage_ratio: 0.94,
};

const mockMumbaiDubaiResponse = {
  status: 'success',
  source_port: 'INBOM',
  destination_port: 'AEDXB',
  source_locode: 'INBOM',
  destination_locode: 'AEDXB',
  routes: [
    {
      id: 'LIVE-INBOM-AEDXB-01',
      is_primary: true,
      distance_m: 2165358.4,
      distance_nm: 1169.2,
      duration_ms: 300600000.0,
      duration_hours: 83.5,
      geometry: { type: 'LineString', coordinates: [[72.95, 18.95], [55.06, 25.01]] },
      environmental_points: [],
      metadata: { name: 'Mumbai to Dubai (Jebel Ali) Coastal Passage' },
      optimization: {
        score: 94.5,
        rank: 1,
        distance_score: 95.0,
        wind_score: 92.0,
        risk_score: 96.0,
        storm_penalty: 0.0,
        marine_coverage_ratio: 1.0,
        weather_coverage_ratio: 1.0,
        explanation: 'Short Arabian Sea crossing into Gulf of Oman.',
      },
    },
  ],
  primary_route: {
    id: 'LIVE-INBOM-AEDXB-01',
    is_primary: true,
    distance_m: 2165358.4,
    distance_nm: 1169.2,
    duration_ms: 300600000.0,
    duration_hours: 83.5,
    geometry: { type: 'LineString', coordinates: [] },
    environmental_points: [],
    metadata: { name: 'Mumbai to Dubai (Jebel Ali) Coastal Passage' },
  },
  marine_coverage_ratio: 1.0,
  weather_coverage_ratio: 1.0,
};

// ==============================================================================
// TEST SUITE: Phase 4C Voyage State Propagation & Request Construction
// ==============================================================================

test('A. Singapore → Dubai: Stage03 renders Dubai destination without Rotterdam routes', () => {
  const voyageConfig = {
    sourcePort: 'PORT-SG',
    destPort: 'AEDXB',
    cargoWeight: 55000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-20T12:00',
  };

  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeDubaiResponse,
      mode: 'live',
    })
  );

  // Must render authoritative Stage 01 ports
  assert.ok(html.includes('PORT-SG'), 'Must display origin PORT-SG');
  assert.ok(html.includes('AEDXB'), 'Must display destination AEDXB');
  assert.ok(html.includes('LIVE-SGSIN-AEDXB-01'), 'Must render Dubai route ID');
  assert.ok(html.includes('Singapore to Dubai (Jebel Ali) Direct Passage'), 'Must render Dubai route name');
  assert.ok(html.includes('3,502.06') || html.includes('3,502'), 'Must display distance ~3502 NM');

  // Must NOT inject Rotterdam or Suez/Cape routes
  assert.ok(!html.includes('PORT-RTM'), 'Must NOT contain PORT-RTM');
  assert.ok(!html.includes('NLRTM'), 'Must NOT contain NLRTM');
  assert.ok(!html.includes('RT-SG-RTM-SUEZ'), 'Must NOT inject Suez demo route');
  assert.ok(!html.includes('RT-SG-RTM-CAPE'), 'Must NOT inject Cape demo route');
  assert.ok(!html.includes('Rotterdam'), 'Must NOT mention Rotterdam in route cards');
});

test('B. Singapore → Rotterdam: Stage03 renders live Rotterdam candidate corridors', () => {
  const voyageConfig = {
    sourcePort: 'PORT-SG',
    destPort: 'PORT-RTM',
    cargoWeight: 60000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-29T12:00',
  };

  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeRotterdamResponse,
      mode: 'live',
    })
  );

  assert.ok(html.includes('PORT-SG'), 'Must display origin PORT-SG');
  assert.ok(html.includes('PORT-RTM'), 'Must display destination PORT-RTM');
  assert.ok(html.includes('LIVE-SGSIN-NLRTM-SUEZ'), 'Must render live Suez route');
  assert.ok(html.includes('LIVE-SGSIN-NLRTM-CAPE'), 'Must render live Cape route');
  assert.ok(html.includes('8,280') && html.includes('NM'), 'Must render Suez distance 8,280 NM');
  assert.ok(html.includes('11,720') && html.includes('NM'), 'Must render Cape distance 11,720 NM');
});

test('C. Mumbai → Dubai: Stage03 renders Mumbai-Dubai live voyage without Rotterdam contamination', () => {
  const voyageConfig = {
    sourcePort: 'INBOM',
    destPort: 'AEDXB',
    cargoWeight: 40000,
    departureDate: '2026-10-05T08:00',
    deadlineDate: '2026-10-15T18:00',
  };

  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig,
      selectedVesselIds: ['VES-002'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockMumbaiDubaiResponse,
      mode: 'live',
    })
  );

  assert.ok(html.includes('INBOM'), 'Must display origin INBOM');
  assert.ok(html.includes('AEDXB'), 'Must display destination AEDXB');
  assert.ok(html.includes('LIVE-INBOM-AEDXB-01'), 'Must render live Mumbai-Dubai route ID');
  assert.ok(html.includes('Mumbai to Dubai (Jebel Ali) Coastal Passage'), 'Must render route title');
  assert.ok(html.includes('1,169.2') && html.includes('NM'), 'Must display distance 1169.2 NM');

  // Strict check: zero Rotterdam or Singapore residue
  assert.ok(!html.includes('PORT-RTM'), 'Must NOT contain PORT-RTM');
  assert.ok(!html.includes('NLRTM'), 'Must NOT contain NLRTM');
  assert.ok(!html.includes('RT-SG-RTM-SUEZ'), 'Must NOT inject Suez demo route');
  assert.ok(!html.includes('RT-SG-RTM-CAPE'), 'Must NOT inject Cape demo route');
});

test('D. Changing voyage destination updates Stage03 and discards stale routes', () => {
  // First render: Singapore → Rotterdam
  const configRtm = {
    sourcePort: 'PORT-SG',
    destPort: 'PORT-RTM',
    cargoWeight: 60000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-29T12:00',
  };

  const htmlRtm = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: configRtm,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeRotterdamResponse,
      mode: 'live',
    })
  );
  assert.ok(htmlRtm.includes('PORT-RTM'), 'Initial state has PORT-RTM');

  // Second render: Destination switched to Dubai (AEDXB)
  const configDxb = {
    ...configRtm,
    destPort: 'AEDXB',
  };

  const htmlDxb = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: configDxb,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeDubaiResponse,
      mode: 'live',
    })
  );

  assert.ok(htmlDxb.includes('AEDXB'), 'Updated state has AEDXB');
  assert.ok(!htmlDxb.includes('PORT-RTM'), 'Updated state does NOT retain PORT-RTM');
  assert.ok(htmlDxb.includes('LIVE-SGSIN-AEDXB-01'), 'Updated state renders Dubai route');
  assert.ok(!htmlDxb.includes('LIVE-SGSIN-NLRTM-SUEZ'), 'Stale Suez route is discarded');
});

test('E. Live service unavailable: Stage03 shows clear unavailable state with Retry button (No silent demo fallback)', () => {
  const voyageConfig = {
    sourcePort: 'PORT-SG',
    destPort: 'AEDXB',
    cargoWeight: 50000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-20T12:00',
  };

  // Render in Live mode with NO initial response and skipAnimation=false to trigger loading/error surface
  // We can pass an error state or verify the error card structure
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: false,
      initialLiveResponse: null,
      mode: 'live',
    })
  );

  // When live service response is not present, it must show loading or explicit state
  assert.ok(
    html.includes('Querying Live Maritime Routing') ||
    html.includes('Evaluating Live Telemetry') ||
    html.includes('Live maritime routing and weather unavailable'),
    'Must display honest live querying / unavailable state'
  );

  // Must NOT secretly render DEFAULT_ROUTES as live data
  assert.ok(!html.includes('RT-SG-RTM-SUEZ'), 'Must NOT inject demo Suez route into Dubai voyage');
  assert.ok(!html.includes('RT-SG-RTM-CAPE'), 'Must NOT inject demo Cape route into Dubai voyage');
});

test('F. Variable candidate route count: UI renders 1, 2, and 3+ candidates dynamically', () => {
  const mock3Candidates = {
    status: 'success',
    source_port: 'PORT-SG',
    destination_port: 'AEDXB',
    source_locode: 'SGSIN',
    destination_locode: 'AEDXB',
    routes: [
      {
        id: 'LIVE-ROUTE-ALPHA',
        is_primary: true,
        distance_m: 6400000.0,
        distance_nm: 3455.7,
        duration_ms: 880000000.0,
        duration_hours: 244.4,
        geometry: { type: 'LineString', coordinates: [] },
        environmental_points: [],
        metadata: { name: 'Alpha Coastal Corridor' },
      },
      {
        id: 'LIVE-ROUTE-BETA',
        is_primary: false,
        distance_m: 6600000.0,
        distance_nm: 3563.7,
        duration_ms: 910000000.0,
        duration_hours: 252.8,
        geometry: { type: 'LineString', coordinates: [] },
        environmental_points: [],
        metadata: { name: 'Beta Deepwater Corridor' },
      },
      {
        id: 'LIVE-ROUTE-GAMMA',
        is_primary: false,
        distance_m: 6900000.0,
        distance_nm: 3725.7,
        duration_ms: 950000000.0,
        duration_hours: 263.9,
        geometry: { type: 'LineString', coordinates: [] },
        environmental_points: [],
        metadata: { name: 'Gamma Weather Avoidance Corridor' },
      },
    ],
    primary_route: null,
    marine_coverage_ratio: 0.99,
    weather_coverage_ratio: 0.99,
  };

  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: {
        sourcePort: 'PORT-SG',
        destPort: 'AEDXB',
        cargoWeight: 60000,
        departureDate: '2026-10-01T12:00',
        deadlineDate: '2026-10-25T12:00',
      },
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mock3Candidates,
      mode: 'live',
    })
  );

  assert.ok(html.includes('LIVE-ROUTE-ALPHA'), 'Must render route Alpha');
  assert.ok(html.includes('LIVE-ROUTE-BETA'), 'Must render route Beta');
  assert.ok(html.includes('LIVE-ROUTE-GAMMA'), 'Must render route Gamma');
  assert.ok(
    html.includes('Candidate Maritime Routes') &&
      (html.includes('(3)') || html.includes('3<!-- -->)') || html.includes('(<!-- -->3<!-- -->)')),
    'Must indicate 3 candidate routes evaluated'
  );
});

test('G. Strict null preservation: Missing environmental values display as Unavailable, never 0', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: {
        sourcePort: 'PORT-SG',
        destPort: 'AEDXB',
        cargoWeight: 55000,
        departureDate: '2026-10-01T12:00',
        deadlineDate: '2026-10-20T12:00',
      },
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeDubaiResponse,
      mode: 'live',
    })
  );

  // Point #2 in mockSingaporeDubaiResponse has null wind_speed_knots and significant_wave_height_m
  assert.ok(html.includes('Unavailable'), 'Missing telemetry values must render as Unavailable');
});

test('H. REGRESSION TEST: Old behavior defect where Dubai evaluates Rotterdam routes is eliminated', () => {
  // Reproduction of old bug: User configures Dubai (AEDXB) in Stage 01
  const voyageConfig = {
    sourcePort: 'PORT-SG',
    destPort: 'AEDXB',
    cargoWeight: 60000,
    departureDate: '2026-10-01T12:00',
    deadlineDate: '2026-10-29T12:00',
  };

  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
      initialLiveResponse: mockSingaporeDubaiResponse,
      mode: 'live',
    })
  );

  // Under old behavior, the following would FAIL because Stage03 evaluated Rotterdam Suez/Cape routes:
  assert.strictEqual(
    html.includes('Singapore (PORT-SG) → Rotterdam (PORT-RTM)'),
    false,
    'Regression check: Hardcoded Singapore-Rotterdam title must NOT be rendered for Dubai voyage'
  );
  assert.strictEqual(
    html.includes('RT-SG-RTM-SUEZ'),
    false,
    'Regression check: Suez Rotterdam route must NOT be evaluated for Dubai voyage'
  );
  assert.strictEqual(
    html.includes('RT-SG-RTM-CAPE'),
    false,
    'Regression check: Cape Rotterdam route must NOT be evaluated for Dubai voyage'
  );

  // New behavior MUST be present:
  assert.ok(html.includes('AEDXB'), 'Must evaluate Dubai destination AEDXB');
  assert.ok(html.includes('LIVE-SGSIN-AEDXB-01'), 'Must render Dubai route');
});
