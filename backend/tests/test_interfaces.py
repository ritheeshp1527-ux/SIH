from datetime import datetime, timezone
from backend.app.services.interfaces.fuel_model import FuelConsumptionModelBase
from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.services.interfaces.weather_provider import WeatherProviderBase
from backend.app.optimization.interfaces.optimizer import VoyageOptimizerBase
from backend.app.optimization.interfaces.evaluator import ComparativeEvaluatorBase

from backend.app.services.demo.demo_fuel_model import DemoFuelModel
from backend.app.services.demo.demo_route_provider import DemoRouteProvider
from backend.app.services.demo.demo_weather_provider import DemoWeatherProvider
from backend.app.optimization.demo.demo_classical_optimizer import DemoClassicalOptimizer
from backend.app.optimization.demo.demo_quantum_optimizer import DemoQuantumOptimizer
from backend.app.optimization.demo.demo_comparative_evaluator import DemoComparativeEvaluator

from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.optimization import OptimizationRequest

def test_fuel_model_interface_subclass():
    model = DemoFuelModel()
    assert isinstance(model, FuelConsumptionModelBase)
    
    v = Vessel(id="V1", name="Test Ship", type="Bulk", capacity=50000, max_speed=18, min_speed=10, fuel_options=["VLSFO"])
    f = Fuel(id="VLSFO", name="VLSFO", price=600, emission_factor=3.15)
    consumption = model.calculate_consumption(v, f, distance_nm=1000, speed_knots=14, cargo_weight=40000)
    assert consumption > 0

def test_route_provider_interface():
    provider = DemoRouteProvider()
    assert isinstance(provider, RouteProviderBase)
    routes = provider.get_routes("Singapore", "Rotterdam")
    assert len(routes) >= 1
    assert routes[0].distance > 0

def test_weather_provider_interface():
    provider = DemoWeatherProvider()
    assert isinstance(provider, WeatherProviderBase)
    conditions = provider.get_route_weather("RT-SG-RTM-SUEZ", datetime.now(timezone.utc))
    assert isinstance(conditions, list)
    assert len(conditions) > 0


def test_optimizer_interfaces():
    classical = DemoClassicalOptimizer()
    quantum = DemoQuantumOptimizer()
    evaluator = DemoComparativeEvaluator()

    assert isinstance(classical, VoyageOptimizerBase)
    assert isinstance(quantum, VoyageOptimizerBase)
    assert isinstance(evaluator, ComparativeEvaluatorBase)

    req = OptimizationRequest(
        source="Singapore",
        destination="Rotterdam",
        cargo_weight=45000,
        deadline=datetime(2026, 10, 1)
    )
    plan_c = classical.solve(req, [], [], [])
    plan_q = quantum.solve(req, [], [], [])
    assert plan_c.estimated_fuel_tonnes > 0
    assert plan_q.estimated_fuel_tonnes > 0

    comparison = evaluator.evaluate("REQ-TEST", plan_c, plan_q)
    assert comparison.request_id == "REQ-TEST"
    assert comparison.efficiency_gain_pct is not None
