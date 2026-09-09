import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.workflow import (
    WorkflowOptimizationRequest,
    WorkflowOptimizationResponse,
)
from backend.app.models.optimization import VoyageOptimizationRequest, SimulatedAnnealingConfig
from backend.app.models.decision_analysis import DecisionPriority
from backend.app.services.end_to_end_workflow_service import EndToEndWorkflowService

client = TestClient(app)

@pytest.fixture
def sample_voyage_request():
    departure = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    deadline = departure + timedelta(days=28)
    return VoyageOptimizationRequest(
        source_port_id="PORT-SG",
        destination_port_id="PORT-RTM",
        cargo_weight_tonnes=60000.0,
        departure_datetime=departure,
        deadline_datetime=deadline,
        vessel_ids=None,
        route_ids=None,
        speed_grid_step_knots=1.0,
        currency="USD"
    )

@pytest.fixture
def workflow_service():
    return EndToEndWorkflowService()


class TestWorkflowOrchestrationService:

    def test_end_to_end_workflow_completion(self, sample_voyage_request, workflow_service):
        """Test that a valid request completes all 6 stages sequentially with valid artifacts."""
        req = WorkflowOptimizationRequest(
            voyage_request=sample_voyage_request,
            priority=DecisionPriority.BALANCED,
            top_k=3,
            solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=3, iterations_per_temperature=20)
        )

        response = workflow_service.execute_workflow(req)

        assert isinstance(response, WorkflowOptimizationResponse)
        assert response.workflow_metadata.execution_status == "completed"
        assert response.workflow_metadata.failed_stage is None
        assert response.workflow_metadata.total_runtime_ms > 0

        # Verify all 6 stages are populated
        stages = response.stages
        assert stages.fuel_intelligence is not None
        assert stages.fuel_intelligence.status == "completed"
        assert stages.fuel_intelligence.available_vessels_count > 0
        assert stages.fuel_intelligence.available_fuels_count > 0
        assert stages.fuel_intelligence.representative_fuel_estimate is not None

        assert stages.maritime_network is not None
        assert stages.maritime_network.status == "completed"
        assert stages.maritime_network.origin_port_id == "PORT-SG"
        assert stages.maritime_network.destination_port_id == "PORT-RTM"
        assert stages.maritime_network.candidate_routes_count >= 1
        assert stages.maritime_network.feasible_routes_count >= 1

        assert stages.weather_ocean is not None
        assert stages.weather_ocean.status == "completed"
        assert stages.weather_ocean.assessed_routes_count == stages.maritime_network.candidate_routes_count
        assert stages.weather_ocean.safe_routes_count >= 1

        assert stages.classical_optimization is not None
        assert stages.classical_optimization.status == "completed"
        assert stages.classical_optimization.feasible_solutions_count > 0
        assert stages.classical_optimization.best_cost_candidate_id is not None
        assert stages.classical_optimization.best_time_candidate_id is not None

        assert stages.quantum_inspired is not None
        assert stages.quantum_inspired.status == "completed"
        assert stages.quantum_inspired.qubo_variable_count > 0
        assert stages.quantum_inspired.best_decision_id is not None
        assert stages.quantum_inspired.top_k_solutions_count > 0

        assert stages.comparative_analysis is not None
        assert stages.comparative_analysis.status == "completed"
        assert stages.comparative_analysis.pareto_front_count > 0
        assert stages.comparative_analysis.recommended_decision_id != ""

    def test_workflow_determinism(self, sample_voyage_request, workflow_service):
        """Test that identical requests yield exact matching workflow ID and decisions."""
        req1 = WorkflowOptimizationRequest(
            voyage_request=sample_voyage_request,
            priority=DecisionPriority.COST,
            top_k=3,
            solver_config=SimulatedAnnealingConfig(random_seed=123, number_of_runs=3, iterations_per_temperature=20)
        )
        req2 = WorkflowOptimizationRequest(
            voyage_request=sample_voyage_request,
            priority=DecisionPriority.COST,
            top_k=3,
            solver_config=SimulatedAnnealingConfig(random_seed=123, number_of_runs=3, iterations_per_temperature=20)
        )

        res1 = workflow_service.execute_workflow(req1)
        res2 = workflow_service.execute_workflow(req2)

        assert res1.workflow_metadata.workflow_id == res2.workflow_metadata.workflow_id
        assert res1.stages.classical_optimization.best_cost_candidate_id == res2.stages.classical_optimization.best_cost_candidate_id
        assert res1.stages.quantum_inspired.best_decision_id == res2.stages.quantum_inspired.best_decision_id
        assert res1.stages.comparative_analysis.recommended_decision_id == res2.stages.comparative_analysis.recommended_decision_id

    def test_stage_tracking_dictionary(self, sample_voyage_request, workflow_service):
        """Verify that stage_completion_status tracks all six stages."""
        req = WorkflowOptimizationRequest(
            voyage_request=sample_voyage_request,
            priority=DecisionPriority.BALANCED,
            top_k=2,
            solver_config=SimulatedAnnealingConfig(random_seed=42, number_of_runs=2, iterations_per_temperature=10)
        )
        res = workflow_service.execute_workflow(req)
        status_map = res.workflow_metadata.stage_completion_status

        expected_stages = [
            "fuel_intelligence",
            "maritime_network",
            "weather_ocean",
            "classical_optimization",
            "quantum_inspired",
            "comparative_analysis"
        ]
        for stg in expected_stages:
            assert stg in status_map
            assert status_map[stg] == "completed"

    def test_invalid_origin_port_rejection(self, sample_voyage_request, workflow_service):
        """Verify that an unknown origin port halts at maritime_network with 404."""
        invalid_req = sample_voyage_request.model_copy(update={"source_port_id": "PORT-NONEXISTENT"})
        req = WorkflowOptimizationRequest(voyage_request=invalid_req)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            workflow_service.execute_workflow(req, raise_on_error=True)

        assert exc_info.value.status_code == 404
        assert "PORT-NONEXISTENT" in exc_info.value.detail

    def test_invalid_destination_port_rejection(self, sample_voyage_request, workflow_service):
        """Verify that an unknown destination port halts at maritime_network with 404."""
        invalid_req = sample_voyage_request.model_copy(update={"destination_port_id": "PORT-INVALID"})
        req = WorkflowOptimizationRequest(voyage_request=invalid_req)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            workflow_service.execute_workflow(req, raise_on_error=True)

        assert exc_info.value.status_code == 404
        assert "PORT-INVALID" in exc_info.value.detail

    def test_infeasible_deadline_stops_downstream_fabrication(self, sample_voyage_request, workflow_service):
        """Verify that impossible deadline (e.g. 1 hour transit) is rejected at classical stage without fabricating results."""
        impossible_deadline = sample_voyage_request.departure_datetime + timedelta(hours=1)
        infeasible_req = sample_voyage_request.model_copy(update={"deadline_datetime": impossible_deadline})
        req = WorkflowOptimizationRequest(voyage_request=infeasible_req)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            workflow_service.execute_workflow(req, raise_on_error=True)

        assert exc_info.value.status_code == 400
        assert "No feasible candidates" in exc_info.value.detail


class TestWorkflowApiEndpoints:

    def test_workflow_sample_request_endpoint(self):
        """GET /api/v1/workflow/sample-request returns a valid request payload."""
        resp = client.get("/api/v1/workflow/sample-request")
        assert resp.status_code == 200
        data = resp.json()
        assert "voyage_request" in data
        assert data["voyage_request"]["source_port_id"] == "PORT-SG"
        assert data["voyage_request"]["destination_port_id"] == "PORT-RTM"

    def test_workflow_optimize_endpoint_nested_payload(self):
        """POST /api/v1/workflow/optimize with wrapped WorkflowOptimizationRequest."""
        sample_resp = client.get("/api/v1/workflow/sample-request")
        payload = sample_resp.json()
        payload["voyage_request"]["speed_grid_step_knots"] = 1.0
        payload["solver_config"] = {
            "random_seed": 42,
            "number_of_runs": 2,
            "iterations_per_temperature": 15
        }
        payload["top_k"] = 3
        payload["priority"] = "cost"

        resp = client.post("/api/v1/workflow/optimize", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        assert data["workflow_metadata"]["execution_status"] == "completed"
        assert data["stages"]["fuel_intelligence"]["status"] == "completed"
        assert data["stages"]["maritime_network"]["status"] == "completed"
        assert data["stages"]["weather_ocean"]["status"] == "completed"
        assert data["stages"]["classical_optimization"]["status"] == "completed"
        assert data["stages"]["quantum_inspired"]["status"] == "completed"
        assert data["stages"]["comparative_analysis"]["status"] == "completed"
        assert data["stages"]["comparative_analysis"]["selected_priority"] == "cost"

    def test_workflow_optimize_endpoint_adapted_flat_payload(self):
        """POST /api/v1/workflow/optimize with flat voyage parameters adapted automatically."""
        departure = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        deadline = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        flat_payload = {
            "source_port_id": "PORT-SG",
            "destination_port_id": "PORT-RTM",
            "cargo_weight_tonnes": 55000.0,
            "departure_datetime": departure,
            "deadline_datetime": deadline,
            "speed_grid_step_knots": 1.0,
            "priority": "co2",
            "top_k": 3,
            "solver_config": {
                "random_seed": 99,
                "number_of_runs": 2,
                "iterations_per_temperature": 10
            }
        }

        resp = client.post("/api/v1/workflow/optimize", json=flat_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["workflow_metadata"]["execution_status"] == "completed"
        assert data["stages"]["comparative_analysis"]["selected_priority"] == "co2"

    def test_workflow_optimize_endpoint_invalid_port_returns_404(self):
        """POST /api/v1/workflow/optimize with unknown port returns HTTP 404."""
        sample_resp = client.get("/api/v1/workflow/sample-request")
        payload = sample_resp.json()
        payload["voyage_request"]["source_port_id"] = "PORT-NONEXISTENT"

        resp = client.post("/api/v1/workflow/optimize", json=payload)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"]
