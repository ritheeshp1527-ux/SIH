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
from backend.app.data.ingestion.route_ingestion import MaritimeNetworkIngestionService

from backend.app.services.demo.demo_route_provider import DemoRouteProvider

# UN/LOCODE alias map for backwards compatibility with demo identifiers
LOCODE_ALIASES: Dict[str, str] = {
    "PORT-SG": "SGSIN",
    "PORT-RTM": "NLRTM",
}
REVERSE_ALIASES: Dict[str, str] = {v: k for k, v in LOCODE_ALIASES.items()}

def resolve_locode(port_id: str) -> str:
    cleaned = port_id.strip()
    return LOCODE_ALIASES.get(cleaned, cleaned.upper())

class ExternalRouteProvider(RouteProviderBase):
    """
    Route Provider consuming external maritime datasets (e.g. stage3_maritime_routes.csv).
    Loads 20 global routes connecting Mumbai, Rotterdam, Singapore, Dubai, and New York.
    Supports UN/LOCODE identifiers while maintaining backward-compatible aliases for demo codes.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        self._ingestion = MaritimeNetworkIngestionService(data_dir=data_dir)
        (
            self._maritime_routes,
            self._segments,
            self._waypoints,
            self._ports
        ) = self._ingestion.load_routes()
        self._demo_provider = DemoRouteProvider()

    def get_ports(self) -> List[Port]:
        return list(self._ports.values())

    def get_port_by_id(self, port_id: str) -> Optional[Port]:
        code = resolve_locode(port_id)
        port = self._ports.get(code)
        if port:
            if port_id in LOCODE_ALIASES:
                return port.model_copy(update={"id": port_id})
            return port
        return self._demo_provider.get_port_by_id(port_id)

    def get_waypoints(self) -> List[Waypoint]:
        return list(self._waypoints.values())

    def get_waypoint_by_id(self, waypoint_id: str) -> Optional[Waypoint]:
        wp = self._waypoints.get(waypoint_id)
        if wp:
            return wp
        return self._demo_provider.get_waypoint_by_id(waypoint_id)

    def get_maritime_route_by_id(self, route_id: str) -> Optional[MaritimeRoute]:
        # Direct lookup
        if route_id in self._maritime_routes:
            return self._maritime_routes[route_id]
        # Check demo provider for legacy route ID (e.g. RT-SG-RTM-SUEZ, RT-SG-RTM-CAPE)
        demo_route = self._demo_provider.get_maritime_route_by_id(route_id)
        if demo_route:
            return demo_route
        # Try resolving aliases in route ID
        for rid, route in self._maritime_routes.items():
            if rid.lower() == route_id.lower():
                return route
        return None

    def get_all_maritime_routes(self) -> List[MaritimeRoute]:
        return list(self._maritime_routes.values())

    def get_candidate_routes(
        self,
        origin_port_id: str,
        destination_port_id: str,
        vessel: Optional[Vessel] = None,
        cargo_weight_tonnes: Optional[float] = None
    ) -> List[MaritimeRoute]:
        src_code = resolve_locode(origin_port_id)
        dst_code = resolve_locode(destination_port_id)

        origin_port = self._ports.get(src_code)
        if not origin_port:
            origin_port = self._demo_provider.get_port_by_id(origin_port_id)
        if not origin_port:
            raise HTTPException(
                status_code=404,
                detail=f"Origin port '{origin_port_id}' not found in maritime catalog."
            )

        dest_port = self._ports.get(dst_code)
        if not dest_port:
            dest_port = self._demo_provider.get_port_by_id(destination_port_id)
        if not dest_port:
            raise HTTPException(
                status_code=404,
                detail=f"Destination port '{destination_port_id}' not found in maritime catalog."
            )

        if origin_port_id in LOCODE_ALIASES:
            origin_port = origin_port.model_copy(update={"id": origin_port_id})
        if destination_port_id in LOCODE_ALIASES:
            dest_port = dest_port.model_copy(update={"id": destination_port_id})

        candidates: List[MaritimeRoute] = []
        for route_template in self._maritime_routes.values():
            if (
                route_template.origin_port_id == src_code
                and route_template.destination_port_id == dst_code
            ):
                route = route_template.model_copy(deep=True)
                route.origin_port = origin_port
                route.destination_port = dest_port

                # Feasibility checks
                infeasible_reasons: List[str] = []
                if vessel:
                    if origin_port.draft_limit_m and vessel.design_draft_m > origin_port.draft_limit_m:
                        infeasible_reasons.append(
                            f"VESSEL_DRAFT_EXCEEDS_PORT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                            f"exceeds origin port {origin_port.name} limit ({origin_port.draft_limit_m}m)."
                        )
                    if dest_port.draft_limit_m and vessel.design_draft_m > dest_port.draft_limit_m:
                        infeasible_reasons.append(
                            f"VESSEL_DRAFT_EXCEEDS_PORT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                            f"exceeds destination port {dest_port.name} limit ({dest_port.draft_limit_m}m)."
                        )
                    for seg in route.segments:
                        if seg.draft_limit_m and vessel.design_draft_m > seg.draft_limit_m:
                            infeasible_reasons.append(
                                f"VESSEL_DRAFT_EXCEEDS_SEGMENT_LIMIT: Vessel draft ({vessel.design_draft_m}m) "
                                f"exceeds {seg.id} maximum draft limit ({seg.draft_limit_m}m)."
                            )
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

    def get_routes(self, source: str, destination: str) -> List[Route]:
        """Backward compatibility helper returning legacy Route objects."""
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
