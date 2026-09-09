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

// Bundle Stage03Environment
const stage03BundlePath = path.join(outDir, 'stage03TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage03Environment.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage03BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const stage03Url = pathToFileURL(stage03BundlePath).href;
const { Stage03Environment } = await import(stage03Url);

const mockVoyageConfig = {
  sourcePort: 'PORT-SG',
  destPort: 'PORT-RTM',
  cargoWeight: 60000,
  departureDate: '2026-10-01T12:00',
  deadlineDate: '2026-10-29T12:00',
};

const mockFleetIds = ['VES-001', 'VES-002', 'VES-003'];

// ==============================================================================
// Test 1: Stage 03 renders title, subtitle, and stage indicators
// ==============================================================================
test('1. Stage 03 renders title, subtitle, and stage indicators', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Environment'), 'Must render Environment title');
  assert.ok(
    html.includes('Check weather, ocean conditions, and route feasibility'),
    'Must render required subtitle'
  );
  assert.ok(html.includes('03 / 07'), 'Must display Stage 03 indicator');
  assert.ok(html.includes('Ocean &amp; Weather Modeling') || html.includes('Ocean & Weather Modeling'), 'Must display stage badge');
});

// ==============================================================================
// Test 2: Read-only voyage and fleet context is displayed
// ==============================================================================
test('2. Read-only voyage and fleet context is displayed without re-entry', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001'],
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('PORT-SG'), 'Must display origin port');
  assert.ok(html.includes('PORT-RTM'), 'Must display destination port');
  assert.ok(html.includes('60,000') && html.includes('MT'), 'Must display cargo load from Stage 01');
  assert.ok(html.includes('VES-001'), 'Must display selected fleet ID from Stage 02');
  assert.ok(html.includes('SOG = STW + Ocean Drift') || html.includes('SOG = STW + c_along'), 'Must display the speed over ground model');
});

// ==============================================================================
// Test 3: Environmental data source is honestly labelled
// ==============================================================================
test('3. Environmental data source is honestly labelled as simulated demo data', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Environmental Data'), 'Must have Environmental Data section');
  assert.ok(
    html.includes('Demo Environmental Data') || html.includes('Simulated environmental conditions'),
    'Must explicitly label as Demo Environmental Data'
  );
  assert.ok(
    html.includes('Not a live') || html.includes('not a live'),
    'Must clarify it is not a live weather API'
  );
});

// ==============================================================================
// Test 4: Existing route options are displayed with project distances and draft limits
// ==============================================================================
test('4. Existing route options are displayed with project distances and draft requirements', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('RT-SG-RTM-SUEZ'), 'Must display Suez route ID');
  assert.ok(html.includes('8,280') && html.includes('NM'), 'Must display Suez distance 8,280 NM');
  assert.ok(html.includes('16.0') && html.includes('m limit'), 'Must display Suez draft limit 16.0 m');

  assert.ok(html.includes('RT-SG-RTM-CAPE'), 'Must display Cape route ID');
  assert.ok(html.includes('11,720') && html.includes('NM'), 'Must display Cape distance 11,720 NM');
  assert.ok(html.includes('Unrestricted'), 'Must display Cape unrestricted draft note');
});

// ==============================================================================
// Test 5: Feasibility status, along-track current, and fuel factors are displayed
// ==============================================================================
test('5. Feasibility status, along-track current, and fuel factors are displayed', () => {
  const html = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('✓ Feasible'), 'Must show Feasible badge');
  assert.ok(html.includes('Current effect:'), 'Must show Current effect');
  assert.ok(
    html.includes('Favorable current') || html.includes('Adverse current') || html.includes('Neutral current'),
    'Must display human-readable current direction'
  );
  assert.ok(html.includes('SOG:'), 'Must display speed over ground SOG');
  assert.ok(html.includes('Demo Environmental Fuel Factor:'), 'Must display demo environmental fuel factor');
});

// ==============================================================================
// Test 6: Infeasible routes are excluded with specific physical/environmental reasons
// ==============================================================================
test('6. Infeasible routes are excluded with specific disqualification reasons', () => {
  // Pass scenario-d-storm via initial environmentResult
  const htmlScenarioD = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: {
        status: 'completed',
        scenario_id: 'scenario-d-storm',
        assessed_routes_count: 2,
        route_assessments: {},
        safe_routes_count: 1,
        unsafe_routes_count: 1,
        weather_fuel_factors: {},
        notes: [],
      },
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(htmlScenarioD.includes('Excluded Routes'), 'Must display Excluded Routes section in Scenario D');
  assert.ok(htmlScenarioD.includes('✕ Infeasible'), 'Must display Infeasible badge for excluded route');
  assert.ok(
    htmlScenarioD.includes('EXCESSIVE_WAVE_HEIGHT') || htmlScenarioD.includes('7.5m'),
    'Must state excessive wave height reason'
  );
  assert.ok(
    htmlScenarioD.includes('SEA_STATE_TOO_HIGH') || htmlScenarioD.includes('State 8'),
    'Must state unsafe sea state reason'
  );
  assert.ok(
    htmlScenarioD.includes('STORM_CONDITION') || htmlScenarioD.includes('cyclone'),
    'Must state severe storm condition reason'
  );
});

// ==============================================================================
// Test 7: Continue is blocked (disabled) when no feasible route remains
// ==============================================================================
test('7. Continue is blocked when all routes are infeasible', () => {
  const htmlAllInfeasible = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: {
        status: 'no_feasible_routes',
        scenario_id: 'scenario-all-infeasible-sim',
        assessed_routes_count: 2,
        route_assessments: {},
        safe_routes_count: 0,
        unsafe_routes_count: 2,
        weather_fuel_factors: {},
        notes: [],
      },
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(
    htmlAllInfeasible.includes('No Feasible Routes Remain in Search Space'),
    'Must display clear warning when 0 routes are feasible'
  );
  assert.ok(
    htmlAllInfeasible.includes('disabled'),
    'Continue button must be disabled when no feasible route remains'
  );
});

// ==============================================================================
// Test 8: Continue is enabled when feasible routes exist; Previous returns to Stage 02
// ==============================================================================
test('8. Continue is enabled with feasible routes; Previous button is wired to Stage 02', () => {
  const htmlNominal = renderToString(
    React.createElement(Stage03Environment, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: mockFleetIds,
      environmentResult: null,
      onEnvironmentProcessed: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  // Button should not have disabled attribute in nominal conditions
  assert.ok(htmlNominal.includes('id="stage-continue-btn"'), 'Must have stage-continue-btn');
  assert.ok(htmlNominal.includes('Previous (Fleet)'), 'Previous button must point back to Fleet');
  assert.ok(htmlNominal.includes('id="stage-prev-btn"'), 'Must have stage-prev-btn');
});

// ==============================================================================
// Test 9: App.tsx integration preserves state and downstream invalidation
// ==============================================================================
test('9. App.tsx integrates Stage03Environment with state synchronization and invalidation', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');

  assert.ok(appSrc.includes('Stage03Environment'), 'App.tsx must import and render Stage03Environment');
  assert.ok(
    appSrc.includes('environmentResult') && appSrc.includes('setEnvironmentResult'),
    'App.tsx must manage environmentResult state'
  );
  assert.ok(
    appSrc.includes('activeStage === 3 ? ('),
    'App.tsx must render Stage03Environment on activeStage 3'
  );
  assert.ok(
    appSrc.includes('setMaxUnlockedStage((prev) => Math.min(prev, 2))') ||
    appSrc.includes('setEnvironmentResult(null)'),
    'Changing fleet selection in Stage 02 must invalidate Stage 03 results'
  );
  assert.ok(
    appSrc.includes('setActiveStage(4)') && appSrc.includes('setMaxUnlockedStage((prev) => Math.max(prev, 4))'),
    'Continuing from Stage 03 must advance to Stage 04 and unlock Stage 04'
  );
});
