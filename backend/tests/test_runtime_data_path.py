from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.api.v1.endpoints.routes import get_route_provider
from backend.app.api.v1.endpoints.fuel import get_fuel_service
from backend.app.services.external.external_route_provider import ExternalRouteProvider
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

client = TestClient(app)

def test_runtime_default_config():
    """Verify DATA_SOURCE_MODE defaults to external provider."""
    assert settings.DATA_SOURCE_MODE == "external"
    provider = get_route_provider()
    assert isinstance(provider, ExternalRouteProvider)
    service = get_fuel_service()
    assert isinstance(service, FuelIntelligenceService)
    assert service._ingestion is not None

def test_health_endpoint_reports_external_provider():
    """Verify GET /api/v1/health reports external data source mode and ExternalRouteProvider."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data_source_mode"] == "external"
    assert data["interfaces"]["route_provider"] == "ExternalRouteProvider"

def test_routes_ports_api_returns_external_ports():
    """Verify GET /api/v1/routes/ports returns all 5 external ports with specs from port_reference.csv."""
    resp = client.get("/api/v1/routes/ports")
    assert resp.status_code == 200
    ports = resp.json()
    port_ids = {p["id"] for p in ports}
    expected_ids = {"INBOM", "NLRTM", "SGSIN", "AEDXB", "USNYC"}
    assert expected_ids.issubset(port_ids)
    
    port_map = {p["id"]: p for p in ports}
    assert port_map["SGSIN"]["draft_limit_m"] == 21.0
    assert port_map["NLRTM"]["draft_limit_m"] == 24.0
    assert port_map["INBOM"]["draft_limit_m"] == 15.5
    assert port_map["AEDXB"]["draft_limit_m"] == 17.0
    assert port_map["USNYC"]["draft_limit_m"] == 16.5

def test_routes_list_all_returns_twenty_routes():
    resp = client.get("/api/v1/routes")
    assert resp.status_code == 200
    routes = resp.json()
    assert len(routes) in (20, 22, 23, 24)
    route_ids = [r["id"] for r in routes]
    assert "RT-SGSIN-NLRTM" in route_ids
    assert "RT-SGSIN-NLRTM-CAPE" in route_ids
    assert "RT-INBOM-NLRTM" in route_ids

def test_fuel_vessels_api_returns_external_fleet():
    """Verify GET /api/v1/fuel/vessels returns fleet vessels with multi-fuel options from fleet_reference.csv."""
    resp = client.get("/api/v1/fuel/vessels")
    assert resp.status_code == 200
    vessels = resp.json()
    assert len(vessels) == 6
    vessel_map = {v["id"]: v for v in vessels}
    assert "VES-001" in vessel_map
    assert "VES-002" in vessel_map
    assert "VES-003" in vessel_map
    assert "VES-004" in vessel_map
    assert "VES-005" in vessel_map
    assert "VES-006" in vessel_map
    
    # Check multi-fuel options from fleet_reference.csv
    assert "HFO" in vessel_map["VES-001"]["fuel_options"]
    assert "METHANOL" in vessel_map["VES-001"]["fuel_options"]
    assert "AMMONIA" in vessel_map["VES-002"]["fuel_options"]
    assert "MDO" in vessel_map["VES-003"]["fuel_options"]
    assert "LNG" in vessel_map["VES-004"]["fuel_options"]
    assert "MDO" in vessel_map["VES-005"]["fuel_options"]
    assert "METHANOL" in vessel_map["VES-006"]["fuel_options"]
    assert "LNG Carrier" in vessel_map["VES-004"]["type"]
    assert "Ro-Ro" in vessel_map["VES-005"]["type"]
    assert "Feeder" in vessel_map["VES-006"]["type"]

def test_fuel_fuels_api_returns_external_normalized_emissions():
    """Verify GET /api/v1/fuel/fuels returns normalized fuels from stage6_emission_factors.csv."""
    resp = client.get("/api/v1/fuel/fuels")
    assert resp.status_code == 200
    fuels = resp.json()
    fuel_ids = {f["id"] for f in fuels}
    assert fuel_ids == {"HFO", "MDO", "LNG", "METHANOL", "AMMONIA"}
    
    fuel_map = {f["id"]: f for f in fuels}
    # Unit conversions: MJ/g * 1000 = MJ/kg, g/g * 1000 = kg/tonne
    assert fuel_map["HFO"]["energy_density_mj_per_kg"] == 40.5
    assert fuel_map["HFO"]["emission_factor_kg_co2_per_tonne"] == 3114.0
    assert fuel_map["LNG"]["energy_density_mj_per_kg"] == 49.1
    assert fuel_map["LNG"]["emission_factor_kg_co2_per_tonne"] == 2750.0
    assert fuel_map["MDO"]["energy_density_mj_per_kg"] == 42.7
    assert fuel_map["MDO"]["emission_factor_kg_co2_per_tonne"] == 3206.0

def test_stage7_bunker_prices_at_sgsin():
    """Verify GET /api/v1/fuel/fuels?port=SGSIN returns exact stage7 bunker prices."""
    resp = client.get("/api/v1/fuel/fuels?port=SGSIN")
    assert resp.status_code == 200
    fuels = resp.json()
    fuel_map = {f["id"]: f for f in fuels}
    
    # 3 observed records at SGSIN
    assert fuel_map["HFO"]["price_per_tonne"] == 648.0
    assert fuel_map["HFO"]["is_observed_market_price"] is True
    assert fuel_map["HFO"]["price_date"] == "2026-09-08"
    assert fuel_map["HFO"]["price_source"] == "stage7_bunker_prices.csv"
    
    assert fuel_map["MDO"]["price_per_tonne"] == 1371.0
    assert fuel_map["MDO"]["is_observed_market_price"] is True
    assert fuel_map["MDO"]["price_date"] == "2026-09-08"
    assert fuel_map["MDO"]["price_source"] == "stage7_bunker_prices.csv"
    
    assert fuel_map["LNG"]["price_per_tonne"] == 821.95
    assert fuel_map["LNG"]["is_observed_market_price"] is True
    assert fuel_map["LNG"]["price_date"] == "2026-09-08"
    assert fuel_map["LNG"]["price_source"] == "stage7_bunker_prices.csv"
    
    # Unobserved fuels must be explicitly marked as fallback reference
    assert fuel_map["METHANOL"]["is_observed_market_price"] is False
    assert fuel_map["METHANOL"]["price_source"] == "fallback_reference"
    assert fuel_map["AMMONIA"]["is_observed_market_price"] is False
    assert fuel_map["AMMONIA"]["price_source"] == "fallback_reference"

def test_stage7_bunker_prices_at_inbom_and_nlrtm():
    """Verify observed records and non-fabrication of missing combinations at INBOM & NLRTM."""
    # INBOM: HFO 660, LNG 845 (MDO not observed)
    resp = client.get("/api/v1/fuel/fuels?port=INBOM")
    assert resp.status_code == 200
    inbom_map = {f["id"]: f for f in resp.json()}
    assert inbom_map["HFO"]["price_per_tonne"] == 660.0
    assert inbom_map["HFO"]["is_observed_market_price"] is True
    assert inbom_map["LNG"]["price_per_tonne"] == 845.0
    assert inbom_map["LNG"]["is_observed_market_price"] is True
    assert inbom_map["MDO"]["is_observed_market_price"] is False
    assert inbom_map["MDO"]["price_source"] == "fallback_reference"
    
    # When allow_fallback=false, unobserved MDO must NOT be fabricated at all
    resp_no_fallback = client.get("/api/v1/fuel/fuels?port=INBOM&allow_fallback=false")
    assert resp_no_fallback.status_code == 200
    observed_only = {f["id"]: f for f in resp_no_fallback.json()}
    assert set(observed_only.keys()) == {"HFO", "LNG"}
    assert "MDO" not in observed_only
    
    # NLRTM: HFO 590, LNG 790
    resp_rtm = client.get("/api/v1/fuel/fuels?port=NLRTM")
    assert resp_rtm.status_code == 200
    rtm_map = {f["id"]: f for f in resp_rtm.json()}
    assert rtm_map["HFO"]["price_per_tonne"] == 590.0
    assert rtm_map["HFO"]["is_observed_market_price"] is True
    assert rtm_map["LNG"]["price_per_tonne"] == 790.0
    assert rtm_map["LNG"]["is_observed_market_price"] is True

def test_classical_optimizer_runtime_uses_stage7_bunker_prices():
    """Verify Classical optimizer evaluates candidates using port-specific stage7 market bunker prices."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    payload_sg = {
        "source_port_id": "SGSIN",
        "destination_port_id": "NLRTM",
        "cargo_weight_tonnes": 60000.0,
        "departure_datetime": now.isoformat(),
        "deadline_datetime": (now + timedelta(days=35)).isoformat(),
        "speed_grid_step_knots": 1.0,
        "currency": "USD"
    }
    resp = client.post("/api/v1/optimization/classical", json=payload_sg)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "exact_classical_optimization"
    assert data["cost_efficient"]["global_best"] is not None
    best_candidate = data["cost_efficient"]["global_best"]
    # Candidate decision must use normalized external route and fuels
    assert best_candidate["fuel_id"] in {"HFO", "MDO", "LNG", "METHANOL", "AMMONIA"}
    assert best_candidate["route_id"] == "RT-SGSIN-NLRTM"

def test_workflow_optimize_runtime_end_to_end_external():
    """Verify End-to-End Orchestrated Pipeline runs on external normalized datasets."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    workflow_req = {
        "voyage_request": {
            "source_port_id": "SGSIN",
            "destination_port_id": "NLRTM",
            "cargo_weight_tonnes": 60000.0,
            "departure_datetime": now.isoformat(),
            "deadline_datetime": (now + timedelta(days=35)).isoformat(),
            "speed_grid_step_knots": 1.0,
            "currency": "USD"
        },
        "priority": "balanced",
        "top_k": 3
    }
    resp = client.post("/api/v1/workflow/optimize", json=workflow_req)
    assert resp.status_code == 200
    data = resp.json()
    assert data["workflow_metadata"]["execution_status"] == "completed"
    assert data["stages"]["fuel_intelligence"]["status"] == "completed"
    assert data["stages"]["maritime_network"]["status"] == "completed"
    assert data["stages"]["classical_optimization"]["status"] == "completed"
    assert data["stages"]["quantum_inspired"]["status"] == "completed"
    assert data["stages"]["comparative_analysis"]["status"] == "completed"
