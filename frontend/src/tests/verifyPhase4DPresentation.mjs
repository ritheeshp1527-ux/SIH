import React from 'react';
import { renderToString } from 'react-dom/server';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stage03BundlePath = path.resolve(__dirname, '../../dist-test/stage03PropagationTestBundle.mjs');
const stage03Url = pathToFileURL(stage03BundlePath).href;
const { Stage03Environment } = await import(stage03Url);

console.log('=== PRESENTATION CHECK: 1. Singapore -> Dubai ===');
const singaporeDubaiResponse = {
  status: 'success',
  source_port: 'PORT-SG',
  destination_port: 'AEDXB',
  source_locode: 'SGSIN',
  destination_locode: 'AEDXB',
  routes: [
    {
      id: 'LIVE-SGSIN-AEDXB-01',
      is_primary: true,
      distance_m: 6485815.0,
      distance_nm: 3502.06,
      duration_ms: 900360000.0,
      duration_hours: 250.1,
      geometry: { type: 'LineString', coordinates: [[103.85, 1.29], [55.06, 25.01]] },
      environmental_points: [
        {
          latitude: 1.29,
          longitude: 103.85,
          timestamp: '2026-10-01T12:00:00Z',
          wind_speed_knots: 14.2,
          wind_direction_deg: 185.0,
          significant_wave_height_m: 1.5,
          wave_direction_deg: 195.0,
          wave_period_s: 6.8,
          ocean_current_velocity_knots: 0.9,
          ocean_current_direction_deg: 95.0,
          sea_state: 3,
          along_track_current_knots: 0.6,
          storm_flag: false,
          weather_risk_level: 'LOW',
          visibility_m: 10000.0,
        },
        {
          latitude: 5.75,
          longitude: 95.20,
          timestamp: '2026-10-02T18:00:00Z',
          wind_speed_knots: 16.0,
          wind_direction_deg: 210.0,
          significant_wave_height_m: 1.8,
          wave_direction_deg: 220.0,
          wave_period_s: 7.2,
          ocean_current_velocity_knots: 1.1,
          ocean_current_direction_deg: 110.0,
          sea_state: 4,
          along_track_current_knots: 0.4,
          storm_flag: false,
          weather_risk_level: 'LOW',
          visibility_m: 10000.0,
        },
      ],
      metadata: { name: 'Singapore to Dubai (Jebel Ali) Direct Passage' },
      optimization: {
        score: 91.2,
        rank: 1,
        distance_score: 92.0,
        wind_score: 88.0,
        wave_score: 90.0,
        current_score: 94.0,
        risk_score: 95.0,
        storm_penalty: 0.0,
        marine_coverage_ratio: 1.0,
        weather_coverage_ratio: 1.0,
        explanation: 'Direct passage via Malacca Strait and Arabian Sea.',
      },
    },
  ],
  primary_route: {
    id: 'LIVE-SGSIN-AEDXB-01',
    is_primary: true,
    distance_m: 6485815.0,
    distance_nm: 3502.06,
    duration_ms: 900360000.0,
    duration_hours: 250.1,
    geometry: { type: 'LineString', coordinates: [[103.85, 1.29], [55.06, 25.01]] },
    environmental_points: [],
    metadata: { name: 'Singapore to Dubai (Jebel Ali) Direct Passage' },
    optimization: {
      score: 91.2,
      rank: 1,
    },
  },
  marine_coverage_ratio: 0.96,
  weather_coverage_ratio: 0.99,
};

const htmlDubai = renderToString(
  React.createElement(Stage03Environment, {
    voyageConfig: {
      sourcePort: 'PORT-SG',
      destPort: 'AEDXB',
      cargoWeight: 55000,
      departureDate: '2026-10-01T12:00',
      deadlineDate: '2026-10-20T12:00',
    },
    selectedVesselIds: ['VES-001'],
    environmentResult: null,
    onEnvironmentProcessed: () => {},
    onValidContinue: () => {},
    onPrevious: () => {},
    skipAnimation: true,
    initialLiveResponse: singaporeDubaiResponse,
    mode: 'live',
  })
);

console.log('- Header contains "LIVE MARITIME ENVIRONMENT":', htmlDubai.includes('LIVE MARITIME ENVIRONMENT'));
console.log('- Header contains "Singapore → Dubai":', htmlDubai.includes('Singapore → Dubai'));
console.log('- Returned destination is Dubai / AEDXB:', htmlDubai.includes('AEDXB') && htmlDubai.includes('Dubai'));
console.log('- Route information is displayed (3,502.06 NM, 250.1 hrs, LIVE-SGSIN-AEDXB-01):',
  htmlDubai.includes('3,502.06') && htmlDubai.includes('250.1 hrs') && htmlDubai.includes('LIVE-SGSIN-AEDXB-01'));
console.log('- Weather information is displayed (Wind: 14.2 kts, Waves: 1.5 m, State 3):',
  htmlDubai.includes('14.2 kts') && htmlDubai.includes('1.5 m') && htmlDubai.includes('State 3'));
console.log('- Environmental points table displayed ("ENVIRONMENTAL POINTS", "WP-1", "WP-2"):',
  htmlDubai.includes('ENVIRONMENTAL POINTS') && (htmlDubai.includes('WP-1') || htmlDubai.includes('2026-10-01T12:00:00Z')));
console.log('- Rotterdam is nowhere shown:', !htmlDubai.includes('Rotterdam') && !htmlDubai.includes('PORT-RTM') && !htmlDubai.includes('NLRTM'));

console.log('\n=== PRESENTATION CHECK: 2. Singapore -> Rotterdam ===');
const singaporeRotterdamResponse = {
  status: 'success',
  source_port: 'PORT-SG',
  destination_port: 'PORT-RTM',
  source_locode: 'SGSIN',
  destination_locode: 'NLRTM',
  routes: [
    {
      id: 'LIVE-SGSIN-NLRTM-SUEZ',
      is_primary: true,
      distance_m: 15334560.0,
      distance_nm: 8280.0,
      duration_ms: 2129040000.0,
      duration_hours: 591.4,
      geometry: { type: 'LineString', coordinates: [] },
      environmental_points: [
        {
          latitude: 1.29,
          longitude: 103.85,
          timestamp: '2026-10-01T12:00:00Z',
          wind_speed_knots: 11.0,
          wind_direction_deg: 160.0,
          significant_wave_height_m: 1.2,
          wave_direction_deg: 170.0,
          wave_period_s: 5.5,
          ocean_current_velocity_knots: 0.7,
          ocean_current_direction_deg: 80.0,
          sea_state: 2,
          along_track_current_knots: 0.5,
          storm_flag: false,
          weather_risk_level: 'LOW',
          visibility_m: 10000.0,
        },
      ],
      metadata: { name: 'Singapore to Rotterdam via Suez Canal (Live)' },
      optimization: {
        score: 85.0,
        rank: 1,
      },
    },
    {
      id: 'LIVE-SGSIN-NLRTM-CAPE',
      is_primary: false,
      distance_m: 21705440.0,
      distance_nm: 11720.0,
      duration_ms: 3013560000.0,
      duration_hours: 837.1,
      geometry: { type: 'LineString', coordinates: [] },
      environmental_points: [],
      metadata: { name: 'Singapore to Rotterdam via Cape of Good Hope (Live)' },
      optimization: {
        score: 72.0,
        rank: 2,
      },
    },
  ],
  primary_route: {
    id: 'LIVE-SGSIN-NLRTM-SUEZ',
    is_primary: true,
    distance_m: 15334560.0,
    distance_nm: 8280.0,
    duration_ms: 2129040000.0,
    duration_hours: 591.4,
    geometry: { type: 'LineString', coordinates: [] },
    environmental_points: [],
    metadata: { name: 'Singapore to Rotterdam via Suez Canal (Live)' },
    optimization: {
      score: 85.0,
      rank: 1,
    },
  },
  marine_coverage_ratio: 0.96,
  weather_coverage_ratio: 0.94,
};

const htmlRotterdam = renderToString(
  React.createElement(Stage03Environment, {
    voyageConfig: {
      sourcePort: 'PORT-SG',
      destPort: 'PORT-RTM',
      cargoWeight: 60000,
      departureDate: '2026-10-01T12:00',
      deadlineDate: '2026-10-29T12:00',
    },
    selectedVesselIds: ['VES-001'],
    environmentResult: null,
    onEnvironmentProcessed: () => {},
    onValidContinue: () => {},
    onPrevious: () => {},
    skipAnimation: true,
    initialLiveResponse: singaporeRotterdamResponse,
    mode: 'live',
  })
);

console.log('- Header contains "Singapore → Rotterdam":', htmlRotterdam.includes('Singapore → Rotterdam'));
console.log('- Returned destination is Rotterdam / PORT-RTM:', htmlRotterdam.includes('PORT-RTM') && htmlRotterdam.includes('Rotterdam'));
console.log('- Suez route displayed (8,280 NM, 591.4 hrs, LIVE-SGSIN-NLRTM-SUEZ):',
  htmlRotterdam.includes('8,280 NM') && htmlRotterdam.includes('591.4 hrs') && htmlRotterdam.includes('LIVE-SGSIN-NLRTM-SUEZ'));
console.log('- Cape route displayed (11,720 NM, 837.1 hrs, LIVE-SGSIN-NLRTM-CAPE):',
  htmlRotterdam.includes('11,720 NM') && htmlRotterdam.includes('837.1 hrs') && htmlRotterdam.includes('LIVE-SGSIN-NLRTM-CAPE'));
console.log('- Dubai is nowhere shown in route cards:', !htmlRotterdam.includes('AEDXB') && !htmlRotterdam.includes('Jebel Ali'));
