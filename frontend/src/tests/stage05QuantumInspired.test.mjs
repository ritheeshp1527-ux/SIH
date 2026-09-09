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

// Bundle Stage05QuantumInspired with esbuild for Node test runner
const stage05BundlePath = path.join(outDir, 'stage05TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage05QuantumInspired.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage05BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const stage05Url = pathToFileURL(stage05BundlePath).href;
const { Stage05QuantumInspired } = await import(stage05Url);

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
  },
  safe_routes_count: 1,
  unsafe_routes_count: 0,
  weather_fuel_factors: { 'RT-SG-RTM-SUEZ': 1.05 },
  notes: [],
};

const mockClassicalResponse = {
  status: 'completed',
  disclaimer: 'SIMULATED CLASSICAL OPTIMIZATION BASELINE',
  environmental_disclaimer: '',
  request: {
    source_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    cargo_weight_tonnes: 60000.0,
    departure_datetime: '2026-10-01T12:00:00.000Z',
    deadline_datetime: '2026-10-29T12:00:00.000Z',
    vessel_ids: ['VES-001', 'VES-002', 'VES-003'],
    route_ids: ['RT-SG-RTM-SUEZ'],
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
    objective_description: '',
    per_vessel_best: {},
    global_best: null,
  },
  informational_best_fuel: null,
  informational_best_emissions: null,
  benchmark: {
    total_candidates_evaluated: 144,
    feasible_candidates_count: 60,
    infeasible_candidates_count: 84,
    feasibility_rate_pct: 41.7,
    rejection_breakdown: {},
    runtime_ms: 18.2,
    speed_grid_step_knots: 1.0,
    unique_vessels_count: 3,
    unique_routes_count: 1,
    unique_fuels_count: 3,
  },
  candidate_decision_space_preview: [],
};

const mockQiResponse = {
  status: 'completed',
  disclaimer: 'QUANTUM-INSPIRED OPTIMIZATION BASELINE — SIMULATED ANNEALING ON QUBO FORMULATION.',
  qubo_formulation_level: 'discrete_decision_one_hot',
  objective_mode: 'cost',
  qubo_summary: {
    num_variables: 60,
    num_nonzero_coefficients: 1830,
    objective_mode: 'cost',
    penalty_magnitude: 2.5,
    penalty_strategy: 'exact_one_hot',
    normalization_scale: {
      min: 880000.0,
      max: 2100000.0,
      scale_delta: 1220000.0,
    },
    constant_offset: 2.5,
    variable_mappings_preview: [],
    sample_linear_coefficients: {},
    sample_quadratic_coefficients: {},
  },
  solver_config: {
    initial_temperature: 10.0,
    final_temperature: 0.001,
    cooling_rate: 0.95,
    iterations_per_temperature: 50,
    number_of_runs: 5,
    random_seed: 42,
  },
  top_k_solutions: [
    {
      rank: 1,
      decision_id: 'DEC-VES-001-SUEZ-VLSFO-12.0',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      speed_knots: 12.0,
      fuel_id: 'VLSFO',
      fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
      total_cost_usd: 1267710.0,
      total_duration_hours: 715.7,
      fuel_consumption_tonnes: 1420.5,
      operational_co2_tonnes: 4424.8,
      lifecycle_ghg_tonnes: 5113.8,
      arrival_datetime: '2026-10-29T12:00:00.000Z',
      deadline_margin_hours: 48.5,
      weather_risk_level: 'LOW',
      qubo_energy: -0.942,
      is_valid_one_hot: true,
      is_feasible: true,
      infeasibility_reasons: [],
      solver_seed: 42,
      candidate: {},
    },
    {
      rank: 2,
      decision_id: 'DEC-VES-001-SUEZ-LNG-12.0',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      speed_knots: 12.0,
      fuel_id: 'LNG',
      fuel_name: 'Liquefied Natural Gas (LNG)',
      total_cost_usd: 1301910.0,
      total_duration_hours: 715.7,
      fuel_consumption_tonnes: 1180.2,
      operational_co2_tonnes: 3820.0,
      lifecycle_ghg_tonnes: 4350.0,
      arrival_datetime: '2026-10-29T12:00:00.000Z',
      deadline_margin_hours: 48.5,
      weather_risk_level: 'LOW',
      qubo_energy: -0.915,
      is_valid_one_hot: true,
      is_feasible: true,
      infeasibility_reasons: [],
      solver_seed: 42,
      candidate: {},
    },
  ],
  best_solution: {
    rank: 1,
    decision_id: 'DEC-VES-001-SUEZ-VLSFO-12.0',
    vessel_id: 'VES-001',
    vessel_name: 'Poseidon Leader',
    route_id: 'RT-SG-RTM-SUEZ',
    route_name: 'Singapore to Rotterdam via Suez Canal',
    speed_knots: 12.0,
    fuel_id: 'VLSFO',
    fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
    total_cost_usd: 1267710.0,
    total_duration_hours: 715.7,
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    lifecycle_ghg_tonnes: 5113.8,
    arrival_datetime: '2026-10-29T12:00:00.000Z',
    deadline_margin_hours: 48.5,
    weather_risk_level: 'LOW',
    qubo_energy: -0.942,
    is_valid_one_hot: true,
    is_feasible: true,
    infeasibility_reasons: [],
    solver_seed: 42,
    candidate: {},
  },
  solver_runtime_ms: 12.4,
  total_runtime_ms: 24.8,
  number_of_runs_executed: 5,
  unique_feasible_solutions_found: 2,
  raw_decision_space_size: 144,
  feasible_candidate_space_size: 60,
};

// ==============================================================================
// Test 1: Stage 05 renders title, subtitle, and badges
// ==============================================================================
test('1. Stage 05 renders title, subtitle, and required badges', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Quantum-Inspired Optimization'), 'Must render stage title');
  assert.ok(
    html.includes('Search the feasible maritime decision space using a QUBO-based quantum-inspired solver'),
    'Must render required subtitle'
  );
  assert.ok(html.includes('05 / 07'), 'Must display Stage 05 indicator');
  assert.ok(html.includes('QUBO'), 'Must display QUBO badge');
  assert.ok(html.includes('Simulated Annealing'), 'Must display Simulated Annealing badge');
});

// ==============================================================================
// Test 2: Upstream context is displayed
// ==============================================================================
test('2. Upstream context displays Voyage, Fleet, Environment, and Classical Baseline', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('PORT-SG'), 'Must display source port');
  assert.ok(html.includes('PORT-RTM'), 'Must display destination port');
  assert.ok(html.includes('60,000') && html.includes('MT'), 'Must display cargo payload');
  assert.ok(html.includes('3') && html.includes('Vessels Selected'), 'Must display fleet vessel count');
  assert.ok(html.includes('1,267,710'), 'Must display classical baseline best cost');
  assert.ok(html.includes('18.2 ms'), 'Must display classical runtime');
});

// ==============================================================================
// Test 3: Run button exists
// ==============================================================================
test('3. Run button exists with correct id and text', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="run-qi-opt-btn"'), 'Must have run-qi-opt-btn id');
  assert.ok(html.includes('Run Quantum-Inspired Optimization'), 'Must have button label');
});

// ==============================================================================
// Test 4: Run button is blocked before classical optimization completes
// ==============================================================================
test('4. Run button is disabled if classical baseline has not completed', () => {
  const htmlNoClassical = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: null, // Classical baseline not yet solved
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const btnMatch = htmlNoClassical.match(/<button[^>]*id="run-qi-opt-btn"[^>]*>/);
  assert.ok(btnMatch, 'Must find run-qi-opt-btn');
  assert.ok(btnMatch[0].includes('disabled'), 'Run button must be disabled when classicalResult is null');
  assert.ok(htmlNoClassical.includes('Locked (Requires Stage 04)'), 'Status must indicate locked');
});

// ==============================================================================
// Test 5: Run button is enabled when classicalResult is provided
// ==============================================================================
test('5. Run button is enabled after classical baseline completes', () => {
  const htmlWithClassical = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const btnMatch = htmlWithClassical.match(/<button[^>]*id="run-qi-opt-btn"[^>]*>/);
  assert.ok(btnMatch, 'Must find run-qi-opt-btn');
  assert.ok(!btnMatch[0].includes('disabled'), 'Run button must be enabled when classicalResult exists');
  assert.ok(htmlWithClassical.includes('Ready to Formulate &amp; Solve') || htmlWithClassical.includes('Ready to Formulate & Solve'), 'Status must indicate ready');
});

// ==============================================================================
// Test 6: Plain explanation of QUBO formulation is visible
// ==============================================================================
test('6. Plain explanation of QUBO formulation and simulated annealing is visible', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(
    html.includes('The classical baseline defines the feasible decision space. This stage encodes those feasible decisions as binary variables in a QUBO and searches the resulting objective using quantum-inspired simulated annealing'),
    'Must display the exact required explanation sentence'
  );
});

// ==============================================================================
// Test 7: QUBO formulation pipeline visual flow renders
// ==============================================================================
test('7. QUBO formulation pipeline visual flow renders the 5 transformation stages', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Feasible Decisions'), 'Must show Feasible Decisions stage');
  assert.ok(html.includes('Binary Variables'), 'Must show Binary Variables stage');
  assert.ok(html.includes('QUBO Matrix'), 'Must show QUBO Matrix stage');
  assert.ok(html.includes('Simulated Annealing'), 'Must show Simulated Annealing stage');
  assert.ok(html.includes('Feasible Solutions'), 'Must show Feasible Solutions stage');
});

// ==============================================================================
// Test 8: Actual QUBO metadata is rendered when response is available
// ==============================================================================
test('8. Actual QUBO metadata is rendered from backend response', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('60'), 'Must display QUBO variable count (60)');
  assert.ok(html.includes('1830') || html.includes('1,830'), 'Must display non-zero terms (1830)');
  assert.ok(html.includes('2.5'), 'Must display penalty magnitude (2.5)');
  assert.ok(html.includes('cost'), 'Must display objective mode');
});

// ==============================================================================
// Test 9: Best Quantum-Inspired solution card renders actual values
// ==============================================================================
test('9. Best Quantum-Inspired solution card renders actual values without unsupported claims', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="card-best-qi"'), 'Must have card-best-qi');
  assert.ok(html.includes('Best Quantum-Inspired Solution'), 'Must title best solution card');
  assert.ok(html.includes('Best solution returned by the quantum-inspired search'), 'Must use neutral description');
  assert.ok(html.includes('1,267,710'), 'Must display total cost $1,267,710');
  assert.ok(html.includes('12') && html.includes('knots'), 'Must display speed 12 knots');
  assert.ok(html.includes('48.5') && html.includes('hrs buffer'), 'Must display deadline margin');
  assert.ok(!html.includes('Quantum supremacy'), 'Must NOT claim quantum supremacy');
  assert.ok(!html.includes('Quantum advantage'), 'Must NOT claim quantum advantage');
});

// ==============================================================================
// Test 10: Top-K alternatives table renders ranked candidates
// ==============================================================================
test('10. Top-K alternatives table renders ranked candidates with cost and fuel', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="table-top-k-solutions"'), 'Must have table-top-k-solutions');
  assert.ok(html.includes('#') && html.includes('1'), 'Must display Rank #1');
  assert.ok(html.includes('#') && html.includes('2'), 'Must display Rank #2');
  assert.ok(html.includes('1,301,910'), 'Must display Rank #2 cost $1,301,910');
  assert.ok(html.includes('LNG'), 'Must display fuel alternative LNG');
});

// ==============================================================================
// Test 11: Classical vs QI preview renders comparison
// ==============================================================================
test('11. Classical vs QI preview renders comparison of best cost and solver runtime', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="classical-vs-qi-preview"'), 'Must have classical-vs-qi-preview section');
  assert.ok(html.includes('id="preview-classical-cost"'), 'Must have preview-classical-cost');
  assert.ok(html.includes('id="preview-qi-cost"'), 'Must have preview-qi-cost');
  assert.ok(html.includes('18.2') && html.includes('ms'), 'Must display classical runtime');
  assert.ok(html.includes('12.4') && html.includes('ms'), 'Must display QI runtime');
});

// ==============================================================================
// Test 12: Honest quantum-inspired disclaimer is visible
// ==============================================================================
test('12. Honest quantum-inspiration disclaimer is clearly visible', () => {
  const html = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="qi-honest-disclaimer"'), 'Must have qi-honest-disclaimer');
  assert.ok(
    html.includes('Quantum-inspired means the solver uses quantum-optimization-inspired mathematical formulation and search techniques executed classically. No quantum hardware is used in this prototype'),
    'Must display the exact scientific integrity disclaimer'
  );
});

// ==============================================================================
// Test 13: Stage 06 remains locked until QI run completes
// ==============================================================================
test('13. Stage 06 remains locked / Continue disabled until QI run succeeds', () => {
  const htmlWithoutQi = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: null,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const contBtnMatch = htmlWithoutQi.match(/<button[^>]*id="stage-continue-btn"[^>]*>/);
  assert.ok(contBtnMatch, 'Must find stage-continue-btn');
  assert.ok(contBtnMatch[0].includes('disabled'), 'Continue button must be disabled when qiResult is null');
});

// ==============================================================================
// Test 14: Stage 06 unlocks upon successful QI completion
// ==============================================================================
test('14. Continue button is enabled when qiResult is present; navigates to Stage 06', () => {
  const htmlWithQi = renderToString(
    React.createElement(Stage05QuantumInspired, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      onQiOptimized: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const contBtnMatch = htmlWithQi.match(/<button[^>]*id="stage-continue-btn"[^>]*>/);
  assert.ok(contBtnMatch, 'Must find stage-continue-btn');
  assert.ok(!contBtnMatch[0].includes('disabled'), 'Continue button must be enabled when qiResult exists');
  assert.ok(htmlWithQi.includes('Continue to Comparative Analysis (Stage 06)'), 'Must point to Stage 06');
});

// ==============================================================================
// Test 15: App.tsx integrates Stage05QuantumInspired with upstream invalidation
// ==============================================================================
test('15. App.tsx integrates Stage05QuantumInspired with upstream invalidation', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');

  assert.ok(appSrc.includes('Stage05QuantumInspired'), 'App.tsx must import and render Stage05QuantumInspired');
  assert.ok(
    appSrc.includes('qiResult') && appSrc.includes('setQiResult'),
    'App.tsx must manage qiResult state'
  );
  assert.ok(
    appSrc.includes('activeStage === 5 ? ('),
    'App.tsx must render Stage05QuantumInspired on activeStage 5'
  );
  assert.ok(
    appSrc.includes('setQiResult(null)'),
    'Modifying upstream stages must invalidate qiResult'
  );
  assert.ok(
    appSrc.includes('setActiveStage(6)') && appSrc.includes('setMaxUnlockedStage((prev) => Math.max(prev, 6))'),
    'Continuing from Stage 05 must advance to Stage 06 and unlock Stage 06'
  );
});
