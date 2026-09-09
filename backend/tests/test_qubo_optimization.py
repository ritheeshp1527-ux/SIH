from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    VoyageCandidate,
    SimulatedAnnealingConfig,
    QuantumInspiredOptimizationRequest,
    OptimizationComparisonRequest,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.qubo.qubo_builder import QUBOBuilder, QUBOModel
from backend.app.optimization.quantum_inspired.simulated_annealing_solver import (
    SimulatedAnnealingSolver,
    AnnealingResult,
)
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import (
    QuantumInspiredVoyageOptimizer,
)
from backend.app.services.optimization_benchmark_service import OptimizationBenchmarkService

client = TestClient(app)

@pytest.fixture
def sample_voyage_request() -> VoyageOptimizationRequest:
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
def evaluated_candidates(sample_voyage_request):
    classical = ClassicalVoyageOptimizer()
    (
        candidates,
        _,
        _,
        _,
        _,
        _
    ) = classical.evaluate_all_candidates(sample_voyage_request)
    feasible = [c for c in candidates if c.is_feasible]
    return feasible

# ==============================================================================
# 1. QUBO Construction & Mathematical Formulation Tests
# ==============================================================================

def test_binary_variable_creation_count(evaluated_candidates):
    builder = QUBOBuilder(safety_multiplier=2.5)
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    assert qubo.num_variables == len(evaluated_candidates)
    assert len(qubo.variable_ids) == len(evaluated_candidates)
    assert qubo.variable_ids[0] == "x_0"

def test_deterministic_variable_mapping(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    for idx, mapping in enumerate(qubo.variable_mappings):
        cand = evaluated_candidates[idx]
        assert mapping.variable_index == idx
        assert mapping.decision_id == cand.decision_id
        assert mapping.vessel_id == cand.vessel_id
        assert mapping.speed_knots == cand.cruising_speed_knots

def test_normalization_correctness_cost(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    normalized_vals = [m.normalized_objective_value for m in qubo.variable_mappings]
    assert min(normalized_vals) == pytest.approx(0.0, abs=1e-5)
    assert max(normalized_vals) == pytest.approx(1.0, abs=1e-5)
    assert all(0.0 <= val <= 1.0 for val in normalized_vals)

def test_normalization_correctness_time(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="time")
    normalized_vals = [m.normalized_objective_value for m in qubo.variable_mappings]
    assert min(normalized_vals) == pytest.approx(0.0, abs=1e-5)
    assert max(normalized_vals) == pytest.approx(1.0, abs=1e-5)

def test_normalization_zero_delta_edge_case(evaluated_candidates):
    builder = QUBOBuilder()
    single_cand = [evaluated_candidates[0]]
    qubo = builder.build_qubo(single_cand, objective_mode="cost")
    assert qubo.normalization_scale == 1.0
    assert qubo.variable_mappings[0].normalized_objective_value == 0.0

def test_one_hot_penalty_linear_coefficients(evaluated_candidates):
    builder = QUBOBuilder(safety_multiplier=3.0)
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    p = qubo.penalty_magnitude
    assert p == pytest.approx(3.0, abs=1e-5)
    for idx, mapping in enumerate(qubo.variable_mappings):
        w_i = mapping.normalized_objective_value
        q_ii = qubo.linear_coefficients[idx]
        assert q_ii == pytest.approx(w_i - p, abs=1e-5)

def test_one_hot_penalty_quadratic_coefficients(evaluated_candidates):
    builder = QUBOBuilder(safety_multiplier=2.5)
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    p = qubo.penalty_magnitude
    two_p = 2.0 * p
    assert len(qubo.quadratic_coefficients) == (qubo.num_variables * (qubo.num_variables - 1)) // 2
    for (i, j), coeff in qubo.quadratic_coefficients.items():
        assert i < j
        assert coeff == pytest.approx(two_p, abs=1e-5)

def test_constant_offset_equals_penalty(evaluated_candidates):
    builder = QUBOBuilder(safety_multiplier=2.5)
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    assert qubo.constant_offset == pytest.approx(qubo.penalty_magnitude, abs=1e-5)

def test_penalty_magnitude_dominates_objective(evaluated_candidates):
    builder = QUBOBuilder(safety_multiplier=2.5)
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    p = qubo.penalty_magnitude
    # Valid one-hot vector: energy = w_k in [0, 1]
    valid_state = [0] * qubo.num_variables
    valid_state[0] = 1
    e_valid = qubo.evaluate_energy(valid_state)
    assert 0.0 <= e_valid <= 1.0

    # Infeasible: all zeros (0 selections) -> energy = P = 2.5
    zero_state = [0] * qubo.num_variables
    e_zero = qubo.evaluate_energy(zero_state)
    assert e_zero == pytest.approx(p, abs=1e-5)
    assert e_zero > e_valid

    # Infeasible: two selections -> energy = w_i + w_j + P >= P > 1.0
    two_state = [0] * qubo.num_variables
    two_state[0] = 1
    two_state[1] = 1
    e_two = qubo.evaluate_energy(two_state)
    assert e_two > p
    assert e_two > e_valid

def test_qubo_model_summary_inspectable(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    summary = qubo.to_summary(preview_limit=10)
    assert summary.num_variables == qubo.num_variables
    assert summary.num_nonzero_coefficients > 0
    assert summary.objective_mode == "cost"
    assert "safety_multiplier" in summary.penalty_strategy
    assert len(summary.variable_mappings_preview) == 10
    assert len(summary.sample_linear_coefficients) == 10
    assert len(summary.sample_quadratic_coefficients) == 10

def test_symmetric_matrix_representation(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    sym = qubo.get_symmetric_matrix()
    p = qubo.penalty_magnitude
    assert sym[(0, 0)] == pytest.approx(qubo.linear_coefficients[0], abs=1e-5)
    if qubo.num_variables >= 2:
        assert sym[(0, 1)] == pytest.approx(p, abs=1e-5)
        assert sym[(1, 0)] == pytest.approx(p, abs=1e-5)

# ==============================================================================
# 2. Energy Evaluation & Delta Computation Tests
# ==============================================================================

def test_exact_energy_evaluation_single_one_hot(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    for k in range(min(5, qubo.num_variables)):
        state = [0] * qubo.num_variables
        state[k] = 1
        energy = qubo.evaluate_energy(state)
        expected_w = qubo.variable_mappings[k].normalized_objective_value
        assert energy == pytest.approx(expected_w, abs=1e-4)

def test_exact_energy_evaluation_zero_vector(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    zero_state = [0] * qubo.num_variables
    energy = qubo.evaluate_energy(zero_state)
    assert energy == pytest.approx(qubo.penalty_magnitude, abs=1e-4)

def test_exact_energy_evaluation_multi_hot_vector(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    if qubo.num_variables >= 2:
        state = [0] * qubo.num_variables
        state[0] = 1
        state[1] = 1
        energy = qubo.evaluate_energy(state)
        w0 = qubo.variable_mappings[0].normalized_objective_value
        w1 = qubo.variable_mappings[1].normalized_objective_value
        expected = w0 + w1 + qubo.penalty_magnitude
        assert energy == pytest.approx(expected, abs=1e-4)

def test_delta_energy_evaluation_consistency(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    state = [0] * qubo.num_variables
    state[0] = 1
    curr_e = qubo.evaluate_energy(state)

    # Test flipping bit 1 from 0 to 1
    delta_e = qubo.evaluate_delta_energy(state, 1)
    state_flipped = list(state)
    state_flipped[1] = 1
    new_e = qubo.evaluate_energy(state_flipped)
    assert (new_e - curr_e) == pytest.approx(delta_e, abs=1e-5)

    # Test flipping bit 0 from 1 to 0
    delta_e_down = qubo.evaluate_delta_energy(state_flipped, 0)
    state_down = list(state_flipped)
    state_down[0] = 0
    down_e = qubo.evaluate_energy(state_down)
    assert (down_e - new_e) == pytest.approx(delta_e_down, abs=1e-5)

# ==============================================================================
# 3. Simulated Annealing Solver & Determinism Tests
# ==============================================================================

def test_simulated_annealing_seed_reproducibility(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    config = SimulatedAnnealingConfig(
        initial_temperature=5.0,
        final_temperature=0.01,
        cooling_rate=0.9,
        iterations_per_temperature=20,
        random_seed=12345
    )
    solver = SimulatedAnnealingSolver(config=config)
    res1 = solver.solve(qubo)
    res2 = solver.solve(qubo)

    assert res1.best_state == res2.best_state
    assert res1.best_energy == pytest.approx(res2.best_energy, abs=1e-6)
    assert res1.iterations_executed == res2.iterations_executed
    assert res1.accepted_moves == res2.accepted_moves

def test_simulated_annealing_converges_to_valid_one_hot(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    config = SimulatedAnnealingConfig(
        initial_temperature=10.0,
        final_temperature=0.001,
        cooling_rate=0.95,
        iterations_per_temperature=50,
        random_seed=42
    )
    solver = SimulatedAnnealingSolver(config=config)
    res = solver.solve(qubo)
    assert res.is_valid_one_hot is True
    assert sum(res.best_state) == 1
    assert res.selected_variable_index is not None
    assert 0 <= res.selected_variable_index < qubo.num_variables

def test_cooling_schedule_termination(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    config = SimulatedAnnealingConfig(
        initial_temperature=2.0,
        final_temperature=0.5,
        cooling_rate=0.5,
        iterations_per_temperature=5,
        random_seed=99
    )
    solver = SimulatedAnnealingSolver(config=config)
    res = solver.solve(qubo)
    assert res.iterations_executed > 0
    assert res.runtime_ms >= 0.0

def test_solver_state_bounds_and_validity(evaluated_candidates):
    builder = QUBOBuilder()
    qubo = builder.build_qubo(evaluated_candidates, objective_mode="cost")
    solver = SimulatedAnnealingSolver()
    res = solver.solve(qubo, seed_override=777)
    assert all(bit in (0, 1) for bit in res.best_state)
    assert all(bit in (0, 1) for bit in res.final_state)

# ==============================================================================
# 4. Solution Decoding & Re-validation Tests
# ==============================================================================

def test_decoding_valid_one_hot_to_candidate(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=3)
    )
    resp = opt.optimize(req)
    assert resp.status == "quantum_inspired_simulated_annealing"
    assert resp.best_solution is not None
    assert resp.best_solution.is_valid_one_hot is True
    assert resp.best_solution.is_feasible is True
    assert resp.best_solution.vessel_id in ("VES-001", "VES-002", "VES-003", "VES-004", "VES-005", "VES-006")

def test_revalidation_preserves_feasibility(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="cost",
        top_k=5
    )
    resp = opt.optimize(req)
    for sol in resp.top_k_solutions:
        assert sol.is_feasible is True
        assert sol.deadline_margin_hours >= 0.0
        assert len(sol.infeasibility_reasons) == 0

def test_cost_mode_optimizes_cost(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    resp = opt.optimize(req)
    assert resp.best_solution is not None
    assert resp.best_solution.total_cost_usd > 0
    # Ranks should have non-decreasing cost
    costs = [s.total_cost_usd for s in resp.top_k_solutions]
    assert costs == sorted(costs)

def test_time_mode_optimizes_time(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="time",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    resp = opt.optimize(req)
    assert resp.best_solution is not None
    assert resp.best_solution.total_duration_hours > 0
    durations = [s.total_duration_hours for s in resp.top_k_solutions]
    assert durations == sorted(durations)

# ==============================================================================
# 5. Top-K Diversity & Uniqueness Tests
# ==============================================================================

def test_top_k_solutions_unique(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(number_of_runs=5)
    )
    resp = opt.optimize(req)
    decision_ids = [s.decision_id for s in resp.top_k_solutions]
    assert len(decision_ids) == len(set(decision_ids))

def test_top_k_solutions_all_feasible(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    req = QuantumInspiredOptimizationRequest(
        voyage_request=sample_voyage_request,
        objective_mode="cost",
        top_k=5
    )
    resp = opt.optimize(req)
    for s in resp.top_k_solutions:
        assert s.is_feasible is True

def test_top_k_respects_k_limit(sample_voyage_request):
    opt = QuantumInspiredVoyageOptimizer()
    for k in [1, 3, 5]:
        req = QuantumInspiredOptimizationRequest(
            voyage_request=sample_voyage_request,
            objective_mode="cost",
            top_k=k
        )
        resp = opt.optimize(req)
        assert len(resp.top_k_solutions) <= k

def test_candidate_space_fairness_with_classical(sample_voyage_request):
    classical = ClassicalVoyageOptimizer()
    cl_resp = classical.optimize(sample_voyage_request)

    qi = QuantumInspiredVoyageOptimizer()
    qi_req = QuantumInspiredOptimizationRequest(voyage_request=sample_voyage_request, objective_mode="cost")
    qi_resp = qi.optimize(qi_req)

    # Identical raw and feasible candidate counts
    assert qi_resp.raw_decision_space_size == cl_resp.benchmark.raw_combinations_evaluated
    assert qi_resp.feasible_candidate_space_size == cl_resp.benchmark.feasible_candidates_count
    assert qi_resp.qubo_summary.num_variables == cl_resp.benchmark.feasible_candidates_count

# ==============================================================================
# 6. Benchmark Service & Relative Gap Tests
# ==============================================================================

def test_benchmark_service_computes_relative_objective_gaps(sample_voyage_request):
    bench = OptimizationBenchmarkService()
    comp = bench.compare(
        request=sample_voyage_request,
        objective_mode="cost",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    assert comp.status == "optimization_comparison_complete"
    assert comp.cost_gap_percent is not None
    # Quantum-inspired is classical SA, cost gap should be >= 0% or ~0%
    assert comp.cost_gap_percent >= -0.001
    assert comp.classical.best_cost_usd is not None
    assert comp.quantum_inspired.best_cost_usd is not None

def test_benchmark_service_time_mode(sample_voyage_request):
    bench = OptimizationBenchmarkService()
    comp = bench.compare(
        request=sample_voyage_request,
        objective_mode="time",
        top_k=5,
        solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=5)
    )
    assert comp.objective_mode == "time"
    assert comp.time_gap_percent is not None
    assert comp.time_gap_percent >= -0.001

def test_benchmark_service_scientific_summary(sample_voyage_request):
    bench = OptimizationBenchmarkService()
    comp = bench.compare(request=sample_voyage_request, objective_mode="cost")
    assert "but does not claim quantum computational advantage" in comp.scientific_summary
    assert "The current prototype uses a feasible-decision selection QUBO" in comp.scientific_summary

# ==============================================================================
# 7. REST API Endpoints Tests
# ==============================================================================

def test_api_post_quantum_inspired_cost_endpoint(sample_voyage_request):
    payload = {
        "voyage_request": sample_voyage_request.model_dump(mode="json"),
        "objective_mode": "cost",
        "top_k": 3,
        "solver_config": {
            "initial_temperature": 5.0,
            "final_temperature": 0.01,
            "cooling_rate": 0.9,
            "iterations_per_temperature": 30,
            "number_of_runs": 2,
            "random_seed": 42
        }
    }
    response = client.post("/api/v1/optimization/quantum-inspired", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "quantum_inspired_simulated_annealing"
    assert data["objective_mode"] == "cost"
    assert len(data["top_k_solutions"]) <= 3
    assert data["qubo_summary"]["num_variables"] > 0
    assert "NO QUANTUM HARDWARE USED" in data["disclaimer"]

def test_api_post_quantum_inspired_time_endpoint(sample_voyage_request):
    payload = {
        "voyage_request": sample_voyage_request.model_dump(mode="json"),
        "objective_mode": "time",
        "top_k": 3
    }
    response = client.post("/api/v1/optimization/quantum-inspired", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["objective_mode"] == "time"
    assert data["best_solution"] is not None

def test_api_post_optimization_compare_endpoint(sample_voyage_request):
    payload = {
        "voyage_request": sample_voyage_request.model_dump(mode="json"),
        "objective_mode": "cost",
        "top_k": 3,
        "solver_config": {
            "number_of_runs": 2,
            "random_seed": 42
        }
    }
    response = client.post("/api/v1/optimization/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "optimization_comparison_complete"
    assert "classical" in data
    assert "quantum_inspired" in data
    assert "cost_gap_percent" in data

def test_invalid_objective_mode_rejected(sample_voyage_request):
    payload = {
        "voyage_request": sample_voyage_request.model_dump(mode="json"),
        "objective_mode": "arbitrary_mode",
        "top_k": 3
    }
    response = client.post("/api/v1/optimization/quantum-inspired", json=payload)
    assert response.status_code == 400
    assert "Unsupported objective_mode" in response.json()["detail"]

def test_infeasible_request_handling():
    departure = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)
    # Deadline only 1 hour after departure for Singapore to Rotterdam (impossible)
    deadline = departure + timedelta(hours=1)
    req = VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=departure,
        deadline_datetime=deadline
    )
    payload = {
        "voyage_request": req.model_dump(mode="json"),
        "objective_mode": "cost"
    }
    response = client.post("/api/v1/optimization/quantum-inspired", json=payload)
    assert response.status_code == 400
    assert "No feasible candidates satisfy operational" in response.json()["detail"]
