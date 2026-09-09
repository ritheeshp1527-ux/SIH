import pytest
import json
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.weather_intelligence import (
    SegmentEnvironmentalCondition,
    RouteEnvironmentalAssessmentRequest,
    RouteEnvironmentalAssessmentResponse,
)
from backend.app.services.demo.demo_weather_provider import DemoWeatherProvider
from backend.app.services.route_environmental_assessment_service import (
    RouteEnvironmentalAssessmentService,
)

client = TestClient(app)

# 1. Seed existence and schema validation
def test_demo_segment_weather_seed_exists_and_valid():
    seed_path = Path(__file__).resolve().parent.parent / "app" / "data" / "demo" / "demo_segment_weather.json"
    assert seed_path.exists(), "demo_segment_weather.json must exist"
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) == 13, f"Expected 13 segment weather records, found {len(data)}"
    for item in data:
        cond = SegmentEnvironmentalCondition(**item)
        assert cond.segment_id.startswith("SEG-")
        assert cond.significant_wave_height_m >= 0.0
        assert 0 <= cond.sea_state <= 9
        assert "SIMULATED WEATHER & OCEAN DATA" in cond.disclaimer

# 2. Scenario seed validation
def test_weather_scenarios_seed_exists_and_valid():
    seed_path = Path(__file__).resolve().parent.parent / "app" / "data" / "demo" / "demo_weather_scenarios.json"
    assert seed_path.exists(), "demo_weather_scenarios.json must exist"
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert len(data) == 5, f"Expected 5 weather scenarios, found {len(data)}"
    scenario_ids = [s["id"] for s in data]
    assert "scenario-a-favorable-current" in scenario_ids
    assert "scenario-b-adverse-current" in scenario_ids
    assert "scenario-c-rough-sea" in scenario_ids
    assert "scenario-d-storm" in scenario_ids
    assert "scenario-e-route-comparison" in scenario_ids

# 3. Provider lists all segments
def test_demo_weather_provider_get_all_segments():
    provider = DemoWeatherProvider()
    segments = provider.get_all_segment_conditions()
    assert len(segments) == 13
    assert all(isinstance(s, SegmentEnvironmentalCondition) for s in segments)

# 4. Provider gets single segment
def test_demo_weather_provider_get_single_segment():
    provider = DemoWeatherProvider()
    cond = provider.get_segment_condition("SEG-SG-MALACCA")
    assert cond is not None
    assert cond.segment_id == "SEG-SG-MALACCA"
    assert cond.sea_state == 2
    assert cond.along_track_current_knots == 0.5

# 5. Provider returns None for unknown segment
def test_demo_weather_provider_get_unknown_segment():
    provider = DemoWeatherProvider()
    cond = provider.get_segment_condition("SEG-NONEXISTENT")
    assert cond is None

# 6. Scenario override applies correctly
def test_demo_weather_provider_scenario_override():
    provider = DemoWeatherProvider()
    baseline = provider.get_segment_condition("SEG-MALACCA-INDIAN")
    assert baseline.along_track_current_knots == 0.8

    overridden = provider.get_segment_condition("SEG-MALACCA-INDIAN", scenario_id="scenario-a-favorable-current")
    assert overridden.along_track_current_knots == 2.2

    # Verify non-overridden segment retains baseline
    unaffected = provider.get_segment_condition("SEG-SG-MALACCA", scenario_id="scenario-a-favorable-current")
    assert unaffected.along_track_current_knots == 0.5

# 7. Provider lists all scenarios
def test_demo_weather_provider_all_scenarios():
    provider = DemoWeatherProvider()
    scenarios = provider.get_all_scenarios()
    assert len(scenarios) == 5
    ids = [s.id for s in scenarios]
    assert "scenario-d-storm" in ids

# 8. Effective speed calculation: assisting current (SOG = STW + Current)
def test_effective_speed_calculation_assisting_current():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0
    )
    res = service.assess_route(req)
    seg = next(s for s in res.segment_assessments if s.segment_id == "SEG-SG-MALACCA")
    assert seg.vessel_speed_knots == 14.0
    assert seg.effective_current_knots == 0.5
    assert seg.effective_speed_knots == pytest.approx(14.5, rel=1e-2)

# 9. Effective speed calculation: opposing current
def test_effective_speed_calculation_opposing_current():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0,
        scenario_id="scenario-b-adverse-current"
    )
    res = service.assess_route(req)
    seg = next(s for s in res.segment_assessments if s.segment_id == "SEG-GULF-ADEN-RED-SEA")
    assert seg.effective_current_knots == -2.2
    assert seg.effective_speed_knots == pytest.approx(11.8, rel=1e-2)

# 10. Travel time reduction under assisting current
def test_travel_time_reduction_assisting_current():
    service = RouteEnvironmentalAssessmentService()
    req_base = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0
    )
    req_fav = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0,
        scenario_id="scenario-a-favorable-current"
    )
    res_base = service.assess_route(req_base)
    res_fav = service.assess_route(req_fav)
    assert res_fav.weather_adjusted_travel_time_hours < res_base.weather_adjusted_travel_time_hours

# 11. Travel time increase under opposing current
def test_travel_time_increase_opposing_current():
    service = RouteEnvironmentalAssessmentService()
    req_base = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0
    )
    req_adv = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0,
        scenario_id="scenario-b-adverse-current"
    )
    res_base = service.assess_route(req_base)
    res_adv = service.assess_route(req_adv)
    assert res_adv.weather_adjusted_travel_time_hours > res_base.weather_adjusted_travel_time_hours

# 12. Weather fuel factor sensitivity
def test_weather_fuel_factor_calculation():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-CAPE",
        vessel_id="VES-002",
        speed_knots=14.0,
        scenario_id="scenario-c-rough-sea"
    )
    res = service.assess_route(req)
    seg = next(s for s in res.segment_assessments if s.segment_id == "SEG-INDIAN-CAPE")
    # In rough sea scenario, Hs=4.8m, sea_state=6 -> factor should be substantially above 1.0
    assert seg.demo_environmental_fuel_factor > 1.20
    assert seg.weather_fuel_factor == seg.demo_environmental_fuel_factor

# 13. Weather fuel factor clamping within [0.90, 2.00] and semantic naming
def test_weather_fuel_factor_clamping():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0
    )
    res = service.assess_route(req)
    for seg in res.segment_assessments:
        assert 0.90 <= seg.demo_environmental_fuel_factor <= 2.00
        assert seg.weather_fuel_factor == seg.demo_environmental_fuel_factor
    assert 0.90 <= res.aggregate_demo_environmental_fuel_factor <= 2.00
    assert res.aggregate_weather_fuel_factor == res.aggregate_demo_environmental_fuel_factor
    assert "DEMO ENVIRONMENTAL FUEL FACTOR" in res.environmental_disclaimer

# 14. Nominal route feasibility passes
def test_feasibility_pass_nominal_route():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0
    )
    res = service.assess_route(req)
    assert res.is_feasible is True
    assert len(res.infeasibility_reasons) == 0
    assert res.overall_risk_level in ["LOW", "MODERATE"]

# 15. Storm scenario D causes route infeasibility
def test_feasibility_fail_storm_scenario_d():
    service = RouteEnvironmentalAssessmentService()
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=14.0,
        scenario_id="scenario-d-storm"
    )
    res = service.assess_route(req)
    assert res.is_feasible is False
    assert len(res.infeasibility_reasons) > 0
    reasons_str = " ".join(res.infeasibility_reasons)
    assert "STORM_CONDITION" in reasons_str or "EXCESSIVE_WAVE_HEIGHT" in reasons_str
    assert res.overall_risk_level == "CRITICAL"

# 16. Feasibility fails if effective speed is non-positive
def test_feasibility_fail_non_positive_speed():
    service = RouteEnvironmentalAssessmentService()
    # If speed is commanded at 0.4 kts and opposing current is -0.5 kts, SOG <= 0
    req = RouteEnvironmentalAssessmentRequest(
        route_id="RT-SG-RTM-SUEZ",
        vessel_id="VES-001",
        speed_knots=0.4
    )
    res = service.assess_route(req)
    assert res.is_feasible is False
    assert any("NON_POSITIVE_EFFECTIVE_SPEED" in r for r in res.infeasibility_reasons)

# 17. API endpoint POST /api/v1/weather/assess-route
def test_route_environmental_assessment_api_endpoint():
    payload = {
        "route_id": "RT-SG-RTM-SUEZ",
        "vessel_id": "VES-001",
        "speed_knots": 14.0,
        "scenario_id": "scenario-a-favorable-current"
    }
    response = client.post("/api/v1/weather/assess-route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["route_id"] == "RT-SG-RTM-SUEZ"
    assert data["vessel_id"] == "VES-001"
    assert "SIMULATED WEATHER & OCEAN DATA" in data["disclaimer"]
    assert len(data["segment_assessments"]) == 10
    assert "aggregate_weather_fuel_factor" in data

# 18. API endpoint 404 for invalid route
def test_route_environmental_assessment_api_404_route():
    payload = {
        "route_id": "RT-INVALID",
        "vessel_id": "VES-001",
        "speed_knots": 14.0
    }
    response = client.post("/api/v1/weather/assess-route", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# 19. API endpoint 404 for invalid vessel
def test_route_environmental_assessment_api_404_vessel():
    payload = {
        "route_id": "RT-SG-RTM-SUEZ",
        "vessel_id": "VES-NONEXISTENT",
        "speed_knots": 14.0
    }
    response = client.post("/api/v1/weather/assess-route", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# 20. API endpoints GET segments and scenarios
def test_weather_segments_and_scenarios_api_endpoints():
    r_segs = client.get("/api/v1/weather/segments")
    assert r_segs.status_code == 200
    segs = r_segs.json()
    assert len(segs) == 13

    r_scen = client.get("/api/v1/weather/scenarios")
    assert r_scen.status_code == 200
    scens = r_scen.json()
    assert len(scens) == 5
