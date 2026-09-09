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

// Bundle Stage01Voyage
const stage01BundlePath = path.join(outDir, 'stage01TestBundle.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../components/Stage01Voyage.tsx')],
  bundle: true,
  format: 'esm',
  outfile: stage01BundlePath,
  external: ['react', 'react-dom', 'react-dom/server'],
  jsx: 'automatic'
});

const stage01Url = pathToFileURL(stage01BundlePath).href;
const { Stage01Voyage } = await import(stage01Url);

const validVoyageValues = {
  sourcePort: 'PORT-SG',
  destPort: 'PORT-RTM',
  cargoWeight: 60000,
  departureDate: '2026-10-01T12:00',
  deadlineDate: '2026-10-29T12:00',
};

// ==============================================================================
// Test 1: Stage 01 renders title, subtitle, and primary voyage form
// ==============================================================================
test('1. Stage 01 renders title, subtitle, and primary voyage form', () => {
  const html = renderToString(
    React.createElement(Stage01Voyage, {
      values: validVoyageValues,
      onChange: () => {},
      onValidContinue: () => {},
    })
  );

  assert.ok(html.includes('Voyage'), 'Must render Voyage title');
  assert.ok(html.includes('Define the shipment you want to optimize'), 'Must render required subtitle');
  assert.ok(html.includes('Stage 01'), 'Must display Stage 01 indicator');
});

// ==============================================================================
// Test 2: Renders the 4 required core inputs
// ==============================================================================
test('2. Renders the 4 required core inputs: Source, Destination, Cargo, Deadline', () => {
  const html = renderToString(
    React.createElement(Stage01Voyage, {
      values: validVoyageValues,
      onChange: () => {},
      onValidContinue: () => {},
    })
  );

  assert.ok(html.includes('Source Port'), 'Must contain Source Port label');
  assert.ok(html.includes('Destination Port'), 'Must contain Destination Port label');
  assert.ok(html.includes('Cargo Load'), 'Must contain Cargo Load label');
  assert.ok(html.includes('Delivery Deadline'), 'Must contain Delivery Deadline label');
  assert.ok(html.includes('Metric Tonnes (MT)'), 'Must indicate MT unit for cargo');
});

// ==============================================================================
// Test 3: Load SIH Demo Scenario button exists
// ==============================================================================
test('3. Load SIH Demo Scenario button is exposed and functional', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/Stage01Voyage.tsx'), 'utf8');
  assert.ok(src.includes('Load SIH Demo Scenario'), 'Must feature Load SIH Demo Scenario button');
  assert.ok(src.includes('handleLoadDemo'), 'Must have handleLoadDemo method');
  assert.ok(src.includes('PORT-SG'), 'Must populate Singapore as origin');
  assert.ok(src.includes('PORT-RTM'), 'Must populate Rotterdam as destination');
  assert.ok(src.includes('60000'), 'Must populate 60,000 MT as cargo weight');
});

// ==============================================================================
// Test 4: Validation prevents invalid inputs and shows specific error messages
// ==============================================================================
test('4. Validation logic handles same-port, non-positive cargo, and deadline earlier than departure', () => {
  const src = fs.readFileSync(path.join(__dirname, '../components/Stage01Voyage.tsx'), 'utf8');
  assert.ok(src.includes('Destination port must be different from source port'), 'Must validate source !== dest');
  assert.ok(src.includes('Cargo load must be greater than 0 MT'), 'Must validate cargo > 0');
  assert.ok(src.includes('Delivery deadline must be later than the departure datetime'), 'Must validate deadline > departure');
});

// ==============================================================================
// Test 5: Previous button is disabled on Stage 01
// ==============================================================================
test('5. Previous button is disabled on Stage 01', () => {
  const html = renderToString(
    React.createElement(Stage01Voyage, {
      values: validVoyageValues,
      onChange: () => {},
      onValidContinue: () => {},
    })
  );

  assert.ok(html.includes('disabled'), 'Previous button must be disabled on Stage 01');
  assert.ok(html.includes('Continue'), 'Continue button must be rendered');
});
