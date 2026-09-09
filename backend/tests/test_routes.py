import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
from backend.app.models.fuel_intelligence import FuelEstimationRequest
from backend.app.models.vessel import Vessel

client = TestClient(app)
route_provider = DemoRouteProvider()
fuel_service = FuelIntelligenceService()

# 1. Ports load successfully
def test_ports_load_successfully():
    ports = route_provider.get_ports()
    assert isinstance(ports, list)
    assert len(ports) >= 2

# 2. Waypoints load successfully
def test_waypoints_load_successfully():
    waypoints = route_provider.get_waypoints()
    assert isinstance(waypoints, list)
    assert len(waypoints) >= 10

# 3. Singapore exists
def test_singapore_exists():
    port = route_provider.get_port_by_id("PORT-SG")
    assert port is not None
    assert "Singapore" in port.name
    assert port.draft_limit_m > 0
    assert "VLSFO" in port.fuel_availability

# 4. Rotterdam exists
def test_rotterdam_exists():
    port = route_provider.get_port_by_id("PORT-RTM")
    assert port is not None
    assert "Rotterdam" in port.name
    assert port.draft_limit_m > 0

# 5. Candidate routes between Singapore and Rotterdam are returned
def test_candidate_routes_returned():
    response = client.post(
        "/api/v1/routes/candidates",
        json={"origin_port_id": "PORT-SG", "destination_port_id": "PORT-RTM"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["origin_port"]["id"] == "PORT-SG"
    assert data["destination_port"]["id"] == "PORT-RTM"
    assert len(data["candidate_routes"]) >= 1

# 6. At least two candidate routes exist (Suez and Cape)
def test_suez_and_cape_routes_exist():
    routes = route_provider.get_candidate_routes("PORT-SG", "PORT-RTM")
    route_ids = [r.id for r in routes]
    assert "RT-SG-RTM-SUEZ" in route_ids
    assert "RT-SG-RTM-CAPE" in route_ids

# 7. Route waypoint sequences are valid
def test_route_waypoint_sequences_valid():
    suez = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    assert suez is not None
    assert len(suez.waypoints) >= 8
    # Origin is first waypoint and destination is last
    assert suez.waypoints[0].id == "PORT-SG"
    assert suez.waypoints[-1].id == "PORT-RTM"

# 8. Route segments resolve correctly
def test_route_segments_resolve():
    cape = route_provider.get_maritime_route_by_id("RT-SG-RTM-CAPE")
    assert cape is not None
    assert len(cape.segments) >= 5
    assert cape.segments[0].from_node == "PORT-SG"
    assert cape.segments[-1].to_node == "PORT-RTM"

# 9. Total route distance strictly equals the sum of segment distances
def test_total_distance_equals_sum_of_segments():
    for route_id in ["RT-SG-RTM-SUEZ", "RT-SG-RTM-CAPE"]:
        route = route_provider.get_maritime_route_by_id(route_id)
        assert route is not None
        sum_segments = sum(seg.distance_nm for seg in route.segments)
        assert pytest.approx(route.total_distance_nm, abs=0.1) == sum_segments

# 10. Transit time is calculated consistently
def test_transit_time_calculation():
    suez = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    assert suez is not None
    # At reference speed 14.0 kn
    expected_hours = round(suez.total_distance_nm / 14.0, 1)
    assert pytest.approx(suez.estimated_transit_hours, abs=0.5) == expected_hours
    assert pytest.approx(suez.estimated_transit_days, abs=0.1) == round(expected_hours / 24.0, 1)

# 11. Unknown origin rejected (404)
def test_unknown_origin_rejected():
    response = client.post(
        "/api/v1/routes/candidates",
        json={"origin_port_id": "PORT-UNKNOWN", "destination_port_id": "PORT-RTM"}
    )
    assert response.status_code == 404
    assert "Origin port" in response.json()["detail"]

# 12. Unknown destination rejected (404)
def test_unknown_destination_rejected():
    response = client.post(
        "/api/v1/routes/candidates",
        json={"origin_port_id": "PORT-SG", "destination_port_id": "PORT-UNKNOWN"}
    )
    assert response.status_code == 404
    assert "Destination port" in response.json()["detail"]

# 13. Invalid route ID rejected (404)
def test_invalid_route_id_rejected():
    response = client.get("/api/v1/routes/RT-DOES-NOT-EXIST")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

# 14. Vessel draft restriction works (Suez max draft is 16.0m)
def test_vessel_draft_restriction():
    # Deep draft vessel (e.g. 17.5m draft, typical for laden VLCC)
    deep_vessel = Vessel(
        id="VES-DEEP",
        name="Titan Deep",
        type="VLCC Tanker",
        capacity_tonnes=200000.0,
        min_speed_knots=10.0,
        max_speed_knots=18.0,
        engine_power_kw=35000.0,
        fuel_options=["VLSFO"],
        design_draft_m=17.5  # Exceeds Suez 16.0m limit!
    )
    routes = route_provider.get_candidate_routes(
        origin_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        vessel=deep_vessel
    )
    
    suez_route = next(r for r in routes if r.id == "RT-SG-RTM-SUEZ")
    cape_route = next(r for r in routes if r.id == "RT-SG-RTM-CAPE")

    # Suez route must be marked infeasible because draft 17.5m > 16.0m
    assert suez_route.feasibility_status == "infeasible"
    assert any("VESSEL_DRAFT_EXCEEDS_SEGMENT_LIMIT" in r for r in suez_route.infeasibility_reasons)

    # Cape route has no canal depth restriction and should remain feasible
    assert cape_route.feasibility_status == "feasible"
    assert len(cape_route.infeasibility_reasons) == 0

# 15. Cargo/vessel capacity restriction works
def test_cargo_capacity_restriction():
    normal_vessel = route_provider.get_port_by_id("PORT-SG")
    v = fuel_service.get_vessel_by_id("VES-001") # capacity 120,000t
    routes = route_provider.get_candidate_routes(
        origin_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        vessel=v,
        cargo_weight_tonnes=150000.0 # Exceeds capacity
    )
    for r in routes:
        assert r.feasibility_status == "infeasible"
        assert any("CARGO_EXCEEDS_VESSEL_CAPACITY" in reason for reason in r.infeasibility_reasons)

# 16. Infeasible routes return clear diagnostic reason
def test_infeasible_route_diagnostic_reasons():
    deep_vessel = Vessel(
        id="VES-SUPER",
        name="Ultra Tanker",
        type="ULCC",
        capacity_tonnes=350000.0, # Exceeds port limits (SG 250k, RTM 300k)
        min_speed_knots=10.0,
        max_speed_knots=16.0,
        engine_power_kw=40000.0,
        fuel_options=["VLSFO"],
        design_draft_m=22.0 # Exceeds SG port 21.0m limit & Suez 16.0m limit
    )
    routes = route_provider.get_candidate_routes(
        origin_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        vessel=deep_vessel
    )
    suez = next(r for r in routes if r.id == "RT-SG-RTM-SUEZ")
    assert len(suez.infeasibility_reasons) >= 2

# 17. Feasible routes are marked correctly
def test_feasible_routes_marked():
    # Normal vessel (VES-002: Green Horizon, draft 14.0m < 16.0m)
    vessel = fuel_service.get_vessel_by_id("VES-002")
    routes = route_provider.get_candidate_routes(
        origin_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        vessel=vessel,
        cargo_weight_tonnes=50000.0
    )
    for r in routes:
        assert r.feasibility_status == "feasible"
        assert len(r.infeasibility_reasons) == 0

# 18. Route distance can feed the existing Phase 1 fuel estimator
def test_route_distance_feeds_fuel_estimator():
    suez_route = route_provider.get_maritime_route_by_id("RT-SG-RTM-SUEZ")
    assert suez_route is not None
    
    # Pass suez_route.total_distance_nm directly to Phase 1 fuel estimator!
    fuel_req = FuelEstimationRequest(
        vessel_id="VES-001",
        fuel_id="VLSFO",
        cargo_weight_tonnes=60000.0,
        distance_nm=suez_route.total_distance_nm,
        speed_knots=14.0,
        sea_state=2
    )
    result = fuel_service.estimate_fuel(fuel_req)
    assert result.fuel_consumption_tonnes > 0
    assert result.distance_nm == suez_route.total_distance_nm
    assert result.fuel_cost > 0

# 19. Determinism: Identical candidate route requests produce identical results
def test_candidate_routes_deterministic():
    res1 = client.post(
        "/api/v1/routes/candidates",
        json={"origin_port_id": "PORT-SG", "destination_port_id": "PORT-RTM", "vessel_id": "VES-001"}
    ).json()
    res2 = client.post(
        "/api/v1/routes/candidates",
        json={"origin_port_id": "PORT-SG", "destination_port_id": "PORT-RTM", "vessel_id": "VES-001"}
    ).json()

    assert res1["candidate_routes"][0]["total_distance_nm"] == res2["candidate_routes"][0]["total_distance_nm"]
    assert res1["candidate_routes"][0]["feasibility_status"] == res2["candidate_routes"][0]["feasibility_status"]

# 20. Endpoints for ports and waypoints return valid data
def test_endpoints_ports_and_waypoints():
    res_ports = client.get("/api/v1/routes/ports")
    assert res_ports.status_code == 200
    assert len(res_ports.json()) >= 2

    res_wps = client.get("/api/v1/routes/waypoints")
    assert res_wps.status_code == 200
    assert len(res_wps.json()) >= 10
