from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Port(BaseModel):
    """
    Maritime commercial terminal node with navigational and handling limits.
    All units explicitly declared.
    """
    id: str = Field(..., description="Unique port code or UN/LOCODE", examples=["PORT-SG"])
    name: str = Field(..., description="Official port name", examples=["Port of Singapore"])
    country: str = Field(..., description="Country or territory", examples=["Singapore"])
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[1.29])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[103.85])
    draft_limit_m: float = Field(..., gt=0, description="Maximum allowable approach water draft in meters", examples=[21.0])
    max_vessel_capacity_tonnes: float = Field(..., gt=0, description="Maximum deadweight berth capacity in metric tons", examples=[250000.0])
    fuel_availability: List[str] = Field(..., description="Supported bunker fuel types", examples=[["VLSFO", "MGO", "LNG", "BIO-B20"]])
    shore_power_available: bool = Field(default=True, description="Whether cold-ironing shore electric power is available")
    port_cost: float = Field(default=15000.0, ge=0, description="Standard port call dues and agency fees in USD", examples=[15000.0])
    typical_wait_hours: float = Field(default=8.0, ge=0, description="Estimated anchorage / pilotage waiting time in hours", examples=[8.0])

class Waypoint(BaseModel):
    """
    Geographic routing node along sea lanes, straits, or canals.
    """
    id: str = Field(..., description="Unique waypoint identifier", examples=["WP-SUEZ"])
    name: str = Field(..., description="Navigational name", examples=["Suez Canal"])
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[29.97])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[32.55])
    waypoint_type: str = Field(
        ...,
        description="Category: 'port', 'strait', 'canal', 'sea', 'ocean', 'checkpoint'",
        examples=["canal"]
    )
    navigational_notes: Optional[str] = Field(None, description="Operational considerations or transit notes")

class RouteSegment(BaseModel):
    """
    Directed navigational edge between two adjacent waypoints.
    Preserves granular physical attributes for segment-level weather & optimization.
    """
    id: str = Field(..., description="Unique segment identifier", examples=["SEG-RED-SEA-SUEZ"])
    from_node: str = Field(..., description="Origin waypoint ID", examples=["WP-RED-SEA"])
    to_node: str = Field(..., description="Destination waypoint ID", examples=["WP-SUEZ"])
    distance_nm: float = Field(..., gt=0, description="Nautical miles between nodes", examples=[780.0])
    minimum_speed_knots: float = Field(default=8.0, gt=0, description="Minimum transit speed (knots)", examples=[8.0])
    maximum_speed_knots: float = Field(default=22.0, gt=0, description="Maximum safe transit speed (knots)", examples=[11.0])
    draft_limit_m: Optional[float] = Field(None, gt=0, description="Physical depth / draft limitation in meters (if canal/strait)", examples=[16.0])
    route_restriction: Optional[str] = Field(None, description="Regulatory restrictions: 'CANAL_TRANSIT', 'CONVOY_REQUIRED', 'ECA_ZONE'", examples=["CANAL_TRANSIT"])
    transit_cost: float = Field(default=0.0, ge=0, description="Canal transit toll or maritime fee in USD", examples=[350000.0])
    notes: Optional[str] = Field(None, description="Segment characteristics")

class MaritimeRoute(BaseModel):
    """
    Complete candidate maritime passage connecting origin and destination ports.
    Preserves full segment breakdown for downstream weather & optimization phases.
    """
    id: str = Field(..., description="Unique route identifier", examples=["RT-SG-RTM-SUEZ"])
    name: str = Field(..., description="Descriptive route name", examples=["Singapore to Rotterdam via Suez Canal"])
    origin_port_id: str = Field(..., description="Origin port ID", examples=["PORT-SG"])
    destination_port_id: str = Field(..., description="Destination port ID", examples=["PORT-RTM"])
    origin_port: Optional[Port] = Field(None, description="Resolved origin port specifications")
    destination_port: Optional[Port] = Field(None, description="Resolved destination port specifications")
    waypoint_ids: List[str] = Field(..., description="Ordered sequence of waypoint IDs")
    waypoints: List[Waypoint] = Field(default_factory=list, description="Resolved waypoint objects")
    segment_ids: List[str] = Field(..., description="Ordered sequence of segment IDs")
    segments: List[RouteSegment] = Field(default_factory=list, description="Resolved route segments")
    total_distance_nm: float = Field(..., gt=0, description="Total nautical miles (sum of all segment distances)", examples=[8280.0])
    estimated_transit_hours: float = Field(..., gt=0, description="Transit time at baseline reference speed 14 kn", examples=[591.4])
    estimated_transit_days: float = Field(..., gt=0, description="Transit duration in days", examples=[24.6])
    route_cost: float = Field(default=0.0, ge=0, description="Total route tolls (canal + port dues) in USD", examples=[387000.0])
    restrictions: List[str] = Field(default_factory=list, description="Aggregated route restrictions")
    feasibility_status: str = Field(default="feasible", description="'feasible' or 'infeasible'", examples=["feasible"])
    infeasibility_reasons: List[str] = Field(default_factory=list, description="Diagnostic reasons if marked infeasible")
    route_type: str = Field(default="open_ocean", description="'canal_transit' or 'open_ocean'", examples=["canal_transit"])
    disclaimer: str = Field(
        default="SIMULATED DEMO ROUTE DISTANCES — FOR PROTOTYPE DEMONSTRATION ONLY",
        description="Demo transparency marker"
    )

    # Backward compatibility properties for Phase 0 code
    @property
    def source(self) -> str:
        return self.origin_port.name if self.origin_port else self.origin_port_id

    @property
    def destination(self) -> str:
        return self.destination_port.name if self.destination_port else self.destination_port_id

    @property
    def distance(self) -> float:
        return self.total_distance_nm

    @property
    def is_canal_route(self) -> bool:
        return self.route_type == "canal_transit"

class CandidateRouteRequest(BaseModel):
    """
    Request model for querying feasible candidate routes between ports.
    """
    origin_port_id: str = Field(..., description="Origin port ID", examples=["PORT-SG"])
    destination_port_id: str = Field(..., description="Destination port ID", examples=["PORT-RTM"])
    vessel_id: Optional[str] = Field(None, description="Optional vessel ID for draft and capacity feasibility checks", examples=["VES-001"])
    cargo_weight_tonnes: Optional[float] = Field(None, gt=0, description="Optional cargo payload in metric tons", examples=[60000.0])

class CandidateRouteResponse(BaseModel):
    """
    Response model containing all candidate maritime routes with feasibility evaluations.
    """
    status: str = Field(default="demo_network", description="Response status")
    disclaimer: str = Field(
        default="SIMULATED MARITIME NETWORK — DEMONSTRATION DATA ONLY",
        description="Prototype transparency notice"
    )
    origin_port: Port
    destination_port: Port
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    cargo_weight_tonnes: Optional[float] = None
    candidate_routes: List[MaritimeRoute]
    total_candidates: int
    feasible_candidates: int
