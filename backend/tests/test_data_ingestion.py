import pytest
from datetime import datetime, timedelta, timezone
from backend.app.data.ingestion.fuel_ingestion import FuelEmissionIngestionService
from backend.app.data.ingestion.route_ingestion import MaritimeNetworkIngestionService
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.demo.demo_fuel_model import DemoFuelModel
from backend.app.services.voyage_evaluation_service import VoyageEvaluationService
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel


def test_fuel_emission_ingestion_values_and_transformations():
    """
    Validates stage6_emission_factors.csv parsing, unit conversions, and companion pricing.
    """
    svc = FuelEmissionIngestionService()
    fuels = svc.load_fuels()

    # 1. Check all 5 fuels are parsed
    assert len(fuels) == 5
    assert set(fuels.keys()) == {"HFO", "MDO", "LNG", "METHANOL", "AMMONIA"}

    # 2. Verify HFO exact conversions
    hfo = fuels["HFO"]
    assert hfo.id == "HFO"
    assert hfo.price_per_tonne == 648.0  # From stage7_bunker_prices.csv for SGSIN
    assert hfo.port_id == "SGSIN"
    assert hfo.price_date == "2026-09-08"
    assert hfo.is_observed_market_price is True
    assert hfo.price_source == "stage7_bunker_prices.csv"
    assert hfo.energy_density_mj_per_kg == 40.5  # 0.0405 * 1000
    assert hfo.emission_factor_kg_co2_per_tonne == 3114.0  # 3.114 * 1000
    assert hfo.lifecycle_ghg_factor_kg_co2e_per_tonne == pytest.approx(3691.98, rel=1e-3)  # 91.16 * 40.5

    # 3. Verify MDO exact conversions
    mdo = fuels["MDO"]
    assert mdo.id == "MDO"
    assert mdo.price_per_tonne == 1371.0  # From stage7_bunker_prices.csv for SGSIN
    assert mdo.port_id == "SGSIN"
    assert mdo.price_date == "2026-09-08"
    assert mdo.is_observed_market_price is True
    assert mdo.price_source == "stage7_bunker_prices.csv"
    assert mdo.energy_density_mj_per_kg == 42.7  # 0.0427 * 1000
    assert mdo.emission_factor_kg_co2_per_tonne == 3206.0  # 3.206 * 1000
    assert mdo.lifecycle_ghg_factor_kg_co2e_per_tonne == pytest.approx(3864.35, rel=1e-3)  # 90.5 * 42.7

    # 4. Verify LNG exact conversions
    lng = fuels["LNG"]
    assert lng.id == "LNG"
    assert lng.price_per_tonne == 821.95  # From stage7_bunker_prices.csv for SGSIN
    assert lng.port_id == "SGSIN"
    assert lng.price_date == "2026-09-08"
    assert lng.is_observed_market_price is True
    assert lng.price_source == "stage7_bunker_prices.csv"
    assert lng.energy_density_mj_per_kg == 49.1  # 0.0491 * 1000
    assert lng.emission_factor_kg_co2_per_tonne == 2750.0  # 2.75 * 1000
    assert lng.lifecycle_ghg_factor_kg_co2e_per_tonne == pytest.approx(3854.35, rel=1e-3)  # 78.5 * 49.1

    # 5. Verify Green Methanol exact conversions (Fallback reference price marked)
    methanol = fuels["METHANOL"]
    assert methanol.id == "METHANOL"
    assert methanol.price_per_tonne == 950.0
    assert methanol.is_observed_market_price is False
    assert methanol.price_source == "fallback_reference"
    assert methanol.energy_density_mj_per_kg == 19.9  # 0.0199 * 1000
    assert methanol.emission_factor_kg_co2_per_tonne == 1375.0  # 1.375 * 1000
    assert methanol.lifecycle_ghg_factor_kg_co2e_per_tonne == pytest.approx(298.50, rel=1e-3)  # 15.0 * 19.9

    # 6. Verify Green Ammonia exact conversions (Zero combustion tailpipe CO2, Fallback marked)
    ammonia = fuels["AMMONIA"]
    assert ammonia.id == "AMMONIA"
    assert ammonia.price_per_tonne == 1100.0
    assert ammonia.is_observed_market_price is False
    assert ammonia.price_source == "fallback_reference"
    assert ammonia.energy_density_mj_per_kg == 18.6  # 0.0186 * 1000
    assert ammonia.emission_factor_kg_co2_per_tonne == 0.0  # Zero direct CO2
    assert ammonia.lifecycle_ghg_factor_kg_co2e_per_tonne == pytest.approx(167.40, rel=1e-3)  # 9.0 * 18.6


def test_stage7_bunker_prices_all_seven_records():
    """
    Validates that all 7 records from stage7_bunker_prices.csv are ingested, normalized,
    and joined correctly with port, fuel type, price, currency, unit, and date.
    """
    svc = FuelEmissionIngestionService()
    port_prices = svc.load_port_bunker_prices("stage7_bunker_prices.csv")

    # Verify total count is exactly 7
    assert len(port_prices) == 7

    # 1. SGSIN HFO
    sg_hfo = port_prices[("SGSIN", "HFO")]
    assert sg_hfo.port == "SGSIN"
    assert sg_hfo.fuel_id == "HFO"
    assert sg_hfo.price_per_tonne == 648.0
    assert sg_hfo.currency == "USD"
    assert sg_hfo.unit == "MT"
    assert sg_hfo.date == "2026-09-08"
    assert sg_hfo.is_observed_market_price is True
    assert sg_hfo.price_source == "stage7_bunker_prices.csv"

    # 2. SGSIN MDO
    sg_mdo = port_prices[("SGSIN", "MDO")]
    assert sg_mdo.port == "SGSIN"
    assert sg_mdo.fuel_id == "MDO"
    assert sg_mdo.price_per_tonne == 1371.0
    assert sg_mdo.currency == "USD"
    assert sg_mdo.unit == "MT"
    assert sg_mdo.date == "2026-09-08"
    assert sg_mdo.is_observed_market_price is True

    # 3. SGSIN LNG
    sg_lng = port_prices[("SGSIN", "LNG")]
    assert sg_lng.port == "SGSIN"
    assert sg_lng.fuel_id == "LNG"
    assert sg_lng.price_per_tonne == 821.95
    assert sg_lng.currency == "USD"
    assert sg_lng.unit == "MT"
    assert sg_lng.date == "2026-09-08"
    assert sg_lng.is_observed_market_price is True

    # 4. INBOM HFO
    in_hfo = port_prices[("INBOM", "HFO")]
    assert in_hfo.port == "INBOM"
    assert in_hfo.fuel_id == "HFO"
    assert in_hfo.price_per_tonne == 660.0
    assert in_hfo.currency == "USD"
    assert in_hfo.unit == "MT"
    assert in_hfo.date == "2026-09-08"
    assert in_hfo.is_observed_market_price is True

    # 5. INBOM LNG
    in_lng = port_prices[("INBOM", "LNG")]
    assert in_lng.port == "INBOM"
    assert in_lng.fuel_id == "LNG"
    assert in_lng.price_per_tonne == 845.0
    assert in_lng.currency == "USD"
    assert in_lng.unit == "MT"
    assert in_lng.date == "2026-09-08"
    assert in_lng.is_observed_market_price is True

    # 6. NLRTM HFO
    nl_hfo = port_prices[("NLRTM", "HFO")]
    assert nl_hfo.port == "NLRTM"
    assert nl_hfo.fuel_id == "HFO"
    assert nl_hfo.price_per_tonne == 590.0
    assert nl_hfo.currency == "USD"
    assert nl_hfo.unit == "MT"
    assert nl_hfo.date == "2026-09-08"
    assert nl_hfo.is_observed_market_price is True

    # 7. NLRTM LNG
    nl_lng = port_prices[("NLRTM", "LNG")]
    assert nl_lng.port == "NLRTM"
    assert nl_lng.fuel_id == "LNG"
    assert nl_lng.price_per_tonne == 790.0
    assert nl_lng.currency == "USD"
    assert nl_lng.unit == "MT"
    assert nl_lng.date == "2026-09-08"
    assert nl_lng.is_observed_market_price is True


def test_stage7_bunker_prices_missing_combinations_no_fabrication():
    """
    Validates that missing port-fuel combinations are NOT fabricated as observed prices.
    When allow_fallback=False, queries return None.
    When allow_fallback=True, records are explicitly tagged as fallback_reference.
    """
    svc = FuelEmissionIngestionService()

    # 1. Missing fuel at an existing port: INBOM has no MDO in stage7_bunker_prices.csv
    inbom_mdo_strict = svc.get_bunker_price("INBOM", "MDO", allow_fallback=False)
    assert inbom_mdo_strict is None  # Zero fabrication

    inbom_mdo_fallback = svc.get_bunker_price("INBOM", "MDO", allow_fallback=True)
    assert inbom_mdo_fallback is not None
    assert inbom_mdo_fallback.is_observed_market_price is False
    assert inbom_mdo_fallback.price_source == "fallback_reference"
    assert inbom_mdo_fallback.date is None

    # 2. Missing fuel at NLRTM: NLRTM has no MDO
    nlrtm_mdo_strict = svc.get_bunker_price("NLRTM", "MDO", allow_fallback=False)
    assert nlrtm_mdo_strict is None

    # 3. Missing e-fuels at SGSIN: SGSIN has no Methanol or Ammonia in stage7_bunker_prices.csv
    sgsin_meth_strict = svc.get_bunker_price("SGSIN", "METHANOL", allow_fallback=False)
    assert sgsin_meth_strict is None
    sgsin_amm_strict = svc.get_bunker_price("SGSIN", "AMMONIA", allow_fallback=False)
    assert sgsin_amm_strict is None

    # 4. Completely unlisted port: AEDXB has no records in stage7_bunker_prices.csv
    aedxb_hfo_strict = svc.get_bunker_price("AEDXB", "HFO", allow_fallback=False)
    assert aedxb_hfo_strict is None

    aedxb_hfo_fallback = svc.get_bunker_price("AEDXB", "HFO", allow_fallback=True)
    assert aedxb_hfo_fallback is not None
    assert aedxb_hfo_fallback.is_observed_market_price is False
    assert aedxb_hfo_fallback.price_source == "fallback_reference"

    # 5. Strict fuel loading for INBOM: should strictly return only HFO and LNG (2 fuels)
    inbom_fuels_strict = svc.load_fuels(port="INBOM", allow_fallback=False)
    assert len(inbom_fuels_strict) == 2
    assert set(inbom_fuels_strict.keys()) == {"HFO", "LNG"}
    assert inbom_fuels_strict["HFO"].price_per_tonne == 660.0
    assert inbom_fuels_strict["LNG"].price_per_tonne == 845.0
    assert inbom_fuels_strict["HFO"].is_observed_market_price is True
    assert inbom_fuels_strict["LNG"].is_observed_market_price is True
    assert "MDO" not in inbom_fuels_strict
    assert "METHANOL" not in inbom_fuels_strict
    assert "AMMONIA" not in inbom_fuels_strict

    # 6. Fallback fuel loading for INBOM: returns all 5 fuels, with missing ones marked as fallback
    inbom_fuels_fallback = svc.load_fuels(port="INBOM", allow_fallback=True)
    assert len(inbom_fuels_fallback) == 5
    assert inbom_fuels_fallback["HFO"].is_observed_market_price is True
    assert inbom_fuels_fallback["LNG"].is_observed_market_price is True
    assert inbom_fuels_fallback["MDO"].is_observed_market_price is False
    assert inbom_fuels_fallback["MDO"].price_source == "fallback_reference"
    assert inbom_fuels_fallback["METHANOL"].is_observed_market_price is False
    assert inbom_fuels_fallback["METHANOL"].price_source == "fallback_reference"
    assert inbom_fuels_fallback["AMMONIA"].is_observed_market_price is False
    assert inbom_fuels_fallback["AMMONIA"].price_source == "fallback_reference"


def test_fleet_reference_ingestion():
    """
    Validates fleet_reference.csv parsing and multi-fuel capability alignment.
    """
    svc = FuelEmissionIngestionService()
    vessels = svc.load_vessels()

    assert len(vessels) == 6
    assert "VES-001" in vessels
    assert "VES-002" in vessels
    assert "VES-003" in vessels
    assert "VES-004" in vessels
    assert "VES-005" in vessels
    assert "VES-006" in vessels

    # Check fuel options
    assert "HFO" in vessels["VES-001"].fuel_options
    assert "LNG" in vessels["VES-001"].fuel_options
    assert "METHANOL" in vessels["VES-001"].fuel_options

    assert "HFO" in vessels["VES-002"].fuel_options
    assert "MDO" in vessels["VES-002"].fuel_options
    assert "AMMONIA" in vessels["VES-002"].fuel_options

    assert "LNG" in vessels["VES-004"].fuel_options
    assert "MDO" in vessels["VES-004"].fuel_options

    assert "MDO" in vessels["VES-005"].fuel_options
    assert "HFO" in vessels["VES-005"].fuel_options

    assert "MDO" in vessels["VES-006"].fuel_options
    assert "METHANOL" in vessels["VES-006"].fuel_options


def test_maritime_network_routes_ingestion():
    """
    Validates stage3_maritime_routes.csv and port_reference.csv parsing into complete MaritimeRoute models.
    """
    svc = MaritimeNetworkIngestionService()
    routes, segments, waypoints, ports = svc.load_routes()

    # 1. Ports validation (5 global hubs)
    assert len(ports) == 5
    assert set(ports.keys()) == {"INBOM", "NLRTM", "SGSIN", "AEDXB", "USNYC"}
    assert ports["INBOM"].country == "India"
    assert ports["NLRTM"].country == "Netherlands"
    assert ports["SGSIN"].country == "Singapore"
    assert ports["AEDXB"].country == "United Arab Emirates"
    assert ports["USNYC"].country == "United States"

    # 2. Routes validation (22 canonical routes: 20 base pairs + 2 alternative Cape corridors)
    assert len(routes) == 22
    assert "RT-INBOM-NLRTM" in routes
    assert "RT-INBOM-SGSIN" in routes
    assert "RT-SGSIN-USNYC" in routes
    assert "RT-USNYC-AEDXB" in routes
    assert "RT-SGSIN-NLRTM" in routes
    assert "RT-SGSIN-NLRTM-CAPE" in routes

    # 3. Distance verification
    inbom_nlrtm = routes["RT-INBOM-NLRTM"]
    assert inbom_nlrtm.total_distance_nm == pytest.approx(6362.01, abs=0.01)
    assert inbom_nlrtm.origin_port_id == "INBOM"
    assert inbom_nlrtm.destination_port_id == "NLRTM"
    assert inbom_nlrtm.estimated_transit_hours == pytest.approx(6362.01 / 14.0, abs=0.2)

    # 4. Multi-segment topology verification
    assert len(inbom_nlrtm.segments) == 10
    assert inbom_nlrtm.segments[0].from_node == "WP-INBOM"
    assert inbom_nlrtm.segments[-1].to_node == "WP-NLRTM"
    assert inbom_nlrtm.route_cost == 350000.0  # Suez Canal transit toll
    assert "CANAL_TRANSIT" in inbom_nlrtm.restrictions


def test_external_route_provider_candidate_discovery():
    """
    Validates candidate route discovery, alternative corridors, and draft feasibility using ExternalRouteProvider.
    """
    provider = ExternalRouteProvider()

    # 1. Query candidates between Mumbai and Rotterdam
    candidates = provider.get_candidate_routes(
        origin_port_id="INBOM",
        destination_port_id="NLRTM"
    )
    assert len(candidates) >= 1
    assert candidates[0].id == "RT-INBOM-NLRTM"
    assert candidates[0].total_distance_nm == pytest.approx(6362.01, abs=0.01)
    assert candidates[0].feasibility_status == "feasible"

    # 2. Query with alias (PORT-SG -> SGSIN, PORT-RTM -> NLRTM) discovers BOTH Suez and Cape corridors
    alias_candidates = provider.get_candidate_routes(
        origin_port_id="PORT-SG",
        destination_port_id="PORT-RTM"
    )
    assert len(alias_candidates) == 2
    alias_map = {c.id: c for c in alias_candidates}
    assert "RT-SGSIN-NLRTM" in alias_map
    assert "RT-SGSIN-NLRTM-CAPE" in alias_map
    assert alias_map["RT-SGSIN-NLRTM"].total_distance_nm == pytest.approx(8364.75, abs=0.01)
    assert alias_map["RT-SGSIN-NLRTM-CAPE"].total_distance_nm == 11720.00

    # 3. Draft limit violation check
    shallow_vessel = Vessel(
        id="VES-DEEP",
        name="Deep Draft Supertanker",
        type="VLCC",
        capacity_tonnes=250000.0,
        min_speed_knots=9.0,
        max_speed_knots=18.0,
        engine_power_kw=35000.0,
        fuel_options=["HFO"],
        design_draft_m=18.5  # Exceeds Mumbai's 15.5m draft limit
    )
    infeasible_candidates = provider.get_candidate_routes(
        origin_port_id="INBOM",
        destination_port_id="NLRTM",
        vessel=shallow_vessel
    )
    assert len(infeasible_candidates) == 1
    assert infeasible_candidates[0].feasibility_status == "infeasible"
    assert any("VESSEL_DRAFT_EXCEEDS_PORT_LIMIT" in r for r in infeasible_candidates[0].infeasibility_reasons)


def test_end_to_end_evaluation_with_external_data():
    """
    Validates that external routes and fuels integrate cleanly with DemoFuelModel and VoyageEvaluationService.
    """
    f_svc = FuelEmissionIngestionService()
    fuels = f_svc.load_fuels()
    vessels = f_svc.load_vessels()

    r_provider = ExternalRouteProvider()
    routes = r_provider.get_candidate_routes("INBOM", "NLRTM")
    route = routes[0]

    vessel = vessels["VES-001"]
    fuel = fuels["HFO"]
    origin = r_provider.get_port_by_id("INBOM")
    dest = r_provider.get_port_by_id("NLRTM")

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=35)

    from backend.app.services.route_environmental_assessment_service import RouteEnvironmentalAssessmentService
    weather_svc = RouteEnvironmentalAssessmentService(route_provider=r_provider)
    eval_svc = VoyageEvaluationService(weather_assessment_service=weather_svc)
    candidate, rejections = eval_svc.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=60000.0,
        departure_datetime=now,
        deadline_datetime=deadline,
        origin_port=origin,
        destination_port=dest
    )

    assert candidate.is_feasible is True
    assert len(rejections) == 0
    assert candidate.fuel_consumption_tonnes > 0
    assert candidate.fuel_cost_usd > 0
    assert candidate.operational_co2_tonnes > 0
    assert candidate.lifecycle_ghg_tonnes > 0
    assert candidate.sailing_time_hours > 0


def test_optimization_with_external_data():
    """
    Validates that ClassicalVoyageOptimizer and QUBOBuilder + SimulatedAnnealingSolver
    execute successfully over external routes (INBOM -> NLRTM) and external fuels (HFO, MDO, LNG, etc.).
    """
    from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
    from backend.app.services.route_environmental_assessment_service import RouteEnvironmentalAssessmentService
    from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
    from backend.app.optimization.qubo.qubo_builder import QUBOBuilder
    from backend.app.optimization.quantum_inspired.simulated_annealing_solver import SimulatedAnnealingSolver
    from backend.app.models.optimization import VoyageOptimizationRequest

    f_svc_ingest = FuelEmissionIngestionService()
    fuels = f_svc_ingest.load_fuels()
    vessels = f_svc_ingest.load_vessels()
    fuel_service = FuelIntelligenceService(fuels=fuels, vessels=vessels)

    r_provider = ExternalRouteProvider()
    weather_svc = RouteEnvironmentalAssessmentService(
        route_provider=r_provider,
        fuel_service=fuel_service
    )
    eval_svc = VoyageEvaluationService(
        weather_assessment_service=weather_svc
    )
    classical_opt = ClassicalVoyageOptimizer(
        route_provider=r_provider,
        fuel_service=fuel_service,
        evaluation_service=eval_svc
    )

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=30)
    req = VoyageOptimizationRequest(
        source_port_id="INBOM",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=now,
        deadline_datetime=deadline,
        speed_grid_step_knots=2.0
    )

    # 1. Classical Exact Optimization
    cl_resp = classical_opt.optimize(req)
    assert cl_resp.benchmark.feasible_candidates_count > 0
    assert cl_resp.cost_efficient.global_best is not None
    assert cl_resp.time_efficient.global_best is not None
    assert cl_resp.cost_efficient.global_best.total_voyage_cost_usd > 0
    assert cl_resp.cost_efficient.global_best.fuel_id in {"HFO", "MDO", "LNG", "METHANOL", "AMMONIA"}

    # 2. QUBO Model Construction
    feasible_cands = [c for c in eval_svc_cands if c.is_feasible] if 'eval_svc_cands' in locals() else [
        c for c in classical_opt.evaluate_all_candidates(req)[0] if c.is_feasible
    ]
    qubo_builder = QUBOBuilder()
    qubo = qubo_builder.build_qubo(feasible_cands, objective_mode="cost")
    assert qubo.num_variables == len(feasible_cands)

    # 3. Quantum-Inspired Simulated Annealing
    solver = SimulatedAnnealingSolver()
    result = solver.solve(qubo, seed_override=42)
    assert result.is_valid_one_hot is True
    assert result.selected_variable_index is not None
    selected_cand = qubo.variable_to_candidate[result.selected_variable_index]
    assert selected_cand.is_feasible is True

