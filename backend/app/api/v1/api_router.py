from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, meta, fuel, routes, weather, optimization, workflow

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(meta.router, tags=["Metadata"])
api_router.include_router(fuel.router, prefix="/fuel", tags=["Ship & Fuel Intelligence"])
api_router.include_router(routes.router, prefix="/routes", tags=["Maritime Network & Routes"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather & Ocean Dynamic Impact"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["Classical Voyage Optimization"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["End-to-End Workflow Orchestration"])
