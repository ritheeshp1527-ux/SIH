from abc import ABC, abstractmethod
from typing import List, Optional
from backend.app.models.maritime_network import Port, Waypoint, MaritimeRoute
from backend.app.models.vessel import Vessel
from backend.app.models.route import Route

class RouteProviderBase(ABC):
    """
    Abstract Port for Maritime Routes and Navigational Networks.
    Allows seamlessly swapping the local simulated route repository with
    live maritime GIS graphs or API providers (e.g. SeaRoutes, OpenSeaMap)
    without redesigning higher-level optimization services.
    """

    @abstractmethod
    def get_ports(self) -> List[Port]:
        """Retrieves all available commercial maritime ports."""
        pass

    @abstractmethod
    def get_port_by_id(self, port_id: str) -> Optional[Port]:
        """Retrieves port specifications by unique identifier."""
        pass

    @abstractmethod
    def get_waypoints(self) -> List[Waypoint]:
        """Retrieves all navigational waypoints and straits in the network."""
        pass

    @abstractmethod
    def get_waypoint_by_id(self, waypoint_id: str) -> Optional[Waypoint]:
        """Retrieves waypoint details by identifier."""
        pass

    @abstractmethod
    def get_candidate_routes(
        self,
        origin_port_id: str,
        destination_port_id: str,
        vessel: Optional[Vessel] = None,
        cargo_weight_tonnes: Optional[float] = None
    ) -> List[MaritimeRoute]:
        """
        Retrieves candidate maritime routes connecting origin and destination ports,
        evaluating navigational and physical feasibility against vessel limits.
        """
        pass

    @abstractmethod
    def get_maritime_route_by_id(self, route_id: str) -> Optional[MaritimeRoute]:
        """Retrieves detailed maritime route with segments and waypoints resolved."""
        pass

    @abstractmethod
    def get_all_maritime_routes(self) -> List[MaritimeRoute]:
        """Retrieves all defined maritime routes in the network."""
        pass

    # Backward compatibility with Phase 0 interface
    @abstractmethod
    def get_routes(self, source: str, destination: str) -> List[Route]:
        pass

    @abstractmethod
    def get_route_by_id(self, route_id: str) -> Optional[Route]:
        pass
