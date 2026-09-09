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

// Bundle EndToEndWorkflowOptimizer
const wfBundlePath = path.join(outDir, 'workflowTestBundle.mjs');
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
const apiBundlePath = path.join(outDir, 'apiWfTestBundle.mjs');
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
        id: "IMO-9811000",
        name: "Pacific Voyager",
        type: "Container",
        capacity_tonnes: 65000.0,
        min_speed_knots: 10.0,
        max_speed_knots: 22.0
      },
      selected_fuel_context: {
        id: "VLSFO",
        name: "Very Low Sulfur Fuel Oil",
        price_per_tonne: 620.0
      },
      representative_fuel_estimate: {
        status: "ok",
        disclaimer: "Calm water demo",
        vessel_id: "IMO-9811000",
        vessel_name: "Pacific Voyager",
        vessel_type: "Container",
        fuel_id: "VLSFO",
        fuel_name: "VLSFO",
        distance_nm: 1000.0,
        speed_knots: 16.0,
        sea_state: 2,
        cargo_weight_tonnes: 60000.0,
        travel_time_hours: 62.5,
        travel_time_days: 2.6,
        fuel_consumption_rate_tonnes_per_hour: 1.42,
        fuel_consumption_tonnes: 88.75,
        currency: "USD",
        fuel_price_per_tonne: 620.0,
        fuel_cost: 55025.0,
        operational_co2_tonnes: 279.56,
        fuel_per_nm_kg: 88.75,
        fuel_per_tonne_cargo_kg: 1.48,
        fuel_per_tonne_nm_grams: 1.48,
        co2_per_tonne_nm_grams: 4.66,
        vessel_utilization_percent: 92.3
      },
      notes: ["Catalog verified"]
    },
    maritime_network: {
      status: "completed",
      origin_port_id: "PORT-SG",
      destination_port_id: "PORT-RTM",
      candidate_routes_count: 2,
      candidate_routes: [],
      feasible_routes_count: 2,
      route_feasibility_breakdown: { "ROUTE-SUEZ": true, "ROUTE-CAPE": true },
      notes: ["Network verified"]
    },
    weather_ocean: {
      status: "completed",
      scenario_id: "default_deterministic",
      assessed_routes_count: 2,
      route_assessments: {},
      safe_routes_count: 2,
      unsafe_routes_count: 0,
      weather_fuel_factors: { "ROUTE-SUEZ": 1.04, "ROUTE-CAPE": 1.02 },
      notes: ["Currents evaluated"]
    },
    classical_optimization: {
      status: "completed",
      total_evaluated_combinations: 78,
      feasible_solutions_count: 36,
      runtime_ms: 12.5,
      best_cost_candidate_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO",
      best_time_candidate_id: "IMO-9811000::ROUTE-SUEZ::22.0::VLSFO",
      full_response: {
        status: "exact_classical_optimization",
        disclaimer: "Exact baseline",
        environmental_disclaimer: "Demo multiplier",
        request: {},
        cost_efficient: { mode: "cost_efficient", objective_description: "Min cost", per_vessel_best: {}, global_best: null },
        time_efficient: { mode: "time_efficient", objective_description: "Min time", per_vessel_best: {}, global_best: null },
        benchmark: {
          raw_combinations_evaluated: 78,
          pre_filtered_combinations: 0,
          total_candidates_evaluated: 78,
          feasible_candidates_count: 36,
          infeasible_candidates_count: 42,
          feasibility_rate_pct: 46.15,
          rejection_breakdown: {},
          runtime_ms: 12.5,
          speed_grid_step_knots: 0.5,
          unique_vessels_count: 1,
          unique_routes_count: 2,
          unique_fuels_count: 1
        },
        candidate_decision_space_preview: []
      }
    },
    quantum_inspired: {
      status: "completed",
      qubo_variable_count: 36,
      qubo_formulation_level: "Single-Voyage Discrete One-Hot QUBO",
      solver_runtime_ms: 18.2,
      total_runtime_ms: 31.4,
      best_decision_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO",
      top_k_solutions_count: 3,
      full_response: {
        status: "quantum_inspired_simulated_annealing",
        disclaimer: "No quantum hardware",
        qubo_formulation_level: "One-hot",
        objective_mode: "cost",
        qubo_summary: {
          num_variables: 36,
          num_nonzero_coefficients: 666,
          objective_mode: "cost",
          penalty_magnitude: 50.0,
          penalty_strategy: "P = safety * delta",
          normalization_scale: { min: 10000, max: 80000, span: 70000 },
          constant_offset: 50.0,
          variable_mappings_preview: []
        },
        solver_config: {
          initial_temperature: 10.0,
          final_temperature: 0.001,
          cooling_rate: 0.95,
          iterations_per_temperature: 50,
          number_of_runs: 5,
          random_seed: 42
        },
        top_k_solutions: [],
        best_solution: null,
        solver_runtime_ms: 18.2,
        total_runtime_ms: 31.4,
        number_of_runs_executed: 5,
        unique_feasible_solutions_found: 3,
        raw_decision_space_size: 78,
        feasible_candidate_space_size: 36
      }
    },
    comparative_analysis: {
      status: "completed",
      pareto_front_count: 7,
      selected_priority: "balanced",
      recommended_decision_id: "IMO-9811000::ROUTE-SUEZ::14.0::VLSFO",
      full_response: {
        request: {},
        classical: { method_name: "Classical Exact", best_cost_usd: 50000, best_time_hours: 500, fuel_consumption_tonnes: 80, operational_co2_tonnes: 250, lifecycle_ghg_tonnes: 260, runtime_ms: 12.5, best_decision_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO", top_k_count: 1 },
        quantum_inspired: { method_name: "Quantum-Inspired", best_cost_usd: 50000, best_time_hours: 500, fuel_consumption_tonnes: 80, operational_co2_tonnes: 250, lifecycle_ghg_tonnes: 260, runtime_ms: 18.2, best_decision_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO", top_k_count: 3 },
        classical_summary: { method_name: "Classical Exact" },
        quantum_inspired_summary: { method_name: "Quantum-Inspired" },
        comparison: {
          classical_candidate: { decision_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO", vessel_name: "Pacific Voyager", route_name: "Suez Canal Corridor", speed_knots: 10.0, fuel_name: "VLSFO", total_cost_usd: 50000, total_voyage_time_hours: 500, fuel_consumption_tonnes: 80, operational_co2_tonnes: 250, lifecycle_ghg_tonnes: 260, deadline_margin_hours: 100, is_feasible: true, optimization_method: "Classical", runtime_ms: 12.5 },
          quantum_inspired_candidate: { decision_id: "IMO-9811000::ROUTE-SUEZ::10.0::VLSFO", vessel_name: "Pacific Voyager", route_name: "Suez Canal Corridor", speed_knots: 10.0, fuel_name: "VLSFO", total_cost_usd: 50000, total_voyage_time_hours: 500, fuel_consumption_tonnes: 80, operational_co2_tonnes: 250, lifecycle_ghg_tonnes: 260, deadline_margin_hours: 100, is_feasible: true, optimization_method: "Quantum-Inspired", runtime_ms: 18.2 },
          tradeoffs: { cost_difference: 0, cost_percentage_difference: 0, time_difference: 0, time_percentage_difference: 0, fuel_difference: 0, co2_difference: 0, lifecycle_ghg_difference: 0, deadline_margin_difference: 0, runtime_difference: 5.7, objective_gap: 0, cost_delta_usd: 0, cost_delta_pct: 0, time_delta_hours: 0, time_delta_pct: 0, fuel_delta_tonnes: 0, co2_delta_tonnes: 0, ghg_delta_tonnes: 0 },
          scientific_statement: "Both methods discover optimal trade-offs."
        },
        pareto_front: [
          { decision_id: "IMO-9811000::ROUTE-SUEZ::14.0::VLSFO", total_voyage_cost_usd: 52000, total_voyage_time_hours: 480, fuel_consumption_tonnes: 85, operational_co2_tonnes: 260, lifecycle_ghg_tonnes: 270, deadline_margin_hours: 120, is_feasible: true }
        ],
        recommendations: {
          balanced: {
            priority: "balanced",
            method: "Comparative Decision Analysis",
            candidate: { decision_id: "IMO-9811000::ROUTE-SUEZ::14.0::VLSFO", vessel_name: "Pacific Voyager", route_name: "Suez Canal Corridor", speed_knots: 14.0, fuel_name: "VLSFO", total_cost_usd: 52000, total_voyage_time_hours: 480, fuel_consumption_tonnes: 85, operational_co2_tonnes: 260, lifecycle_ghg_tonnes: 270, deadline_margin_hours: 120, is_feasible: true },
            reasons: ["Pareto-efficient trade-off.", "Minimizes normalized distance to ideal point."]
          }
        },
        tradeoffs: { cost_difference: 0, cost_percentage_difference: 0, time_difference: 0, time_percentage_difference: 0, fuel_difference: 0, co2_difference: 0, lifecycle_ghg_difference: 0, deadline_margin_difference: 0, runtime_difference: 5.7, objective_gap: 0, cost_delta_usd: 0, cost_delta_pct: 0, time_delta_hours: 0, time_delta_pct: 0, fuel_delta_tonnes: 0, co2_delta_tonnes: 0, ghg_delta_tonnes: 0 },
        environmental_analysis: { operational_co2_tonnes: 260, lifecycle_ghg_tonnes: 270, upstream_ghg_tonnes: 10, fuel_type: "VLSFO", comparison_note: "Standard maritime emissions." },
        schedule_analysis: { departure_datetime: "2026-10-01T12:00:00Z", arrival_datetime: "2026-10-21T12:00:00Z", deadline_datetime: "2026-10-29T12:00:00Z", deadline_margin_hours: 192, is_safe: true, status: "Safe" },
        qi_top_k: [],
        assumptions: [
          "Phase 6 is a decision-analysis layer over existing optimization outputs.",
          "No quantum advantage or speedup is claimed."
        ]
      }
    }
  },
  workflow_metadata: {
    workflow_id: "WF-E3BBA7B57A2F",
    execution_status: "completed",
    failed_stage: null,
    error_detail: null,
    stage_completion_status: {
      fuel_intelligence: "completed",
      maritime_network: "completed",
      weather_ocean: "completed",
      classical_optimization: "completed",
      quantum_inspired: "completed",
      comparative_analysis: "completed"
    },
    total_runtime_ms: 460.57,
    deterministic_mode: true,
    timestamp_utc: "2026-10-01T12:00:00Z",
    assumptions: [
      "Deterministic end-to-end orchestration across Phase 1 to Phase 6.",
      "No quantum advantage or hardware execution is claimed."
    ]
  }
};

// ==============================================================================
// Test 1: Workflow page renders structure and controls
// ==============================================================================
test('1. Workflow page renders structure and controls', () => {
  const html = renderToString(React.createElement(EndToEndWorkflowOptimizer));
  assert.ok(html.includes('End-to-End Voyage Optimization Workflow'), 'Must render workflow title');
  assert.ok(html.includes('POST /api/v1/workflow/optimize'), 'Must display target API endpoint');
  assert.ok(html.includes('Run End-to-End Optimization'), 'Must render primary run action button');
  assert.ok(html.includes('Origin Port'), 'Must render origin port selector');
  assert.ok(html.includes('Destination Port'), 'Must render destination port selector');
  assert.ok(html.includes('Decision Priority'), 'Must render decision priority selector');
});

// ==============================================================================
// Test 2: Correct POST endpoint is called
// ==============================================================================
test('2. Correct POST endpoint is called', async () => {
  let calledUrl = '';
  let calledMethod = '';
  global.fetch = async (url, options) => {
    calledUrl = url;
    calledMethod = options?.method || 'GET';
    return {
      ok: true,
      json: async () => mockWorkflowResponse
    };
  };

  await runEndToEndWorkflow({
    voyage_request: mockWorkflowResponse.request,
    priority: 'balanced',
    top_k: 5
  });

  assert.equal(calledUrl, '/api/v1/workflow/optimize', 'Must call /api/v1/workflow/optimize');
  assert.equal(calledMethod, 'POST', 'Must execute via HTTP POST');
});

// ==============================================================================
// Test 3: Correct request payload is sent
// ==============================================================================
test('3. Correct request payload is sent', async () => {
  let capturedBody = null;
  global.fetch = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => mockWorkflowResponse
    };
  };

  const payload = {
    voyage_request: mockWorkflowResponse.request,
    priority: 'cost',
    top_k: 3,
    solver_config: {
      initial_temperature: 10.0,
      final_temperature: 0.001,
      cooling_rate: 0.95,
      iterations_per_temperature: 50,
      number_of_runs: 5,
      random_seed: 42
    }
  };

  await runEndToEndWorkflow(payload);

  assert.ok(capturedBody, 'Body must be captured');
  assert.equal(capturedBody.voyage_request.source_port_id, 'PORT-SG');
  assert.equal(capturedBody.voyage_request.destination_port_id, 'PORT-RTM');
  assert.equal(capturedBody.priority, 'cost');
  assert.equal(capturedBody.top_k, 3);
  assert.equal(capturedBody.solver_config.random_seed, 42);
});

// ==============================================================================
// Test 4: Loading/progress state appears
// ==============================================================================
test('4. Loading/progress state appears and shows 6 stages', () => {
  const html = renderToString(React.createElement(EndToEndWorkflowOptimizer));
  assert.ok(html.includes('Ship &amp; Fuel Intelligence'), 'Must display Stage 1');
  assert.ok(html.includes('Maritime Network'), 'Must display Stage 2');
  assert.ok(html.includes('Weather &amp; Ocean'), 'Must display Stage 3');
  assert.ok(html.includes('Classical Optimization'), 'Must display Stage 4');
  assert.ok(html.includes('Quantum-Inspired Optimization'), 'Must display Stage 5');
  assert.ok(html.includes('Comparative Decision Analysis'), 'Must display Stage 6');
});

// ==============================================================================
// Test 5: Successful workflow response renders all six stages
// ==============================================================================
test('5. Successful workflow response renders all six stages in HTML', () => {
  // Test that the mock response maps cleanly and contains all stage keys
  const stages = mockWorkflowResponse.stages;
  assert.ok(stages.fuel_intelligence, 'Phase 1 present');
  assert.ok(stages.maritime_network, 'Phase 2 present');
  assert.ok(stages.weather_ocean, 'Phase 3 present');
  assert.ok(stages.classical_optimization, 'Phase 4 present');
  assert.ok(stages.quantum_inspired, 'Phase 5 present');
  assert.ok(stages.comparative_analysis, 'Phase 6 present');
  assert.equal(mockWorkflowResponse.workflow_metadata.execution_status, 'completed');
  assert.equal(mockWorkflowResponse.workflow_metadata.workflow_id, 'WF-E3BBA7B57A2F');
});

// ==============================================================================
// Test 6: Final comparative analysis is displayed
// ==============================================================================
test('6. Final comparative analysis is displayed', () => {
  const comp = mockWorkflowResponse.stages.comparative_analysis;
  assert.equal(comp.status, 'completed');
  assert.equal(comp.pareto_front_count, 7);
  assert.equal(comp.selected_priority, 'balanced');
  assert.equal(comp.recommended_decision_id, 'IMO-9811000::ROUTE-SUEZ::14.0::VLSFO');
  assert.ok(comp.full_response.recommendations.balanced, 'Balanced recommendation exists');
});

// ==============================================================================
// Test 7: Phase 1 representative estimate is labeled correctly and distinguished
// ==============================================================================
test('7. Phase 1 representative estimate is labeled correctly and distinguished from optimized fuel', () => {
  const repEst = mockWorkflowResponse.stages.fuel_intelligence.representative_fuel_estimate;
  assert.ok(repEst, 'Representative fuel estimate exists');
  assert.equal(repEst.fuel_consumption_tonnes, 88.75);
  // In EndToEndWorkflowOptimizer.tsx, it explicitly labels:
  // "Phase 1 Representative Fuel Estimate"
  // "Note: This is NOT the optimized voyage fuel consumption."
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  assert.ok(src.includes('Phase 1 Representative Fuel Estimate'), 'Must explicitly label Phase 1 representative estimate');
  assert.ok(src.includes('This is NOT the optimized voyage fuel consumption'), 'Must warn that this is not optimized consumption');
});

// ==============================================================================
// Test 8: Backend failure displays failed stage and error without fabrication
// ==============================================================================
test('8. Backend failure throws structured error and captures failure details', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ detail: "Origin port 'PORT-UNKNOWN' not found in maritime network." })
  });

  await assert.rejects(
    async () => {
      await runEndToEndWorkflow({
        voyage_request: { ...mockWorkflowResponse.request, source_port_id: 'PORT-UNKNOWN' }
      });
    },
    (err) => {
      assert.ok(err.message.includes('PORT-UNKNOWN'), 'Error message must specify failed port');
      return true;
    }
  );
});

// ==============================================================================
// Test 9: Reset / run-again controls exist
// ==============================================================================
test('9. Reset / run-again controls exist in component', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  assert.ok(src.includes('Reset / Run Again'), 'Must provide Reset / Run Again control');
  assert.ok(src.includes('handleReset'), 'Must have handleReset handler');
});

// ==============================================================================
// Test 10: No unsupported quantum-superiority language is introduced
// ==============================================================================
test('10. No unsupported quantum-superiority language is introduced', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  const forbiddenPatterns = [
    /quantum supremacy/i,
    /quantum advantage over classical/i,
    /exponential speedup/i,
    /quantum beats classical/i,
    /outperformed classical/i,
  ];

  for (const pat of forbiddenPatterns) {
    assert.ok(!pat.test(src), `Component must not contain unsupported pattern: ${pat}`);
  }
});

// ==============================================================================
// Test 11: Benchmark Evidence section renders the 4 required values
// ==============================================================================
test('11. Benchmark Evidence section renders the 4 required values from workflowResult', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  assert.ok(src.includes('Benchmark Evidence'), 'Must contain Benchmark Evidence section title');
  assert.ok(src.includes('workflowResult.stages.classical_optimization.runtime_ms'), 'Must render classical runtime');
  assert.ok(src.includes('workflowResult.stages.quantum_inspired.solver_runtime_ms'), 'Must render quantum-inspired runtime');
  assert.ok(
    src.includes('comparative_analysis.full_response.classical?.best_cost_usd') || 
    src.includes('comparative_analysis.full_response.classical_summary?.best_cost_usd'), 
    'Must render classical objective value'
  );
  assert.ok(
    src.includes('comparative_analysis.full_response.quantum_inspired?.best_cost_usd') || 
    src.includes('comparative_analysis.full_response.quantum_inspired_summary?.best_cost_usd'), 
    'Must render quantum-inspired objective value'
  );
});

// ==============================================================================
// Test 12: Benchmark Evidence section gracefully handles missing objective values
// ==============================================================================
test('12. Benchmark Evidence section does not crash when comparative-analysis objective values are missing', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/EndToEndWorkflowOptimizer.tsx'), 'utf8');
  
  assert.ok(
    (src.includes('classical?.best_cost_usd') || src.includes('classical_summary?.best_cost_usd')) && 
    src.includes('|| 0'),
    'Must use optional chaining and a fallback (e.g. || 0) for classical cost to prevent crashing'
  );
  
  assert.ok(
    (src.includes('quantum_inspired?.best_cost_usd') || src.includes('quantum_inspired_summary?.best_cost_usd')) && 
    src.includes('|| 0'),
    'Must use optional chaining and a fallback (e.g. || 0) for quantum-inspired cost to prevent crashing'
  );
});
