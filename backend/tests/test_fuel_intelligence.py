import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService
from backend.app.models.fuel_intelligence import FuelEstimationRequest

client = TestClient(app)
service = FuelIntelligenceService()

# 1. Basic valid calculation
def test_valid_fuel_estimation():
    req = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "speed_knots": 14.0,
        "sea_state": 2,
        "currency": "USD"
    }
    response = client.post("/api/v1/fuel/estimate", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "demo_estimate"
    assert "SIMULATED DEMONSTRATION" in data["disclaimer"]
    assert data["vessel_id"] == "VES-001"
    assert data["fuel_id"] == "VLSFO"
    assert data["travel_time_hours"] > 0
    assert data["fuel_consumption_rate_tonnes_per_hour"] > 0
    assert data["fuel_consumption_tonnes"] > 0
    assert data["fuel_cost"] > 0
    assert data["operational_co2_tonnes"] > 0

# 2. Zero/negative distance rejected
def test_zero_or_negative_distance_rejected():
    req_zero = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 0.0,
        "speed_knots": 14.0
    }
    response = client.post("/api/v1/fuel/estimate", json=req_zero)
    assert response.status_code == 422

    req_neg = dict(req_zero, distance_nm=-500.0)
    response = client.post("/api/v1/fuel/estimate", json=req_neg)
    assert response.status_code == 422

# 3. Zero/negative cargo rejected
def test_zero_or_negative_cargo_rejected():
    req_zero = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 0.0,
        "distance_nm": 3000.0,
        "speed_knots": 14.0
    }
    response = client.post("/api/v1/fuel/estimate", json=req_zero)
    assert response.status_code == 422

    req_neg = dict(req_zero, cargo_weight_tonnes=-100.0)
    response = client.post("/api/v1/fuel/estimate", json=req_neg)
    assert response.status_code == 422

# 4. Speed below vessel minimum rejected
def test_speed_below_vessel_minimum_rejected():
    # VES-001 min_speed_knots is 10.0
    req = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "speed_knots": 8.0,
        "sea_state": 2
    }
    response = client.post("/api/v1/fuel/estimate", json=req)
    assert response.status_code == 400
    assert "below minimum safe speed" in response.json()["detail"]

# 5. Speed above vessel maximum rejected
def test_speed_above_vessel_maximum_rejected():
    # VES-001 max_speed_knots is 22.0
    req = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "speed_knots": 25.0,
        "sea_state": 2
    }
    response = client.post("/api/v1/fuel/estimate", json=req)
    assert response.status_code == 400
    assert "exceeds maximum design speed" in response.json()["detail"]

# 6. Cargo above vessel capacity rejected
def test_cargo_above_vessel_capacity_rejected():
    # VES-001 capacity is 120,000 tonnes
    req = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 150000.0,
        "distance_nm": 3000.0,
        "speed_knots": 14.0,
        "sea_state": 2
    }
    response = client.post("/api/v1/fuel/estimate", json=req)
    assert response.status_code == 400
    assert "exceeds maximum deadweight capacity" in response.json()["detail"]

# 7. Incompatible fuel rejected
def test_incompatible_fuel_rejected():
    # VES-001 only supports VLSFO and LNG, NOT BIO-B20
    req = {
        "vessel_id": "VES-001",
        "fuel_id": "BIO-B20",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "speed_knots": 14.0,
        "sea_state": 2
    }
    response = client.post("/api/v1/fuel/estimate", json=req)
    assert response.status_code == 400
    assert "Incompatible fuel" in response.json()["detail"]

# 8. Higher speed increases total fuel consumption under identical conditions
def test_speed_sensitivity_increases_consumption():
    base_params = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "sea_state": 2
    }
    res_low = service.estimate_fuel(FuelEstimationRequest(**base_params, speed_knots=12.0))
    res_high = service.estimate_fuel(FuelEstimationRequest(**base_params, speed_knots=16.0))

    # Travel time should decrease
    assert res_high.travel_time_hours < res_low.travel_time_hours
    # Hourly rate and total fuel consumption must be higher at 16 knots than at 12 knots
    assert res_high.fuel_consumption_rate_tonnes_per_hour > res_low.fuel_consumption_rate_tonnes_per_hour
    assert res_high.fuel_consumption_tonnes > res_low.fuel_consumption_tonnes
    assert res_high.fuel_cost > res_low.fuel_cost

# 9. Higher distance increases total fuel consumption approximately proportionally
def test_distance_sensitivity_increases_total_fuel():
    base_params = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "speed_knots": 14.0,
        "sea_state": 2
    }
    res_1000 = service.estimate_fuel(FuelEstimationRequest(**base_params, distance_nm=1000.0))
    res_2000 = service.estimate_fuel(FuelEstimationRequest(**base_params, distance_nm=2000.0))

    # Rate per hour should be identical
    assert pytest.approx(res_1000.fuel_consumption_rate_tonnes_per_hour, rel=1e-3) == res_2000.fuel_consumption_rate_tonnes_per_hour
    # Total fuel should double
    assert pytest.approx(res_2000.fuel_consumption_tonnes, rel=1e-2) == res_1000.fuel_consumption_tonnes * 2.0

# 10. Higher load increases fuel consumption
def test_load_sensitivity_increases_fuel():
    base_params = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "distance_nm": 3000.0,
        "speed_knots": 14.0,
        "sea_state": 2
    }
    res_light = service.estimate_fuel(FuelEstimationRequest(**base_params, cargo_weight_tonnes=20000.0))
    res_heavy = service.estimate_fuel(FuelEstimationRequest(**base_params, cargo_weight_tonnes=100000.0))

    assert res_heavy.fuel_consumption_tonnes > res_light.fuel_consumption_tonnes
    assert res_heavy.vessel_utilization_percent > res_light.vessel_utilization_percent

# 11. Worse sea state increases fuel consumption
def test_sea_state_sensitivity_increases_fuel():
    base_params = {
        "vessel_id": "VES-001",
        "fuel_id": "VLSFO",
        "cargo_weight_tonnes": 50000.0,
        "distance_nm": 3000.0,
        "speed_knots": 14.0
    }
    res_calm = service.estimate_fuel(FuelEstimationRequest(**base_params, sea_state=2))
    res_rough = service.estimate_fuel(FuelEstimationRequest(**base_params, sea_state=6))

    assert res_rough.fuel_consumption_tonnes > res_calm.fuel_consumption_tonnes
    assert res_rough.fuel_consumption_rate_tonnes_per_hour > res_calm.fuel_consumption_rate_tonnes_per_hour

# 12. Fuel cost calculation is correct
def test_fuel_cost_calculation():
    req = FuelEstimationRequest(
        vessel_id="VES-001",
        fuel_id="VLSFO",
        cargo_weight_tonnes=50000.0,
        distance_nm=3000.0,
        speed_knots=14.0,
        sea_state=2
    )
    result = service.estimate_fuel(req)
    expected_cost = round(result.fuel_consumption_tonnes * result.fuel_price_per_tonne, 2)
    assert pytest.approx(result.fuel_cost, abs=0.05) == expected_cost

# 13. Operational CO₂ calculation is correct
def test_co2_calculation():
    req = FuelEstimationRequest(
        vessel_id="VES-001",
        fuel_id="VLSFO",
        cargo_weight_tonnes=50000.0,
        distance_nm=3000.0,
        speed_knots=14.0,
        sea_state=2
    )
    result = service.estimate_fuel(req)
    fuel = service.get_fuel_by_id("VLSFO")
    expected_co2 = round(result.fuel_consumption_tonnes * (fuel.emission_factor_kg_co2_per_tonne / 1000.0), 2)
    assert pytest.approx(result.operational_co2_tonnes, abs=0.05) == expected_co2

# 14. Derived efficiency metrics are mathematically consistent
def test_derived_efficiency_metrics():
    req = FuelEstimationRequest(
        vessel_id="VES-001",
        fuel_id="VLSFO",
        cargo_weight_tonnes=50000.0,
        distance_nm=3000.0,
        speed_knots=14.0,
        sea_state=2
    )
    res = service.estimate_fuel(req)

    # fuel_per_nm_kg = (total_fuel * 1000) / distance_nm
    expected_fuel_per_nm = round((res.fuel_consumption_tonnes * 1000.0) / req.distance_nm, 2)
    assert pytest.approx(res.fuel_per_nm_kg, abs=0.05) == expected_fuel_per_nm

    # fuel_per_tonne_cargo_kg = (total_fuel * 1000) / cargo_weight
    expected_fuel_per_cargo = round((res.fuel_consumption_tonnes * 1000.0) / req.cargo_weight_tonnes, 3)
    assert pytest.approx(res.fuel_per_tonne_cargo_kg, abs=0.05) == expected_fuel_per_cargo

    # vessel_utilization_percent = (cargo / capacity) * 100
    vessel = service.get_vessel_by_id("VES-001")
    expected_util = round((req.cargo_weight_tonnes / vessel.capacity_tonnes) * 100.0, 1)
    assert pytest.approx(res.vessel_utilization_percent, abs=0.1) == expected_util

# 15. Demo results are deterministic
def test_deterministic_results():
    req = FuelEstimationRequest(
        vessel_id="VES-001",
        fuel_id="VLSFO",
        cargo_weight_tonnes=50000.0,
        distance_nm=3000.0,
        speed_knots=14.0,
        sea_state=4
    )
    res1 = service.estimate_fuel(req)
    res2 = service.estimate_fuel(req)

    assert res1.fuel_consumption_tonnes == res2.fuel_consumption_tonnes
    assert res1.fuel_consumption_rate_tonnes_per_hour == res2.fuel_consumption_rate_tonnes_per_hour
    assert res1.fuel_cost == res2.fuel_cost
    assert res1.operational_co2_tonnes == res2.operational_co2_tonnes

# Helper test: scenario presets endpoint
def test_scenarios_endpoint():
    response = client.get("/api/v1/fuel/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) >= 5
    assert scenarios[0]["id"] == "scenario-a-cost-optimal"
