from typing import List, Optional
from pydantic import BaseModel, Field

class Checkpoint(BaseModel):
    """
    Geographic maritime waypoint or canal checkpoint.
    """
    name: str = Field(..., description="Waypoint name", examples=["Strait of Malacca"])
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[2.5])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[101.5])
    sequence_order: int = Field(default=1, ge=0, description="Order along route")

class Route(BaseModel):
    """
    Preliminary schema for maritime candidate routes.
    """
    id: str = Field(..., description="Unique route identifier", examples=["RT-SG-RTM-SUEZ"])
    name: str = Field(..., description="Route descriptive name", examples=["Singapore to Rotterdam via Suez"])
    source: str = Field(..., description="Origin port", examples=["Port of Singapore"])
    destination: str = Field(..., description="Destination port", examples=["Port of Rotterdam"])
    distance: float = Field(..., gt=0, description="Total nautical miles", examples=[8280.0])
    checkpoints: List[Checkpoint] = Field(default_factory=list, description="Ordered navigational waypoints")
    is_canal_route: bool = Field(default=False, description="Whether route transits regulated canals")
    estimated_transit_hours: Optional[float] = Field(None, description="Baseline transit duration in hours")

from backend.app.models.maritime_network import (
    Port,
    Waypoint,
    RouteSegment,
    MaritimeRoute,
    CandidateRouteRequest,
    CandidateRouteResponse,
)


