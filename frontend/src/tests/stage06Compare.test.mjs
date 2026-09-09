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

// Bundle Stage06Compare with esbuild for Node test runner
const stage06BundlePath = path.join(outDir, 'stage06TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage06Compare.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage06BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic',
});

const stage06Url = pathToFileURL(stage06BundlePath).href;
const { Stage06Compare } = await import(stage06Url);

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

const mockClassicalCandidate = {
  decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
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
  departure_datetime: '2026-10-01T12:00:00Z',
  arrival_datetime: '2026-10-28T07:42:00Z',
  deadline_datetime: '2026-10-29T12:00:00Z',
  deadline_margin_hours: 28.3,
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
};

const mockClassicalResponse = {
  status: 'completed',
  disclaimer: 'CLASSICAL DISCRETE COMBINATORIAL OPTIMIZATION BASELINE',
  environmental_disclaimer: '',
  request: {
    source_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    cargo_weight_tonnes: 60000,
    departure_datetime: '2026-10-01T12:00:00Z',
    deadline_datetime: '2026-10-29T12:00:00Z',
    vessel_ids: ['VES-001'],
    route_ids: ['RT-SG-RTM-SUEZ'],
    speed_grid_step_knots: 1.0,
    currency: 'USD',
  },
  cost_efficient: {
    mode: 'cost_efficient',
    objective_description: 'Global minimum voyage expenditure',
    per_vessel_best: { 'VES-001': mockClassicalCandidate },
    global_best: mockClassicalCandidate,
  },
  time_efficient: {
    mode: 'time_efficient',
    objective_description: 'Fastest arrival duration',
    per_vessel_best: { 'VES-001': mockClassicalCandidate },
    global_best: mockClassicalCandidate,
  },
  informational_best_fuel: mockClassicalCandidate,
  informational_best_emissions: mockClassicalCandidate,
  benchmark: {
    total_candidates_evaluated: 60,
    feasible_candidates_count: 32,
    infeasible_candidates_count: 28,
    feasibility_rate_pct: 53.3,
    rejection_breakdown: {},
    runtime_ms: 18.5,
    speed_grid_step_knots: 1.0,
    unique_vessels_count: 1,
    unique_routes_count: 1,
    unique_fuels_count: 3,
  },
  candidate_decision_space_preview: [],
};

const mockQiSolution = {
  rank: 1,
  decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
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
  arrival_datetime: '2026-10-28T07:42:00Z',
  deadline_margin_hours: 28.3,
  weather_risk_level: 'LOW',
  qubo_energy: -0.942,
  is_valid_one_hot: true,
  is_feasible: true,
  infeasibility_reasons: [],
  solver_seed: 42,
  candidate: mockClassicalCandidate,
};

const mockQiResponse = {
  status: 'completed',
  disclaimer: 'QUANTUM-INSPIRED OPTIMIZATION BASELINE',
  objective_mode: 'cost',
  qubo_summary: {
    num_variables: 60,
    num_nonzero_coefficients: 1830,
    objective_mode: 'cost',
    penalty_magnitude: 2.5,
    penalty_strategy: 'exact_one_hot',
    normalization_scale: { min: 880000.0, max: 2100000.0, scale_delta: 1220000.0 },
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
  top_k_solutions: [mockQiSolution],
  best_solution: mockQiSolution,
  solver_runtime_ms: 125.4,
  total_runtime_ms: 142.1,
  number_of_runs_executed: 5,
  unique_feasible_solutions_found: 5,
  raw_decision_space_size: 60,
  feasible_candidate_space_size: 32,
};

const mockComparativeResponse = {
  request: mockClassicalResponse.request,
  classical: {
    method_name: 'Classical Exhaustive Baseline',
    best_cost_usd: 1267710.0,
    best_time_hours: 715.7,
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    runtime_ms: 18.5,
    candidates_evaluated: 60,
    feasible_solutions_count: 32,
    best_decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
    details: {},
  },
  quantum_inspired: {
    method_name: 'Quantum-Inspired Simulated Annealing',
    best_cost_usd: 1267710.0,
    best_time_hours: 715.7,
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    runtime_ms: 125.4,
    candidates_evaluated: 5,
    feasible_solutions_count: 5,
    best_decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
    details: {},
  },
  classical_summary: {
    method_name: 'Classical Exhaustive Baseline',
    best_cost_usd: 1267710.0,
    best_time_hours: 715.7,
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    runtime_ms: 18.5,
    candidates_evaluated: 60,
    feasible_solutions_count: 32,
    best_decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
    details: {},
  },
  quantum_inspired_summary: {
    method_name: 'Quantum-Inspired Simulated Annealing',
    best_cost_usd: 1267710.0,
    best_time_hours: 715.7,
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    runtime_ms: 125.4,
    candidates_evaluated: 5,
    feasible_solutions_count: 5,
    best_decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
    details: {},
  },
  comparison: {
    classical_candidate: {
      decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
      optimization_method: 'Classical Exhaustive Baseline',
      vessel: 'Poseidon Leader',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_type: 'Ultra Large Container Vessel (ULCV)',
      route: 'Singapore to Rotterdam via Suez Canal',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      speed: 12.0,
      fuel: 'Very Low Sulphur Fuel Oil (VLSFO)',
      fuel_id: 'VLSFO',
      fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
      total_cost: 1267710.0,
      total_time: 715.7,
      fuel_consumption: 1420.5,
      operational_CO2: 4424.8,
      lifecycle_GHG: 5113.8,
      deadline_margin: 28.3,
      utilization: 50.0,
      risk: 'LOW',
      feasibility: true,
      runtime: 18.5,
      qubo_energy: null,
    },
    quantum_inspired_candidate: {
      decision_id: 'DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0',
      optimization_method: 'Quantum-Inspired Simulated Annealing',
      vessel: 'Poseidon Leader',
      vessel_id: 'VES-001',
      vessel_name: 'Poseidon Leader',
      vessel_type: 'Ultra Large Container Vessel (ULCV)',
      route: 'Singapore to Rotterdam via Suez Canal',
      route_id: 'RT-SG-RTM-SUEZ',
      route_name: 'Singapore to Rotterdam via Suez Canal',
      speed: 12.0,
      fuel: 'Very Low Sulphur Fuel Oil (VLSFO)',
      fuel_id: 'VLSFO',
      fuel_name: 'Very Low Sulphur Fuel Oil (VLSFO)',
      total_cost: 1267710.0,
      total_time: 715.7,
      fuel_consumption: 1420.5,
      operational_CO2: 4424.8,
      lifecycle_GHG: 5113.8,
      deadline_margin: 28.3,
      utilization: 50.0,
      risk: 'LOW',
      feasibility: true,
      runtime: 125.4,
      qubo_energy: -0.942,
    },
    tradeoffs: {
      cost_delta_usd: 0.0,
      cost_delta_pct: 0.0,
      time_delta_hours: 0.0,
      time_delta_pct: 0.0,
      fuel_delta_tonnes: 0.0,
      co2_delta_tonnes: 0.0,
      ghg_delta_tonnes: 0.0,
      cost_difference: 0.0,
      cost_percentage_difference: 0.0,
      time_difference: 0.0,
      time_percentage_difference: 0.0,
      fuel_difference: 0.0,
      co2_difference: 0.0,
      lifecycle_ghg_difference: 0.0,
      deadline_margin_difference: 0.0,
      runtime_difference: 106.9,
      objective_gap: 0.0,
    },
    cost_difference: 0.0,
    cost_percentage_difference: 0.0,
    time_difference: 0.0,
    time_percentage_difference: 0.0,
    fuel_difference: 0.0,
    co2_difference: 0.0,
    lifecycle_ghg_difference: 0.0,
    deadline_margin_difference: 0.0,
    runtime_difference: 106.9,
    objective_gap: 0.0,
    neutral_notes: [],
  },
  pareto_front: [mockClassicalCandidate],
  recommendations: {
    cost: {
      priority: 'cost',
      method: 'Classical Exhaustive Baseline',
      candidate: mockClassicalCandidate,
      reasons: ['Lowest absolute total voyage expenditure.'],
    },
    time: {
      priority: 'time',
      method: 'Classical Exhaustive Baseline',
      candidate: mockClassicalCandidate,
      reasons: ['Fastest viable transit.'],
    },
    fuel: {
      priority: 'fuel',
      method: 'Classical Exhaustive Baseline',
      candidate: mockClassicalCandidate,
      reasons: ['Lowest absolute fuel consumption.'],
    },
    co2: {
      priority: 'co2',
      method: 'Classical Exhaustive Baseline',
      candidate: mockClassicalCandidate,
      reasons: ['Lowest operational combustion CO2 emissions.'],
    },
    ghg: {
      priority: 'ghg',
      method: 'Classical Exhaustive Baseline',
      candidate: mockClassicalCandidate,
      reasons: ['Lowest well-to-wake lifecycle GHG impact.'],
    },
    balanced: {
      priority: 'balanced',
      method: 'Comparative Decision Analysis',
      candidate: mockClassicalCandidate,
      reasons: ['Multi-objective compromise via normalized Euclidean distance.'],
    },
  },
  tradeoffs: {
    cost_delta_usd: 0.0,
    cost_delta_pct: 0.0,
    time_delta_hours: 0.0,
    time_delta_pct: 0.0,
    fuel_delta_tonnes: 0.0,
    co2_delta_tonnes: 0.0,
    ghg_delta_tonnes: 0.0,
    cost_difference: 0.0,
    cost_percentage_difference: 0.0,
    time_difference: 0.0,
    time_percentage_difference: 0.0,
    fuel_difference: 0.0,
    co2_difference: 0.0,
    lifecycle_ghg_difference: 0.0,
    deadline_margin_difference: 0.0,
    runtime_difference: 106.9,
    objective_gap: 0.0,
  },
  environmental_analysis: {
    fuel_consumption_tonnes: 1420.5,
    operational_co2_tonnes: 4424.8,
    lifecycle_ghg_tonnes: 5113.8,
  },
  schedule_analysis: {
    departure_datetime: '2026-10-01T12:00:00Z',
    arrival_datetime: '2026-10-28T07:42:00Z',
    deadline_datetime: '2026-10-29T12:00:00Z',
    deadline_margin_hours: 28.3,
    is_safe: true,
    status: 'Safe',
  },
  qi_top_k: [mockQiSolution],
  assumptions: [],
};

// ==============================================================================
// Test 1: Stage 06 renders title, subtitle, and badge
// ==============================================================================
test('1. Stage 06 renders title, subtitle, and stage indicators', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: null,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('06 / 07'), 'Must display 06 / 07 badge');
  assert.ok(html.includes('Comparative Analysis'), 'Must display Comparative Analysis badge');
  assert.ok(html.includes('Compare'), 'Must display Stage title "Compare"');
  assert.ok(
    html.includes('Compare solution quality, efficiency, emissions, and trade-offs.'),
    'Must display required subtitle'
  );
});

// ==============================================================================
// Test 2: Compact Upstream Context appears
// ==============================================================================
test('2. Compact read-only upstream context displays Voyage, Fleet, and Feasible Routes', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: null,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="stage-06-upstream-context"'), 'Must have upstream context container');
  assert.ok(html.includes('PORT-SG'), 'Must display origin port');
  assert.ok(html.includes('PORT-RTM'), 'Must display destination port');
  assert.ok(html.includes('3 Vessels Selected'), 'Must display fleet vessel count');
  assert.ok(html.includes('SUEZ'), 'Must display feasible route');
});

// ==============================================================================
// Test 3: Classical vs QI values are actual state values
// ==============================================================================
test('3. Headline comparison renders actual Classical and QI state values', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('CLASSICAL BASELINE'), 'Must clearly label CLASSICAL BASELINE');
  assert.ok(html.includes('QUANTUM-INSPIRED'), 'Must clearly label QUANTUM-INSPIRED');
  assert.ok(html.includes('Best Cost'), 'Must compare Best Cost');
  assert.ok(html.includes('Best Travel Time'), 'Must compare Best Travel Time');
  assert.ok(html.includes('Fuel Consumption'), 'Must compare Fuel Consumption');
  assert.ok(html.includes('Operational CO₂'), 'Must compare Operational CO2');
  assert.ok(html.includes('Lifecycle GHG'), 'Must compare Lifecycle GHG');
  assert.ok(html.includes('Runtime'), 'Must compare Runtime');
  assert.ok(html.includes('$1,267,710'), 'Must render exact classical cost');
  assert.ok(html.includes('18.5 ms'), 'Must render exact classical runtime');
  assert.ok(html.includes('125.4 ms'), 'Must render exact QI runtime');
});

// ==============================================================================
// Test 4: Objective gap is calculated and displayed with honest terminology
// ==============================================================================
test('4. Objective gap is calculated and displayed with honest terminology', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Cost Gap:'), 'Must label Cost Gap');
  assert.ok(html.includes('Runtime Difference:'), 'Must label Runtime Difference');
  assert.ok(!html.includes('Improvement:') || html.includes('not'), 'Must not call cost or runtime gaps improvements');
});

// ==============================================================================
// Test 5: Honest performance interpretation changes according to actual comparison
// ==============================================================================
test('5. Honest interpretation changes dynamically across match and heuristic gap scenarios', () => {
  // Scenario A: Exact Match
  const htmlMatch = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );
  assert.ok(
    htmlMatch.includes('QI matched the classical optimum'),
    'Scenario A: Must state QI matched the classical optimum'
  );

  // Scenario B: Higher-Cost Heuristic Solution
  const higherCostQi = {
    ...mockQiResponse,
    best_solution: {
      ...mockQiSolution,
      total_cost_usd: 1350000.0,
    },
    solver_runtime_ms: 200.0,
  };
  const htmlHigherCost = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: higherCostQi,
      comparativeResult: null,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );
  assert.ok(
    htmlHigherCost.includes('QI found a higher-cost heuristic solution'),
    'Scenario B: Must state QI found a higher-cost heuristic solution'
  );

  // Scenario C: Lower Runtime but Small Objective Gap
  const lowerRuntimeHigherCostQi = {
    ...mockQiResponse,
    best_solution: {
      ...mockQiSolution,
      total_cost_usd: 1290000.0,
    },
    solver_runtime_ms: 5.2, // Faster than classical 18.5 ms
    total_runtime_ms: 5.2,
  };
  const htmlLowerRuntime = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: lowerRuntimeHigherCostQi,
      comparativeResult: null,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );
  assert.ok(
    htmlLowerRuntime.includes('QI reduced runtime but accepted a small objective gap'),
    'Scenario C: Must state QI reduced runtime but accepted a small objective gap'
  );
});

// ==============================================================================
// Test 6: Pareto visualization renders clean SVG plot
// ==============================================================================
test('6. Pareto visualization renders clean SVG plot with axes and legend', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="stage-pareto-section"'), 'Must have Pareto section');
  assert.ok(html.includes('<svg'), 'Must render SVG chart');
  assert.ok(html.includes('Transit Duration (hours)'), 'Must have Transit Duration axis');
  assert.ok(html.includes('Total Voyage Cost (USD)'), 'Must have Cost axis');
  assert.ok(html.includes('Non-Dominated Trade-off Frontier'), 'Must have legend for frontier');
  assert.ok(
    html.includes('Pareto-optimal solutions are alternatives where improving one objective would require sacrificing at least one other objective.'),
    'Must include the required Pareto explanation'
  );
});

// ==============================================================================
// Test 7: Pareto candidates are actual backend candidates
// ==============================================================================
test('7. Pareto candidates are actual backend candidates', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(
    html.includes('DEC-VES-001-RT-SG-RTM-SUEZ-VLSFO-12.0'),
    'Must include the actual decision ID in candidate visualization'
  );
});

// ==============================================================================
// Test 8: Priority options render all backend priorities
// ==============================================================================
test('8. Priority options render all supported criteria', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Balanced'), 'Must have Balanced priority');
  assert.ok(html.includes('Minimum Cost'), 'Must have Minimum Cost priority');
  assert.ok(html.includes('Minimum Time'), 'Must have Minimum Time priority');
  assert.ok(html.includes('Minimum Fuel'), 'Must have Minimum Fuel priority');
  assert.ok(html.includes('Minimum Operational CO₂'), 'Must have Minimum CO2 priority');
  assert.ok(html.includes('Minimum Lifecycle GHG'), 'Must have Minimum GHG priority');
});

// ==============================================================================
// Test 9: Balanced solution card renders with required metrics
// ==============================================================================
test('9. Balanced solution renders with required operational metrics', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Balanced Trade-Off'), 'Must display "Balanced Trade-Off" title');
  assert.ok(html.includes('Poseidon Leader'), 'Must show Vessel');
  assert.ok(html.includes('Singapore to Rotterdam via Suez Canal'), 'Must show Route');
  assert.ok(html.includes('12 kts') || html.includes('12.0 kts'), 'Must show Speed');
  assert.ok(html.includes('VLSFO'), 'Must show Fuel');
  assert.ok(html.includes('$1,267,710'), 'Must show Cost');
  assert.ok(html.includes('715.7h'), 'Must show Travel Time');
  assert.ok(html.includes('1,420.5 MT') || html.includes('1,420.5t'), 'Must show Fuel Consumption');
  assert.ok(html.includes('4,424.8t'), 'Must show Operational CO2');
  assert.ok(html.includes('5,113.8t'), 'Must show Lifecycle GHG');
  assert.ok(html.includes('28.3h'), 'Must show Deadline Margin');
});

// ==============================================================================
// Test 10: Balanced caveat is visible and explicit
// ==============================================================================
test('10. Balanced caveat is visible and explicit', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(
    html.includes('The balanced selection is based on the project') &&
    html.includes('current normalized multi-objective heuristic'),
    'Must display heuristic caveat'
  );
  assert.ok(
    html.includes('not a mathematically universally optimal solution'),
    'Must state it is not universally optimal'
  );
});

// ==============================================================================
// Test 11: Stage 07 remains locked before comparison succeeds
// ==============================================================================
test('11. Stage 07 remains locked / Continue disabled until comparison succeeds', () => {
  const htmlWithoutComp = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: null,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const contBtnMatch = htmlWithoutComp.match(/<button[^>]*id="stage-06-continue-btn"[^>]*>/);
  assert.ok(contBtnMatch, 'Must find stage-06-continue-btn');
  assert.ok(contBtnMatch[0].includes('disabled'), 'Continue button must be disabled when comparativeResult is null');
});

// ==============================================================================
// Test 12: Stage 07 unlocks after successful comparison
// ==============================================================================
test('12. Stage 07 unlocks after successful comparison', () => {
  const htmlWithComp = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  const contBtnMatch = htmlWithComp.match(/<button[^>]*id="stage-06-continue-btn"[^>]*>/);
  assert.ok(contBtnMatch, 'Must find stage-06-continue-btn');
  assert.ok(!contBtnMatch[0].includes('disabled'), 'Continue button must be enabled when comparativeResult exists');
  assert.ok(htmlWithComp.includes('Continue to Stage 07 (Decision)'), 'Must point to Stage 07');
});

// ==============================================================================
// Test 13: Upstream invalidation clears stale comparison state
// ==============================================================================
test('13. Upstream invalidation clears stale comparison state in App.tsx', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');

  assert.ok(appSrc.includes('Stage06Compare'), 'App.tsx must import Stage06Compare');
  assert.ok(
    appSrc.includes('comparativeResult') && appSrc.includes('setComparativeResult'),
    'App.tsx must manage comparativeResult state'
  );
  assert.ok(
    appSrc.includes('activeStage === 6 ? ('),
    'App.tsx must render Stage06Compare on activeStage 6'
  );

  // Invalidation checks
  assert.ok(
    appSrc.includes('setComparativeResult(null)'),
    'App.tsx must reset comparativeResult to null on upstream modifications'
  );
  assert.ok(
    appSrc.includes('setActiveStage(7)') && appSrc.includes('setMaxUnlockedStage((prev) => Math.max(prev, 7))'),
    'Completing Stage 06 must advance to Stage 07 and unlock Stage 07'
  );
});

// ==============================================================================
// Test 14: Top alternatives and dynamic decision insights render
// ==============================================================================
test('14. Top alternatives table and dynamic decision insights render', () => {
  const html = renderToString(
    React.createElement(Stage06Compare, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: mockEnvironmentResult,
      classicalResult: mockClassicalResponse,
      qiResult: mockQiResponse,
      comparativeResult: mockComparativeResponse,
      onComparativeAnalyzed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('id="stage-top-alternatives-section"'), 'Must have top alternatives table');
  assert.ok(html.includes('id="stage-decision-insights-section"'), 'Must have dynamic decision insights');
  assert.ok(html.includes('id="stage-technical-telemetry-details"'), 'Must have collapsible technical details');
  assert.ok(html.includes('<details'), 'Must be wrapped in a collapsible details tag');
});
