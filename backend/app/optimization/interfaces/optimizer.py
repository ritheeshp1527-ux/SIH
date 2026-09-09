from abc import ABC, abstractmethod
from backend.app.models.optimization import OptimizationRequest, VoyagePlan
from backend.app.models.vessel import Vessel
from backend.app.models.route import Route
from backend.app.models.fuel import Fuel
from typing import List

class VoyageOptimizerBase(ABC):
    """
    Abstract Port for Voyage and Fleet Optimization Solvers.
    Enforces uniform execution signature across Classical (Dijkstra/A*/MIP)
    and Quantum-Inspired (QUBO / Simulated Annealing) solvers.
    """

    @property
    @abstractmethod
    def algorithm_name(self) -> str:
        """Returns the canonical name of the optimizer algorithm."""
        pass

    @abstractmethod
    def solve(
        self,
        request: OptimizationRequest,
        candidate_routes: List[Route],
        candidate_vessels: List[Vessel],
        available_fuels: List[Fuel]
    ) -> VoyagePlan:
        """
        Executes optimization and returns the selected VoyagePlan.
        """
        pass
