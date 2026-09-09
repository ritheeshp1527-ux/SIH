from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    ClassicalOptimizationResponse,
    QuantumInspiredOptimizationRequest,
    QuantumInspiredOptimizationResponse,
    OptimizationComparisonRequest,
    OptimizationComparisonResponse,
)
from backend.app.optimization.classical.classical_voyage_optimizer import ClassicalVoyageOptimizer
from backend.app.optimization.quantum_inspired.quantum_inspired_voyage_optimizer import QuantumInspiredVoyageOptimizer
from backend.app.services.optimization_benchmark_service import OptimizationBenchmarkService

router = APIRouter()

# Singleton optimizer and service instances
_classical_optimizer = ClassicalVoyageOptimizer()
_quantum_optimizer = QuantumInspiredVoyageOptimizer(classical_optimizer=_classical_optimizer)
_benchmark_service = OptimizationBenchmarkService(
    classical_optimizer=_classical_optimizer,
    quantum_optimizer=_quantum_optimizer
)

@router.post(
    "/classical",
    response_model=ClassicalOptimizationResponse,
    summary="Exact Classical Voyage Optimization Baseline",
    description=(
        "Executes deterministic exhaustive discrete enumeration across Vessel x Route x Speed x Fuel. "
        "Evaluates both Cost-Efficient (minimum voyage cost) and Time-Efficient (minimum voyage duration) "
        "objectives under physical, draft, weather safety, and arrival deadline constraints."
    )
)
def run_classical_optimization(
    request: VoyageOptimizationRequest
) -> ClassicalOptimizationResponse:
    return _classical_optimizer.optimize(request)

@router.post(
    "/quantum-inspired",
    response_model=QuantumInspiredOptimizationResponse,
    summary="Quantum-Inspired Simulated Annealing QUBO Voyage Optimization",
    description=(
        "Solves the discrete maritime voyage decision problem using a Quadratic Unconstrained "
        "Binary Optimization (QUBO) formulation and classical Simulated Annealing. "
        "Operates on the exact same decision space and candidate feasibility constraints as Phase 4."
    )
)
def run_quantum_inspired_optimization(
    request: QuantumInspiredOptimizationRequest
) -> QuantumInspiredOptimizationResponse:
    return _quantum_optimizer.optimize(request)

@router.post(
    "/compare",
    response_model=OptimizationComparisonResponse,
    summary="Direct Benchmark Comparison: Classical Exact Baseline vs Quantum-Inspired Optimization",
    description=(
        "Runs both Classical Exact Enumeration and Quantum-Inspired Simulated Annealing on the exact "
        "same shipment parameters, constraints, and objective mode. Reports honest relative objective "
        "gaps and transparent search statistics without false quantum claims."
    )
)
def run_optimization_comparison(
    request: OptimizationComparisonRequest
) -> OptimizationComparisonResponse:
    return _benchmark_service.compare(
        request=request.voyage_request,
        objective_mode=request.objective_mode,
        top_k=request.top_k,
        solver_config=request.solver_config
    )

from backend.app.models.decision_analysis import ComparativeAnalysisRequest, ComparativeAnalysisResponse
from backend.app.services.comparative_analysis_service import ComparativeAnalysisService

_comparative_service = ComparativeAnalysisService(
    classical_optimizer=_classical_optimizer,
    quantum_optimizer=_quantum_optimizer,
    benchmark_service=_benchmark_service
)

@router.post(
    "/comparative-analysis",
    response_model=ComparativeAnalysisResponse,
    summary="Phase 6: Comparative Decision Analysis & Recommendation",
    description=(
        "Takes the exact Phase 4 and Phase 5 optimization outcomes and constructs a "
        "comprehensive multi-objective comparative decision analysis. Calculates Pareto "
        "dominance, trade-offs, schedule reliability, and priority-driven recommendations."
    )
)
def run_comparative_analysis(
    request: ComparativeAnalysisRequest
) -> ComparativeAnalysisResponse:
    return _comparative_service.analyze(request)

from backend.app.core.config import settings

@router.get(
    "/sample-request",
    response_model=VoyageOptimizationRequest,
    summary="Get sample optimization request",
    description="Returns preconfigured sample shipment parameters from Singapore to Rotterdam."
)
def get_sample_request() -> VoyageOptimizationRequest:
    departure = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
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
