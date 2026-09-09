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

// Bundle Stage04Classical with esbuild for Node test runner
const stage04BundlePath = path.join(outDir, 'stage04TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage04Classical.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage04BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const stage04Url = pathToFileURL(stage04BundlePath).href;
const { Stage04Classical } = await import(stage04Url);

const mockVoyageConfig = {
  sourcePort: 'PORT-SG',
  destPort: 'PORT-RTM',
  cargoWeight: 60000,
  departureDate: '2026-10-01T12:00',
  deadlineDate: '2026-10-29T12:00',
};

const mockFleetIds = ['VES-001', 'VES-002', 'VES-003'];

const mockEnvironmentResult = {
  status: 'completed',
  scenario_id: 'nominal',
  assessed_routes_count: 2,
  route_assessments: {
    'RT-SG-RTM-SUEZ': {
      status: 'completed',
      disclaimer: '',
      environmental_disclaimer: '',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_speed_knots: 14.0,
      total_distance_nm: 8280.0,
      baseline_travel_time_hours: 591.4,
      baseline_travel_time_days: 24.6,
      weather_adjusted_travel_time_hours: 591.4,
      weather_adjusted_travel_time_days: 24.6,
      time_delta_hours: 0,
      aggregate_demo_environmental_fuel_factor: 1.05,
      overall_risk_level: 'LOW',
      is_feasible: true,
      infeasibility_reasons: [],
      warnings: [],
      segment_assessments: [],
    },
    'RT-SG-RTM-CAPE': {
      status: 'completed',
      disclaimer: '',
      environmental_disclaimer: '',
      route_id: 'RT-SG-RTM-CAPE',
      route_name: 'Singapore to Rotterdam via Cape of Good Hope',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_speed_knots: 14.0,
      total_distance_nm: 11720.0,
      baseline_travel_time_hours: 837.1,
      baseline_travel_time_days: 34.9,
      weather_adjusted_travel_time_hours: 837.1,
      weather_adjusted_travel_time_days: 34.9,
      time_delta_hours: 0,
      aggregate_demo_environmental_fuel_factor: 1.08,
      overall_risk_level: 'MODERATE',
      is_feasible: true,
      infeasibility_reasons: [],
      warnings: [],
      segment_assessments: [],
    },
  },
  safe_routes_count: 2,
  unsafe_routes_count: 0,
  weather_fuel_factors: { 'RT-SG-RTM-SUEZ': 1.05, 'RT-SG-RTM-CAPE': 1.08 },
  notes: [],
};

const mockClassicalResponse = {
  status: 'completed',
  disclaimer: 'SIMULATED CLASSICAL OPTIMIZATION BASELINE',
  environmental_disclaimer: 'Route environmental assessments applied',
  request: {
    source_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    cargo_weight_tonnes: 60000.0,
    departure_datetime: '2026-10-01T12:00:00.000Z',
    deadline_datetime: '2026-10-29T12:00:00.000Z',
    vessel_ids: ['VES-001', 'VES-002', 'VES-003'],
    route_ids: ['RT-SG-RTM-SUEZ', 'RT-SG-RTM-CAPE'],
    speed_grid_step_knots: 1.0,
    currency: 'USD',
    scenario_id: null,
  },
  cost_efficient: {
    mode: 'cost_efficient',
    objective_description: 'Minimizes total voyage cost',
    per_vessel_best: {},
    global_best: {
      decision_id: 'DEC-VES-001-SUEZ-VLSFO-12',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_type: 'Ultra Large Container Vessel (ULCV)',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      fuel_id: 'VLSFO',
      fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
      cargo_tonnes: 60000.0,
      distance_nm: 8280.0,
      cruising_speed_knots: 12.0,
      effective_speed_knots: 11.8,
      sailing_time_hours: 701.7,
      port_wait_hours: 14.0,
      total_voyage_time_hours: 715.7,
      departure_datetime: '2026-10-01T12:00:00.000Z',
      arrival_datetime: '2026-10-29T12:00:00.000Z',
      deadline_datetime: '2026-10-29T12:00:00.000Z',
      deadline_margin_hours: 48.5,
      fuel_consumption_tonnes: 1420.5,
      fuel_cost_usd: 880710.0,
      route_cost_usd: 387000.0,
      total_voyage_cost_usd: 1267710.0,
      operational_co2_tonnes: 4424.8,
      lifecycle_ghg_tonnes: 5113.8,
      cargo_utilization_pct: 50.0,
      demo_environmental_fuel_factor: 1.05,
      weather_risk_level: 'LOW',
      is_feasible: true,
      infeasibility_reasons: [],
    },
  },
  time_efficient: {
    mode: 'time_efficient',
    objective_description: 'Minimizes total voyage transit duration',
    per_vessel_best: {},
    global_best: {
      decision_id: 'DEC-VES-001-SUEZ-VLSFO-18',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_type: 'Ultra Large Container Vessel (ULCV)',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      fuel_id: 'VLSFO',
      fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
      cargo_tonnes: 60000.0,
      distance_nm: 8280.0,
      cruising_speed_knots: 18.0,
      effective_speed_knots: 17.8,
      sailing_time_hours: 465.2,
      port_wait_hours: 14.0,
      total_voyage_time_hours: 479.2,
      departure_datetime: '2026-10-01T12:00:00.000Z',
      arrival_datetime: '2026-10-29T12:00:00.000Z',
      deadline_datetime: '2026-10-29T12:00:00.000Z',
      deadline_margin_hours: 195.2,
      fuel_consumption_tonnes: 2180.4,
      fuel_cost_usd: 1351848.0,
      route_cost_usd: 387000.0,
      total_voyage_cost_usd: 1738848.0,
      operational_co2_tonnes: 6792.0,
      lifecycle_ghg_tonnes: 7849.4,
      cargo_utilization_pct: 50.0,
      demo_environmental_fuel_factor: 1.05,
      weather_risk_level: 'LOW',
      is_feasible: true,
      infeasibility_reasons: [],
    },
  },
  informational_best_fuel: null,
  informational_best_emissions: null,
  benchmark: {
    total_candidates_evaluated: 144,
    feasible_candidates_count: 60,
    infeasible_candidates_count: 84,
    feasibility_rate_pct: 41.7,
    rejection_breakdown: {
      capacity: 12,
      speed: 0,
      fuel_compatibility: 8,
      draft: 0,
      route_restriction: 0,
      weather: 4,
      negative_speed: 0,
      deadline: 60,
    },
    runtime_ms: 18.2,
    speed_grid_step_knots: 1.0,
    unique_vessels_count: 3,
    unique_routes_count: 2,
    unique_fuels_count: 3,
  },
  candidate_decision_space_preview: [
    { decision_id: 'DEC-001', vessel_id: 'VES-001', route_id: 'RT-SG-RTM-SUEZ', fuel_id: 'VLSFO', speed_knots: 12.0 },
    { decision_id: 'DEC-002', vessel_id: 'VES-001', route_id: 'RT-SG-RTM-SUEZ', fuel_id: 'VLSFO', speed_knots: 18.0 },
  ],
};

// ==============================================================================
// Test 1: Stage 04 renders title, subtitle, and stage indicators
// ==============================================================================
test('1. Stage 04 renders title, subtitle, and stage indicators', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Classical Baseline'), 'Must render Classical Baseline title');
  assert.ok(
    html.includes('Evaluate feasible vessel, route, speed, and fuel combinations using the conventional optimizer'),
    'Must render required subtitle'
  );
  assert.ok(html.includes('04 / 07'), 'Must display Stage 04 indicator');
  assert.ok(html.includes('Exhaustive Baseline'), 'Must display Exhaustive Baseline badge');
});

// ==============================================================================
// Test 2: Voyage, fleet, and environment context appears without re-entry
// ==============================================================================
test('2. Voyage, fleet, and environment read-only context appears without re-entry', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001', 'VES-002'],
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('PORT-SG'), 'Must display source port');
  assert.ok(html.includes('PORT-RTM'), 'Must display destination port');
  assert.ok(html.includes('60,000') && html.includes('MT'), 'Must display cargo payload');
  assert.ok(html.includes('2') && html.includes('Vessels Selected'), 'Must display fleet count');
  assert.ok(html.includes('Poseidon Leader'), 'Must display vessel name');
  assert.ok(html.includes('2') && html.includes('Feasible Routes'), 'Must display environment feasible route count');
});

// ==============================================================================
// Test 3: Explanation of classical optimization is visible
// ==============================================================================
test('3. Explanation of classical optimization is visible', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(
    html.includes('The classical baseline exhaustively evaluates feasible vessel × route × speed × fuel combinations under the configured operational constraints'),
    'Must render the exact required explanation sentence'
  );
});

// ==============================================================================
// Test 4: Run Classical Optimization button exists
// ==============================================================================
test('4. Run button exists with correct id', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="run-classical-opt-btn"'), 'Must have run-classical-opt-btn id');
  assert.ok(html.includes('Run Classical Optimization'), 'Must have button text Run Classical Optimization');
});

// ==============================================================================
// Test 5: Optimizer is not called before Run (no results shown initially)
// ==============================================================================
test('5. Optimizer results are not displayed before running', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(!html.includes('id="classical-results-section"'), 'Must not render results section before optimization runs');
  assert.ok(html.includes('Ready to Run'), 'Status should be Ready to Run');
});

// ==============================================================================
// Test 6: Actual backend response values are displayed when classicalResult is present
// ==============================================================================
test('6. Actual backend result values are displayed in KPI metrics', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="classical-results-section"'), 'Must render results section');
  assert.ok(html.includes('144'), 'Must display candidates evaluated count (144)');
  assert.ok(html.includes('60'), 'Must display feasible candidates count (60)');
  assert.ok(html.includes('18.2 ms'), 'Must display classical runtime (18.2 ms)');
  assert.ok(html.includes('41.7% Feasibility Rate'), 'Must display feasibility rate');
});

// ==============================================================================
// Test 7: Cost-efficient result is displayed separately
// ==============================================================================
test('7. Cost-efficient result is displayed separately with required metrics', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="card-cost-efficient"'), 'Must have card-cost-efficient');
  assert.ok(html.includes('Cost-Efficient Voyage'), 'Must label as Cost-Efficient Voyage');
  assert.ok(html.includes('This is the minimum-cost feasible solution found by the classical baseline'), 'Must have cost-efficient caption');
  assert.ok(html.includes('1,267,710'), 'Must display total cost $1,267,710');
  assert.ok(html.includes('12') && html.includes('knots'), 'Must display cruising speed 12 knots');
  assert.ok(html.includes('48.5') && html.includes('hrs buffer'), 'Must display deadline margin');
});

// ==============================================================================
// Test 8: Time-efficient result is displayed separately
// ==============================================================================
test('8. Time-efficient result is displayed separately with required metrics', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="card-time-efficient"'), 'Must have card-time-efficient');
  assert.ok(html.includes('Time-Efficient Voyage'), 'Must label as Time-Efficient Voyage');
  assert.ok(html.includes('This is the fastest feasible solution identified by the classical baseline'), 'Must have time-efficient caption');
  assert.ok(html.includes('1,738,848'), 'Must display total cost $1,738,848');
  assert.ok(html.includes('18') && html.includes('knots'), 'Must display cruising speed 18 knots');
  assert.ok(html.includes('195.2') && html.includes('hrs buffer'), 'Must display deadline margin');
});

// ==============================================================================
// Test 9: Continue button disabled before result is obtained
// ==============================================================================
test('9. Stage 05 remains locked / Continue disabled until classical optimization succeeds', () => {
  const htmlWithoutResult = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(htmlWithoutResult.includes('id="stage-continue-btn"'), 'Must have stage-continue-btn');
  assert.ok(htmlWithoutResult.includes('disabled'), 'Continue button must be disabled when classicalResult is null');
});

// ==============================================================================
// Test 10: Continue button enabled when classicalResult is present
// ==============================================================================
test('10. Continue button is enabled when classical optimization is complete', () => {
  const htmlWithResult = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  // When classicalResult is present, the continue button should not have disabled attribute
  const continueBtnMatch = htmlWithResult.match(/<button[^>]*id="stage-continue-btn"[^>]*>/);
  assert.ok(continueBtnMatch, 'Must find stage-continue-btn');
  assert.ok(!continueBtnMatch[0].includes('disabled'), 'Continue button must not be disabled when classicalResult is provided');
});

// ==============================================================================
// Test 11: Navigation controls wire correctly to previous and continue callbacks
// ==============================================================================
test('11. Navigation controls render Previous (Environment) and Continue buttons', () => {
  const html = renderToString(
    React.createElement(Stage04Classical, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      onClassicalOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="stage-prev-btn"'), 'Must have stage-prev-btn');
  assert.ok(html.includes('Previous (Environment)'), 'Must display Previous (Environment)');
  assert.ok(html.includes('Continue to Quantum-Inspired (Stage 05)'), 'Must display target stage on continue');
});

// ==============================================================================
// Test 12: App.tsx integration preserves state and downstream invalidation
// ==============================================================================
test('12. App.tsx integrates Stage04Classical with state synchronization and invalidation', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');

  assert.ok(appSrc.includes('Stage04Classical'), 'App.tsx must import and render Stage04Classical');
  assert.ok(
    appSrc.includes('classicalResult') && appSrc.includes('setClassicalResult'),
    'App.tsx must manage classicalResult state'
  );
  assert.ok(
    appSrc.includes('activeStage === 4 ? ('),
    'App.tsx must render Stage04Classical on activeStage 4'
  );
  assert.ok(
    appSrc.includes('setClassicalResult(null)'),
    'Modifying upstream stages must invalidate classicalResult'
  );
  assert.ok(
    appSrc.includes('setActiveStage(5)') && appSrc.includes('setMaxUnlockedStage((prev) => Math.max(prev, 5))'),
    'Continuing from Stage 04 must advance to Stage 05 and unlock Stage 05'
  );
});
