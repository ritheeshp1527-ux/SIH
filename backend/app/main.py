from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.v1.api_router import api_router
from backend.app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")
    logger.info("Phase 0 Architectural Interfaces Initialized (Demo Providers Active)")
    yield
    logger.info("Shutting down green fleet optimization service.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Presentation-Ready Prototype Architecture for SIH26138:\n"
        "Quantum-Inspired Fuel Consumption Prediction and Green Fleet Optimization.\n"
        "Phase 0: Project Foundation and Architectural Skeleton."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS) for Frontend Dev Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"], summary="Root Health Probe")
def root_health():
    """Direct root health probe for load-balancers or container orchestrators."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "phase": "Phase 0 - Foundation",
        "api_docs": "/docs"
    }

