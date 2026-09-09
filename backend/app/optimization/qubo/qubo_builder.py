import math
from typing import List, Dict, Tuple, Any, Optional
from dataclasses import dataclass, field

from backend.app.models.optimization import (
    VoyageCandidate,
    QUBOVariableMapping,
    QUBOModelSummary,
)

@dataclass
class QUBOModel:
    """
    Independent, inspectable QUBO Model representing:
      minimize  x^T Q x + constant_offset
      subject to  x_i in {0, 1}
    
    The model is constructed from candidate maritime voyage decisions.
    """
    variable_ids: List[str]
    variable_to_candidate: Dict[int, VoyageCandidate]
    variable_mappings: List[QUBOVariableMapping]
    linear_coefficients: Dict[int, float]  # Q_ii = w_i - P
    quadratic_coefficients: Dict[Tuple[int, int], float]  # (i, j) -> 2P for i < j
    constant_offset: float  # P
    objective_mode: str  # 'cost' or 'time'
    normalization_min: float
    normalization_max: float
    normalization_scale: float
    penalty_magnitude: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def num_variables(self) -> int:
        return len(self.variable_ids)

    def evaluate_energy(self, x: List[int]) -> float:
        """
        Calculates exact objective energy H(x) = x^T Q x + constant_offset.
        
        Expanded:
          H(x) = sum_i Q_ii * x_i + sum_{i < j} Q_ij * x_i * x_j + constant_offset
        """
        if len(x) != self.num_variables:
            raise ValueError(f"State vector length {len(x)} does not match variable count {self.num_variables}")

        # Linear term
        energy = 0.0
        for i, xi in enumerate(x):
            if xi:
                energy += self.linear_coefficients.get(i, 0.0)

        # Quadratic coupling terms
        for (i, j), coeff in self.quadratic_coefficients.items():
            if x[i] and x[j]:
                energy += coeff

        energy += self.constant_offset
        return energy

    def evaluate_delta_energy(self, x: List[int], flip_idx: int) -> float:
        """
        Computes exact change in energy Delta H when bit x[flip_idx] is inverted (0 -> 1 or 1 -> 0).
        Achieves O(N) complexity for fast Simulated Annealing steps.
        
        Delta H = (1 - 2*x_k) * ( Q_kk + sum_{j != k} Q_{min(k,j), max(k,j)} * x_j )
        """
        k = flip_idx
        delta_x = 1 - 2 * x[k]  # +1 if currently 0 -> becoming 1; -1 if currently 1 -> becoming 0
        q_kk = self.linear_coefficients.get(k, 0.0)
        
        coupling_sum = 0.0
        # For all j != k:
        for j in range(self.num_variables):
            if j == k or x[j] == 0:
                continue
            pair = (min(k, j), max(k, j))
            coupling_sum += self.quadratic_coefficients.get(pair, 0.0)
            
        return delta_x * (q_kk + coupling_sum)

    def get_symmetric_matrix(self) -> Dict[Tuple[int, int], float]:
        """
        Returns the QUBO matrix in symmetric form: Q_sym[i, j] = Q_sym[j, i] = P for i != j,
        and Q_sym[i, i] = Q_ii.
        """
        sym_q: Dict[Tuple[int, int], float] = {}
        for i in range(self.num_variables):
            sym_q[(i, i)] = self.linear_coefficients.get(i, 0.0)
            
        half_p = self.penalty_magnitude
        for (i, j) in self.quadratic_coefficients.keys():
            sym_q[(i, j)] = half_p
            sym_q[(j, i)] = half_p
        return sym_q

    def to_summary(self, preview_limit: int = 20) -> QUBOModelSummary:
        """
        Produces a serializable, human-inspectable summary of the QUBO model.
        """
        sample_linear = {
            f"Q_{i}_{i}": round(self.linear_coefficients[i], 6)
            for i in range(min(preview_limit, self.num_variables))
        }
        
        sample_quadratic = {}
        for count, ((i, j), val) in enumerate(self.quadratic_coefficients.items()):
            if count >= preview_limit:
                break
            sample_quadratic[f"Q_{i}_{j}"] = round(val, 6)

        return QUBOModelSummary(
            num_variables=self.num_variables,
            num_nonzero_coefficients=len(self.linear_coefficients) + len(self.quadratic_coefficients),
            objective_mode=self.objective_mode,
            penalty_magnitude=round(self.penalty_magnitude, 4),
            penalty_strategy=(
                f"P = {self.penalty_magnitude:.4f} derived via safety_multiplier * max(1.0, scale). "
                "Guarantees any invalid selection sum(x) != 1 has energy >= P, strictly dominating valid single selections in [0, 1]."
            ),
            normalization_scale={
                "min": round(self.normalization_min, 4),
                "max": round(self.normalization_max, 4),
                "scale_delta": round(self.normalization_scale, 4)
            },
            constant_offset=round(self.constant_offset, 4),
            variable_mappings_preview=self.variable_mappings[:preview_limit],
            sample_linear_coefficients=sample_linear,
            sample_quadratic_coefficients=sample_quadratic
        )


class QUBOBuilder:
    """
    Constructs a Quadratic Unconstrained Binary Optimization (QUBO) model from Phase 4 candidates.
    
    Mathematical Formulation:
      Variables: x_i in {0, 1} for each feasible candidate i in 0 .. N-1.
      Objective: minimize sum_i w_i * x_i  where w_i is normalized cost or time in [0, 1].
      Constraint: sum_i x_i = 1 (exactly one voyage decision must be selected).
      Penalty: P * (sum_i x_i - 1)^2 = P * [ -sum_i x_i + 2 * sum_{i < j} x_i * x_j + 1 ].
      Combined Hamiltonian:
        H(x) = sum_i (w_i - P) * x_i + sum_{i < j} 2P * x_i * x_j + P
    """

    def __init__(self, safety_multiplier: float = 2.5):
        """
        Args:
            safety_multiplier: Multiplier used to scale penalty magnitude P above the objective span.
                               Default 2.5 ensures invalid states have energy >= 2.5, while valid states are in [0, 1].
        """
        self.safety_multiplier = safety_multiplier

    def build_qubo(
        self,
        candidates: List[VoyageCandidate],
        objective_mode: str = "cost"
    ) -> QUBOModel:
        """
        Builds the inspectable QUBOModel from a collection of evaluated voyage candidates.
        
        Args:
            candidates: List of feasible VoyageCandidate objects from Phase 4.
            objective_mode: 'cost' (total voyage cost) or 'time' (total voyage duration).
            
        Returns:
            QUBOModel instance ready for Simulated Annealing or inspection.
        """
        if objective_mode not in ("cost", "time"):
            raise ValueError(f"Unsupported objective_mode '{objective_mode}'. Must be 'cost' or 'time'.")

        if not candidates:
            raise ValueError("Cannot construct QUBO model with zero candidate decisions.")

        # 1. Extract raw objective values
        raw_values: List[float] = []
        for c in candidates:
            if objective_mode == "cost":
                raw_values.append(c.total_voyage_cost_usd)
            else:
                raw_values.append(c.total_voyage_time_hours)

        v_min = min(raw_values)
        v_max = max(raw_values)
        delta_v = v_max - v_min

        # 2. Min-max normalization: w_i = (v_i - v_min) / delta_v in [0, 1]
        scale = delta_v if delta_v > 1e-6 else 1.0
        normalized_weights: List[float] = []
        for v in raw_values:
            if delta_v > 1e-6:
                normalized_weights.append((v - v_min) / scale)
            else:
                normalized_weights.append(0.0)

        # 3. Transparent Penalty Magnitude Strategy
        # Since w_i in [0, 1], maximum possible objective variation between valid states is 1.0.
        # An invalid state has (sum x_i - 1)^2 >= 1.
        # Setting P = safety_multiplier * 1.0 guarantees any invalid state energy >= P > 1.0 >= any valid state energy.
        penalty_p = self.safety_multiplier * 1.0

        # 4. Build Linear and Quadratic Terms
        N = len(candidates)
        variable_ids: List[str] = [f"x_{i}" for i in range(N)]
        var_to_candidate: Dict[int, VoyageCandidate] = {}
        variable_mappings: List[QUBOVariableMapping] = []

        linear_coeffs: Dict[int, float] = {}
        for i in range(N):
            c = candidates[i]
            var_to_candidate[i] = c
            
            # Linear diagonal: Q_ii = w_i - P
            w_i = normalized_weights[i]
            linear_coeffs[i] = w_i - penalty_p
            
            variable_mappings.append(
                QUBOVariableMapping(
                    variable_index=i,
                    variable_id=variable_ids[i],
                    decision_id=c.decision_id,
                    vessel_id=c.vessel_id,
                    route_id=c.route_id,
                    fuel_id=c.fuel_id,
                    speed_knots=c.cruising_speed_knots,
                    raw_objective_value=raw_values[i],
                    normalized_objective_value=round(w_i, 6)
                )
            )

        # Quadratic coupling terms: Q_ij = 2P for all i < j
        quadratic_coeffs: Dict[Tuple[int, int], float] = {}
        two_p = 2.0 * penalty_p
        for i in range(N):
            for j in range(i + 1, N):
                quadratic_coeffs[(i, j)] = two_p

        # Constant scalar offset from (sum x - 1)^2 is +P
        constant_offset = penalty_p

        metadata = {
            "num_candidates": N,
            "objective_mode": objective_mode,
            "raw_min": v_min,
            "raw_max": v_max,
            "raw_delta": delta_v,
            "safety_multiplier": self.safety_multiplier,
            "penalty_p": penalty_p,
            "candidate_level_filtering_applied": True,
            "selection_level_constraint": "sum(x_i) == 1"
        }

        return QUBOModel(
            variable_ids=variable_ids,
            variable_to_candidate=var_to_candidate,
            variable_mappings=variable_mappings,
            linear_coefficients=linear_coeffs,
            quadratic_coefficients=quadratic_coeffs,
            constant_offset=constant_offset,
            objective_mode=objective_mode,
            normalization_min=v_min,
            normalization_max=v_max,
            normalization_scale=scale,
            penalty_magnitude=penalty_p,
            metadata=metadata
        )
