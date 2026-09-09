# System Architecture — SIH26138

**Project Title**: Quantum-Inspired Fuel Consumption Prediction and Green Fleet Optimization  
**Phase**: Phase 0 — Project Foundation and Architecture  

---

## 1. Architectural Philosophy: Ports and Adapters (Hexagonal)

A core requirement of this project is that the prototype must transition from **simulated/demo fixtures** to **real production models** and **satellite APIs** without requiring a structural rewrite of the application.

```
       [ Client Layer ]
    (React / TypeScript UI)
               │
               ▼ HTTP / JSON
       [ API Layer (FastAPI) ]
               │
               ▼ Core DTOs (Pydantic v2)
   ┌────────────────────────────────────────┐
   │         Abstract Interface Ports       │
   │  • FuelConsumptionModelBase           │
   │  • RouteProviderBase                   │
   │  • WeatherProviderBase                 │
   │  • VoyageOptimizerBase                 │
   │  • ComparativeEvaluatorBase            │
   └────────────────────────────────────────┘
          │                           │
          ▼ Phase 0 Adapters          ▼ Future Phase Adapters
   ┌──────────────────────┐    ┌──────────────────────┐
   │  Demo Adapters       │    │  Production Adapters │
   │  • DemoFuelModel     │ ─► │  • RealFuelModel(ML) │
   │  • DemoRouteProvider │ ─► │  • RealRouteProvider │
   │  • DemoWeatherProv.  │ ─► │  • RealWeatherProv.  │
   │  • DemoQuantumOpt.   │ ─► │  • RealQUBOOptimizer │
   │  • Local JSON Seeds  │    │  • PostgreSQL/GIS    │
   └──────────────────────┘    └──────────────────────┘
```

---

## 2. Target Maritime Pipeline

The system processes fleet optimization requests through eight sequential stages:

1. **User Shipment Request**: Cargo weight, origin, destination port, deadline, and priority.
2. **Ship & Fuel Intelligence**: Vessel capacity, draft limits, propulsion specs, and bunker fuel alternatives (VLSFO, MGO, LNG, Biofuels).
3. **Maritime Network / Routes**: Navigational waypoints, canal regulations (Suez/Panama), and nautical distances.
4. **Weather & Ocean Feasibility**: Sea states, significant wave heights, wind vectors, and ocean currents.
5. **Classical Voyage Optimization**: Baseline multi-objective route and speed profiling.
6. **Quantum-Inspired Optimization**: QUBO formulation mapped to simulated annealing / quantum-inspired algorithms.
7. **Comparative Analysis**: Head-to-head metric evaluation (fuel saved, CO2 avoided, voyage cost delta, efficiency gain %).
8. **Final Recommendation**: Actionable voyage dispatch plan with speed schedule and bunker allocation.

---

## 3. Abstract Interfaces and Swapping Mechanism

### 3.1 Fuel Consumption Model
- **Interface**: `backend.app.services.interfaces.fuel_model.FuelConsumptionModelBase`
- **Method**:
  - `calculate_consumption_breakdown(vessel, fuel, distance_nm, speed_knots, cargo_weight_tonnes, sea_state) -> (rate_t_h, hours, total_fuel_t, breakdown)`
  - `calculate_consumption(vessel, fuel, distance_nm, speed_knots, cargo_weight, weather) -> float`
- **Phase 1 Implementation**: `DemoFuelModel`
  - Heuristic formulation:
    - $\text{Travel Time } T = \frac{\text{distance}}{\text{speed}}$
    - $\text{Base Hourly Rate} = P_{\text{engine}} \times 0.000185\text{ t/kWh}$
    - $f_{\text{speed}} = (v / 14.0)^3$ (Cubic power relationship)
    - $f_{\text{load}} = 0.65 + 0.35 \times (cargo / capacity)$ (Displacement modifier)
    - $f_{\text{weather}} = 1.0 + 0.035 \times \max(0, sea\_state - 2)$ (Hydrodynamic sea resistance)
    - $f_{\text{fuel}} = 41.2 / \text{energy\_density}$ (Specific energy normalization)
    - $\text{Rate (t/h)} = \text{Base Rate} \times f_{\text{speed}} \times f_{\text{load}} \times f_{\text{weather}} \times f_{\text{fuel}}$
    - $\text{Total Fuel (t)} = \text{Rate} \times T$
  - **Status**: Clearly labeled **SIMULATED DEMONSTRATION ESTIMATES**.
- **Future Replacement**: `RealFuelModel` using trained hydrodynamic polynomials, ISO 15016 speed-power trials, or neural network regression models calibrated on real telemetry.


### 3.2 Maritime Route Network
- **Interface**: `backend.app.services.interfaces.route_provider.RouteProviderBase`
- **Methods**:
  - `get_ports() -> list[Port]`
  - `get_port_by_id(port_id: str) -> Port | None`
  - `get_waypoints() -> list[Waypoint]`
  - `get_waypoint_by_id(waypoint_id: str) -> Waypoint | None`
  - `get_candidate_routes(origin_id, destination_id, vessel, cargo_weight) -> list[MaritimeRoute]`
  - `get_maritime_route_by_id(route_id: str) -> MaritimeRoute | None`
- **Phase 2 Implementation**: `DemoRouteProvider`
  - Granular topological graph: Port &rarr; Waypoint &rarr; RouteSegment &rarr; MaritimeRoute.
  - Segment-by-segment distance accounting: $\text{Total Distance} = \sum \text{Segment Distances}$ ($8,280$ NM Suez vs $11,720$ NM Cape).
  - Physical feasibility checks: validates vessel draft against segment limits (e.g. Suez Canal 16.0m draft limit) and port berth limits.
  - Cross-phase integration: candidate route distances feed directly into Phase 1's `FuelIntelligenceService`.
  - **Status**: Clearly labeled **SIMULATED MARITIME NETWORK — DEMONSTRATION DATA ONLY**.
- **Future Replacement**: `RealRouteProvider` calling live maritime GIS routing engines (SeaRoutes API / OpenSeaMap Dijkstra / A* graph with Bathymetric depth contours).


### 3.3 Oceanographic & Weather Conditions
- **Interface**: `backend.app.services.interfaces.weather_provider.WeatherProviderBase`
- **Methods**:
  - `get_route_weather(route_id, start_time) -> list[WeatherCondition]` (Phase 0 legacy compatibility)
  - `get_segment_condition(segment_id, scenario_id) -> SegmentEnvironmentalCondition | None`
  - `get_route_conditions(segment_ids, scenario_id) -> list[SegmentEnvironmentalCondition]`
  - `get_all_segment_conditions(scenario_id) -> list[SegmentEnvironmentalCondition]`
  - `get_all_scenarios() -> list[WeatherScenarioPreset]`
- **Phase 3 Implementation**: `DemoWeatherProvider` (seeded from `demo_segment_weather.json` and `demo_weather_scenarios.json`).
- **Future Replacement**: `RealWeatherProvider` integrating Copernicus Marine Service or NOAA GFS/WaveWatch III APIs.

### 3.4 Demo Environmental Fuel Factor

> **Demo Environmental Fuel Factor:** A deterministic simulated sensitivity multiplier representing the illustrative effect of environmental conditions on fuel-consumption estimates. It is not calibrated against real vessel operational data and is not a validated hydrodynamic resistance or fuel-consumption model.

1. **Why it exists**: In the prototype architecture, the environmental service must feed a weather impact factor into the fuel and routing pipeline without pretending that real ML or hydrodynamic resistance models have already been trained.
2. **What it represents**: A demonstration sensitivity heuristic illustrating how wave height ($H_s$), WMO sea state, and along-track ocean current might adjust fuel burn relative to calm-water baselines:
   $$f_{\text{environment}} = 1 + 0.035\max(0, S-2) + 0.040\max(0, H_s - 1.5) - 0.020\left(\frac{c_{\text{along}}}{v_{\text{water}}}\right)$$
   bounded in $[0.90, 2.00]$.
3. **What it does NOT represent**: It does **not** represent a validated hydrodynamic resistance model (e.g. ITTC-1978, ISO 15016, Holtrop-Mennen, or CFD). It is not an authoritative fuel predictor.
4. **Simulated parameters**: The coefficients ($0.035, 0.040, -0.020$) are **DEMO PARAMETERS — NOT CALIBRATED ON REAL VESSEL DATA**.
5. **Dual role of current**:
   - *Navigational effect*: $v_{\text{ground}} = v_{\text{water}} + c_{\text{along}}$ determines effective speed over ground and voyage transit time.
   - *Environmental fuel effect*: Represents an illustrative sensitivity multiplier, kept separate from complete physical resistance equations.
6. **Future calibration**: A production implementation will replace this heuristic with a machine-learning model (e.g. XGBoost, Physics-Informed Neural Network) calibrated against high-frequency noon reports, shaft torque measurements, and satellite hindcasts.

### 3.5 Voyage Optimizer
- **Interfaces**:
  - Legacy Phase 0 contract: `backend.app.optimization.interfaces.optimizer.VoyageOptimizerBase` (`solve(request, routes, vessels, fuels) -> VoyagePlan`)
  - Phase 4 Exact Enumeration Engine: `backend.app.optimization.classical.classical_voyage_optimizer.ClassicalVoyageOptimizer`
  - Voyage Evaluation Service: `backend.app.services.voyage_evaluation_service.VoyageEvaluationService`
- **Phase 4 Implementation**: `ClassicalVoyageOptimizer`
  - **Decision Space**: Discrete combinatorial space:
    $$\mathcal{D} = \mathcal{V} \times \mathcal{R} \times \mathcal{S} \times \mathcal{F}$$
    Where $\mathcal{S}$ is generated with configurable step resolution (default $0.5$ knots) within $[v_{\min}(v), v_{\max}(v)]$. The exhaustive candidate space grows multiplicatively with the number of vessels, routes, discrete speed choices and fuels. As additional decision dimensions such as bunkering, multi-leg routing, departure times, shore power and fleet-level allocation are introduced, the resulting combinatorial search space can become prohibitively large.
  - **Non-Double-Counting Environmental Integration**:
    Baseline fuel is calculated under calm-water conditions ($\text{sea\_state}=2$) using Phase 1 `DemoFuelModel`, then multiplied exactly once by Phase 3 `demo_environmental_fuel_factor`:
    $$\text{baseline\_fuel\_calm} = \text{calculate\_consumption\_breakdown}(v, f, d, s, m_{\text{cargo}}, \text{sea\_state}=2)$$
    $$\text{fuel\_consumption\_tonnes} = \text{baseline\_fuel\_calm} \times f_{\text{environment}}$$
    Segment sailing durations utilize effective speed over ground ($v_{\text{ground}} = v_{\text{water}} + c_{\text{along}}$) from Phase 3.
  - **Dual Optimization Modes**:
    1. **Cost-Efficient Mode**: Minimizes Total Voyage Cost $C_{\text{total}} = \text{fuel\_cost} + \text{route\_cost}$. Deterministic tie-breakers: fuel consumption $\to$ GHG emissions $\to$ duration $\to$ decision ID.
    2. **Time-Efficient Mode**: Minimizes Total Voyage Duration $T_{\text{total}} = \text{sailing\_time} + \text{port\_wait}$. Deterministic tie-breakers: total cost $\to$ fuel consumption $\to$ GHG emissions $\to$ decision ID.
  - **Constraints Evaluated**:
    - Vessel deadweight capacity ($m_{\text{cargo}} \le \text{capacity}$)
    - Speed bounds ($v_{\min} \le s \le v_{\max}$)
    - Fuel compatibility ($f \in \text{compatible\_fuels}$)
    - Draft limits ($T_{\text{draft}} \le \text{draft\_limit}$ across origin port, destination port, and all route segments)
    - Navigational safety / weather feasibility ($H_s \le 6.0$m, sea state $\le 7$, visibility $\ge 1.0$ NM, no storm flag, positive ground speed)
    - Schedule deadline ($\text{departure} + T_{\text{total}} \le \text{deadline}$)
  - **Benchmark Analytics**: Total evaluated combinations, feasible candidates, structured rejection tallies, execution runtime ms.
- **Future Phase 5 Replacement**: `QuantumVoyageOptimizer` mapping this discrete decision space $\mathcal{D}$ to a QUBO formulation solved via Simulated Annealing / Quantum Annealing and compared directly against this exact classical baseline.

---

## 4. Preliminary Data Schemas

All schemas are strictly validated using **Pydantic v2** on the backend and mapped to equivalent **TypeScript interfaces** on the frontend:

- `Shipment`: Origin, destination, cargo payload, UTC deadline, and optional priority.
- `Vessel`: IMO/ID, vessel name, type, DWT capacity, max/min speed, compatible fuel types, and draft.
- `Fuel`: Identifier, name, price per metric ton (USD), CO2 emission factor, and energy density.
- `Route`: Unique ID, route name, source, destination, nautical distance, and sequence of checkpoints.
- `WeatherCondition`: Forecast timestamp, wind speed, wave height, current speed, WMO sea state, and risk rating.
- `OptimizationRequest`: Shipment reference, origin/destination, cargo weight, deadline, and objective weightings.
- `VoyagePlan`: Assigned vessel, route, fuel, speed profile, transit hours, fuel consumed, cost, and CO2 emissions.
- `ComparativeAnalysis`: Head-to-head comparison between classical and quantum-inspired plans with delta metrics.
