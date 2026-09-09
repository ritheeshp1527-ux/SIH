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

// Bundle Stage07Decision with esbuild for Node test runner
const stage07BundlePath = path.join(outDir, 'stage07TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage07Decision.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage07BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic',
});

const stage07Url = pathToFileURL(stage07BundlePath).href;
const { Stage07Decision } = await import(stage07Url);

const mockVoyageConfig = {
  sourcePort: 'PORT-SG',
  destPort: 'PORT-RTM',
  cargoWeight: 60000,
  departureDate: '2026-10-01T12:00',
  deadlineDate: '2026-10-29T12:00',
};

const mockBalancedCandidate = {
  decision_id: 'CAND-BALANCED-01',
  vessel_id: 'VES-001',
  vessel_name: 'Poseidon Leader',
  vessel_type: 'Panamax Bulk Carrier',
  route_id: 'RT-SG-RTM-SUEZ',
  route_name: 'Singapore to Rotterdam via Suez Canal',
  fuel_id: 'VLSFO',
  fuel_name: 'Very Low Sulfur Fuel Oil (VLSFO)',
  cargo_tonnes: 60000,
  distance_nm: 8280.0,
  cruising_speed_knots: 13.5,
  effective_speed_knots: 13.5,
  sailing_time_hours: 613.3,
  port_wait_hours: 24.0,
  total_voyage_time_hours: 637.3,
  departure_datetime: '2026-10-01T12:00:00Z',
  arrival_datetime: '2026-10-28T01:18:00Z',
  deadline_datetime: '2026-10-29T12:00:00Z',
  deadline_margin_hours: 34.7,
  fuel_consumption_tonnes: 1285.4,
  fuel_cost_usd: 835510,
  route_cost_usd: 350000,
  total_voyage_cost_usd: 1185510,
  operational_co2_tonnes: 4004.0,
  lifecycle_ghg_tonnes: 4627.4,
  cargo_utilization_pct: 85.7,
  demo_environmental_fuel_factor: 1.05,
  weather_risk_level: 'LOW',
  is_feasible: true,
  infeasibility_reasons: [],
};

const mockCostCandidate = {
  decision_id: 'CAND-COST-01',
  vessel_id: 'VES-002',
  vessel_name: 'Ocean Titan',
  vessel_type: 'Capesize Bulk Carrier',
  route_id: 'RT-SG-RTM-SUEZ',
  route_name: 'Singapore to Rotterdam via Suez Canal',
  fuel_id: 'HFO',
  fuel_name: 'Heavy Fuel Oil (HFO)',
  cargo_tonnes: 60000,
  distance_nm: 8280.0,
  cruising_speed_knots: 11.5,
  effective_speed_knots: 11.5,
  sailing_time_hours: 720.0,
  port_wait_hours: 24.0,
  total_voyage_time_hours: 744.0,
  departure_datetime: '2026-10-01T12:00:00Z',
  arrival_datetime: '2026-10-32T12:00:00Z',
  deadline_datetime: '2026-10-29T12:00:00Z',
  deadline_margin_hours: 12.0,
  fuel_consumption_tonnes: 1450.0,
  fuel_cost_usd: 750000,
  route_cost_usd: 350000,
  total_voyage_cost_usd: 1100000,
  operational_co2_tonnes: 4500.0,
  lifecycle_ghg_tonnes: 5200.0,
  cargo_utilization_pct: 50.0,
  demo_environmental_fuel_factor: 1.05,
  weather_risk_level: 'LOW',
  is_feasible: true,
  infeasibility_reasons: [],
};

const mockTimeCandidate = {
  decision_id: 'CAND-TIME-01',
  vessel_id: 'VES-001',
  vessel_name: 'Poseidon Leader',
  vessel_type: 'Panamax Bulk Carrier',
  route_id: 'RT-SG-RTM-SUEZ',
  route_name: 'Singapore to Rotterdam via Suez Canal',
  fuel_id: 'MGO',
  fuel_name: 'Marine Gas Oil (MGO)',
  cargo_tonnes: 60000,
  distance_nm: 8280.0,
  cruising_speed_knots: 15.0,
  effective_speed_knots: 15.0,
  sailing_time_hours: 552.0,
  port_wait_hours: 24.0,
  total_voyage_time_hours: 576.0,
  departure_datetime: '2026-10-01T12:00:00Z',
  arrival_datetime: '2026-10-25T12:00:00Z',
  deadline_datetime: '2026-10-29T12:00:00Z',
  deadline_margin_hours: 96.0,
  fuel_consumption_tonnes: 1520.0,
  fuel_cost_usd: 1050000,
  route_cost_usd: 350000,
  total_voyage_cost_usd: 1400000,
  operational_co2_tonnes: 4800.0,
  lifecycle_ghg_tonnes: 5500.0,
  cargo_utilization_pct: 85.7,
  demo_environmental_fuel_factor: 1.05,
  weather_risk_level: 'LOW',
  is_feasible: true,
  infeasibility_reasons: [],
};

const mockComparativeResult = {
  request: {
    source_port_id: 'PORT-SG',
    destination_port_id: 'PORT-RTM',
    cargo_weight_tonnes: 60000,
    departure_datetime: '2026-10-01T12:00:00Z',
    deadline_datetime: '2026-10-29T12:00:00Z',
    vessel_ids: null,
    route_ids: null,
    speed_grid_step_knots: 1.0,
    currency: 'USD',
  },
  classical_summary: {
    method_name: 'Classical Exhaustive Baseline',
    best_cost_usd: 1100000,
    best_time_hours: 576.0,
    fuel_consumption_tonnes: 1450.0,
    operational_co2_tonnes: 4500.0,
    runtime_ms: 22.4,
    candidates_evaluated: 60,
    feasible_solutions_count: 32,
    best_decision_id: 'CAND-COST-01',
    details: {},
  },
  quantum_inspired_summary: {
    method_name: 'Quantum-Inspired Simulated Annealing',
    best_cost_usd: 1185510,
    best_time_hours: 637.3,
    fuel_consumption_tonnes: 1285.4,
    operational_co2_tonnes: 4004.0,
    runtime_ms: 145.2,
    candidates_evaluated: 500,
    feasible_solutions_count: 5,
    best_decision_id: 'CAND-BALANCED-01',
    details: {},
  },
  tradeoffs: {
    cost_delta_usd: 85510,
    cost_delta_pct: 7.77,
    time_delta_hours: -106.7,
    time_delta_pct: -14.34,
    fuel_delta_tonnes: -164.6,
    co2_delta_tonnes: -496.0,
    ghg_delta_tonnes: -572.6,
  },
  pareto_front: [mockCostCandidate, mockBalancedCandidate, mockTimeCandidate],
  recommendations: {
    balanced: {
      priority: 'balanced',
      method: 'Comparative Multi-Objective Compromise',
      candidate: mockBalancedCandidate,
      reasons: [
        'Multi-objective compromise across non-dominated Pareto frontier.',
        'Minimizes distance to the normalized ideal point.',
      ],
    },
    cost: {
      priority: 'cost',
      method: 'Classical Exact Baseline',
      candidate: mockCostCandidate,
      reasons: ['Lowest absolute total voyage expenditure.'],
    },
    time: {
      priority: 'time',
      method: 'Classical Exact Baseline',
      candidate: mockTimeCandidate,
      reasons: ['Fastest viable transit duration.'],
    },
  },
  environmental_analysis: {
    fuel_consumption_tonnes: 1285.4,
    operational_co2_tonnes: 4004.0,
    lifecycle_ghg_tonnes: 4627.4,
  },
  schedule_analysis: {
    departure_datetime: '2026-10-01T12:00:00Z',
    arrival_datetime: '2026-10-28T01:18:00Z',
    deadline_datetime: '2026-10-29T12:00:00Z',
    deadline_margin_hours: 34.7,
    is_safe: true,
    status: 'ON_TIME',
  },
  qi_top_k: [],
  assumptions: [],
};

test('1. Stage 07 renders title, subtitle, badges, and workflow completion status', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Final Decision/);
  assert.match(html, /Recommended voyage plan based on the optimization and comparative analysis/);
  assert.match(html, /07 \/ 07/);
  assert.match(html, /Decision/);
  assert.match(html, /All optimization stages completed/);
  assert.match(html, /Optimization workflow complete/);
});

test('2. Primary recommendation is displayed in dominant card with title Recommended Voyage Plan', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /id="primary-recommendation-card"/);
  assert.match(html, /Recommended Voyage Plan/);
});

test('3. Recommendation comes directly from comparativeResult.recommendations', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  // Balanced candidate is Poseidon Leader
  assert.match(html, /Poseidon Leader/);
  assert.match(html, /VES-001/);
});

test('4. Vessel, route, speed, and fuel are actual result values from candidate', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Poseidon Leader/);
  assert.match(html, /Singapore to Rotterdam via Suez Canal/);
  assert.match(html, /13\.5 kts/);
  assert.match(html, /Very Low Sulfur Fuel Oil \(VLSFO\)/);
});

test('5. Cost, time, fuel, and emissions are formatted from actual backend values', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  // $1,185,510
  assert.match(html, /\$1,185,510/);
  // 637.3 hrs
  assert.match(html, /637\.3 hrs/);
  // 1,285.4 MT
  assert.match(html, /1,285\.4 MT/);
  // 4,004.0 MT
  assert.match(html, /4,004\.0 MT/);
  // 4,627.4 MT
  assert.match(html, /4,627\.4 MT/);
  // +34.7 hrs
  assert.match(html, /\+34\.7 hrs/);
  // 60,000 MT
  assert.match(html, /60,000 MT/);
  // 85.7%
  assert.match(html, /85\.7%/);
});

test('6. "Why this plan?" section renders fact-based explanations without unsupported claims', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Why this plan\?/);
  assert.match(html, /Multi-objective compromise across non-dominated Pareto frontier/);
  assert.match(html, /Preserves.*34\.7 hours.*of schedule buffer/);
  assert.match(html, /Singapore to Rotterdam via Suez Canal/);
  assert.match(html, /85\.7%.*deadweight utilization/);
  // Must NOT claim global optimality or quantum supremacy
  assert.doesNotMatch(html, /Best in every category/);
  assert.doesNotMatch(html, /Globally optimal/);
  assert.doesNotMatch(html, /Quantum proved superior/);
});

test('7. Trade-off section computes and displays honest delta against minimum-cost candidate', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Trade-Off Accepted/);
  // Cost delta is $1,185,510 - $1,100,000 = $85,510 (+7.8%)
  assert.match(html, /\$85,510 more/);
  // Time saved is 744.0 - 637.3 = 106.7 hrs
  assert.match(html, /106\.7 hours/);
  // CO2 saved is 4500.0 - 4004.0 = 496.0 MT
  assert.match(html, /496\.0 MT/);
});

test('8. Trade-off section honestly handles scenario where plan matches lowest-cost candidate', () => {
  const matchingResult = {
    ...mockComparativeResult,
    recommendations: {
      balanced: {
        priority: 'balanced',
        method: 'Classical Baseline',
        candidate: mockCostCandidate,
        reasons: ['Optimal cost solution.'],
      },
      cost: {
        priority: 'cost',
        method: 'Classical Baseline',
        candidate: mockCostCandidate,
        reasons: ['Lowest cost.'],
      },
    },
  };

  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: matchingResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /The selected plan matches the lowest-cost feasible solution in the current search space/);
});

test('9. Alternatives section displays concise options from comparativeResult.recommendations', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Alternative Options/);
  assert.match(html, /Balanced \(Cost \+ Time\)/);
  assert.match(html, /Cost First/);
  assert.match(html, /Time First/);
  assert.match(html, /★ Primary/);
  assert.match(html, /Ocean Titan/);
  assert.match(html, /\$1,100,000/);
});

test('10. Operational checklist verifies real candidate constraints without inventing checks', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Operational Feasibility Checklist/);
  assert.match(html, /Cargo capacity satisfied/);
  assert.match(html, /Route environmentally feasible/);
  assert.match(html, /Commercial deadline satisfied/);
  assert.match(html, /Fuel compatibility confirmed/);
  assert.match(html, /Speed within vessel limits/);
  assert.match(html, /Emission footprint evaluated/);
});

test('11. Decision notes contain established project limitations', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Decision Notes &amp; Operational Limitations/);
  assert.match(html, /simulated\/demo oceanographic profiles/);
  assert.match(html, /executed classically via simulated annealing on conventional CPU hardware/);
  assert.match(html, /does not replace operational command judgment/);
  assert.match(html, /verify local port berthing windows, canal transit reservations/);
});

test('12. Navigation and reset actions are rendered', () => {
  let prevCalled = false;
  let resetCalled = false;

  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: mockComparativeResult,
      onPrevious: () => { prevCalled = true; },
      onResetWorkflow: () => { resetCalled = true; },
    })
  );

  assert.match(html, /id="stage07-prev-btn"/);
  assert.match(html, /Back to Compare/);
  assert.match(html, /id="stage07-reset-btn"/);
  assert.match(html, /Start New Optimization/);
});

test('13. Stage 07 renders prerequisite warning if comparativeResult is missing', () => {
  const html = renderToString(
    React.createElement(Stage07Decision, {
      voyageConfig: mockVoyageConfig,
      comparativeResult: null,
      onPrevious: () => {},
      onResetWorkflow: () => {},
    })
  );

  assert.match(html, /Prerequisite Incomplete: Comparative Analysis Required/);
  assert.match(html, /id="stage07-back-to-compare-btn"/);
});

test('14. App.tsx integrates Stage07Decision and handleResetWorkflow safely', () => {
  const appFile = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf-8');

  // Verify Stage07Decision imported and used
  assert.match(appFile, /import.*Stage07Decision.*from/);
  assert.match(appFile, /activeStage === 7 \?/);
  assert.match(appFile, /<Stage07Decision/);

  // Verify handleResetWorkflow resets all required states
  assert.match(appFile, /const handleResetWorkflow = \(\) => {/);
  assert.match(appFile, /setActiveStage\(1\)/);
  assert.match(appFile, /setMaxUnlockedStage\(1\)/);
  assert.match(appFile, /setSelectedVesselIds\(\['VES-001', 'VES-002', 'VES-003'\]\)/);
  assert.match(appFile, /setEnvironmentResult\(null\)/);
  assert.match(appFile, /setClassicalResult\(null\)/);
  assert.match(appFile, /setQiResult\(null\)/);
  assert.match(appFile, /setComparativeResult\(null\)/);

  // Verify stepper shows completion when all stages done
  assert.match(appFile, /isAllStagesCompleted/);
});
