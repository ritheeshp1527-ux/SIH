from typing import List
from backend.app.optimization.interfaces.optimizer import VoyageOptimizerBase
from backend.app.models.optimization import OptimizationRequest, VoyagePlan
from backend.app.models.vessel import Vessel
from backend.app.models.route import Route
from backend.app.models.fuel import Fuel
from backend.app.services.demo.demo_fuel_model import DemoFuelModel

class DemoQuantumOptimizer(VoyageOptimizerBase):
    """
    Demo Quantum-Inspired Voyage Optimizer Skeleton.
    Represents future QUBO / Simulated Annealing formulation.
    NOTICE: This is an empty interface implementation for Phase 0 architectural alignment.
    The real Quantum-Inspired Annealer will be implemented in Phase 5.
    """

    def __init__(self):
        self._fuel_model = DemoFuelModel()

    @property
    def algorithm_name(self) -> str:
        return "Quantum-Inspired-QUBO-Simulated"

    def solve(
        self,
        request: OptimizationRequest,
        candidate_routes: List[Route],
        candidate_vessels: List[Vessel],
        available_fuels: List[Fuel]
    ) -> VoyagePlan:
        # For Phase 0 architectural demonstration, select cleanest fuel option and optimize speed profile
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
            fuel_options=["LNG"]
        )
        
        # Pick green fuel if present
        lng_fuels = [f for f in available_fuels if "LNG" in f.id or "BIO" in f.id]
        selected_fuel = lng_fuels[0] if lng_fuels else (available_fuels[0] if available_fuels else Fuel(
            id="LNG",
            name="Liquefied Natural Gas",
            price=680.0,
            emission_factor=2.75
        ))

        # Simulated optimal speed (slightly slowed down eco-steaming 13.2 knots)
        speed = 13.2
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
            notes="Phase 0 Interface Skeleton (Simulated Green Profile)"
        )
