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

// Bundle SihDecisionStory
const storyBundlePath = path.join(outDir, 'storyTestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/SihDecisionStory.tsx')],
  bundle: true,
  format: 'esm',
  outfile: storyBundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});
const storyBundleUrl = pathToFileURL(storyBundlePath).href;
const { SihDecisionStory } = await import(storyBundleUrl);

// Bundle EndToEndWorkflowOptimizer
const wfBundlePath = path.join(outDir, 'sihWfTestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx')],
  bundle: true,
  format: 'esm',
  outfile: wfBundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});
const wfBundleUrl = pathToFileURL(wfBundlePath).href;
const { EndToEndWorkflowOptimizer } = await import(wfBundleUrl);

// Bundle api.ts
const apiBundlePath = path.join(outDir, 'apiSihTestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../services/api.ts')],
  bundle: true,
  format: 'esm',
  outfile: apiBundlePath,
  external: []
});
const apiUrl = pathToFileURL(apiBundlePath).href;
const { runEndToEndWorkflow, fetchSampleWorkflowRequest } = await import(apiUrl);

// Mock fixture
const mockWorkflowResponse = {
  request: {
    source_port_id: "PORT-SG",
    destination_port_id: "PORT-RTM",
    cargo_weight_tonnes: 60000.0,
    departure_datetime: "2026-10-01T12:00:00Z",
    deadline_datetime: "2026-10-29T12:00:00Z",
    speed_grid_step_knots: 0.5,
    currency: "USD"
  },
  stages: {
    fuel_intelligence: {
      status: "completed",
      available_vessels_count: 4,
      available_fuels_count: 4,
      selected_vessel_context: {
        id: "VES-001",
        name: "Pacific Horizon",
        type: "Panamax Bulk Carrier",
        dwt: 75000,
        design_speed_knots: 14.5
      },
      selected_fuel_context: {
        id: "FUEL-VLSFO",
        name: "Very Low Sulfur Fuel Oil",
        price_per_tonne: 650.0
      },
      representative_fuel_estimate: {
        fuel_consumption_tonnes: 88.75,
        fuel_cost: 57687.5,
        operational_co2_tonnes: 279.56,
        lifecycle_ghg_tonnes: 314.18
      },
      notes: ["Phase 1 executed successfully"]
    },
    maritime_network: {
      status: "completed",
      origin_port_id: "PORT-SG",
      destination_port_id: "PORT-RTM",
      candidate_routes_count: 2,
      candidate_routes: [
        {
          id: "RT-SG-RTM-SUEZ",
          name: "Suez Canal Corridor",
          total_distance_nm: 8280.0,
          route_cost: 387000.0,
          max_draft_m: 16.0
        },
        {
          id: "RT-SG-RTM-CAPE",
          name: "Cape of Good Hope Corridor",
          total_distance_nm: 11720.0,
          route_cost: 37000.0,
          max_draft_m: 25.0
        }
      ],
      feasible_routes_count: 2,
      route_feasibility_breakdown: {
        "RT-SG-RTM-SUEZ": true,
        "RT-SG-RTM-CAPE": true
      },
      notes: ["Suez and Cape corridors available"]
    },
    weather_ocean: {
      status: "completed",
      scenario_id: "SCEN-A-FAVORABLE",
      assessed_routes_count: 2,
      route_assessments: {},
      safe_routes_count: 2,
      unsafe_routes_count: 0,
      weather_fuel_factors: {
        "RT-SG-RTM-SUEZ": 1.05,
        "RT-SG-RTM-CAPE": 1.15
      },
      notes: ["Phase 3 dynamic sea-state factors evaluated"]
    },
    classical_optimization: {
      status: "completed",
      total_evaluated_combinations: 75,
      feasible_solutions_count: 48,
      runtime_ms: 18.5,
      best_cost_candidate_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
      best_time_candidate_id: "VES-001::RT-SG-RTM-SUEZ::15.5::VLSFO",
      full_response: {
        method_name: "Classical Exact Enumeration",
        best_cost_usd: 1162760.0,
        best_time_hours: 601.2,
        runtime_ms: 18.5
      }
    },
    quantum_inspired: {
      status: "completed",
      qubo_variable_count: 48,
      qubo_formulation_level: "ONE_HOT_DECISION_VARIABLES",
      solver_runtime_ms: 45.2,
      total_runtime_ms: 52.0,
      best_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
      top_k_solutions_count: 5,
      full_response: {
        method_name: "Quantum-Inspired Simulated Annealing",
        best_cost_usd: 1162760.0,
        best_time_hours: 601.2,
        solver_runtime_ms: 45.2
      }
    },
    comparative_analysis: {
      status: "completed",
      pareto_front_count: 5,
      selected_priority: "balanced",
      recommended_decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
      full_response: {
        request: {
          source_port_id: "PORT-SG",
          destination_port_id: "PORT-RTM",
          cargo_weight_tonnes: 60000.0,
          deadline_datetime: "2026-10-29T12:00:00Z"
        },
        classical: {
          method_name: "Classical Exact Enumeration",
          best_cost_usd: 1162760.0,
          best_time_hours: 601.2,
          fuel_consumption_tonnes: 1250.4,
          operational_co2_tonnes: 3938.8,
          runtime_ms: 18.5
        },
        quantum_inspired: {
          method_name: "Quantum-Inspired Simulated Annealing",
          best_cost_usd: 1162760.0,
          best_time_hours: 601.2,
          fuel_consumption_tonnes: 1250.4,
          operational_co2_tonnes: 3938.8,
          solver_runtime_ms: 45.2,
          runtime_ms: 45.2
        },
        tradeoffs: {
          cost_delta_usd: 0.0,
          cost_delta_pct: 0.0,
          time_delta_hours: 0.0,
          time_delta_pct: 0.0,
          fuel_delta_tonnes: 0.0,
          co2_delta_tonnes: 0.0,
          ghg_delta_tonnes: 0.0,
          deadline_margin_delta_hours: 0.0
        },
        schedule_analysis: {
          departure_datetime: "2026-10-01T12:00:00Z",
          arrival_datetime: "2026-10-26T13:12:00Z",
          deadline_datetime: "2026-10-29T12:00:00Z",
          deadline_margin_hours: 70.8,
          is_safe: true,
          status: "Safe"
        },
        environmental_analysis: {
          fuel_consumption_tonnes: 1250.4,
          operational_co2_tonnes: 3938.8,
          lifecycle_ghg_tonnes: 4426.4
        },
        recommendations: {
          balanced: {
            priority: "balanced",
            method: "Comparative Decision Analysis",
            candidate: {
              decision_id: "VES-001::RT-SG-RTM-SUEZ::14.0::VLSFO",
              vessel_name: "Pacific Horizon",
              route_name: "Suez Canal Corridor",
              cruising_speed_knots: 14.0,
              fuel_name: "Very Low Sulfur Fuel Oil",
              total_voyage_cost_usd: 1162760.0,
              total_voyage_time_hours: 601.2,
              fuel_consumption_tonnes: 1250.4,
              operational_co2_tonnes: 3938.8,
              lifecycle_ghg_tonnes: 4426.4,
              deadline_margin_hours: 70.8,
              weather_risk_level: "LOW"
            },
            reasons: [
              "Pareto-efficient trade-off.",
              "Minimizes normalized distance to ideal theoretical optimum.",
              "Meets delivery deadline with 70.8 hours safety margin."
            ]
          }
        },
        pareto_front: [],
        assumptions: ["Decision analysis layer over existing optimization outputs."]
      }
    }
  },
  workflow_metadata: {
    workflow_id: "WF-DEMO-26138",
    execution_status: "success",
    stage_completion_status: {
      fuel_intelligence: "completed",
      maritime_network: "completed",
      weather_ocean: "completed",
      classical_optimization: "completed",
      quantum_inspired: "completed",
      comparative_analysis: "completed"
    },
    total_runtime_ms: 115.7,
    deterministic_mode: true,
    timestamp_utc: "2026-10-01T12:00:00Z",
    assumptions: []
  }
};

// ==============================================================================
// Test 1: SIH demo scenario loads correctly
// ==============================================================================
test('1. SIH demo scenario loads correctly with standard Singapore to Rotterdam parameters', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  assert.ok(src.includes('Load SIH Demo Scenario'), 'Must feature Load SIH Demo Scenario button');
  assert.ok(src.includes('PORT-SG'), 'Must support Singapore port');
  assert.ok(src.includes('PORT-RTM'), 'Must support Rotterdam port');
  assert.ok(src.includes('60000'), 'Must default to 60,000 MT cargo payload');
});

// ==============================================================================
// Test 2: Demo scenario uses the existing sample workflow data endpoint
// ==============================================================================
test('2. Demo scenario uses the existing sample workflow data endpoint', async () => {
  let calledUrl = '';
  let calledMethod = '';

  global.fetch = async (url, options) => {
    calledUrl = url;
    calledMethod = options?.method || 'GET';
    return {
      ok: true,
      json: async () => ({ voyage_request: mockWorkflowResponse.request })
    };
  };

  const sample = await fetchSampleWorkflowRequest();
  assert.ok(calledUrl.includes('/workflow/sample-request'), 'Must call existing sample request endpoint');
  assert.equal(calledMethod, 'GET', 'Sample request must use GET method');
  assert.equal(sample.voyage_request.source_port_id, 'PORT-SG', 'Source port must be Singapore');
});

// ==============================================================================
// Test 3: Run button uses the existing end-to-end endpoint
// ==============================================================================
test('3. Run button uses the existing end-to-end endpoint', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let requestBody = null;

  global.fetch = async (url, options) => {
    calledUrl = url;
    calledMethod = options?.method || 'GET';
    if (options?.body) {
      requestBody = JSON.parse(options.body);
    }
    return {
      ok: true,
      json: async () => mockWorkflowResponse
    };
  };

  const res = await runEndToEndWorkflow({
    voyage_request: mockWorkflowResponse.request,
    priority: "balanced",
    top_k: 5
  });

  assert.ok(calledUrl.includes('/workflow/optimize'), 'Must target POST /workflow/optimize');
  assert.equal(calledMethod, 'POST', 'Must execute HTTP POST');
  assert.equal(requestBody.voyage_request.source_port_id, 'PORT-SG');
  assert.equal(res.workflow_metadata.workflow_id, 'WF-DEMO-26138');
});

// ==============================================================================
// Test 4: Decision story renders after successful execution
// ==============================================================================
test('4. Decision story renders after successful execution', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));

  assert.ok(html.includes('SIH DEMONSTRATION SCENARIO'), 'Must render SIH demo badge');
  assert.ok(html.includes('Voyage Optimization Decision Story'), 'Must render story headline');
  assert.ok(html.includes('STEP 1'), 'Must include Step 1');
  assert.ok(html.includes('STEP 2'), 'Must include Step 2');
  assert.ok(html.includes('STEP 3'), 'Must include Step 3');
  assert.ok(html.includes('STEP 4'), 'Must include Step 4');
  assert.ok(html.includes('STEP 5'), 'Must include Step 5');
});

// ==============================================================================
// Test 5: Route alternatives render from backend data
// ==============================================================================
test('5. Route alternatives render from backend data', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));

  assert.ok(html.includes('Suez Canal Corridor'), 'Must render Suez corridor');
  assert.ok(html.includes('Cape of Good Hope Corridor'), 'Must render Cape corridor');
  assert.ok(html.includes('8,280 NM') || html.includes('8280'), 'Must render Suez distance');
  assert.ok(html.includes('11,720') || html.includes('11720'), 'Must render Cape distance');
});

// ==============================================================================
// Test 6: Classical vs QI comparison renders
// ==============================================================================
test('6. Classical vs QI comparison renders with genuine solver telemetry', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));

  assert.ok(html.includes('Classical Exact Enumeration'), 'Must label Classical Exact method');
  assert.ok(html.includes('Quantum-Inspired Simulated Annealing'), 'Must label Quantum-Inspired Simulated Annealing');
  assert.ok(html.includes('QUBO Binary Variables'), 'Must display QUBO variable count');
  assert.ok(html.includes('Evaluated Combinations'), 'Must display evaluated combinations');
});

// ==============================================================================
// Test 7: Final recommendation renders from backend data
// ==============================================================================
test('7. Final recommendation renders from backend data with justifications', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));

  assert.ok(html.includes('Pacific Horizon'), 'Must render recommended vessel');
  assert.ok(html.includes('Suez Canal Corridor'), 'Must render recommended route');
  assert.ok(html.includes('14.0 kts') || html.includes('14 kts'), 'Must render recommended speed');
  assert.ok(html.includes('Very Low Sulfur Fuel Oil'), 'Must render fuel');
  assert.ok(html.includes('Pareto-efficient trade-off'), 'Must render backend justification');
});

// ==============================================================================
// Test 8: No fabricated savings/percentage improvements are introduced
// ==============================================================================
test('8. No fabricated savings/percentage improvements are introduced', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));

  const storySrc = fs.readFileSync(path.join(__dirname, '../components/SihDecisionStory.tsx'), 'utf8');

  // Verify warning on baseline vs optimized
  assert.ok(
    html.includes('Note: This is NOT the optimized voyage fuel consumption') ||
    html.includes('Baseline estimate — NOT the optimized voyage fuel consumption'),
    'Must warn that Phase 1 baseline estimate is not optimized consumption'
  );

  // Must not contain fabricated savings terms
  assert.ok(!storySrc.includes('quantum saves 50%'), 'No fabricated savings claims');
  assert.ok(!storySrc.includes('guaranteed 20% savings'), 'No fabricated guarantee claims');
});

// ==============================================================================
// Test 9: Reset works
// ==============================================================================
test('9. Reset / run-again controls exist in component', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  assert.ok(src.includes('handleReset'), 'Must define handleReset');
  assert.ok(src.includes('Reset / Run Again') || src.includes('Reset'), 'Must provide reset button');
});

// ==============================================================================
// Test 10: Scientific neutrality is preserved
// ==============================================================================
test('10. Scientific neutrality is preserved with zero unsupported quantum-superiority claims', () => {
  const storySrc = fs.readFileSync(path.join(__dirname, '../components/SihDecisionStory.tsx'), 'utf8');

  const forbiddenPatterns = [
    /quantum superiority/i,
    /quantum beats classical/i,
    /quantum is faster/i,
    /quantum wins/i,
    /quantum is more efficient/i,
    /exponential speedup/i
  ];

  for (const pat of forbiddenPatterns) {
    assert.ok(!pat.test(storySrc), `SihDecisionStory must not contain unsupported phrase: ${pat}`);
  }

  assert.ok(storySrc.includes('Quantum-Inspired Candidate'), 'Must use neutral candidate nomenclature');
  assert.ok(storySrc.includes('Compared against Classical Exact baseline'), 'Must label comparison against Classical baseline');
});

// ==============================================================================
// Test 11: Regression test for backend-derived values in SIH Demo Story
// ==============================================================================
test('11. Regression test: SIH Demo Story displays backend-returned values rather than hardcoded optimization results', () => {
  const storySrc = fs.readFileSync(path.join(__dirname, '../components/SihDecisionStory.tsx'), 'utf8');

  // Verify that hardcoded fallback values for these fields are removed or replaced by dynamic variables
  assert.ok(!storySrc.includes('|| 75}'), 'Must not hardcode 75 evaluated combinations');
  assert.ok(!storySrc.includes('|| 48}'), 'Must not hardcode 48 feasible candidates or QUBO variables');
  
  // Verify that route distances are dynamically populated
  assert.ok(!storySrc.includes('Distance: <strong style={{ color: \'var(--text-primary)\' }}>8,280 NM</strong>'), 'Suez distance must not be hardcoded as exactly 8,280 NM without backend mapping');
  assert.ok(storySrc.includes('suezRoute.total_distance_nm'), 'Must use backend-provided distance for Suez');
  assert.ok(storySrc.includes('capeRoute.total_distance_nm'), 'Must use backend-provided distance for Cape');
  
  // Verify that route costs are dynamically populated
  assert.ok(!storySrc.includes('Canal Fee: <strong style={{ color: \'var(--accent-cyan)\' }}>$350,000</strong>'), 'Suez cost must not be hardcoded');
  assert.ok(storySrc.includes('suezRoute?.route_cost'), 'Must use backend-provided route cost for Suez');
});

// ==============================================================================
// Test 12: Benchmark values render from workflowResult
// ==============================================================================
test('12. Benchmark values render from workflowResult', () => {
  const html = renderToString(React.createElement(SihDecisionStory, {
    workflowResult: mockWorkflowResponse,
    priority: "balanced"
  }));
  assert.ok(html.includes('Benchmark Evidence'), 'Must render Benchmark Evidence title');
  // Check that the classical and quantum-inspired runtimes are present
  assert.ok(html.includes('18.5'), 'Must display classical runtime');
  assert.ok(html.includes('45.2'), 'Must display quantum-inspired runtime');
});

// ==============================================================================
// Test 13: Missing benchmark data does not crash the component
// ==============================================================================
test('13. Missing benchmark data does not crash the component', () => {
  const missingDataResponse = JSON.parse(JSON.stringify(mockWorkflowResponse));
  delete missingDataResponse.stages.comparative_analysis;
  delete missingDataResponse.stages.classical_optimization;
  delete missingDataResponse.stages.quantum_inspired;

  assert.doesNotThrow(() => {
    renderToString(React.createElement(SihDecisionStory, {
      workflowResult: missingDataResponse,
      priority: "balanced"
    }));
  }, 'Component should gracefully render even if benchmark data is missing');
});
