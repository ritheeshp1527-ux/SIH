# Development Phases Roadmap — SIH26138

This roadmap outlines the phased development sequence for the presentation-ready prototype.

---

## Phase 0: Project Foundation & Architecture (Current Phase)
- [x] Project structure and directory modularization
- [x] Backend entry point (FastAPI, CORS, Lifespan, Swagger docs)
- [x] Frontend entry point (React + TypeScript + Vite + custom maritime theme)
- [x] Abstract interface boundaries (Ports & Adapters)
- [x] Preliminary schemas (Shipment, Vessel, Fuel, Route, Weather, Optimization)
- [x] Demo data seeds isolated in `data/demo/`
- [x] Backend test suite with Pytest (14 passing tests, 0 warnings)
- [x] Frontend production bundle validation (`tsc && vite build`)
- [x] Git-friendly `.gitignore` and `.env.example`

---

## Phase 1: Ship & Fuel Intelligence (Completed)
- [x] Refined Vessel schema with explicit units (`capacity_tonnes`, `min_speed_knots`, `max_speed_knots`, `engine_power_kw`, `design_draft_m`)
- [x] Refined Fuel schema with explicit units (`price_per_tonne`, `emission_factor_kg_co2_per_tonne`, `energy_density_mj_per_kg`, `lifecycle_ghg_factor_kg_co2e_per_tonne`)
- [x] FuelEstimationRequest, FuelConsumptionBreakdown, and FuelEstimationResult Pydantic models
- [x] Clear separation between Fuel Consumption Rate (tonnes/hour) and Total Voyage Fuel (tonnes)
- [x] Deterministic DemoFuelModel implementing naval architecture speed-cube, load-displacement, and sea-state resistance
- [x] FuelIntelligenceService enforcing interface decoupling and input validations
- [x] Endpoints: `POST /api/v1/fuel/estimate`, `GET /api/v1/fuel/vessels`, `GET /api/v1/fuel/fuels`, `GET /api/v1/fuel/scenarios`
- [x] 5 Deterministic demonstration scenarios (A: Cost-optimal discrete speed, B: High speed, C: Full cargo, D: Rough seas, E: LNG transition)
- [x] 16 comprehensive unit tests verifying calculation, boundaries, and qualitative sensitivities (all 30 backend tests passing)
- [x] Interactive Stage 1 Ship & Fuel Intelligence Playground UI with real-time recalculations and transparency banners

---

## Phase 2: Maritime Network & Route Modeling (Completed)
- [x] Pydantic models for `Port`, `Waypoint`, `RouteSegment`, `MaritimeRoute`, `CandidateRouteRequest`, `CandidateRouteResponse`
- [x] Local deterministic demo network containing major nodes: Singapore, Rotterdam, Malacca Strait, Indian Ocean, Arabian Sea, Gulf of Aden, Red Sea, Suez Canal, Mediterranean Sea, Gibraltar, Atlantic Ocean, Cape of Good Hope
- [x] Two candidate routes: Route A (Suez, 8,280 NM, 10 segments) and Route B (Cape, 11,720 NM, 6 segments)
- [x] Segment-by-segment distance accounting ($\text{Total Distance} = \sum \text{Segment Distances}$)
- [x] Physical feasibility engine evaluating vessel draft vs segment limits (e.g. Suez 16.0m limit) and berth capacity
- [x] RouteProviderBase abstract port and DemoRouteProvider adapter
- [x] Endpoints: `GET /api/v1/routes/ports`, `GET /api/v1/routes/waypoints`, `GET /api/v1/routes`, `GET /api/v1/routes/{route_id}`, `POST /api/v1/routes/candidates`
- [x] Seamless integration with Phase 1 Fuel Intelligence (route distance feeds directly into fuel estimator)
- [x] Interactive Stage 2 Maritime Route Explorer UI with schematic bifurcated network visualization and route-to-fuel handoff
- [x] 20 unit tests in Pytest covering network loading, draft restrictions, distance consistency, and determinism (all 50 tests passing)

---

## Phase 3: Weather & Ocean Dynamic Impact Modeling (Completed)
- [x] Pydantic schemas for `SegmentEnvironmentalCondition`, `SegmentEnvironmentalAssessment`, `RouteEnvironmentalAssessmentRequest`, `RouteEnvironmentalAssessmentResponse`, `WeatherScenarioPreset`
- [x] Segment-level simulated environmental data across all 13 route segments (`demo_segment_weather.json`)
- [x] 5 Deterministic presentation weather scenarios (`demo_weather_scenarios.json`: A: Favorable Currents, B: Adverse Currents, C: Rough Sea State, D: Cyclone Infeasibility Breach, E: Suez vs Cape Differential)
- [x] Distinguishes Vessel Speed Through Water (STW) from Navigational Speed Over Ground ($v_{\text{ground}} = v_{\text{water}} + c_{\text{along}}$)
- [x] Demo environmental fuel factor heuristic ($f_{\text{environment}}$ clamped to $[0.90, 2.00]$, explicitly not calibrated on real operational data)
- [x] Navigational safety feasibility rules ($H_s > 6.0$m, sea state $> 7$, visibility $< 1.0$ NM, active storm flags, non-positive effective speed)
- [x] `WeatherProviderBase` port and `DemoWeatherProvider` adapter with scenario overrides
- [x] `RouteEnvironmentalAssessmentService` implementing dynamic segment assessment and route-level aggregation
- [x] Endpoints: `GET /api/v1/weather/segments`, `GET /api/v1/weather/segments/{segment_id}`, `POST /api/v1/weather/assess-route`, `GET /api/v1/weather/scenarios`
- [x] Interactive Stage 3 Weather & Ocean Dynamic Impact Explorer UI with scenario selector, summary cards, segment table, and demo environmental factor handoff
- [x] 20 unit and integration tests in Pytest (all 70 tests passing)


---

## Phase 4: Classical Voyage Optimization Baseline (Completed)
- [x] Discrete combinatorial decision formulation: $\text{Vessel} \times \text{Route} \times \text{Speed} \times \text{Fuel}$
- [x] Configurable discrete speed grid (default $0.5$ knot resolution) within $[v_{\min}, v_{\max}]$
- [x] Hard constraint evaluations: vessel deadweight capacity, speed bounds, fuel compatibility, port/segment draft limits, weather & navigational safety, deadline margin
- [x] Non-double-counting environmental integration: baseline fuel under calm sea state evaluated once, multiplied by Phase 3 `demo_environmental_fuel_factor`
- [x] Dual optimization modes:
  - **Cost-Efficient Mode**: Minimizes total voyage cost ($\text{fuel\_cost} + \text{route\_cost}$) subject to all operational/weather constraints
  - **Time-Efficient Mode**: Minimizes total voyage duration ($\text{sailing\_time} + \text{port\_wait}$) subject to all operational/weather constraints
- [x] Transparent multi-tier deterministic tie-breaking (no non-deterministic randomness)
- [x] Per-vessel best rankings and global best recommendations for both modes
- [x] Informational lowest fuel consumption and lowest emissions candidates
- [x] Comprehensive benchmark analytics: total evaluated combinations, feasible count, structured rejection breakdown, execution runtime (ms)
- [x] Stable `decision_id` format (`{vessel_id}::{route_id}::{speed_knots}::{fuel_id}`) for Phase 5 QUBO verification
- [x] Endpoints: `POST /api/v1/optimization/classical`, `GET /api/v1/optimization/sample-request`
- [x] Stage 4 Classical Voyage Optimizer UI with Configuration Panel, dual-mode views, benchmark cards, and decision space handoff
- [x] 26 Pytest unit and integration tests (all 96 backend tests passing)

Phase 4 is audited and locked.

---

## Phase 5: Quantum-Inspired Voyage Optimizer (Completed & Audited)
- [x] Discrete Decision-to-QUBO binary variable mapping
- [x] One-hot constraint formulation with penalty coefficient calibration ($P > \Delta_{\max}$)
- [x] Min-max objective normalization mapping raw costs and times to $[0, 1]$
- [x] Simulated Annealing metaheuristic solver with geometric cooling schedule
- [x] Exact energy evaluation and $O(1)$ fast flip-delta evaluation
- [x] Revalidation engine guaranteeing zero infeasible solution acceptance
- [x] Benchmark service computing transparent relative objective gaps
- [x] Zero false claims: strictly neutral scientific terminology (no "quantum supremacy" or "quantum speedup")
- [x] Endpoints: `POST /api/v1/optimization/quantum-inspired`, `POST /api/v1/optimization/compare`
- [x] Complete test coverage across QUBO formulation, solver, benchmark, and audit tests

Phase 5 has been audited and locked.

---

## Phase 6: Comparative Decision Analysis & Analytics Dashboard

### Part 1: Backend Comparative Decision Analysis (Completed)
- [x] Multi-objective decision model (`CandidateComparisonRecord`, `MethodComparisonRecord`, `TradeoffMetrics`, `Recommendation`)
- [x] Classical Exact vs Quantum-Inspired Simulated Annealing pairwise delta calculations (cost, time, fuel, operational CO2, lifecycle GHG, deadline margin, runtime, objective gap)
- [x] Strict Pareto dominance analysis across 5 minimization objectives ($A \le B \land \exists k, A < B$)
- [x] Deterministic priority analysis for Cost, Time, Fuel, Operational CO2, and Lifecycle GHG
- [x] Transparent Balanced Recommendation via normalized Euclidean distance to ideal point: $D(c) = \sqrt{\sum \tilde{f}_k^2}$
- [x] Concrete metric-driven explanations using actual numerical values (not generic templates)
- [x] Schedule buffer analysis (Safe, Tight, Infeasible) and separate operational CO2 vs lifecycle GHG tracking
- [x] Endpoint: `POST /api/v1/optimization/comparative-analysis`
- [x] 39 Pytest unit and integration tests passing

### Part 2: Frontend Analytics & Presentation Dashboard (Completed)
- [x] Interactive comparative decision analysis UI component (`src/components/ComparativeDecisionAnalysis.tsx`)
- [x] Request summary header and side-by-side Classical vs Quantum-Inspired benchmarking card
- [x] 5-Objective Pareto frontier interactive scatter plot (Voyage Cost vs Duration with point selection)
- [x] Multi-priority recommendation cards (Cost, Time, Fuel, CO2, Lifecycle GHG, Balanced) with exact metric citations
- [x] Transparent trade-off deltas with neutral scientific indicators and zero quantum supremacy claims
- [x] Dedicated navigation tab and sample scenario autoloader
- [x] 8 Node/TS unit tests passing (`comparativeDecisionAnalysis.test.mjs`)

---

## Phase 7: End-to-End Workflow Orchestration

### Part 1: End-to-End Backend Orchestration (Completed)
- [x] Unified sequential pipeline: Phase 1 (Fuel) -> Phase 2 (Routes) -> Phase 3 (Weather) -> Phase 4 (Classical) -> Phase 5 (Quantum-Inspired) -> Phase 6 (Comparative Analysis)
- [x] `EndToEndWorkflowService` coordinating existing locked services without duplicating optimization logic
- [x] Deterministic workflow identifiers (`WF-{SHA256}`) and seeded reproducibility across all stages
- [x] Strict stage tracking (`stage_completion_status`) and anti-fabrication early exit upon infeasibility
- [x] Endpoints: `POST /api/v1/workflow/optimize`, `GET /api/v1/workflow/sample-request`
- [x] 10 Pytest orchestration integration and boundary tests (all 200 backend tests passing)
- [x] Complete documentation in `docs/end_to_end_workflow.md`

### Part 2: End-to-End Frontend Pipeline Integration (Completed)
- [x] End-to-end voyage optimization workflow component (`src/components/EndToEndWorkflowOptimizer.tsx`)
- [x] Reusable shipment parameters form and single primary action: "Run End-to-End Optimization"
- [x] Direct single API integration: `POST /api/v1/workflow/optimize`
- [x] Six-stage visual progress tracker (Fuel -> Routes -> Weather -> Classical -> QUBO -> Comparative)
- [x] Intermediate stage inspection cards with explicit "Phase 1 Representative Fuel Estimate" vs "Optimized Voyage Consumption" distinction
- [x] Full final decision dashboard reuse embedding `ComparativeDecisionAnalysis` (Pareto scatter plot, priority recommendations, schedule and environmental analysis)
- [x] Anti-fabrication error handling with failed stage detection, server detail reporting, and retry controls
- [x] "Reset / Run Again" and "Load Sample Voyage" controls
- [x] 10 automated frontend tests passing (`endToEndWorkflow.test.mjs`, all 18 frontend tests passing)
- [x] Production bundle verified (`tsc && vite build`) and 0 backend regressions (all 200 backend tests passing)

---

## Phase 8: Demonstration & Product Polish

### Part 1: UI/UX & Presentation Dashboard Polish (Completed)
- [x] Modernized Header with "GreenFleet Quantum" identity, subtitle "Quantum-Inspired Maritime Fuel & Fleet Optimization", and live backend health indicator
- [x] Prominent top-level workflow placement directly following the hero section with smooth quick-jump `.nav-pill` navigation
- [x] Visual conceptual pipeline diagram illustrating: Voyage Request ➔ 6 Optimization Stages ➔ Comparative Decision Support
- [x] Logical grouping of voyage controls (Corridor & Cargo, Schedule & Transit Window, Decision Priorities, and Collapsible Solver Drawer)
- [x] Truthful progress states replacing synthetic delays with authentic `Pending`, `Evaluating...`, `Completed`, or `Failed` indicators
- [x] Primary Operational Recommendation Spotlight card at the head of Comparative Decision Analysis featuring high-impact metric badges
- [x] Enhanced SVG Pareto scatter plot featuring connected dashed trade-off frontier curve, dual-axis numeric ticks, and clear chart legend
- [x] Clear visual distinction and heuristic caveat for the Balanced Recommendation multi-objective Euclidean compromise ($D(c)$)
- [x] Subordinate layout for scientific caveats and methodology notes without cluttering primary decision telemetry
- [x] Preserved mandatory disclaimer distinguishing Phase 1 representative fuel estimate from optimized voyage consumption
- [x] Zero regressions across all 200 backend unit/integration tests and all 18 frontend unit tests

### Part 2: SIH Demonstration Scenario & Decision Story (Completed)
- [x] Deterministic SIH demo scenario integrated around verified Singapore &rarr; Rotterdam (60,000 MT) voyage corridor
- [x] Presentation-friendly demo controls: "Load SIH Demo Scenario", "Run End-to-End Optimization", and "Reset / Run Again"
- [x] Reused existing sample workflow endpoint (`GET /api/v1/workflow/sample-request`) and end-to-end execution endpoint (`POST /api/v1/workflow/optimize`)
- [x] Dedicated 5-step narrative component (`SihDecisionStory.tsx`) providing an executive walk-through:
  - Step 1 — Voyage: Singapore &rarr; Rotterdam, cargo, deadline, priority
  - Step 2 — Route Options: Suez vs Cape distance, draft constraints, sea-state weather risk
  - Step 3 — Optimization: Classical Exact vs Quantum-Inspired Simulated Annealing under strict scientific neutrality
  - Step 4 — Trade-offs: Pairwise deltas across Cost, Time, Fuel, Operational CO₂, Lifecycle GHG, and Deadline Margin
  - Step 5 — Final Decision: Recommended vessel, route, speed, fuel, cost, duration, and deterministic backend justification
- [x] Explicit visual distinction between "Phase 1 Representative Baseline" and "Optimized Voyage Decision" with zero fabricated savings
- [x] Strict scientific neutrality: zero unsupported quantum-superiority or quantum-speedup wording
- [x] 10 new focused automated tests passing (`sihDemoScenario.test.mjs`, all 28 frontend tests passing)
- [x] Frontend production bundle verified (`tsc && vite build` clean in 1.04s)
- [x] Backend verified with zero regressions (all 200 backend pytest tests passing)





