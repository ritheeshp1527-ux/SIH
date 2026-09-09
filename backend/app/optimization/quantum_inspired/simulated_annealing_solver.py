import math
import random
import time
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field

from backend.app.optimization.qubo.qubo_builder import QUBOModel
from backend.app.models.optimization import SimulatedAnnealingConfig

@dataclass
class AnnealingResult:
    """
    Detailed execution telemetry and optimal state from a single Simulated Annealing run.
    """
    best_state: List[int]
    best_energy: float
    final_state: List[int]
    final_energy: float
    is_valid_one_hot: bool
    selected_variable_index: Optional[int]
    iterations_executed: int
    accepted_moves: int
    uphill_moves_accepted: int
    seed: int
    runtime_ms: float
    discovered_one_hot_states: List[Tuple[int, float]] = field(default_factory=list)


class SimulatedAnnealingSolver:
    """
    Classical Quantum-Inspired Simulated Annealing Solver for QUBO problems.
    
    Operates directly on binary decision vectors x in {0, 1}^N minimizing:
      H(x) = x^T Q x + constant_offset
      
    Features:
      - Deterministic reproducibility using isolated random.Random(seed)
      - O(N) delta-energy evaluation per bit flip
      - Geometric cooling schedule: T_{k+1} = T_k * cooling_rate
      - Metropolis-Hastings acceptance probability: min(1, exp(-Delta H / T))
      - Tracks best state and collects all unique feasible one-hot configurations encountered
    """

    def __init__(self, config: Optional[SimulatedAnnealingConfig] = None):
        self.config = config or SimulatedAnnealingConfig()

    def solve(
        self,
        qubo: QUBOModel,
        seed_override: Optional[int] = None,
        initial_state: Optional[List[int]] = None,
    ) -> AnnealingResult:
        """
        Executes a single seeded Simulated Annealing optimization trajectory.
        
        Args:
            qubo: Target QUBOModel instance.
            seed_override: Optional seed replacing config.random_seed for multi-run diversity.
            initial_state: Optional starting state vector; if None, initializes randomly.
            
        Returns:
            AnnealingResult containing best binary state, energy, and run telemetry.
        """
        start_time = time.perf_counter()
        
        seed = seed_override if seed_override is not None else self.config.random_seed
        rng = random.Random(seed)
        
        N = qubo.num_variables
        if N == 0:
            raise ValueError("Cannot solve a QUBO with 0 variables.")

        # 1. Initialize State
        if initial_state is not None:
            if len(initial_state) != N:
                raise ValueError(f"initial_state length {len(initial_state)} != QUBO variable count {N}")
            curr_state = list(initial_state)
        else:
            # Initialize with a random valid one-hot state to start in the feasible manifold,
            # or random binary. Starting in a random one-hot state accelerates search while
            # allowing standard unconstrained bit-flips during annealing to explore freely.
            curr_state = [0] * N
            init_idx = rng.randrange(N)
            curr_state[init_idx] = 1

        curr_energy = qubo.evaluate_energy(curr_state)
        best_state = list(curr_state)
        best_energy = curr_energy

        # Track all unique valid one-hot states discovered along trajectory: dict of var_idx -> best_energy
        discovered_one_hots: Dict[int, float] = {}
        if sum(curr_state) == 1:
            idx = curr_state.index(1)
            discovered_one_hots[idx] = curr_energy

        # 2. Annealing Schedule Setup
        t_init = self.config.initial_temperature
        t_final = self.config.final_temperature
        cooling_rate = self.config.cooling_rate
        steps_per_temp = self.config.iterations_per_temperature

        temperature = t_init
        total_iterations = 0
        accepted_moves = 0
        uphill_accepted = 0

        # 3. Annealing Main Loop
        while temperature > t_final:
            for _ in range(steps_per_temp):
                total_iterations += 1

                # Generate neighbor by flipping a randomly chosen binary variable
                flip_idx = rng.randrange(N)
                delta_e = qubo.evaluate_delta_energy(curr_state, flip_idx)

                # Metropolis acceptance criterion
                accept = False
                if delta_e <= 0:
                    accept = True
                else:
                    # Guard against numerical overflow in exp(-delta_e / T)
                    exponent = -delta_e / temperature
                    if exponent > -50.0:
                        prob = math.exp(exponent)
                        if rng.random() < prob:
                            accept = True
                            uphill_accepted += 1

                if accept:
                    curr_state[flip_idx] = 1 - curr_state[flip_idx]
                    curr_energy += delta_e
                    accepted_moves += 1

                    # Record if valid one-hot state
                    if sum(curr_state) == 1:
                        sel_idx = curr_state.index(1)
                        if sel_idx not in discovered_one_hots or curr_energy < discovered_one_hots[sel_idx]:
                            discovered_one_hots[sel_idx] = curr_energy

                    # Update best state found so far
                    if curr_energy < best_energy:
                        best_energy = curr_energy
                        best_state = list(curr_state)

            temperature *= cooling_rate

        end_time = time.perf_counter()
        runtime_ms = round((end_time - start_time) * 1000.0, 2)

        is_one_hot = (sum(best_state) == 1)
        selected_idx = best_state.index(1) if is_one_hot else None

        sorted_discovered = sorted(discovered_one_hots.items(), key=lambda item: item[1])

        return AnnealingResult(
            best_state=best_state,
            best_energy=round(best_energy, 6),
            final_state=curr_state,
            final_energy=round(curr_energy, 6),
            is_valid_one_hot=is_one_hot,
            selected_variable_index=selected_idx,
            iterations_executed=total_iterations,
            accepted_moves=accepted_moves,
            uphill_moves_accepted=uphill_accepted,
            seed=seed,
            runtime_ms=runtime_ms,
            discovered_one_hot_states=sorted_discovered
        )
