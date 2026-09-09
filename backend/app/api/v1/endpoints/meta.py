from typing import Dict, Any, List
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("/meta/pipeline", summary="Target Processing Pipeline Stages")
def get_pipeline_stages() -> Dict[str, Any]:
    """
    Returns the target execution pipeline stages as outlined for SIH26138.
    """
    stages: List[Dict[str, Any]] = [
        {"order": 1, "name": "User Shipment Request", "status": "Phase 0 Schema Defined"},
        {"order": 2, "name": "Ship & Fuel Intelligence", "status": "Phase 0 Interface Defined"},
        {"order": 3, "name": "Maritime Network / Routes", "status": "Phase 0 Mock Provider Available"},
        {"order": 4, "name": "Weather & Ocean Feasibility", "status": "Phase 0 Mock Provider Available"},
        {"order": 5, "name": "Classical Voyage Optimization", "status": "Phase 0 Heuristic Baseline Ready"},
        {"order": 6, "name": "Quantum-Inspired Optimization", "status": "Phase 0 Interface Skeleton Ready"},
        {"order": 7, "name": "Comparative Analysis", "status": "Phase 0 Metric Evaluator Defined"},
        {"order": 8, "name": "Final Recommendation", "status": "Pending Phase 6"}
    ]
    return {
        "project": settings.PROJECT_NAME,
        "phase": "Phase 0",
        "pipeline": stages
    }
