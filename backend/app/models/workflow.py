from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from backend.app.models.optimization import (
    VoyageOptimizationRequest,
    ClassicalOptimizationResponse,
    QuantumInspiredOptimizationResponse,
    SimulatedAnnealingConfig,
)
from backend.app.models.fuel_intelligence import FuelEstimationResult
from backend.app.models.vessel import Vessel
from backend.app.models.fuel import Fuel
from backend.app.models.maritime_network import MaritimeRoute
from backend.app.models.weather_intelligence import RouteEnvironmentalAssessmentResponse
from backend.app.models.decision_analysis import (
    ComparativeAnalysisResponse,
    DecisionPriority,
)

class StageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class FuelIntelligenceStageResult(BaseModel):
    """Phase 1: Ship & Fuel Intelligence stage output."""
    status: str = "completed"
    available_vessels_count: int
    available_fuels_count: int
    selected_vessel_context: Optional[Vessel] = None
    selected_fuel_context: Optional[Fuel] = None
    representative_fuel_estimate: Optional[FuelEstimationResult] = None
    notes: List[str] = Field(default_factory=list)

class MaritimeNetworkStageResult(BaseModel):
    """Phase 2: Maritime Network & Route Construction stage output."""
    status: str = "completed"
    origin_port_id: str
    destination_port_id: str
    candidate_routes_count: int
    candidate_routes: List[MaritimeRoute] = Field(default_factory=list)
    feasible_routes_count: int
    route_feasibility_breakdown: Dict[str, bool] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)

class WeatherOceanStageResult(BaseModel):
    """Phase 3: Weather & Ocean Feasibility Assessment stage output."""
    status: str = "completed"
    scenario_id: Optional[str] = None
    assessed_routes_count: int
    route_assessments: Dict[str, RouteEnvironmentalAssessmentResponse] = Field(default_factory=dict)
    safe_routes_count: int
    unsafe_routes_count: int
    weather_fuel_factors: Dict[str, float] = Field(default_factory=dict)
    notes: List[str] = Field(default_factory=list)

class ClassicalOptimizationStageResult(BaseModel):
    """Phase 4: Classical Exact Voyage Optimization stage output."""
    status: str = "completed"
    total_evaluated_combinations: int
    feasible_solutions_count: int
    runtime_ms: float
    best_cost_candidate_id: Optional[str] = None
    best_time_candidate_id: Optional[str] = None
    full_response: ClassicalOptimizationResponse

class QuantumInspiredStageResult(BaseModel):
    """Phase 5: Quantum-Inspired QUBO & Simulated Annealing stage output."""
    status: str = "completed"
    qubo_variable_count: int
    qubo_formulation_level: str
    solver_runtime_ms: float
    total_runtime_ms: float
    best_decision_id: Optional[str] = None
    top_k_solutions_count: int
    full_response: QuantumInspiredOptimizationResponse

class ComparativeAnalysisStageResult(BaseModel):
    """Phase 6: Comparative Decision Analysis stage output."""
    status: str = "completed"
    pareto_front_count: int
    selected_priority: DecisionPriority
    recommended_decision_id: str
    full_response: ComparativeAnalysisResponse

class WorkflowStagesResult(BaseModel):
    """Container for the sequential stage outputs of the end-to-end workflow."""
    fuel_intelligence: Optional[FuelIntelligenceStageResult] = None
    maritime_network: Optional[MaritimeNetworkStageResult] = None
    weather_ocean: Optional[WeatherOceanStageResult] = None
    classical_optimization: Optional[ClassicalOptimizationStageResult] = None
    quantum_inspired: Optional[QuantumInspiredStageResult] = None
    comparative_analysis: Optional[ComparativeAnalysisStageResult] = None

class WorkflowMetadata(BaseModel):
    """Traceability and diagnostic metadata for the executed workflow."""
    workflow_id: str = Field(..., description="Deterministic workflow execution identifier")
    execution_status: str = Field(..., description="'completed' or 'failed'")
    failed_stage: Optional[str] = Field(None, description="Identifier of the stage that threw an error, if any")
    error_detail: Optional[str] = Field(None, description="Diagnostic error message if failed")
    stage_completion_status: Dict[str, str] = Field(..., description="Status per pipeline stage")
    total_runtime_ms: float = Field(..., description="Wall-clock execution time in milliseconds")
    deterministic_mode: bool = Field(default=True, description="Strictly reproducible under fixed seed")
    timestamp_utc: str
    assumptions: List[str] = Field(default_factory=list)

from pydantic import BaseModel, Field, model_validator

class WorkflowOptimizationRequest(BaseModel):
    """Request payload to execute the complete end-to-end voyage optimization workflow."""
    voyage_request: VoyageOptimizationRequest
    priority: DecisionPriority = Field(default=DecisionPriority.BALANCED, description="Operator decision priority for final recommendation")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of top Quantum-Inspired solutions to retain")
    solver_config: Optional[SimulatedAnnealingConfig] = Field(default_factory=SimulatedAnnealingConfig, description="Simulated Annealing hyperparameters")

    @model_validator(mode="before")
    @classmethod
    def adapt_voyage_request(cls, data: Any) -> Any:
        if isinstance(data, dict) and "voyage_request" not in data:
            if "source_port_id" in data:
                # Copy dict to avoid mutating original
                raw = dict(data)
                priority = raw.pop("priority", DecisionPriority.BALANCED)
                top_k = raw.pop("top_k", 5)
                solver_config = raw.pop("solver_config", None)
                return {
                    "voyage_request": raw,
                    "priority": priority,
                    "top_k": top_k,
                    "solver_config": solver_config
                }
        return data

class WorkflowOptimizationResponse(BaseModel):
    """Complete end-to-end orchestrated workflow response."""
    request: VoyageOptimizationRequest
    stages: WorkflowStagesResult
    workflow_metadata: WorkflowMetadata
