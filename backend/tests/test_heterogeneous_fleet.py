from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.data.ingestion.fuel_ingestion import FuelEmissionIngestionService
from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    SimulatedAnnealingConfig,
    QuantumInspiredOptimizationRequest,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import (
    QuantumInspiredVoyageOptimizer,
)
from backend.app.api.v1.endpoints.fuel import get_fuel_service

client = TestClient(app)

EXP_FLEET_IDS = {"VES-001", "VES-002", "VES-003", "VES-004", "VES-005", "VES-006"}

EXPECTED_VESSEL_PROFILES = {
    "VES-001": {
        "name": "Poseidon Leader",
        "type": "Ultra Large Container Vessel (ULCV)",
        "capacity_tonnes": 120000.0,
        "fuel_options": ["HFO", "LNG", "METHANOL"],
    },
    "VES-002": {
        "name": "Green Horizon",
        "type": "Post-Panamax Bulk Carrier",
        "capacity_tonnes": 82000.0,
        "fuel_options": ["HFO", "MDO", "AMMONIA"],
    },
    "VES-003": {
        "name": "Oceanic Pioneer",
        "type": "Aframax Product Tanker",
        "capacity_tonnes": 115000.0,
        "fuel_options": ["HFO", "MDO"],
    },
    "VES-004": {
        "name": "Proto Gas Carrier (Ref Profile)",
        "type": "LNG Carrier (Q-Flex Class)",
        "capacity_tonnes": 95000.0,
        "min_speed_knots": 11.0,
        "max_speed_knots": 20.0,
        "engine_power_kw": 32000.0,
        "design_draft_m": 12.5,
        "fuel_options": ["LNG", "MDO"],
    },
    "VES-005": {
        "name": "Proto Ro-Ro Voyager (Ref Profile)",
        "type": "Pure Car & Truck Carrier / Ro-Ro",
        "capacity_tonnes": 25000.0,
        "min_speed_knots": 10.0,
        "max_speed_knots": 19.0,
        "engine_power_kw": 15000.0,
        "design_draft_m": 9.5,
        "fuel_options": ["MDO", "HFO"],
    },
    "VES-006": {
        "name": "Proto Feeder Express (Ref Profile)",
        "type": "Regional Feeder Container Vessel",
        "capacity_tonnes": 35000.0,
        "min_speed_knots": 10.0,
        "max_speed_knots": 19.5,
        "engine_power_kw": 18000.0,
        "design_draft_m": 11.0,
        "fuel_options": ["MDO", "METHANOL"],
    },
}


def test_heterogeneous_fleet_ingestion_service():
    """Verify FuelEmissionIngestionService dynamically loads all 6 vessel profiles with the 9-field schema."""
    svc = FuelEmissionIngestionService()
    vessels = svc.load_vessels()

    assert len(vessels) == 6
    assert set(vessels.keys()) == EXP_FLEET_IDS

    for vid, expected in EXPECTED_VESSEL_PROFILES.items():
        v = vessels[vid]
        assert v.id == vid
        assert v.name == expected["name"]
        assert v.type == expected["type"]
        assert v.capacity_tonnes == expected["capacity_tonnes"]
        for fuel in expected["fuel_options"]:
            assert fuel in v.fuel_options
        # 9-field contract checks
        assert v.min_speed_knots > 0
        assert v.max_speed_knots > v.min_speed_knots
        assert v.engine_power_kw > 0
        assert v.design_draft_m > 0
        assert len(v.fuel_options) >= 1


def test_heterogeneous_fleet_runtime_api():
    """Verify GET /api/v1/fuel/vessels delivers the expanded heterogeneous fleet through the external path."""
    resp = client.get("/api/v1/fuel/vessels")
    assert resp.status_code == 200
    vessels = resp.json()
    assert len(vessels) == 6
    vessel_map = {v["id"]: v for v in vessels}

    for vid, expected in EXPECTED_VESSEL_PROFILES.items():
        assert vid in vessel_map
        v = vessel_map[vid]
        assert v["name"] == expected["name"]
        assert v["type"] == expected["type"]
        assert v["capacity_tonnes"] == expected["capacity_tonnes"]
        # Verify non-fabrication: newly added records are labelled reference profiles
        if vid in {"VES-004", "VES-005", "VES-006"}:
            assert "Proto" in v["name"] or "Ref Profile" in v["name"]


def test_individual_vessel_profiles_via_service():
    """Verify FuelIntelligenceService.get_vessel_by_id returns correct individual profiles for all commercial classes."""
    svc = get_fuel_service()
    for vid, expected in EXPECTED_VESSEL_PROFILES.items():
        v = svc.get_vessel_by_id(vid)
        assert v is not None
        assert v.id == vid
        assert v.type == expected["type"]
        assert v.capacity_tonnes == expected["capacity_tonnes"]


def test_classical_optimization_lng_carrier():
    """Verify classical optimization can evaluate the prototype LNG Carrier (VES-004)."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    req = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=70000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=35),
        vessel_ids=["VES-004"],
        speed_grid_step_knots=1.0,
        currency="USD",
    )
    opt = ClassicalVoyageOptimizer()
    resp = opt.optimize(req)

    assert resp.cost_efficient.global_best is not None
    best = resp.cost_efficient.global_best
    assert best.vessel_id == "VES-004"
    assert best.fuel_id in ("LNG", "MDO")
    assert 11.0 <= best.cruising_speed_knots <= 20.0
    assert best.is_feasible is True


def test_classical_optimization_roro_and_feeder():
    """Verify classical optimization evaluates Ro-Ro (VES-005) and Feeder (VES-006) for suitable cargo."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    # Ro-Ro test with 18,000t cargo (fits within 25,000t capacity)
    req_roro = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=18000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=38),
        vessel_ids=["VES-005"],
        speed_grid_step_knots=1.0,
    )
    opt = ClassicalVoyageOptimizer()
    resp_roro = opt.optimize(req_roro)
    assert resp_roro.cost_efficient.global_best is not None
    assert resp_roro.cost_efficient.global_best.vessel_id == "VES-005"
    assert resp_roro.cost_efficient.global_best.fuel_id in ("MDO", "HFO")

    # Feeder test with 25,000t cargo (fits within 35,000t capacity)
    req_feeder = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=25000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=38),
        vessel_ids=["VES-006"],
        speed_grid_step_knots=1.0,
    )
    resp_feeder = opt.optimize(req_feeder)
    assert resp_feeder.cost_efficient.global_best is not None
    assert resp_feeder.cost_efficient.global_best.vessel_id == "VES-006"
    assert resp_feeder.cost_efficient.global_best.fuel_id in ("MDO", "METHANOL")


def test_capacity_constraint_differentiates_heterogeneous_fleet():
    """
    Verify capacity differentiation:
    Cargo of 50,000 tonnes must reject VES-005 (Ro-Ro, 25k) and VES-006 (Feeder, 35k),
    while permitting VES-001 (ULCV, 120k), VES-002 (Bulk, 82k), VES-003 (Tanker, 115k), and VES-004 (LNG, 95k).
    """
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    req = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=50000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=35),
        speed_grid_step_knots=1.0,
    )
    opt = ClassicalVoyageOptimizer()
    (
        evaluated_cands,
        feasible_cands,
        rejections,
        raw_count,
        feasible_count,
        _
    ) = opt.evaluate_all_candidates(req)

    # Rejections by capacity should include candidates for VES-005 and VES-006
    assert rejections["capacity"] > 0
    # Feasible candidates must only come from vessels with capacity >= 50,000
    feasible_vessels = {c.vessel_id for c in evaluated_cands if c.is_feasible}
    assert "VES-005" not in feasible_vessels
    assert "VES-006" not in feasible_vessels
    assert feasible_vessels.issubset({"VES-001", "VES-002", "VES-003", "VES-004"})


def test_quantum_inspired_optimization_heterogeneous_selection():
    """Verify quantum-inspired QUBO optimization with simulated annealing evaluates heterogeneous vessel types."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    voyage_req = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=20000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=35),
        vessel_ids=["VES-004", "VES-005", "VES-006"],
        speed_grid_step_knots=1.0,
        currency="USD",
    )
    q_opt = QuantumInspiredVoyageOptimizer()
    q_req = QuantumInspiredOptimizationRequest(
        voyage_request=voyage_req,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=3),
    )
    resp = q_opt.optimize(q_req)

    assert resp.status == "quantum_inspired_simulated_annealing"
    assert resp.best_solution is not None
    assert resp.best_solution.is_valid_one_hot is True
    assert resp.best_solution.is_feasible is True
    assert resp.best_solution.vessel_id in {"VES-004", "VES-005", "VES-006"}


def test_classical_multi_vessel_per_vessel_best():
    """Verify per-vessel best solutions are generated across multiple commercial vessel classes without hardcoding."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    req = VoyageOptimizationRequest(
        source_port_id="SGSIN",
        destination_port_id="NLRTM",
        cargo_weight_tonnes=20000.0,
        departure_datetime=now,
        deadline_datetime=now + timedelta(days=35),
        speed_grid_step_knots=1.0,
    )
    opt = ClassicalVoyageOptimizer()
    resp = opt.optimize(req)

    per_vessel = resp.cost_efficient.per_vessel_best
    assert len(per_vessel) >= 4  # multiple vessel classes successfully find feasible options

    for vid, cand in per_vessel.items():
        assert cand.is_feasible is True
        expected_spec = EXPECTED_VESSEL_PROFILES[vid]
        assert cand.fuel_id in expected_spec["fuel_options"]
