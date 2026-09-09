from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from backend.app.models.shipment import Shipment
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.route import Route, Checkpoint
from backend.app.models.weather import WeatherCondition
from backend.app.models.optimization import OptimizationRequest, VoyagePlan, ComparativeAnalysis

def test_shipment_schema_valid():
    s = Shipment(
        source="Port of Singapore",
        destination="Port of Rotterdam",
        cargo_weight=50000.0,
        deadline=datetime(2026, 10, 15, 12, 0)
    )
    assert s.source == "Port of Singapore"
    assert s.cargo_weight == 50000.0

def test_shipment_schema_invalid_weight():
    with pytest.raises(ValidationError):
        Shipment(
            source="Port of Singapore",
            destination="Port of Rotterdam",
            cargo_weight=-10.0,  # invalid negative
            deadline=datetime(2026, 10, 15)
        )

def test_vessel_schema():
    v = Vessel(
        id="IMO-9811000",
        name="Pacific Voyager",
        type="Container",
        capacity=65000.0,
        max_speed=22.0,
        min_speed=10.0,
        fuel_options=["VLSFO", "LNG"]
    )
    assert v.id == "IMO-9811000"
    assert "LNG" in v.fuel_options

def test_fuel_schema():
    f = Fuel(
        id="VLSFO",
        name="Very Low Sulfur Fuel Oil",
        price=620.0,
        emission_factor=3.151
    )
    assert f.price == 620.0
    assert f.emission_factor == 3.151

def test_route_schema():
    r = Route(
        id="RT-01",
        name="Test Route",
        source="Singapore",
        destination="Rotterdam",
        distance=8300.0,
        checkpoints=[
            Checkpoint(name="CP1", latitude=1.2, longitude=103.8, sequence_order=1)
        ]
    )
    assert r.distance == 8300.0
    assert len(r.checkpoints) == 1
    assert r.checkpoints[0].latitude == 1.2

def test_weather_condition_schema():
    w = WeatherCondition(
        timestamp=datetime.now(timezone.utc),
        wind=15.0,
        wave=1.8,
        current=0.5,
        sea_state=3,
        risk="low"
    )

    assert w.wind == 15.0
    assert w.sea_state == 3
    assert w.risk == "low"

def test_comparative_analysis_schema():
    plan_c = VoyagePlan(
        algorithm_name="Classical",
        route_id="RT-01",
        vessel_id="VES-01",
        fuel_id="VLSFO",
        planned_speed_knots=14.0,
        estimated_transit_hours=500.0,
        estimated_fuel_tonnes=1000.0,
        estimated_fuel_cost_usd=620000.0,
        estimated_co2_tonnes=3151.0
    )
    plan_q = VoyagePlan(
        algorithm_name="Quantum-Inspired",
        route_id="RT-01",
        vessel_id="VES-01",
        fuel_id="LNG",
        planned_speed_knots=13.5,
        estimated_transit_hours=515.0,
        estimated_fuel_tonnes=880.0,
        estimated_fuel_cost_usd=598400.0,
        estimated_co2_tonnes=2420.0
    )
    analysis = ComparativeAnalysis(
        request_id="REQ-001",
        classical_plan=plan_c,
        quantum_plan=plan_q,
        fuel_saved_tonnes=120.0,
        cost_saved_usd=21600.0,
        co2_saved_tonnes=731.0,
        efficiency_gain_pct=3.48
    )
    assert analysis.fuel_saved_tonnes == 120.0
