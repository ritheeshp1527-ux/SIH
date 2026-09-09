from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.api.v1.endpoints.routes import get_route_provider

router = APIRouter()

@router.get("/health", summary="System Health & Diagnostic Status")
def get_health() -> Dict[str, Any]:
    """
    Returns system status, active environment, and data source mode flags.
    """
    active_route_provider = type(get_route_provider()).__name__
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "phase": "Phase 4 - Classical Voyage Optimization Baseline",
        "data_source_mode": settings.DATA_SOURCE_MODE,
        "demo_mode": {
            "use_demo_data": settings.USE_DEMO_DATA,
            "use_demo_optimizer": settings.USE_DEMO_OPTIMIZER
        },
        "interfaces": {
            "fuel_model": "DemoFuelModel (ready for RealFuelModel)",
            "route_provider": active_route_provider,
            "weather_provider": "DemoWeatherProvider (ready for RealWeatherProvider)",
            "classical_optimizer": "DemoClassicalOptimizer (ready for ClassicalSolver)",
            "quantum_optimizer": "DemoQuantumOptimizer (ready for RealQuantumInspiredOptimizer)"
        }
    }
