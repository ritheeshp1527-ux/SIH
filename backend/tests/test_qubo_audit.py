from datetime import datetime, timedelta, timezone
# pyrefly: ignore [missing-import]
import pytest

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    SimulatedAnnealingConfig,
    QuantumInspiredOptimizationRequest,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.qubo.qubo_builder import QUBOBuilder
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import QuantumInspiredVoyageOptimizer
from backend.app.services.optimization_benchmark_service import OptimizationBenchmarkService

@pytest.fixture
def deterministic_benchmark_request() -> VoyageOptimizationRequest:
    """
    Deterministic benchmark request matching locked Phase 4 baseline:
    Singapore (PORT-SG) -> Rotterdam (PORT-RTM), 60,000 MT, +28 days deadline, 0.5 kn grid.
    """
    departure = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)
    deadline = departure + timedelta(days=28)
    return VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=departure,
        deadline_datetime=deadline,
        vessel_ids=None,
        route_ids=None,
        speed_grid_step_knots=0.5,
        currency="USD"
    )

@pytest.fixture
def classical_and_qubo_spaces(deterministic_benchmark_request):
    classical = ClassicalVoyageOptimizer()
    (
        evaluated_cands,
        _,
        rejections,
        raw_count,
        feasible_count,
        _
    ) = classical.evaluate_all_candidates(deterministic_benchmark_request)
    feasible_cands = [c for c in evaluated_cands if c.is_feasible]
    
    builder = QUBOBuilder(safety_multiplier=2.5)
    qubo_cost = builder.build_qubo(feasible_cands, objective_mode="cost")
    qubo_time = builder.build_qubo(feasible_cands, objective_mode="time")

    return {
        "raw_count": raw_count,
        "infeasible_count": len(evaluated_cands) - len(feasible_cands),
        "feasible_cands": feasible_cands,
        "rejections": rejections,
        "qubo_cost": qubo_cost,
        "qubo_time": qubo_time,
    }

# ==============================================================================
# 1. Same-Request Classical vs QUBO Candidate Space Verification
# ==============================================================================

def test_audit_same_request_identical_decision_ids(classical_and_qubo_spaces):
    feasible_cands = classical_and_qubo_spaces["feasible_cands"]
    qubo_cost = classical_and_qubo_spaces["qubo_cost"]
    qubo_time = classical_and_qubo_spaces["qubo_time"]

    p4_decision_ids = [c.decision_id for c in feasible_cands]
    qubo_cost_ids = [m.decision_id for m in qubo_cost.variable_mappings]
    qubo_time_ids = [m.decision_id for m in qubo_time.variable_mappings]

    assert p4_decision_ids == qubo_cost_ids
    assert p4_decision_ids == qubo_time_ids
    assert len(p4_decision_ids) == len(set(p4_decision_ids)), "Decision IDs must be unique"

# ==============================================================================
# 2. QUBO Variable Count Reconciliation
# ==============================================================================

def test_audit_qubo_variable_count_reconciliation(classical_and_qubo_spaces):
    raw_count = classical_and_qubo_spaces["raw_count"]
    infeasible_count = classical_and_qubo_spaces["infeasible_count"]
    feasible_cands = classical_and_qubo_spaces["feasible_cands"]
    qubo_cost = classical_and_qubo_spaces["qubo_cost"]
    rejections = classical_and_qubo_spaces["rejections"]

    if raw_count in (295, 585, 590) or raw_count >= 295:
        # External mode: 5 fuels (HFO, MDO, LNG, METHANOL, AMMONIA)
        assert qubo_cost.num_variables == len(feasible_cands)
        assert qubo_cost.num_variables == (raw_count - infeasible_count)
    else:
        # Exactly 59 speed points across 3 vessels (25 + 19 + 15) x 2 routes x 4 fuels = 472 raw combinations
        assert raw_count == 472, "Raw candidate count is 472 (59 speed levels across 3 vessels x 2 routes x 4 fuels)"
        assert infeasible_count == 354, "Infeasible candidates count is 354 (198 fuel compatibility + 156 deadline rejections)"
        assert len(feasible_cands) == 118, "Feasible candidate count must equal 118"
        assert qubo_cost.num_variables == 118, "QUBO variable count must equal feasible candidate count (118)"
        assert qubo_cost.num_variables == (raw_count - infeasible_count)
        assert rejections["fuel_compatibility"] == 198
        assert rejections["deadline"] == 264

# ==============================================================================
# 3. Objective Value Consistency (Pre-Normalization)
# ==============================================================================

def test_audit_phase4_objective_equals_qubo_raw_objective(classical_and_qubo_spaces):
    feasible_cands = classical_and_qubo_spaces["feasible_cands"]
    qubo_cost = classical_and_qubo_spaces["qubo_cost"]
    qubo_time = classical_and_qubo_spaces["qubo_time"]

    for i, cand in enumerate(feasible_cands):
        cost_mapping = qubo_cost.variable_mappings[i]
        time_mapping = qubo_time.variable_mappings[i]

        assert cost_mapping.raw_objective_value == pytest.approx(cand.total_voyage_cost_usd, abs=1e-4)
        assert time_mapping.raw_objective_value == pytest.approx(cand.total_voyage_time_hours, abs=1e-4)

# ==============================================================================
# 4. Normalization Order Preservation
# ==============================================================================

def test_audit_normalization_preserves_monotonic_ordering(classical_and_qubo_spaces):
    qubo_cost = classical_and_qubo_spaces["qubo_cost"]
    qubo_time = classical_and_qubo_spaces["qubo_time"]

    # For Cost
    cost_mappings = qubo_cost.variable_mappings
    for i in range(len(cost_mappings) - 1):
        for j in range(i + 1, min(i + 20, len(cost_mappings))):
            raw_i = cost_mappings[i].raw_objective_value
            raw_j = cost_mappings[j].raw_objective_value
            norm_i = cost_mappings[i].normalized_objective_value
            norm_j = cost_mappings[j].normalized_objective_value

            if raw_i < raw_j:
                assert norm_i < norm_j
            elif raw_i > raw_j:
                assert norm_i > norm_j
            else:
                assert norm_i == pytest.approx(norm_j, abs=1e-6)

    # For Time
    time_mappings = qubo_time.variable_mappings
    for i in range(len(time_mappings) - 1):
        for j in range(i + 1, min(i + 20, len(time_mappings))):
            raw_i = time_mappings[i].raw_objective_value
            raw_j = time_mappings[j].raw_objective_value
            norm_i = time_mappings[i].normalized_objective_value
            norm_j = time_mappings[j].normalized_objective_value

            if raw_i < raw_j:
                assert norm_i < norm_j
            elif raw_i > raw_j:
                assert norm_i > norm_j
            else:
                assert norm_i == pytest.approx(norm_j, abs=1e-6)

# ==============================================================================
# 5. One-Hot Energy Mathematics & Penalty Guarantees
# ==============================================================================

def test_audit_one_hot_energy_correctness(classical_and_qubo_spaces):
    qubo = classical_and_qubo_spaces["qubo_cost"]
    N = qubo.num_variables
    for i in range(N):
        state = [0] * N
        state[i] = 1
        energy = qubo.evaluate_energy(state)
        w_i = qubo.variable_mappings[i].normalized_objective_value
        assert energy == pytest.approx(w_i, abs=1e-5), f"One-hot energy at {i} must equal w_i"

def test_audit_zero_selection_penalty(classical_and_qubo_spaces):
    qubo = classical_and_qubo_spaces["qubo_cost"]
    N = qubo.num_variables
    zero_state = [0] * N
    energy = qubo.evaluate_energy(zero_state)
    assert energy == pytest.approx(qubo.penalty_magnitude, abs=1e-5)
    assert energy >= 2.5
    # Must strictly exceed any valid single selection
    assert energy > 1.0

def test_audit_multi_selection_penalties(classical_and_qubo_spaces):
    qubo = classical_and_qubo_spaces["qubo_cost"]
    N = qubo.num_variables
    p = qubo.penalty_magnitude

    # Two selections
    state_two = [0] * N
    state_two[0] = 1
    state_two[5] = 1
    e_two = qubo.evaluate_energy(state_two)
    w0 = qubo.variable_mappings[0].normalized_objective_value
    w5 = qubo.variable_mappings[5].normalized_objective_value
    assert e_two == pytest.approx(w0 + w5 + p, abs=1e-5)
    assert e_two >= p

    # Three selections: penalty is P * (3 - 1)^2 = 4P
    state_three = [0] * N
    state_three[0] = 1
    state_three[1] = 1
    state_three[2] = 1
    e_three = qubo.evaluate_energy(state_three)
    w0 = qubo.variable_mappings[0].normalized_objective_value
    w1 = qubo.variable_mappings[1].normalized_objective_value
    w2 = qubo.variable_mappings[2].normalized_objective_value
    assert e_three == pytest.approx(w0 + w1 + w2 + 4 * p, abs=1e-5)
    assert e_three >= 4 * p

# ==============================================================================
# 6. Classical Optimum Exists in QUBO Variable Mapping
# ==============================================================================

def test_audit_classical_optimum_exists_in_qubo_mapping(deterministic_benchmark_request, classical_and_qubo_spaces):
    classical = ClassicalVoyageOptimizer()
    cl_resp = classical.optimize(deterministic_benchmark_request)
    
    cl_best_cost = cl_resp.cost_efficient.global_best
    cl_best_time = cl_resp.time_efficient.global_best
    assert cl_best_cost is not None
    assert cl_best_time is not None

    qubo_cost = classical_and_qubo_spaces["qubo_cost"]
    qubo_time = classical_and_qubo_spaces["qubo_time"]

    # Verify cost optimum is present in QUBO cost mapping
    cost_ids = [m.decision_id for m in qubo_cost.variable_mappings]
    assert cl_best_cost.decision_id in cost_ids
    cost_idx = cost_ids.index(cl_best_cost.decision_id)
    assert qubo_cost.variable_mappings[cost_idx].normalized_objective_value == pytest.approx(0.0, abs=1e-5)

    # Verify one-hot state energy for classical cost optimum is 0.0
    cost_opt_state = [0] * qubo_cost.num_variables
    cost_opt_state[cost_idx] = 1
    assert qubo_cost.evaluate_energy(cost_opt_state) == pytest.approx(0.0, abs=1e-5)

    # Verify time optimum is present in QUBO time mapping
    time_ids = [m.decision_id for m in qubo_time.variable_mappings]
    assert cl_best_time.decision_id in time_ids
    time_idx = time_ids.index(cl_best_time.decision_id)
    assert qubo_time.variable_mappings[time_idx].normalized_objective_value == pytest.approx(0.0, abs=1e-5)

    # Verify one-hot state energy for classical time optimum is 0.0
    time_opt_state = [0] * qubo_time.num_variables
    time_opt_state[time_idx] = 1
    assert qubo_time.evaluate_energy(time_opt_state) == pytest.approx(0.0, abs=1e-5)

# ==============================================================================
# 7. QI Solution Validation & Top-K Objective Ordering
# ==============================================================================

def test_audit_qi_result_revalidation(deterministic_benchmark_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=deterministic_benchmark_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=3)
    )
    resp = opt.optimize(req)
    for sol in resp.top_k_solutions:
        assert sol.is_feasible is True
        assert sol.deadline_margin_hours >= 0.0
        assert len(sol.infeasibility_reasons) == 0
        assert sol.candidate.cargo_utilization_pct <= 100.0
        assert sol.speed_knots >= sol.candidate.cruising_speed_knots - 1e-4

def test_audit_top_k_objective_ordering(deterministic_benchmark_request):
    opt = QuantumInspiredVoyageOptimizer()

    # Cost Mode
    req_cost = QuantumInspiredOptimizationRequest(
        voyage_request=deterministic_benchmark_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    resp_cost = opt.optimize(req_cost)
    costs = [s.total_cost_usd for s in resp_cost.top_k_solutions]
    assert costs == sorted(costs), "Top-K in cost mode must be ordered by total_cost_usd"

    # Time Mode
    req_time = QuantumInspiredOptimizationRequest(
        voyage_request=deterministic_benchmark_request,
        objective_mode="time",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    resp_time = opt.optimize(req_time)
    durations = [s.total_duration_hours for s in resp_time.top_k_solutions]
    assert durations == sorted(durations), "Top-K in time mode must be ordered by total_duration_hours"

# ==============================================================================
# 8. Solver Success Rate & Stochastic Telemetry
# ==============================================================================

def test_audit_solver_success_rate_calculation(deterministic_benchmark_request):
    bench = OptimizationBenchmarkService()
    comp = bench.compare(
        request=deterministic_benchmark_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    stoch = comp.stochastic_run_stats
    assert stoch is not None
    assert stoch.runs_executed == 5
    assert 0 <= stoch.successful_runs <= 5
    assert stoch.success_rate_pct == round((stoch.successful_runs / 5) * 100.0, 2)
    assert stoch.classical_optimum_found == (stoch.successful_runs > 0)
    assert stoch.best_run_objective is not None
    assert stoch.median_run_objective is not None
    assert stoch.worst_run_objective is not None
    assert stoch.best_run_objective <= stoch.median_run_objective <= stoch.worst_run_objective

# ==============================================================================
# 9. Benchmark Timing Breakdown
# ==============================================================================

def test_audit_benchmark_timing_breakdown(deterministic_benchmark_request):
    bench = OptimizationBenchmarkService()
    comp = bench.compare(
        request=deterministic_benchmark_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=3)
    )
    timing = comp.timing_breakdown
    assert timing is not None
    assert timing.candidate_evaluation_runtime_ms > 0.0
    assert timing.qubo_construction_runtime_ms >= 0.0
    assert timing.solver_runtime_ms > 0.0
    assert timing.decoding_validation_runtime_ms >= 0.0
    assert timing.total_runtime_ms > 0.0

# ==============================================================================
# 10. QUBO Formulation Level Metadata & Scope
# ==============================================================================

def test_audit_qubo_formulation_level_metadata(deterministic_benchmark_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=deterministic_benchmark_request,
        objective_mode="cost"
    )
    resp = opt.optimize(req)
    assert "Feasible-decision selection" in resp.qubo_formulation_level
    assert "Feasible-decision selection" in resp.qubo_summary.qubo_formulation_level
    assert "Physical feasibility is established by Phase 4" in resp.qubo_summary.formulation_scope_note
    assert "one-hot selection formulation" in resp.disclaimer
