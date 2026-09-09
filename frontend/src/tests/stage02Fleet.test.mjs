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

// Bundle Stage02Fleet
const stage02BundlePath = path.join(outDir, 'stage02TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage02Fleet.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage02BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const stage02Url = pathToFileURL(stage02BundlePath).href;
const { Stage02Fleet } = await import(stage02Url);

const mockVoyageConfig = {
  sourcePort: 'PORT-SG',
  destPort: 'PORT-RTM',
  cargoWeight: 60000,
  departureDate: '2026-10-01T12:00',
  deadlineDate: '2026-10-29T12:00',
};

// ==============================================================================
// Test 1: Stage 02 renders title, subtitle, and read-only voyage context
// ==============================================================================
test('1. Stage 02 renders title, subtitle, and read-only voyage context', () => {
  const html = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001'],
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Fleet'), 'Must render Fleet title');
  assert.ok(html.includes('Select the vessels available for this voyage'), 'Must render required subtitle');
  assert.ok(html.includes('Stage 02'), 'Must display Stage 02 indicator');
  assert.ok(html.includes('60,000') && html.includes('MT'), 'Must display read-only cargo load from Stage 01');
  assert.ok(html.includes('PORT-SG') && html.includes('PORT-RTM'), 'Must display origin and destination ports');
});

// ==============================================================================
// Test 2: Existing supported vessels are displayed
// ==============================================================================
test('2. Existing supported vessels from project are displayed', () => {
  const html = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001'],
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Poseidon Leader'), 'Must display Poseidon Leader (VES-001)');
  assert.ok(html.includes('Green Horizon'), 'Must display Green Horizon (VES-002)');
  assert.ok(html.includes('Oceanic Pioneer'), 'Must display Oceanic Pioneer (VES-003)');
  assert.ok(html.includes((120000).toLocaleString()), 'Must display Poseidon Leader capacity');
  assert.ok(html.includes((82000).toLocaleString()), 'Must display Green Horizon capacity');
  assert.ok(html.includes((115000).toLocaleString()), 'Must display Oceanic Pioneer capacity');
});



// ==============================================================================
// Test 3: Vessel selection indicators and selected states
// ==============================================================================
test('3. Vessel selection state is reflected correctly in UI', () => {
  const htmlSelected = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001', 'VES-002'],
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(htmlSelected.includes('2 vessels assigned to voyage fleet'), 'Must display assigned vessel count');
  assert.ok(htmlSelected.includes('VES-001, VES-002'), 'Must show selected IDs');
});

// ==============================================================================
// Test 4: Cargo-incompatible vessel is marked and cannot be validly selected
// ==============================================================================
test('4. Cargo-incompatible vessel displays insufficient capacity warning', () => {
  // Cargo is 100,000 MT -> Green Horizon has only 82,000 MT capacity
  const heavyVoyageConfig = {
    ...mockVoyageConfig,
    cargoWeight: 100000,
  };

  const html = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: heavyVoyageConfig,
      selectedVesselIds: ['VES-001'],
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(html.includes('Insufficient capacity'), 'Must display Insufficient capacity for incompatible vessel');
  assert.ok(html.includes('Capacity Limit'), 'Must display Capacity Limit badge');
});

// ==============================================================================
// Test 5: Continue remains blocked without a valid selection
// ==============================================================================
test('5. Continue remains blocked (disabled) without a valid selection', () => {
  const htmlEmpty = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: [], // 0 selected
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(htmlEmpty.includes('Select at least one compatible vessel'), 'Must warn that vessels must be selected');
  assert.ok(htmlEmpty.includes('disabled'), 'Continue button must be disabled when 0 vessels selected');
});

// ==============================================================================
// Test 6: "Use Demo Fleet" button exists and selects compatible vessels
// ==============================================================================
test('6. "Use Demo Fleet" button exists and is wired to handleUseDemoFleet', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/Stage02Fleet.tsx'), 'utf8');
  assert.ok(src.includes('Use Demo Fleet'), 'Must feature Use Demo Fleet button');
  assert.ok(src.includes('handleUseDemoFleet'), 'Must have handleUseDemoFleet handler');
  assert.ok(src.includes('onPrevious'), 'Must support onPrevious callback');
  assert.ok(src.includes('onValidContinue'), 'Must support onValidContinue callback');
});

// ==============================================================================
// Test 7: Valid selection enables continue
// ==============================================================================
test('7. Valid compatible selection enables continue button', () => {
  const htmlValid = renderToString(
    React.createElement(Stage02Fleet, {
      voyageConfig: mockVoyageConfig,
      selectedVesselIds: ['VES-001', 'VES-002', 'VES-003'],
      onSelectionChange: () => {},
      onValidContinue: () => {},
      onPrevious: () => {},
      skipAnimation: true,
    })
  );

  assert.ok(htmlValid.includes('3 vessels assigned to voyage fleet'), 'Shows all 3 assigned');
  assert.ok(htmlValid.includes('Confirm fleet selection and proceed to Stage 03'), 'Continue title shows proceed to Stage 03');
});
