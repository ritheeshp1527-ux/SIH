import {
  HealthStatus,
  PipelineMeta,
  Vessel,
  Fuel,
  ScenarioPreset,
  FuelEstimationRequest,
  FuelEstimationResult,
  Port,
  Waypoint,
  MaritimeRoute,
  CandidateRouteRequest,
  CandidateRouteResponse,
  SegmentEnvironmentalCondition,
  WeatherScenarioPreset,
  RouteEnvironmentalAssessmentRequest,
  RouteEnvironmentalAssessmentResponse,
  VoyageOptimizationRequest,
  ClassicalOptimizationResponse,
  QuantumInspiredOptimizationRequest,
  QuantumInspiredOptimizationResponse,
  OptimizationComparisonRequest,
  OptimizationComparisonResponse,
  ComparativeAnalysisRequest,
  ComparativeAnalysisResponse,
  WorkflowOptimizationRequest,
  WorkflowOptimizationResponse,
} from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API health check failed with status: ${response.status}`);
  }
  return response.json();
}

export async function fetchPipelineMeta(): Promise<PipelineMeta> {
  const response = await fetch(`${API_BASE}/meta/pipeline`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load pipeline meta: ${response.status}`);
  }
  return response.json();
}

// Fuel Intelligence Endpoints
export async function fetchVessels(): Promise<Vessel[]> {
  const response = await fetch(`${API_BASE}/fuel/vessels`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch fleet vessels: ${response.status}`);
  }
  return response.json();
}

export async function fetchFuels(port?: string, allowFallback?: boolean): Promise<Fuel[]> {
  const params = new URLSearchParams();
  if (port) params.append('port', port);
  if (allowFallback !== undefined) params.append('allow_fallback', String(allowFallback));
  const qs = params.toString();
  const url = qs ? `${API_BASE}/fuel/fuels?${qs}` : `${API_BASE}/fuel/fuels`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch bunker fuels: ${response.status}`);
  }
  return response.json();
}

export async function fetchScenarios(): Promise<ScenarioPreset[]> {
  const response = await fetch(`${API_BASE}/fuel/scenarios`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch demo scenarios: ${response.status}`);
  }
  return response.json();
}

export async function estimateFuel(request: FuelEstimationRequest): Promise<FuelEstimationResult> {
  const response = await fetch(`${API_BASE}/fuel/estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Fuel estimation failed with status ${response.status}`);
  }
  return response.json();
}

// Maritime Network & Route Endpoints
export async function fetchPorts(): Promise<Port[]> {
  const response = await fetch(`${API_BASE}/routes/ports`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch maritime ports: ${response.status}`);
  }
  return response.json();
}

export async function fetchWaypoints(): Promise<Waypoint[]> {
  const response = await fetch(`${API_BASE}/routes/waypoints`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch navigational waypoints: ${response.status}`);
  }
  return response.json();
}

export async function fetchRoutes(): Promise<MaritimeRoute[]> {
  const response = await fetch(`${API_BASE}/routes`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch routes: ${response.status}`);
  }
  return response.json();
}

export async function fetchCandidateRoutes(request: CandidateRouteRequest): Promise<CandidateRouteResponse> {
  const response = await fetch(`${API_BASE}/routes/candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Candidate route generation failed with status ${response.status}`);
  }
  return response.json();
}

// Phase 3: Weather & Ocean Dynamic Impact Endpoints
export async function fetchSegmentWeather(scenarioId?: string): Promise<SegmentEnvironmentalCondition[]> {
  const url = scenarioId 
    ? `${API_BASE}/weather/segments?scenario_id=${encodeURIComponent(scenarioId)}`
    : `${API_BASE}/weather/segments`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch segment environmental data: ${response.status}`);
  }
  return response.json();
}

export async function fetchWeatherScenarios(): Promise<WeatherScenarioPreset[]> {
  const response = await fetch(`${API_BASE}/weather/scenarios`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch presentation weather scenarios: ${response.status}`);
  }
  return response.json();
}

export async function assessRouteEnvironmentalImpact(
  request: RouteEnvironmentalAssessmentRequest
): Promise<RouteEnvironmentalAssessmentResponse> {
  const response = await fetch(`${API_BASE}/weather/assess-route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Environmental route assessment failed with status ${response.status}`);
  }
  return response.json();
}

// Phase 4: Classical Voyage Optimization Endpoints
export async function runClassicalOptimization(
  request: VoyageOptimizationRequest
): Promise<ClassicalOptimizationResponse> {
  const response = await fetch(`${API_BASE}/optimization/classical`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Classical voyage optimization failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchSampleOptimizationRequest(): Promise<VoyageOptimizationRequest> {
  const response = await fetch(`${API_BASE}/optimization/sample-request`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sample optimization request: ${response.status}`);
  }
  return response.json();
}

// Phase 5: Quantum-Inspired Optimization Endpoints
export async function runQuantumInspiredOptimization(
  request: QuantumInspiredOptimizationRequest
): Promise<QuantumInspiredOptimizationResponse> {
  const response = await fetch(`${API_BASE}/optimization/quantum-inspired`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Quantum-inspired optimization failed with status ${response.status}`);
  }
  return response.json();
}

export async function runOptimizationComparison(
  request: OptimizationComparisonRequest
): Promise<OptimizationComparisonResponse> {
  const response = await fetch(`${API_BASE}/optimization/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Optimization comparison failed with status ${response.status}`);
  }
  return response.json();
}

export async function runComparativeAnalysis(
  request: ComparativeAnalysisRequest
): Promise<ComparativeAnalysisResponse> {
  const response = await fetch(`${API_BASE}/optimization/comparative-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Comparative analysis failed with status ${response.status}`);
  }
  return response.json();
}

// End-to-End Orchestrated Workflow Endpoints
export async function runEndToEndWorkflow(
  request: WorkflowOptimizationRequest
): Promise<WorkflowOptimizationResponse> {
  const response = await fetch(`${API_BASE}/workflow/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `End-to-end workflow failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchSampleWorkflowRequest(): Promise<WorkflowOptimizationRequest> {
  const response = await fetch(`${API_BASE}/workflow/sample-request`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sample workflow request: ${response.status}`);
  }
  return response.json();
}
