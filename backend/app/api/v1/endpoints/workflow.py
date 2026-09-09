from datetime import datetime, timedelta, timezone
from fastapi import APIRouter

from backend.app.models.workflow import (
    WorkflowOptimizationRequest,
    WorkflowOptimizationResponse,
)
from backend.app.models.optimization import VoyageOptimizationRequest
from backend.app.models.decision_analysis import DecisionPriority
from backend.app.services.end_to_end_workflow_service import EndToEndWorkflowService

router = APIRouter()

_workflow_service = EndToEndWorkflowService()

@router.post(
    "/optimize",
    response_model=WorkflowOptimizationResponse,
    summary="End-to-End Orchestrated Voyage Optimization Pipeline",
    description=(
        "Deterministically coordinates the complete voyage optimization lifecycle across all phases: "
        "Phase 1 (Fuel & Vessel Intelligence) -> Phase 2 (Maritime Network & Route Verification) -> "
        "Phase 3 (Weather & Ocean Currents) -> Phase 4 (Exact Classical Enumeration) -> "
        "Phase 5 (Quantum-Inspired QUBO Simulated Annealing) -> Phase 6 (Comparative Decision Analysis). "
        "Returns full intermediate stage artifacts alongside final priority-driven recommendations."
    )
)
def run_end_to_end_workflow(
    request: WorkflowOptimizationRequest
) -> WorkflowOptimizationResponse:
    return _workflow_service.execute_workflow(request)

from backend.app.core.config import settings

@router.get(
    "/sample-request",
    response_model=WorkflowOptimizationRequest,
    summary="Get sample end-to-end workflow request",
    description="Returns preconfigured sample payload from Singapore to Rotterdam."
)
def get_sample_workflow_request() -> WorkflowOptimizationRequest:
    departure = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    deadline = departure + timedelta(days=28)
    voyage_req = VoyageOptimizationRequest(
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
    return WorkflowOptimizationRequest(
        voyage_request=voyage_req,
        priority=DecisionPriority.BALANCED,
        top_k=5
    )
