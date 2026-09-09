from abc import ABC, abstractmethod
from backend.app.models.optimization import VoyagePlan, ComparativeAnalysis

class ComparativeEvaluatorBase(ABC):
    """
    Abstract Port for Comparative Analysis between Classical baseline and Quantum-inspired solution.
    """

    @abstractmethod
    def evaluate(
        self,
        request_id: str,
        classical_plan: VoyagePlan,
        quantum_plan: VoyagePlan
    ) -> ComparativeAnalysis:
        """
        Calculates savings metrics, efficiency delta, and return summary comparison.
        """
        pass
