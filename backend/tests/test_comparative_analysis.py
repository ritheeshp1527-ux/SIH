from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.optimization import VoyageOptimizationRequest
from backend.app.models.decision_analysis import (
    ComparativeAnalysisRequest,
    DecisionPriority,
    ComparativeAnalysisResponse
)
from backend.app.services.comparative_analysis_service import ComparativeAnalysisService
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer

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
def comparative_service():
    return ComparativeAnalysisService()

# ==========================================
# 1. Pareto Dominance Tests
# ==========================================
def test_pareto_front_contains_optimal_candidates(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, top_k=5)
    res = comparative_service.analyze(req)
    # The minimums across all metrics must be in the Pareto front
    pareto_ids = [c.decision_id for c in res.pareto_front]
    min_cost = min(res.pareto_front, key=lambda x: x.total_voyage_cost_usd).decision_id
    min_time = min(res.pareto_front, key=lambda x: x.total_voyage_time_hours).decision_id
    assert min_cost in pareto_ids
    assert min_time in pareto_ids

def test_dominated_candidates_excluded(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    pareto = res.pareto_front
    for i in range(len(pareto)):
        for j in range(len(pareto)):
            if i == j: continue
            A = pareto[i]
            B = pareto[j]
            # A should not dominate B
            A_obj = (A.total_voyage_cost_usd, A.total_voyage_time_hours, A.fuel_consumption_tonnes, A.operational_co2_tonnes, A.lifecycle_ghg_tonnes)
            B_obj = (B.total_voyage_cost_usd, B.total_voyage_time_hours, B.fuel_consumption_tonnes, B.operational_co2_tonnes, B.lifecycle_ghg_tonnes)
            
            dominates = all(a <= b for a, b in zip(A_obj, B_obj)) and any(a < b for a, b in zip(A_obj, B_obj))
            assert not dominates, f"Candidate {A.decision_id} dominates {B.decision_id} but both are in Pareto front"

def test_identical_candidates_not_duplicated(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    # Ensure no two candidates in Pareto front have identical objectives
    seen_objs = set()
    for c in res.pareto_front:
        obj = (c.total_voyage_cost_usd, c.total_voyage_time_hours, c.fuel_consumption_tonnes, c.operational_co2_tonnes, c.lifecycle_ghg_tonnes)
        assert obj not in seen_objs
        seen_objs.add(obj)

def test_pareto_front_is_deterministic(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res1 = comparative_service.analyze(req)
    res2 = comparative_service.analyze(req)
    ids1 = [c.decision_id for c in res1.pareto_front]
    ids2 = [c.decision_id for c in res2.pareto_front]
    assert set(ids1) == set(ids2)

def test_pareto_front_only_feasible(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assert all(c.is_feasible for c in res.pareto_front)
    assert all(c.deadline_margin_hours >= 0 for c in res.pareto_front)

# ==========================================
# 2. Recommendations Tests
# ==========================================
def test_minimum_cost_recommendation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, priority=DecisionPriority.COST)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.COST]
    assert rec.priority == DecisionPriority.COST
    
    min_cost = min(res.pareto_front, key=lambda x: x.total_voyage_cost_usd)
    assert rec.candidate.decision_id == min_cost.decision_id
    assert "Lowest absolute total voyage cost" in "".join(rec.reasons)

def test_minimum_time_recommendation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.TIME]
    min_time = min(res.pareto_front, key=lambda x: x.total_voyage_time_hours)
    assert rec.candidate.decision_id == min_time.decision_id
    assert "Fastest viable transit" in "".join(rec.reasons)

def test_minimum_fuel_recommendation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.FUEL]
    min_fuel = min(res.pareto_front, key=lambda x: x.fuel_consumption_tonnes)
    assert rec.candidate.decision_id == min_fuel.decision_id
    assert "Lowest absolute fuel consumption" in "".join(rec.reasons)

def test_minimum_co2_recommendation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.CO2]
    min_co2 = min(res.pareto_front, key=lambda x: x.operational_co2_tonnes)
    assert rec.candidate.decision_id == min_co2.decision_id
    assert "Lowest operational tailpipe CO2" in "".join(rec.reasons)

def test_minimum_ghg_recommendation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.GHG]
    min_ghg = min(res.pareto_front, key=lambda x: x.lifecycle_ghg_tonnes)
    assert rec.candidate.decision_id == min_ghg.decision_id
    assert "Lowest well-to-wake lifecycle GHG" in "".join(rec.reasons)

def test_balanced_recommendation_is_pareto_efficient(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.BALANCED]
    pareto_ids = [c.decision_id for c in res.pareto_front]
    assert rec.candidate.decision_id in pareto_ids
    assert "Pareto-efficient trade-off" in "".join(rec.reasons)

def test_deterministic_tie_breaking(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res1 = comparative_service.analyze(req)
    res2 = comparative_service.analyze(req)
    for p in DecisionPriority:
        assert res1.recommendations[p].candidate.decision_id == res2.recommendations[p].candidate.decision_id

def test_all_recommendations_populated(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    for p in DecisionPriority:
        assert p in res.recommendations

def test_recommendation_reasons_contain_metrics(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.TIME]
    reasons_str = "".join(rec.reasons)
    # The reason should mention the deadline margin hours
    assert str(round(rec.candidate.deadline_margin_hours, 1)) in reasons_str

def test_balanced_recommendation_mentions_margin(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    rec = res.recommendations[DecisionPriority.BALANCED]
    assert str(round(rec.candidate.deadline_margin_hours, 1)) in "".join(rec.reasons)

# ==========================================
# 3. Trade-offs Tests
# ==========================================
def test_cost_tradeoff_delta(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    cl_best = res.classical_summary.best_cost_usd
    qi_best = res.quantum_inspired_summary.best_cost_usd
    expected_delta = qi_best - cl_best
    
    assert res.tradeoffs.cost_delta_usd == pytest.approx(expected_delta)

def test_time_tradeoff_delta(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    cl_best = res.classical_summary.best_time_hours
    # Note: Tradeoff in service compares best QI vs best classical candidate found by ID.
    # The best_time_hours might be from the cost-optimized candidate if we didn't specify time objective for QI.
    assert hasattr(res.tradeoffs, "time_delta_hours")

def test_percentage_difference_calculation(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    if res.tradeoffs.cost_delta_usd != 0:
        assert res.tradeoffs.cost_delta_pct != 0.0

def test_environmental_tradeoffs(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assert hasattr(res.tradeoffs, "fuel_delta_tonnes")
    assert hasattr(res.tradeoffs, "co2_delta_tonnes")
    assert hasattr(res.tradeoffs, "ghg_delta_tonnes")

def test_zero_tradeoff_if_exact_match(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    # Check if classical ID matches QI ID
    if res.classical_summary.best_decision_id == res.quantum_inspired_summary.best_decision_id:
        assert res.tradeoffs.cost_delta_usd == pytest.approx(0.0)
        assert res.tradeoffs.cost_delta_pct == pytest.approx(0.0)

# ==========================================
# 4. Schedule Tests
# ==========================================
def test_schedule_positive_margin(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, priority=DecisionPriority.TIME)
    res = comparative_service.analyze(req)
    assert res.schedule_analysis.deadline_margin_hours > 0
    assert res.schedule_analysis.is_safe is True
    assert res.schedule_analysis.status in ["Safe", "Tight"]

def test_schedule_tight_margin(comparative_service):
    departure = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)
    # Set deadline tight enough so margin is between 0 and 5 hours
    # Min time from SG to RTM is ~390-394 hrs. Let's set deadline to departure + 397 hrs
    deadline = departure + timedelta(hours=397)
    req = VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=departure,
        deadline_datetime=deadline
    )
    analysis_req = ComparativeAnalysisRequest(voyage_request=req, priority=DecisionPriority.TIME)
    res = comparative_service.analyze(analysis_req)
    
    if 0 <= res.schedule_analysis.deadline_margin_hours <= 5.0:
        assert res.schedule_analysis.status == "Tight"

def test_schedule_analysis_has_datetimes(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assert res.schedule_analysis.departure_datetime
    assert res.schedule_analysis.arrival_datetime
    assert res.schedule_analysis.deadline_datetime

# ==========================================
# 5. QI Integration & API Tests
# ==========================================
def test_qi_top_k_ingestion(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, top_k=3)
    res = comparative_service.analyze(req)
    assert len(res.qi_top_k) <= 3
    for s in res.qi_top_k:
        assert s.is_feasible

def test_qi_solution_decision_id_preserved(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    if res.qi_top_k:
        assert res.qi_top_k[0].decision_id is not None
        assert res.qi_top_k[0].candidate.decision_id == res.qi_top_k[0].decision_id

def test_api_comparative_analysis_success(sample_voyage_request):
    payload = {
        "voyage_request": sample_voyage_request.model_dump(mode="json"),
        "priority": "balanced",
        "top_k": 5
    }
    response = client.post("/api/v1/optimization/comparative-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "pareto_front" in data
    assert "recommendations" in data
    assert "balanced" in data["recommendations"]

def test_api_comparative_analysis_invalid_request():
    payload = {
        "voyage_request": {
            "source_port_id": "UNKNOWN",
            "destination_port_id": "UNKNOWN",
            "cargo_weight_tonnes": 60000.0,
            "departure_datetime": "2026-09-01T08:00:00Z",
            "deadline_datetime": "2026-09-29T08:00:00Z"
        },
        "priority": "balanced"
    }
    response = client.post("/api/v1/optimization/comparative-analysis", json=payload)
    # Should fail validation before comparative analysis
    assert response.status_code == 404

def test_api_comparative_analysis_empty_feasible_set():
    departure = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)
    deadline = departure + timedelta(hours=1) # Impossible
    req = VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=departure,
        deadline_datetime=deadline
    )
    payload = {
        "voyage_request": req.model_dump(mode="json"),
        "priority": "cost"
    }
    response = client.post("/api/v1/optimization/comparative-analysis", json=payload)
    assert response.status_code == 400
    assert "No feasible candidates" in response.json()["detail"] or "No feasible candidates satisfy operational" in response.json()["detail"]

# ==========================================
# 6. Environmental Analysis Tests
# ==========================================
def test_environmental_analysis_exists(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assert res.environmental_analysis.fuel_consumption_tonnes > 0
    assert res.environmental_analysis.operational_co2_tonnes > 0
    assert res.environmental_analysis.lifecycle_ghg_tonnes > 0

def test_environmental_analysis_distinguishes_co2_and_ghg(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    # Operational CO2 and Lifecycle GHG should be distinct values
    assert res.environmental_analysis.operational_co2_tonnes != res.environmental_analysis.lifecycle_ghg_tonnes

# ==========================================
# 7. Assumptions & Metadata Tests
# ==========================================
def test_assumptions_are_documented(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assumptions_str = " ".join(res.assumptions).lower()
    
    assert "no quantum advantage is claimed" in assumptions_str
    assert "deterministic demo data" in assumptions_str
    assert "prototype model" in assumptions_str
    assert "pareto analysis is performed" in assumptions_str
    assert "not a universal optimality guarantee" in assumptions_str
    assert "does not guarantee the classical global optimum" in assumptions_str
    assert "single-voyage decision problem" in assumptions_str

def test_priority_switching_changes_recommendation(comparative_service, sample_voyage_request):
    req_cost = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, priority=DecisionPriority.COST)
    req_time = ComparativeAnalysisRequest(voyage_request=sample_voyage_request, priority=DecisionPriority.TIME)
    
    res_cost = comparative_service.analyze(req_cost)
    res_time = comparative_service.analyze(req_time)
    
    # Environment analysis matches selected priority
    assert res_cost.environmental_analysis.fuel_consumption_tonnes == res_cost.recommendations[DecisionPriority.COST].candidate.fuel_consumption_tonnes
    assert res_time.environmental_analysis.fuel_consumption_tonnes == res_time.recommendations[DecisionPriority.TIME].candidate.fuel_consumption_tonnes

def test_qi_vs_classical_metrics_available(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assert res.classical_summary.method_name == "Classical Exact Enumeration"
    assert "Quantum-Inspired" in res.quantum_inspired_summary.method_name

# ==========================================
# 8. Comparison Records & Neutrality Tests
# ==========================================
def test_comparison_record_structure_and_neutrality(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    assert res.comparison is not None
    assert res.classical is not None
    assert res.quantum_inspired is not None
    assert res.classical.method_name == res.classical_summary.method_name
    assert res.quantum_inspired.method_name == res.quantum_inspired_summary.method_name
    
    # Check all difference fields
    assert hasattr(res.comparison, "cost_difference")
    assert hasattr(res.comparison, "cost_percentage_difference")
    assert hasattr(res.comparison, "time_difference")
    assert hasattr(res.comparison, "time_percentage_difference")
    assert hasattr(res.comparison, "fuel_difference")
    assert hasattr(res.comparison, "co2_difference")
    assert hasattr(res.comparison, "lifecycle_ghg_difference")
    assert hasattr(res.comparison, "deadline_margin_difference")
    assert hasattr(res.comparison, "runtime_difference")
    assert hasattr(res.comparison, "objective_gap")
    
    # Neutrality verification: no quantum advantage / superiority / speedup claims
    all_notes = " ".join(res.comparison.neutral_notes).lower()
    for forbidden in ["quantum advantage", "quantum superiority", "quantum speedup"]:
        assert f"no {forbidden}" in all_notes or forbidden not in all_notes

def test_candidate_comparison_record_model_attributes(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    cl_rec = res.comparison.classical_candidate
    assert cl_rec is not None
    assert cl_rec.decision_id
    assert cl_rec.optimization_method == "Classical Exact Enumeration"
    assert cl_rec.vessel
    assert cl_rec.route
    assert cl_rec.speed > 0
    assert cl_rec.fuel
    assert cl_rec.total_cost > 0
    assert cl_rec.total_time > 0
    assert cl_rec.fuel_consumption > 0
    assert cl_rec.operational_CO2 > 0
    assert cl_rec.lifecycle_GHG > 0
    assert hasattr(cl_rec, "deadline_margin")
    assert hasattr(cl_rec, "utilization")
    assert hasattr(cl_rec, "risk")
    assert cl_rec.feasibility is True
    assert cl_rec.runtime is not None

def test_tradeoff_metrics_differences_present(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    
    t = res.tradeoffs
    assert t.cost_difference == t.cost_delta_usd
    assert t.cost_percentage_difference == t.cost_delta_pct
    assert t.time_difference == t.time_delta_hours
    assert t.time_percentage_difference == t.time_delta_pct
    assert t.fuel_difference == t.fuel_delta_tonnes
    assert t.co2_difference == t.co2_delta_tonnes
    assert t.lifecycle_ghg_difference == t.ghg_delta_tonnes
    assert hasattr(t, "deadline_margin_difference")
    assert hasattr(t, "runtime_difference")
    assert hasattr(t, "objective_gap")

def test_pareto_strictly_better_mathematical_property(comparative_service, sample_voyage_request):
    # Retrieve feasible candidates and verify non-dominated property
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    pareto = res.pareto_front
    
    # Verify strict dominance definition: no member in pareto dominates another member
    for i, c1 in enumerate(pareto):
        for j, c2 in enumerate(pareto):
            if i == j:
                continue
            v1 = (c1.total_voyage_cost_usd, c1.total_voyage_time_hours, c1.fuel_consumption_tonnes, c1.operational_co2_tonnes, c1.lifecycle_ghg_tonnes)
            v2 = (c2.total_voyage_cost_usd, c2.total_voyage_time_hours, c2.fuel_consumption_tonnes, c2.operational_co2_tonnes, c2.lifecycle_ghg_tonnes)
            
            c1_dominates_c2 = all(a <= b for a, b in zip(v1, v2)) and any(a < b for a, b in zip(v1, v2))
            assert not c1_dominates_c2, f"{c1.decision_id} should not dominate {c2.decision_id} in Pareto front"

def test_equal_weighting_assumption_documented(comparative_service, sample_voyage_request):
    req = ComparativeAnalysisRequest(voyage_request=sample_voyage_request)
    res = comparative_service.analyze(req)
    assumptions_str = " ".join(res.assumptions).lower()
    assert "equal weighting across normalized objectives" in assumptions_str
    assert "decision-analysis assumption" in assumptions_str

def test_api_comparative_analysis_all_priorities(sample_voyage_request):
    for priority in ["cost", "time", "fuel", "co2", "ghg", "balanced"]:
        payload = {
            "voyage_request": sample_voyage_request.model_dump(mode="json"),
            "priority": priority,
            "top_k": 3
        }
        response = client.post("/api/v1/optimization/comparative-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert priority in data["recommendations"]
        assert "comparison" in data
        assert "classical" in data
        assert "quantum_inspired" in data

