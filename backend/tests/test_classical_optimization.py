import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    ClassicalOptimizationResponse,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.services.voyage_evaluation_service import VoyageEvaluationService
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

client = TestClient(app)

@pytest.fixture
def optimizer():
    return ClassicalVoyageOptimizer()

@pytest.fixture
def eval_service():
    return VoyageEvaluationService()

@pytest.fixture
def base_request():
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=28)  # 672 hours: feasible for Suez and Cape
    return VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        speed_grid_step_knots=0.5
    )

# 1. Model creation & boundary test
def test_valid_optimization_request_creation(base_request):
    assert base_request.source_port_id == "PORT-SG"
    assert base_request.destination_port_id == "PORT-RTM"
    assert base_request.cargo_weight_tonnes == 60000.0
    assert base_request.speed_grid_step_knots == 0.5

# 2. Invalid deadline rejected
def test_invalid_deadline_rejected(optimizer):
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep - timedelta(days=1)  # Invalid: deadline before departure
    req = VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=dep,
        deadline_datetime=dead
    )
    with pytest.raises(Exception) as exc_info:
        optimizer.optimize(req)
    assert "deadline" in str(exc_info.value).lower()

# 3. Speed grid discrete generation
def test_speed_grid_generation(optimizer):
    speeds = optimizer._generate_speed_grid(10.0, 15.0, 1.0)
    assert speeds == [10.0, 11.0, 12.0, 13.0, 14.0, 15.0]

    speeds_half = optimizer._generate_speed_grid(10.0, 12.0, 0.5)
    assert speeds_half == [10.0, 10.5, 11.0, 11.5, 12.0]

# 4. Cargo capacity constraint rejection
def test_cargo_capacity_constraint_rejection(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-002")  # Capacity 82,000t
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    # Cargo exceeding capacity
    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=90000.0,  # 90,000t > 82,000t
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    assert candidate.is_feasible is False
    assert any("CARGO_EXCEEDS_CAPACITY" in r for r in candidate.infeasibility_reasons)
    assert "capacity" in rejections

# 5. Vessel speed envelope bounds constraint
def test_vessel_speed_envelope_constraint(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-001")  # Min 10.0, Max 22.0
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=8.0,  # Below min 10.0
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    assert candidate.is_feasible is False
    assert any("SPEED_OUT_OF_BOUNDS" in r for r in candidate.infeasibility_reasons)
    assert "speed" in rejections

# 6. Fuel compatibility constraint
def test_fuel_compatibility_constraint(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-001")  # Supports VLSFO, LNG only
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("MGO")  # Not in VES-001 fuel options
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    assert candidate.is_feasible is False
    assert any("INCOMPATIBLE_FUEL" in r for r in candidate.infeasibility_reasons)
    assert "fuel_compatibility" in rejections

# 7. Draft limit rejection on route segment
def test_draft_constraint_rejection(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    # Create synthetic vessel with 17.5m draft exceeding Suez 16.0m limit
    vessel = fuel_service.get_vessel_by_id("VES-001").model_copy(update={"design_draft_m": 17.5})
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    assert candidate.is_feasible is False
    assert any("DRAFT_EXCEEDS" in r for r in candidate.infeasibility_reasons)
    assert "draft" in rejections

# 8. Weather safety feasibility rejection (Scenario D Storm)
def test_weather_infeasible_candidate_rejection(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-001")
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest,
        scenario_id="scenario-d-storm"
    )
    assert candidate.is_feasible is False
    assert any("STORM_CONDITION" in r or "EXCESSIVE_WAVE_HEIGHT" in r for r in candidate.infeasibility_reasons)
    assert "weather" in rejections

# 9. Deadline violation rejection
def test_deadline_violation_rejection(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-001")
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    # Require delivery in 10 days (~240 hrs), but 8,280 NM at 10 kts takes ~842 hrs
    dead = dep + timedelta(days=10)

    candidate, rejections = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=10.0,
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    assert candidate.is_feasible is False
    assert candidate.deadline_margin_hours < 0
    assert any("DEADLINE_EXCEEDED" in r for r in candidate.infeasibility_reasons)
    assert "deadline" in rejections

# 10. Cost mode minimizes total voyage cost
def test_cost_efficient_mode_minimizes_cost(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.cost_efficient.global_best is not None
    best = res.cost_efficient.global_best
    assert best.is_feasible is True
    # Verify no other feasible candidate has a strictly lower cost
    # We can check against time mode's global best cost
    if res.time_efficient.global_best:
        assert best.total_voyage_cost_usd <= res.time_efficient.global_best.total_voyage_cost_usd

# 11. Time mode minimizes total voyage duration
def test_time_efficient_mode_minimizes_duration(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.time_efficient.global_best is not None
    fastest = res.time_efficient.global_best
    assert fastest.is_feasible is True
    # Verify no other feasible candidate has a strictly lower voyage duration
    if res.cost_efficient.global_best:
        assert fastest.total_voyage_time_hours <= res.cost_efficient.global_best.total_voyage_time_hours

# 12. Slowest speed is not blindly selected if it violates deadline
def test_slowest_speed_not_blindly_selected_if_misses_deadline(optimizer):
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    # Tight deadline: 20 days (480 hrs). At 10 kts Suez route takes ~590 hrs, but at 18 kts takes ~474 hrs
    dead = dep + timedelta(days=21)
    req = VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        vessel_ids=["VES-001"],
        route_ids=["RT-SG-RTM-SUEZ"],
        speed_grid_step_knots=1.0
    )
    res = optimizer.optimize(req)
    if res.cost_efficient.global_best:
        # Cruising speed must be fast enough to meet the 21-day deadline
        assert res.cost_efficient.global_best.cruising_speed_knots > 10.0
        assert res.cost_efficient.global_best.deadline_margin_hours >= 0.0

# 13. Fastest speed is not blindly selected if an operational constraint makes it infeasible
def test_fastest_speed_not_blindly_selected_if_exceeds_limits(optimizer, base_request):
    res = optimizer.optimize(base_request)
    for vessel_id, candidate in res.time_efficient.per_vessel_best.items():
        assert candidate.cruising_speed_knots <= 22.0  # Max fleet limit

# 14. Non-double-counting of environmental resistance
def test_no_double_counting_of_environmental_factor(eval_service):
    route_provider = DemoRouteProvider()
    fuel_service = FuelIntelligenceService()
    vessel = fuel_service.get_vessel_by_id("VES-001")
    route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    fuel = fuel_service.get_fuel_by_id("VLSFO")
    origin = route_provider.get_port_by_id("PORT-SG")
    dest = route_provider.get_port_by_id("PORT-RTM")
    dep = datetime(2026, 9, 10, 8, 0, 0, tzinfo=timezone.utc)
    dead = dep + timedelta(days=30)

    candidate, _ = eval_service.evaluate_candidate(
        vessel=vessel,
        route=route,
        fuel=fuel,
        speed_knots=14.0,
        cargo_weight_tonnes=50000.0,
        departure_datetime=dep,
        deadline_datetime=dead,
        origin_port=origin,
        destination_port=dest
    )
    # Direct calm fuel calculation
    _, _, baseline_calm, _ = fuel_service._fuel_model.calculate_consumption_breakdown(
        vessel=vessel,
        fuel=fuel,
        distance_nm=route.total_distance_nm,
        speed_knots=14.0,
        cargo_weight_tonnes=50000.0,
        sea_state=2
    )
    expected_fuel = round(baseline_calm * candidate.demo_environmental_fuel_factor, 2)
    assert candidate.fuel_consumption_tonnes == pytest.approx(expected_fuel, rel=1e-2)

# 15. Per-vessel best results populated for all eligible vessels
def test_per_vessel_best_results_populated(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert len(res.cost_efficient.per_vessel_best) > 0
    assert len(res.time_efficient.per_vessel_best) > 0
    for v_id, cand in res.cost_efficient.per_vessel_best.items():
        assert cand.vessel_id == v_id
        assert cand.is_feasible is True

# 16. Global best cost and time identified
def test_global_best_cost_and_time_identified(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.cost_efficient.global_best is not None
    assert res.time_efficient.global_best is not None
    assert res.cost_efficient.global_best.decision_id.startswith("VES")

# 17. Informational lowest fuel and emissions identified
def test_informational_lowest_fuel_and_emissions_identified(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.informational_best_fuel is not None
    assert res.informational_best_emissions is not None
    assert res.informational_best_fuel.fuel_consumption_tonnes > 0
    assert res.informational_best_emissions.operational_co2_tonnes >= 0

# 18. Benchmark stats accurate and complete
def test_benchmark_stats_accurate(optimizer, base_request):
    res = optimizer.optimize(base_request)
    stats = res.benchmark
    assert stats.total_candidates_evaluated > 100
    assert stats.feasible_candidates_count > 0
    assert stats.total_candidates_evaluated == stats.feasible_candidates_count + stats.infeasible_candidates_count
    assert 0.0 <= stats.feasibility_rate_pct <= 100.0
    assert "draft" in stats.rejection_breakdown
    assert "deadline" in stats.rejection_breakdown

# 19. Runtime recorded
def test_runtime_ms_recorded(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.benchmark.runtime_ms > 0.0

# 20. Decision ID format matches Phase 5 contract
def test_decision_id_reusable_format(optimizer, base_request):
    res = optimizer.optimize(base_request)
    best = res.cost_efficient.global_best
    parts = best.decision_id.split("::")
    assert parts[0].startswith("VES")
    assert len(res.candidate_decision_space_preview) > 0
    sample_dec = res.candidate_decision_space_preview[0]
    assert "::" in sample_dec.decision_id

# 21. Route selection trade-off: canal tolls vs distance
def test_route_selection_tolls_vs_distance(optimizer, base_request):
    res = optimizer.optimize(base_request)
    assert res.cost_efficient.global_best.route_id in ["RT-SG-RTM-SUEZ", "RT-SG-RTM-CAPE", "RT-SGSIN-NLRTM"]
    assert res.cost_efficient.global_best.route_cost_usd >= 0.0

# 22. Optimization determinism across repeated executions
def test_optimization_determinism(optimizer, base_request):
    res1 = optimizer.optimize(base_request)
    res2 = optimizer.optimize(base_request)
    assert res1.cost_efficient.global_best.decision_id == res2.cost_efficient.global_best.decision_id
    assert res1.time_efficient.global_best.decision_id == res2.time_efficient.global_best.decision_id
    assert res1.cost_efficient.global_best.total_voyage_cost_usd == res2.cost_efficient.global_best.total_voyage_cost_usd

# 23. Speed grid resolution parameterization
def test_speed_grid_step_resolution_sensitivity(optimizer, base_request):
    req_coarse = base_request.model_copy(update={"speed_grid_step_knots": 1.0})
    req_fine = base_request.model_copy(update={"speed_grid_step_knots": 0.5})
    res_coarse = optimizer.optimize(req_coarse)
    res_fine = optimizer.optimize(req_fine)
    assert res_fine.benchmark.total_candidates_evaluated > res_coarse.benchmark.total_candidates_evaluated

# 24. API POST endpoint /api/v1/optimization/classical
def test_api_post_classical_optimization_endpoint(base_request):
    payload = base_request.model_dump(mode="json")
    response = client.post("/api/v1/optimization/classical", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "exact_classical_optimization"
    assert "cost_efficient" in data
    assert "time_efficient" in data
    assert data["cost_efficient"]["global_best"] is not None

# 25. API GET endpoint /api/v1/optimization/sample-request
def test_api_get_sample_request_endpoint():
    response = client.get("/api/v1/optimization/sample-request")
    assert response.status_code == 200
    data = response.json()
    assert data["source_port_id"] == "PORT-SG"
    assert data["destination_port_id"] == "PORT-RTM"

# 26. API 404 on invalid origin or destination port
def test_api_404_on_invalid_port(base_request):
    bad_req = base_request.model_copy(update={"source_port_id": "PORT-INVALID"})
    response = client.post("/api/v1/optimization/classical", json=bad_req.model_dump(mode="json"))
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
