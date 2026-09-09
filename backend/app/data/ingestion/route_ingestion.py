from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from backend.app.models.maritime_network import (
    Port,
    Waypoint,
    RouteSegment,
    MaritimeRoute,
)
from backend.app.data.ingestion.csv_loader import load_csv_records

# Fallback reference for ports if port_reference.csv is missing
DEFAULT_PORT_REFERENCES: Dict[str, Dict[str, Any]] = {
    "INBOM": {
        "name": "Port of Mumbai (Nhava Sheva)",
        "country": "India",
        "latitude": 18.95,
        "longitude": 72.95,
        "draft_limit_m": 15.5,
        "max_vessel_capacity_tonnes": 180000.0,
        "port_cost": 14000.0,
        "typical_wait_hours": 6.0,
    },
    "NLRTM": {
        "name": "Port of Rotterdam",
        "country": "Netherlands",
        "latitude": 51.92442,
        "longitude": 4.477733,
        "draft_limit_m": 24.0,
        "max_vessel_capacity_tonnes": 300000.0,
        "port_cost": 22000.0,
        "typical_wait_hours": 8.0,
    },
    "SGSIN": {
        "name": "Port of Singapore",
        "country": "Singapore",
        "latitude": 1.29027,
        "longitude": 103.851959,
        "draft_limit_m": 21.0,
        "max_vessel_capacity_tonnes": 250000.0,
        "port_cost": 15000.0,
        "typical_wait_hours": 6.0,
    },
    "AEDXB": {
        "name": "Port of Jebel Ali (Dubai)",
        "country": "United Arab Emirates",
        "latitude": 25.01,
        "longitude": 55.06,
        "draft_limit_m": 17.0,
        "max_vessel_capacity_tonnes": 220000.0,
        "port_cost": 16000.0,
        "typical_wait_hours": 5.0,
    },
    "USNYC": {
        "name": "Port of New York and New Jersey",
        "country": "United States",
        "latitude": 40.68,
        "longitude": -74.04,
        "draft_limit_m": 16.5,
        "max_vessel_capacity_tonnes": 200000.0,
        "port_cost": 25000.0,
        "typical_wait_hours": 7.0,
    },
}

class MaritimeNetworkIngestionService:
    """
    Data ingestion and normalization service for maritime networks and candidate passages.
    Ingests stage3_maritime_routes.csv and port_reference.csv.
    Synthesizes navigable direct corridor segments to allow segment-based environmental
    and weather assessment without changing mathematical formulas or optimizer interfaces.
    """

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).resolve().parent.parent / "external"
        self._data_dir = data_dir

    def load_ports(self, port_file_name: str = "port_reference.csv") -> Dict[str, Port]:
        """
        Loads commercial ports indexed by 5-character UN/LOCODE.
        """
        port_file = self._data_dir / port_file_name
        ports: Dict[str, Port] = {}

        if port_file.exists():
            records = load_csv_records(port_file)
            for row in records:
                locode = row.get("un_locode", "").strip().upper()
                if not locode:
                    continue
                ports[locode] = Port(
                    id=locode,
                    name=row.get("name", locode),
                    country=row.get("country", ""),
                    latitude=float(row.get("latitude", 0.0)),
                    longitude=float(row.get("longitude", 0.0)),
                    draft_limit_m=float(row.get("draft_limit_m", 18.0)),
                    max_vessel_capacity_tonnes=float(row.get("max_vessel_capacity_tonnes", 200000.0)),
                    fuel_availability=["HFO", "MDO", "LNG", "METHANOL", "AMMONIA"],
                    shore_power_available=True,
                    port_cost=float(row.get("port_cost", 15000.0)),
                    typical_wait_hours=float(row.get("typical_wait_hours", 6.0)),
                )

        # Fallback to default dictionary if file was empty or missing entries
        for locode, ref in DEFAULT_PORT_REFERENCES.items():
            if locode not in ports:
                ports[locode] = Port(
                    id=locode,
                    name=ref["name"],
                    country=ref["country"],
                    latitude=ref["latitude"],
                    longitude=ref["longitude"],
                    draft_limit_m=ref["draft_limit_m"],
                    max_vessel_capacity_tonnes=ref["max_vessel_capacity_tonnes"],
                    fuel_availability=["HFO", "MDO", "LNG", "METHANOL", "AMMONIA"],
                    shore_power_available=True,
                    port_cost=ref["port_cost"],
                    typical_wait_hours=ref["typical_wait_hours"],
                )

        return ports

    def load_routes(
        self,
        routes_file_name: str = "maritime_routes.csv",
        segments_file_name: str = "maritime_segments.csv",
        waypoints_file_name: str = "maritime_waypoints.csv",
        port_file_name: str = "port_reference.csv"
    ) -> Tuple[Dict[str, MaritimeRoute], Dict[str, RouteSegment], Dict[str, Waypoint], Dict[str, Port]]:
        """
        Parses canonical maritime network datasets (maritime_routes.csv, maritime_segments.csv, maritime_waypoints.csv).
        If canonical datasets are not found, falls back to parsing stage3_maritime_routes.csv with synthetic segments.
        """
        ports = self.load_ports(port_file_name)
        routes_file = self._data_dir / routes_file_name
        segments_file = self._data_dir / segments_file_name
        waypoints_file = self._data_dir / waypoints_file_name

        # If canonical multi-segment network exists, ingest it
        if routes_file.exists() and segments_file.exists():
            waypoints: Dict[str, Waypoint] = {}
            if waypoints_file.exists():
                wp_records = load_csv_records(waypoints_file)
                for row in wp_records:
                    w_id = row.get("waypoint_id", "").strip()
                    if not w_id:
                        continue
                    draft_val = row.get("draft_limit_m", "").strip()
                    waypoints[w_id] = Waypoint(
                        id=w_id,
                        name=row.get("name", w_id),
                        latitude=float(row.get("latitude", 0.0)),
                        longitude=float(row.get("longitude", 0.0)),
                        waypoint_type=row.get("waypoint_type", "checkpoint"),
                        navigational_notes=row.get("navigational_notes") or None
                    )

            # Ensure all terminal port approach waypoints exist
            for locode, p in ports.items():
                wp_id = f"WP-{locode}"
                if wp_id not in waypoints:
                    waypoints[wp_id] = Waypoint(
                        id=wp_id,
                        name=f"{p.name} Approach",
                        latitude=p.latitude,
                        longitude=p.longitude,
                        waypoint_type="port",
                        navigational_notes=f"Terminal approach waypoint for {locode}"
                    )

            segments: Dict[str, RouteSegment] = {}
            seg_records = load_csv_records(segments_file)
            for row in seg_records:
                s_id = row.get("segment_id", "").strip()
                if not s_id:
                    continue
                draft_str = row.get("draft_limit_m", "").strip()
                draft_val = float(draft_str) if draft_str else None
                restriction_str = row.get("route_restriction", "").strip() or None
                transit_cost_str = row.get("transit_cost_usd", "").strip()
                transit_cost_val = float(transit_cost_str) if transit_cost_str else 0.0

                segments[s_id] = RouteSegment(
                    id=s_id,
                    from_node=row.get("from_node", "").strip(),
                    to_node=row.get("to_node", "").strip(),
                    distance_nm=round(float(row.get("distance_nm", 0.0)), 2),
                    minimum_speed_knots=float(row.get("minimum_speed_knots", 8.0)),
                    maximum_speed_knots=float(row.get("maximum_speed_knots", 22.0)),
                    draft_limit_m=draft_val,
                    route_restriction=restriction_str,
                    transit_cost=transit_cost_val,
                    notes=row.get("notes") or None
                )

            routes: Dict[str, MaritimeRoute] = {}
            route_records = load_csv_records(routes_file)
            for row in route_records:
                r_id = row.get("route_id", "").strip()
                if not r_id:
                    continue
                src = row.get("origin_port_id", "").strip().upper()
                dst = row.get("destination_port_id", "").strip().upper()
                seg_ids_str = row.get("segment_ids", "").strip()
                seg_id_list = [s.strip() for s in seg_ids_str.split(",") if s.strip()]

                route_segments = [segments[s_id] for s_id in seg_id_list if s_id in segments]
                total_dist = round(sum(s.distance_nm for s in route_segments), 2)
                total_cost = round(sum(s.transit_cost for s in route_segments), 2)
                
                # Order waypoints from segments
                route_wp_ids: List[str] = []
                if route_segments:
                    route_wp_ids.append(route_segments[0].from_node)
                    for s in route_segments:
                        route_wp_ids.append(s.to_node)

                route_wp_objs = [waypoints[wid] for wid in route_wp_ids if wid in waypoints]
                collected_restrictions = sorted(list({s.route_restriction for s in route_segments if s.route_restriction}))

                ref_speed = 14.0
                transit_hours = round(total_dist / ref_speed, 1)
                transit_days = round(transit_hours / 24.0, 1)

                src_port_obj = ports.get(src)
                dst_port_obj = ports.get(dst)

                routes[r_id] = MaritimeRoute(
                    id=r_id,
                    name=row.get("name", f"{src} to {dst}"),
                    origin_port_id=src,
                    destination_port_id=dst,
                    origin_port=src_port_obj,
                    destination_port=dst_port_obj,
                    waypoint_ids=route_wp_ids,
                    waypoints=route_wp_objs,
                    segment_ids=seg_id_list,
                    segments=route_segments,
                    total_distance_nm=total_dist,
                    estimated_transit_hours=transit_hours,
                    estimated_transit_days=transit_days,
                    route_cost=total_cost,
                    restrictions=collected_restrictions,
                    route_type=row.get("route_type", "open_ocean"),
                    feasibility_status="feasible",
                    infeasibility_reasons=[],
                    disclaimer=row.get("disclaimer", "CANONICAL MULTI-SEGMENT MARITIME NETWORK")
                )

            return routes, segments, waypoints, ports

        # Fallback to legacy stage3_maritime_routes.csv loader
        legacy_routes_file = self._data_dir / "stage3_maritime_routes.csv"
        if not legacy_routes_file.exists():
            raise FileNotFoundError(f"Routes dataset missing at: {legacy_routes_file}")

        records = load_csv_records(legacy_routes_file)
        routes: Dict[str, MaritimeRoute] = {}
        segments: Dict[str, RouteSegment] = {}
        waypoints: Dict[str, Waypoint] = {}

        for locode, p in ports.items():
            wp_id = f"WP-{locode}"
            waypoints[wp_id] = Waypoint(
                id=wp_id,
                name=f"{p.name} Approach",
                latitude=p.latitude,
                longitude=p.longitude,
                waypoint_type="port",
                navigational_notes=f"Terminal approach waypoint for {locode}"
            )

        for row in records:
            src = row.get("source_port", "").strip().upper()
            dst = row.get("dest_port", "").strip().upper()
            dist_str = row.get("distance_nautical_miles", "").strip()
            if not src or not dst or not dist_str:
                continue

            dist_nm = float(dist_str)
            route_id = f"RT-{src}-{dst}"
            segment_id = f"SEG-{src}-{dst}-DIRECT"
            src_wp_id = f"WP-{src}"
            dst_wp_id = f"WP-{dst}"

            segment = RouteSegment(
                id=segment_id,
                from_node=src_wp_id,
                to_node=dst_wp_id,
                distance_nm=round(dist_nm, 1),
                minimum_speed_knots=8.0,
                maximum_speed_knots=24.0,
                draft_limit_m=None,
                route_restriction=None,
                transit_cost=0.0,
                notes=f"Direct maritime corridor between {src} and {dst}"
            )
            segments[segment_id] = segment

            ref_speed = 14.0
            transit_hours = round(dist_nm / ref_speed, 1)
            transit_days = round(transit_hours / 24.0, 1)

            src_port_obj = ports.get(src)
            dst_port_obj = ports.get(dst)

            route = MaritimeRoute(
                id=route_id,
                name=f"{src_port_obj.name if src_port_obj else src} to {dst_port_obj.name if dst_port_obj else dst}",
                origin_port_id=src,
                destination_port_id=dst,
                origin_port=src_port_obj,
                destination_port=dst_port_obj,
                waypoint_ids=[src_wp_id, dst_wp_id],
                waypoints=[waypoints[src_wp_id], waypoints[dst_wp_id]] if src_wp_id in waypoints and dst_wp_id in waypoints else [],
                segment_ids=[segment_id],
                segments=[segment],
                total_distance_nm=round(dist_nm, 1),
                estimated_transit_hours=transit_hours,
                estimated_transit_days=transit_days,
                route_cost=0.0,
                restrictions=[],
                route_type="open_ocean",
                feasibility_status="feasible",
                infeasibility_reasons=[],
                disclaimer="EXTERNAL DATASET — stage3_maritime_routes.csv"
            )
            routes[route_id] = route

        return routes, segments, waypoints, ports
