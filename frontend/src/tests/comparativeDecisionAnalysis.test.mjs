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

// Build bundle of ComparativeDecisionAnalysis component to run under Node.js
const outDir = path.join(__dirname, '../../dist-test');
fs.mkdirSync(outDir, { recursive: true });
const bundlePath = path.join(outDir, 'compTestBundle.mjs');

await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/ComparativeDecisionAnalysis.tsx')],
  bundle: true,
  format: 'esm',
  outfile: bundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const bundleUrl = pathToFileURL(bundlePath).href;
const { ComparativeDecisionAnalysis } = await import(bundleUrl);

// Bundle api.ts as well for testing API request execution
const apiBundlePath = path.join(outDir, 'apiTestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../services/api.ts')],
  bundle: true,
  format: 'esm',
  outfile: apiBundlePath,
  external: []
});
const apiUrl = pathToFileURL(apiBundlePath).href;
const { runComparativeAnalysis } = await import(apiUrl);

// Mock data fixtures
const mockSampleRequest = {
  source_port_id: "PORT-SG",
  destination_port_id: "PORT-RTM",
  cargo_weight_tonnes: 60000.0,
  departure_datetime: "2026-09-01T08:00:00Z",
  deadline_datetime: "2026-09-29T08:00:00Z",
  vessel_ids: null,
  route_ids: null,
  speed_grid_step_knots: 0.5,
  currency: "USD"
};

const mockCandidate = {
  decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
  vessel_id: "VES-001",
  vessel_name: "Pacific Horizon",
  vessel_type: "Panamax Bulk Carrier",
  route_id: "RT-SG-RTM-SUEZ",
  route_name: "Suez Canal Transit",
  fuel_id: "FUEL-VLSFO",
  fuel_name: "Very Low Sulfur Fuel Oil",
  cargo_tonnes: 60000.0,
  distance_nm: 8280.0,
  cruising_speed_knots: 14.0,
  effective_speed_knots: 14.1,
  sailing_time_hours: 587.2,
  port_wait_hours: 14.0,
  total_voyage_time_hours: 601.2,
  departure_datetime: "2026-09-01T08:00:00Z",
  arrival_datetime: "2026-09-26T09:12:00Z",
  deadline_datetime: "2026-09-29T08:00:00Z",
  deadline_margin_hours: 70.8,
  fuel_consumption_tonnes: 1250.4,
  fuel_cost_usd: 812760.0,
  route_cost_usd: 350000.0,
  total_voyage_cost_usd: 1162760.0,
  operational_co2_tonnes: 3938.8,
  lifecycle_ghg_tonnes: 4426.4,
  cargo_utilization_pct: 85.7,
  demo_environmental_fuel_factor: 1.05,
  weather_risk_level: "LOW",
  is_feasible: true,
  infeasibility_reasons: []
};

const mockComparativeResponse = {
  request: mockSampleRequest,
  classical: {
    method_name: "Classical Exact Enumeration",
    best_cost_usd: 1162760.0,
    best_time_hours: 601.2,
    fuel_consumption_tonnes: 1250.4,
    operational_co2_tonnes: 3938.8,
    runtime_ms: 18.5,
    candidates_evaluated: 75,
    feasible_solutions_count: 48,
    best_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
    details: {}
  },
  quantum_inspired: {
    method_name: "Quantum-Inspired Simulated Annealing",
    best_cost_usd: 1162760.0,
    best_time_hours: 601.2,
    fuel_consumption_tonnes: 1250.4,
    operational_co2_tonnes: 3938.8,
    runtime_ms: 142.3,
    candidates_evaluated: 48,
    feasible_solutions_count: 48,
    best_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
    details: {}
  },
  classical_summary: {
    method_name: "Classical Exact Enumeration",
    best_cost_usd: 1162760.0,
    best_time_hours: 601.2,
    fuel_consumption_tonnes: 1250.4,
    operational_co2_tonnes: 3938.8,
    runtime_ms: 18.5,
    candidates_evaluated: 75,
    feasible_solutions_count: 48,
    best_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
    details: {}
  },
  quantum_inspired_summary: {
    method_name: "Quantum-Inspired Simulated Annealing",
    best_cost_usd: 1162760.0,
    best_time_hours: 601.2,
    fuel_consumption_tonnes: 1250.4,
    operational_co2_tonnes: 3938.8,
    runtime_ms: 142.3,
    candidates_evaluated: 48,
    feasible_solutions_count: 48,
    best_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
    details: {}
  },
  comparison: {
    classical_candidate: {
      ...mockCandidate,
      optimization_method: "Classical Exact Enumeration",
      vessel: mockCandidate.vessel_name,
      route: mockCandidate.route_name,
      speed: mockCandidate.cruising_speed_knots,
      fuel: mockCandidate.fuel_name,
      total_cost: mockCandidate.total_voyage_cost_usd,
      total_time: mockCandidate.total_voyage_time_hours,
      fuel_consumption: mockCandidate.fuel_consumption_tonnes,
      operational_CO2: mockCandidate.operational_co2_tonnes,
      lifecycle_GHG: mockCandidate.lifecycle_ghg_tonnes,
      deadline_margin: mockCandidate.deadline_margin_hours,
      utilization: mockCandidate.cargo_utilization_pct,
      risk: mockCandidate.weather_risk_level,
      feasibility: true,
      runtime: 18.5,
      qubo_energy: null
    },
    quantum_inspired_candidate: {
      ...mockCandidate,
      optimization_method: "Quantum-Inspired Simulated Annealing",
      vessel: mockCandidate.vessel_name,
      route: mockCandidate.route_name,
      speed: mockCandidate.cruising_speed_knots,
      fuel: mockCandidate.fuel_name,
      total_cost: mockCandidate.total_voyage_cost_usd,
      total_time: mockCandidate.total_voyage_time_hours,
      fuel_consumption: mockCandidate.fuel_consumption_tonnes,
      operational_CO2: mockCandidate.operational_co2_tonnes,
      lifecycle_GHG: mockCandidate.lifecycle_ghg_tonnes,
      deadline_margin: mockCandidate.deadline_margin_hours,
      utilization: mockCandidate.cargo_utilization_pct,
      risk: mockCandidate.weather_risk_level,
      feasibility: true,
      runtime: 142.3,
      qubo_energy: -0.42
    },
    tradeoffs: {
      cost_difference: 0.0,
      cost_percentage_difference: 0.0,
      time_difference: 0.0,
      time_percentage_difference: 0.0,
      fuel_difference: 0.0,
      co2_difference: 0.0,
      lifecycle_ghg_difference: 0.0,
      deadline_margin_difference: 0.0,
      runtime_difference: 123.8,
      objective_gap: 0.0,
      cost_delta_usd: 0.0,
      cost_delta_pct: 0.0,
      time_delta_hours: 0.0,
      time_delta_pct: 0.0,
      fuel_delta_tonnes: 0.0,
      co2_delta_tonnes: 0.0,
      ghg_delta_tonnes: 0.0
    },
    cost_difference: 0.0,
    cost_percentage_difference: 0.0,
    time_difference: 0.0,
    time_percentage_difference: 0.0,
    fuel_difference: 0.0,
    co2_difference: 0.0,
    lifecycle_ghg_difference: 0.0,
    deadline_margin_difference: 0.0,
    runtime_difference: 123.8,
    objective_gap: 0.0,
    neutral_notes: [
      "Comparison evaluates Classical Exact Enumeration against Quantum-Inspired Simulated Annealing.",
      "No quantum advantage is claimed. No quantum superiority is claimed. No quantum speedup is claimed.",
      "Objective gap indicates heuristic proximity to classical global optimum."
    ]
  },
  pareto_front: [mockCandidate],
  recommendations: {
    cost: {
      priority: "cost",
      method: "Classical Exact Optimization",
      candidate: mockCandidate,
      reasons: ["Lowest absolute total voyage cost.", "Saves capital compared to faster alternatives."]
    },
    time: {
      priority: "time",
      method: "Classical Exact Optimization",
      candidate: mockCandidate,
      reasons: ["Fastest viable transit.", "Maximizes deadline margin (70.8 hrs)."]
    },
    fuel: {
      priority: "fuel",
      method: "Classical Exact Optimization",
      candidate: mockCandidate,
      reasons: ["Lowest absolute fuel consumption.", "Highly energy efficient configuration."]
    },
    co2: {
      priority: "co2",
      method: "Classical Exact Optimization",
      candidate: mockCandidate,
      reasons: ["Lowest operational tailpipe CO2 emissions.", "Optimized for direct environmental compliance."]
    },
    ghg: {
      priority: "ghg",
      method: "Classical Exact Optimization",
      candidate: mockCandidate,
      reasons: ["Lowest well-to-wake lifecycle GHG.", "Best overall climate impact choice."]
    },
    balanced: {
      priority: "balanced",
      method: "Comparative Decision Analysis",
      candidate: mockCandidate,
      reasons: ["Pareto-efficient trade-off.", "Minimizes normalized distance to ideal theoretical optimum.", "Meets deadline with 70.8 hrs margin."]
    }
  },
  tradeoffs: {
    cost_difference: 0.0,
    cost_percentage_difference: 0.0,
    time_difference: 0.0,
    time_percentage_difference: 0.0,
    fuel_difference: 0.0,
    co2_difference: 0.0,
    lifecycle_ghg_difference: 0.0,
    deadline_margin_difference: 0.0,
    runtime_difference: 123.8,
    objective_gap: 0.0,
    cost_delta_usd: 0.0,
    cost_delta_pct: 0.0,
    time_delta_hours: 0.0,
    time_delta_pct: 0.0,
    fuel_delta_tonnes: 0.0,
    co2_delta_tonnes: 0.0,
    ghg_delta_tonnes: 0.0
  },
  environmental_analysis: {
    fuel_consumption_tonnes: 1250.4,
    operational_co2_tonnes: 3938.8,
    lifecycle_ghg_tonnes: 4426.4
  },
  schedule_analysis: {
    departure_datetime: "2026-09-01T08:00:00Z",
    arrival_datetime: "2026-09-26T09:12:00Z",
    deadline_datetime: "2026-09-29T08:00:00Z",
    deadline_margin_hours: 70.8,
    is_safe: true,
    status: "Safe"
  },
  qi_top_k: [],
  assumptions: [
    "Phase 6 is a decision-analysis layer over existing optimization outputs. It does not create a new optimizer.",
    "Current environmental data is deterministic demo data.",
    "Current fuel model is a prototype model.",
    "Current route network is a deterministic demo network.",
    "Pareto analysis is performed over the available finite candidate set.",
    "Balanced recommendation is a decision-support heuristic, not a universal optimality guarantee.",
    "Equal weighting across normalized objectives is a prototype decision-analysis assumption.",
    "Quantum-inspired simulated annealing currently does not guarantee the classical global optimum.",
    "No quantum advantage is claimed.",
    "No quantum superiority or quantum speedup is claimed.",
    "The current problem is a single-voyage decision problem, not full fleet-wide simultaneous optimization."
  ]
};

// ==========================================
// Test 1: Page renders
// ==========================================
test('1. Page renders Comparative Decision Analysis component structure', () => {
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, { autoFetch: false }));
  assert.ok(html.includes('Comparative Decision Analysis'), 'Page title must render');
  assert.ok(html.includes('Phase 6 Decision Analysis'), 'Badge must render');
});

// ==========================================
// Test 2: API request is sent correctly
// ==========================================
test('2. API request is sent correctly with expected parameters', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let calledBody = null;

  global.fetch = async (url, options) => {
    calledUrl = url;
    calledMethod = options?.method || 'GET';
    if (options?.body) {
      calledBody = JSON.parse(options.body);
    }
    return { 
      ok: true, 
      json: async () => mockComparativeResponse 
    };
  };

  const res = await runComparativeAnalysis({
    voyage_request: mockSampleRequest,
    priority: "balanced",
    top_k: 5
  });

  assert.ok(calledUrl.includes('/optimization/comparative-analysis'), 'API endpoint must match');
  assert.equal(calledMethod, 'POST', 'Must use POST method');
  assert.equal(calledBody.priority, 'balanced', 'Priority must be passed');
  assert.equal(calledBody.top_k, 5, 'Top-K must be passed');
  assert.equal(calledBody.voyage_request.source_port_id, 'PORT-SG', 'Source port must match');
  assert.ok(res.classical || res.classical_summary, 'Response must be received');
});

// ==========================================
// Test 3: Successful response renders comparison
// ==========================================
test('3. Successful response renders Classical vs Quantum-Inspired comparison', () => {
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, {
    initialAnalysis: mockComparativeResponse,
    autoFetch: false
  }));

  assert.ok(html.includes('Classical Exact'), 'Must have Classical Exact label');
  assert.ok(html.includes('Quantum-Inspired Simulated Annealing'), 'Must have QI label');
  assert.ok(html.includes('Total Voyage Cost'), 'Must contain Total Voyage Cost row');
  assert.ok(html.includes('Travel Time'), 'Must contain Travel Time row');
  assert.ok(html.includes('Fuel Consumption'), 'Must contain Fuel Consumption row');
  assert.ok(html.includes('Operational CO₂'), 'Must contain Operational CO2 row');
  assert.ok(html.includes('Lifecycle GHG'), 'Must contain Lifecycle GHG row');
  assert.ok(html.includes('Deadline Margin'), 'Must contain Deadline Margin row');
  assert.ok(html.includes('Solver Execution Runtime'), 'Must contain Runtime row');
});

// ==========================================
// Test 4: Recommendations render
// ==========================================
test('4. Recommendations render with justifications and metrics', () => {
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, {
    initialAnalysis: mockComparativeResponse,
    autoFetch: false
  }));

  assert.ok(html.includes('Priority-Driven Recommendations'), 'Must have recommendations section');
  assert.ok(html.includes('Balanced Recommendation'), 'Must list Balanced recommendation');
  assert.ok(html.includes('Min Cost Recommendation'), 'Must list Min Cost recommendation');
  assert.ok(html.includes('Min Time Recommendation'), 'Must list Min Time recommendation');
  assert.ok(html.includes('Min Fuel Recommendation'), 'Must list Min Fuel recommendation');
  assert.ok(html.includes('Min CO₂ Recommendation'), 'Must list Min CO2 recommendation');
  assert.ok(html.includes('Min GHG Recommendation'), 'Must list Min GHG recommendation');
  assert.ok(html.includes('Pacific Horizon'), 'Must list vessel name');
  assert.ok(html.includes('Lowest absolute total voyage cost'), 'Must include backend justification');
});

// ==========================================
// Test 5: Pareto candidates render
// ==========================================
test('5. Pareto candidates render in table and scatterplot', () => {
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, {
    initialAnalysis: mockComparativeResponse,
    autoFetch: false
  }));

  assert.ok(html.includes('Pareto Efficient Alternatives'), 'Must have Pareto section header');
  assert.ok(html.includes('Cost vs. Time Pareto Trade-off Curve'), 'Must render Pareto scatter plot header');
  assert.ok(html.includes('VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO'), 'Must render candidate decision ID in table');
  assert.ok(html.includes('Pacific Horizon'), 'Must render candidate vessel');
  assert.ok(html.includes('Suez Canal Transit'), 'Must render candidate route');
});

// ==========================================
// Test 6: API failure displays an error
// ==========================================
test('6. API failure displays an error message', async () => {
  // Test error rendering state in component
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, {
    initialAnalysis: null,
    initialLoading: false,
    initialError: 'No feasible candidates found for comparative analysis.',
    autoFetch: false
  }));

  assert.ok(html.includes('Analysis Failed:'), 'Must render failure banner');
  assert.ok(html.includes('No feasible candidates found'), 'Must render error detail');
  assert.ok(html.includes('Retry'), 'Must offer retry button');

  // Test API client throw behavior
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ detail: "No feasible candidates found for comparative analysis." })
  });

  try {
    await runComparativeAnalysis({
      voyage_request: mockSampleRequest,
      priority: "cost",
      top_k: 5
    });
    assert.fail('Expected exception on 400');
  } catch (err) {
    assert.ok(err.message.includes('No feasible candidates') || err.message.includes('failed with status 400'));
  }
});

// ==========================================
// Test 7: Loading state works
// ==========================================
test('7. Loading state displays informative status', () => {
  const html = renderToString(React.createElement(ComparativeDecisionAnalysis, {
    initialAnalysis: null,
    initialLoading: true,
    autoFetch: false
  }));

  assert.ok(html.includes('Running multi-objective comparative decision analysis'), 'Must display loading notice');
  assert.ok(html.includes('Evaluating Classical baseline and Quantum-Inspired QUBO'), 'Must display informative loading description');
});

// ==========================================
// Test 8: No unsupported quantum-superiority wording
// ==========================================
test('8. Component source and output contain NO unsupported quantum-superiority claims', () => {
  const compSource = fs.readFileSync(path.join(__dirname, '../components/ComparativeDecisionAnalysis.tsx'), 'utf-8');
  
  const forbiddenPhrases = [
    'quantum is better',
    'quantum wins',
    'quantum superiority',
    'quantum speedup',
    'quantum advantage'
  ];

  for (const phrase of forbiddenPhrases) {
    const lower = compSource.toLowerCase();
    let pos = 0;
    while ((pos = lower.indexOf(phrase, pos)) !== -1) {
      // Must be explicitly negated (preceded by 'no ' or 'without ')
      const prefix = lower.slice(Math.max(0, pos - 15), pos);
      assert.ok(
        prefix.includes('no ') || prefix.includes('not ') || prefix.includes('without '),
        `Phrase "${phrase}" found in unsupported positive context at pos ${pos}: "...${lower.slice(Math.max(0, pos - 20), pos + phrase.length + 20)}..."`
      );
      pos += phrase.length;
    }
  }
});
