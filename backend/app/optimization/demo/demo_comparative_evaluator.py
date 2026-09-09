from datetime import datetime, timezone
from backend.app.optimization.interfaces.evaluator import ComparativeEvaluatorBase
from backend.app.models.optimization import VoyagePlan, ComparativeAnalysis

class DemoComparativeEvaluator(ComparativeEvaluatorBase):
    """
    Demo Comparative Analysis Evaluator.
    Computes delta metrics between classical baseline and quantum-inspired output.
    """

    def evaluate(
        self,
        request_id: str,
        classical_plan: VoyagePlan,
        quantum_plan: VoyagePlan
    ) -> ComparativeAnalysis:
        fuel_diff = round(classical_plan.estimated_fuel_tonnes - quantum_plan.estimated_fuel_tonnes, 2)
        cost_diff = round(classical_plan.estimated_fuel_cost_usd - quantum_plan.estimated_fuel_cost_usd, 2)
        co2_diff = round(classical_plan.estimated_co2_tonnes - quantum_plan.estimated_co2_tonnes, 2)

        baseline_cost = max(classical_plan.estimated_fuel_cost_usd, 1.0)
        pct_gain = round((cost_diff / baseline_cost) * 100, 2)

        return ComparativeAnalysis(
            request_id=request_id,
            timestamp=datetime.now(timezone.utc),

            classical_plan=classical_plan,
            quantum_plan=quantum_plan,
            fuel_saved_tonnes=fuel_diff,
            cost_saved_usd=cost_diff,
            co2_saved_tonnes=co2_diff,
            efficiency_gain_pct=pct_gain
        )
