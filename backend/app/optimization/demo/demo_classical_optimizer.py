from typing import List
from backend.app.optimization.interfaces.optimizer import VoyageOptimizerBase
from backend.app.models.optimization import OptimizationRequest, VoyagePlan
from backend.app.models.vessel import Vessel
from backend.app.models.route import Route
from backend.app.models.fuel import Fuel
from backend.app.services.demo.demo_fuel_model import DemoFuelModel

class DemoClassicalOptimizer(VoyageOptimizerBase):
    """
    Demo Classical Voyage Optimizer Skeleton.
    Represents standard baseline route selection (e.g. shortest distance / cost-optimal discrete speed under the current deterministic demo model).
    Full algorithmic implementation (Dijkstra/A* multi-objective) will be implemented in Phase 4.
    """

    def __init__(self):
        self._fuel_model = DemoFuelModel()

    @property
    def algorithm_name(self) -> str:
        return "Classical-Baseline-Eco"

    def solve(
        self,
        request: OptimizationRequest,
        candidate_routes: List[Route],
        candidate_vessels: List[Vessel],
        available_fuels: List[Fuel]
    ) -> VoyagePlan:
        selected_route = candidate_routes[0] if candidate_routes else Route(
            id="RT-DEMO-01",
            name="Default Sea Route",
            source=request.source,
            destination=request.destination,
            distance=8000.0
        )
        selected_vessel = candidate_vessels[0] if candidate_vessels else Vessel(
            id="VES-DEMO",
            name="Standard Carrier",
            type="Container",
            capacity=max(request.cargo_weight * 1.2, 50000.0),
            max_speed=20.0,
            min_speed=12.0,
            fuel_options=["VLSFO"]
        )
        selected_fuel = available_fuels[0] if available_fuels else Fuel(
            id="VLSFO",
            name="Very Low Sulfur Fuel Oil",
            price=620.0,
            emission_factor=3.151
        )

        # Baseline standard cruising speed
        speed = 14.0
        transit_hours = round(selected_route.distance / speed, 1)
        fuel_tonnes = self._fuel_model.calculate_consumption(
            vessel=selected_vessel,
            fuel=selected_fuel,
            distance_nm=selected_route.distance,
            speed_knots=speed,
            cargo_weight=request.cargo_weight
        )
        cost_usd = round(fuel_tonnes * selected_fuel.price, 2)
        co2_tonnes = round(fuel_tonnes * selected_fuel.emission_factor, 2)

        return VoyagePlan(
            algorithm_name=self.algorithm_name,
            route_id=selected_route.id,
            vessel_id=selected_vessel.id,
            fuel_id=selected_fuel.id,
            planned_speed_knots=speed,
            estimated_transit_hours=transit_hours,
            estimated_fuel_tonnes=fuel_tonnes,
            estimated_fuel_cost_usd=cost_usd,
            estimated_co2_tonnes=co2_tonnes,
            feasibility_score=1.0,
            notes="Phase 0 Baseline Heuristic (Simulated)"
        )
