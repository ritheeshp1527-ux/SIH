import json
from pathlib import Path
from typing import List, Optional, Dict
from fastapi import HTTPException

from backend.app.services.interfaces.route_provider import RouteProviderBase
from backend.app.models.maritime_network import (
    Port,
    Waypoint,
    RouteSegment,
    MaritimeRoute,
)
from backend.app.models.vessel import Vessel
from backend.app.models.route import Route, Checkpoint

class DemoRouteProvider(RouteProviderBase):
    """
    Simulated/Demo Maritime Network & Route Provider.
    Loads ports, navigational waypoints, route segments, and candidate routes
    from local demo data seed files.
    
    DISCLAIMER:
    All coordinates, segment distances, and canal tolls are SIMULATED DEMO DATA
    for prototype presentation and architecture verification only.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).resolve().parent.parent.parent / "data" / "demo"
        self._data_dir = data_dir
        self._ports: Dict[str, Port] = self._load_ports()
        self._waypoints: Dict[str, Waypoint] = self._load_waypoints()
        self._segments: Dict[str, RouteSegment] = self._load_segments()
        self._maritime_routes: Dict[str, MaritimeRoute] = self._load_maritime_routes()

    def _load_ports(self) -> Dict[str, Port]:
        path = self._data_dir / "demo_ports.json"
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: Port(**item) for item in data}

    def _load_waypoints(self) -> Dict[str, Waypoint]:
        path = self._data_dir / "demo_waypoints.json"
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: Waypoint(**item) for item in data}

    def _load_segments(self) -> Dict[str, RouteSegment]:
        path = self._data_dir / "demo_segments.json"
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["id"]: RouteSegment(**item) for item in data}

    def _load_maritime_routes(self) -> Dict[str, MaritimeRoute]:
        path = self._data_dir / "demo_maritime_routes.json"
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            routes = {}
            for item in data:
                route = MaritimeRoute(**item)
                # Resolve sub-objects
                route.origin_port = self._ports.get(route.origin_port_id)
                route.destination_port = self._ports.get(route.destination_port_id)
                route.waypoints = [self._waypoints[wid] for wid in route.waypoint_ids if wid in self._waypoints]
                route.segments = [self._segments[sid] for sid in route.segment_ids if sid in self._segments]
                
                # Strict distance consistency: sum of segments
                computed_dist = sum(s.distance_nm for s in route.segments)
                if computed_dist > 0:
                    route.total_distance_nm = round(computed_dist, 1)

                routes[route.id] = route
            return routes

    def get_ports(self) -> List[Port]:
        return list(self._ports.values())

    def get_port_by_id(self, port_id: str) -> Optional[Port]:
        return self._ports.get(port_id)

    def get_waypoints(self) -> List[Waypoint]:
        return list(self._waypoints.values())

    def get_waypoint_by_id(self, waypoint_id: str) -> Optional[Waypoint]:
        return self._waypoints.get(waypoint_id)

    def get_maritime_route_by_id(self, route_id: str) -> Optional[MaritimeRoute]:
        return self._maritime_routes.get(route_id)

    def get_all_maritime_routes(self) -> List[MaritimeRoute]:
        return list(self._maritime_routes.values())

    def get_candidate_routes(
        self,
        origin_port_id: str,
        destination_port_id: str,
        vessel: Optional[Vessel] = None,
        cargo_weight_tonnes: Optional[float] = None
    ) -> List[MaritimeRoute]:
        """
        Retrieves candidate routes and evaluates physical and regulatory feasibility against vessel.
        """
        origin_port = self.get_port_by_id(origin_port_id)
        if not origin_port:
            raise HTTPException(
                status_code=404,
                detail=f"Origin port '{origin_port_id}' not found in maritime network catalog."
            )

        dest_port = self.get_port_by_id(destination_port_id)
        if not dest_port:
            raise HTTPException(
                status_code=404,
                detail=f"Destination port '{destination_port_id}' not found in maritime network catalog."
            )

        # Match candidate routes
        candidates: List[MaritimeRoute] = []
        for route_template in self._maritime_routes.values():
            if (
                route_template.origin_port_id == origin_port_id
                and route_template.destination_port_id == destination_port_id
            ):
                # Clone route to avoid mutating cached template
                route = route_template.model_copy(deep=True)
                route.origin_port = origin_port
                route.destination_port = dest_port
                route.waypoints = [self._waypoints[wid] for wid in route.waypoint_ids if wid in self._waypoints]
                route.segments = [self._segments[sid] for sid in route.segment_ids if sid in self._segments]

                # Structural Feasibility Checks
                infeasible_reasons: List[str] = []

                if vessel:
                    # 1. Draft check: Origin port
                    if vessel.design_draft_m > origin_port.draft_limit_m:
                        infeasible_reasons.append(
                            f"VESSEL_DRAFT_EXCEEDS_PORT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                            f"exceeds origin port {origin_port.name} limit ({origin_port.draft_limit_m}m)."
                        )

                    # 2. Draft check: Destination port
                    if vessel.design_draft_m > dest_port.draft_limit_m:
                        infeasible_reasons.append(
                            f"VESSEL_DRAFT_EXCEEDS_PORT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                            f"exceeds destination port {dest_port.name} limit ({dest_port.draft_limit_m}m)."
                        )

                    # 3. Draft check: Segments (e.g. Suez Canal 16.0m limit)
                    for seg in route.segments:
                        if seg.draft_limit_m and vessel.design_draft_m > seg.draft_limit_m:
                            infeasible_reasons.append(
                                f"VESSEL_DRAFT_EXCEEDS_SEGMENT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                                f"exceeds {seg.notes or seg.id} maximum draft limit ({seg.draft_limit_m}m)."
                            )

                    # 4. Capacity vs Port berth limits
                    if vessel.capacity_tonnes > origin_port.max_vessel_capacity_tonnes:
                        infeasible_reasons.append(
                            f"VESSEL_CAPACITY_EXCEEDS_PORT_LIMIT: Vessel capacity ({vessel.capacity_tonnes}t) "
                            f"exceeds origin {origin_port.name} limit ({origin_port.max_vessel_capacity_tonnes}t)."
                        )
                    if vessel.capacity_tonnes > dest_port.max_vessel_capacity_tonnes:
                        infeasible_reasons.append(
                            f"VESSEL_CAPACITY_EXCEEDS_PORT_LIMIT: Vessel capacity ({vessel.capacity_tonnes}t) "
                            f"exceeds destination {dest_port.name} limit ({dest_port.max_vessel_capacity_tonnes}t)."
                        )

                    # 5. Cargo vs Vessel Capacity
                    if cargo_weight_tonnes and cargo_weight_tonnes > vessel.capacity_tonnes:
                        infeasible_reasons.append(
                            f"CARGO_EXCEEDS_VESSEL_CAPACITY: Cargo weight ({cargo_weight_tonnes}t) "
                            f"exceeds vessel capacity ({vessel.capacity_tonnes}t)."
                        )

                if infeasible_reasons:
                    route.feasibility_status = "infeasible"
                    route.infeasibility_reasons = infeasible_reasons
                else:
                    route.feasibility_status = "feasible"
                    route.infeasibility_reasons = []

                candidates.append(route)

        return candidates

    # Backward compatibility with Phase 0
    def get_routes(self, source: str, destination: str) -> List[Route]:
        """Provides backward compatibility for Phase 0 tests and modules."""
        legacy_routes = []
        for r in self._maritime_routes.values():
            origin_name = self._ports.get(r.origin_port_id, Port(id="", name=r.origin_port_id, country="", latitude=0, longitude=0, draft_limit_m=10, max_vessel_capacity_tonnes=100000, fuel_availability=[])).name
            dest_name = self._ports.get(r.destination_port_id, Port(id="", name=r.destination_port_id, country="", latitude=0, longitude=0, draft_limit_m=10, max_vessel_capacity_tonnes=100000, fuel_availability=[])).name
            
            checkpoints = []
            for i, wid in enumerate(r.waypoint_ids):
                wp = self._waypoints.get(wid)
                if wp:
                    checkpoints.append(Checkpoint(
                        name=wp.name,
                        latitude=wp.latitude,
                        longitude=wp.longitude,
                        sequence_order=i + 1
                    ))
            
            legacy_routes.append(Route(
                id=r.id,
                name=r.name,
                source=origin_name,
                destination=dest_name,
                distance=r.total_distance_nm,
                checkpoints=checkpoints,
                is_canal_route=(r.route_type == "canal_transit"),
                estimated_transit_hours=r.estimated_transit_hours
            ))

        # Filter if exact match
        exact_matches = [
            lr for lr in legacy_routes
            if source.lower() in lr.source.lower() and destination.lower() in lr.destination.lower()
        ]
        return exact_matches if exact_matches else legacy_routes

    def get_route_by_id(self, route_id: str) -> Optional[Route]:
        routes = self.get_routes("", "")
        for r in routes:
            if r.id == route_id:
                return r
        return None
