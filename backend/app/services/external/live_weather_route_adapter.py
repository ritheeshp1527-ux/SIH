import logging
import re
from typing import Optional, Dict, Any, List
import httpx

from backend.app.core.config import settings
from backend.app.models.live_weather_route import (
    LiveVoyageRequest,
    LiveVoyageResponse,
    NormalizedRoutePlan,
    NormalizedEnvironmentalPoint,
    NormalizedRouteOptimization,
)
from backend.app.services.fuel_intelligence_service import FuelIntelligenceService

logger = logging.getLogger("maritime.live_weather_adapter")

# Port alias mapping for demo codes to standard UN/LOCODEs
LOCODE_ALIASES: Dict[str, str] = {
    "PORT-SG": "SGSIN",
    "PORT-RTM": "NLRTM",
}

# Standard UN/LOCODE regex: 2 country letters + 3 location alphanumerics
UNLOCODE_PATTERN = re.compile(r"^[A-Z]{2}[A-Z0-9]{3}$")


class ReferenceServiceUnavailableException(Exception):
    """Raised when the internal searoutes-weather service cannot be reached."""
    def __init__(self, message: str = "Live maritime routing/weather service unavailable"):
        self.message = message
        super().__init__(self.message)


class ReferenceBadRequestException(Exception):
    """Raised when the reference engine rejects the request (e.g. unresolvable port or no navigable path)."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


def resolve_port_to_locode(port_str: str) -> str:
    """
    Normalizes a port string to a validated 5-character UN/LOCODE.
    Applies known application aliases (e.g. PORT-SG -> SGSIN, PORT-RTM -> NLRTM).
    Validates syntax against UN/LOCODE format.
    Does NOT restrict globally to the local 5-port catalog.
    """
    if not port_str or not isinstance(port_str, str):
        raise ValueError("Port identifier must be a non-empty string.")

    cleaned = port_str.strip().upper()

    # 1. Check known application aliases
    if cleaned in LOCODE_ALIASES:
        return LOCODE_ALIASES[cleaned]

    # 2. Validate standard 5-character UN/LOCODE structure
    if not UNLOCODE_PATTERN.match(cleaned):
        raise ValueError(
            f"Invalid port identifier '{port_str}'. Must be a valid 5-character UN/LOCODE (e.g. 'SGSIN', 'AEDXB', 'USNYC') "
            f"or recognized application alias (e.g. 'PORT-SG', 'PORT-RTM')."
        )

    return cleaned


class LiveWeatherRouteAdapter:
    """
    Integration adapter bridging the FastAPI backend with the searoutes-weather
    TypeScript reference engine (running on port 3001).
    """

    def __init__(
        self,
        service_url: Optional[str] = None,
        fuel_service: Optional[FuelIntelligenceService] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.service_url = (service_url or settings.SEAROUTES_SERVICE_URL).rstrip("/")
        self.fuel_service = fuel_service or FuelIntelligenceService()
        self._client = http_client

    def evaluate_live_voyage(self, request: LiveVoyageRequest) -> LiveVoyageResponse:
        """
        Executes end-to-end live voyage evaluation:
        1. Resolves port aliases to UN/LOCODE.
        2. Resolves actual vessel parameters if vessel_id is provided.
        3. Calls SEAROUTES_SERVICE_URL/api/voyage.
        4. Validates and normalizes response with strict null preservation.
        """
        # 1. Resolve UN/LOCODEs
        src_locode = resolve_port_to_locode(request.source_port)
        dst_locode = resolve_port_to_locode(request.destination_port)

        if src_locode == dst_locode:
            raise ValueError(f"Source port '{request.source_port}' and destination port '{request.destination_port}' cannot resolve to the same UN/LOCODE ({src_locode}).")

        # 2. Resolve Vessel Parameters without fabricating defaults
        vessel_draft: Optional[float] = request.vessel_draft_m
        vessel_speed: Optional[float] = request.vessel_speed_knots

        if request.vessel_id:
            vessel = self.fuel_service.get_vessel_by_id(request.vessel_id)
            if vessel:
                if vessel_draft is None:
                    vessel_draft = vessel.design_draft_m
                if vessel_speed is None:
                    # Operating midpoint speed
                    vessel_speed = round((vessel.min_speed_knots + vessel.max_speed_knots) / 2.0, 1)

        # 3. Construct reference payload matching searoutes-weather VoyageRequest schema
        ref_payload: Dict[str, Any] = {
            "sourcePort": src_locode,
            "destinationPort": dst_locode,
        }
        if request.departure_datetime:
            ref_payload["departureTimestamp"] = request.departure_datetime
        if vessel_speed is not None:
            ref_payload["vesselSpeed"] = vessel_speed
        if vessel_draft is not None:
            ref_payload["vesselDraft"] = vessel_draft
        if request.avoid_seca is not None:
            ref_payload["avoidSeca"] = request.avoid_seca
        if request.avoid_hra is not None:
            ref_payload["avoidHra"] = request.avoid_hra

        logger.info(
            "Dispatching live voyage evaluation: %s -> %s (resolved %s -> %s) to %s/api/voyage",
            request.source_port,
            request.destination_port,
            src_locode,
            dst_locode,
            self.service_url,
        )

        # 4. Dispatch HTTP Request to internal searoutes-weather service
        endpoint_url = f"{self.service_url}/api/voyage"
        try:
            if self._client is not None:
                response = self._client.post(endpoint_url, json=ref_payload, timeout=25.0)
            else:
                with httpx.Client(timeout=25.0) as client:
                    response = client.post(endpoint_url, json=ref_payload)
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.TimeoutException, httpx.NetworkError) as net_err:
            logger.error("Failed to connect to reference engine at %s: %s", endpoint_url, str(net_err))
            raise ReferenceServiceUnavailableException(
                f"Live maritime routing/weather service unavailable at {self.service_url}"
            ) from net_err

        if response.status_code == 400:
            err_detail = "Route generation failed"
            try:
                err_data = response.json()
                err_detail = err_data.get("error", err_detail)
            except Exception:
                pass
            logger.warning("Reference engine rejected request (%s -> %s): %s", src_locode, dst_locode, err_detail)
            raise ReferenceBadRequestException(err_detail)

        if response.status_code != 200:
            logger.error(
                "Reference engine returned unexpected HTTP %s from %s: %s",
                response.status_code,
                endpoint_url,
                response.text,
            )
            raise ReferenceServiceUnavailableException(
                f"Live maritime routing/weather service error (HTTP {response.status_code})"
            )

        data = response.json()
        logger.info("Successfully received live voyage response from reference engine")

        # 5. Normalize Response with strict Null preservation
        return self._normalize_response(
            raw_data=data,
            source_port=request.source_port,
            destination_port=request.destination_port,
            source_locode=src_locode,
            destination_locode=dst_locode,
        )

    def _normalize_response(
        self,
        raw_data: Dict[str, Any],
        source_port: str,
        destination_port: str,
        source_locode: str,
        destination_locode: str,
    ) -> LiveVoyageResponse:
        raw_routes = raw_data.get("routes", [])
        normalized_routes: List[NormalizedRoutePlan] = []
        primary_route: Optional[NormalizedRoutePlan] = None

        total_pts = 0
        marine_cov_sum = 0.0
        weather_cov_sum = 0.0

        for r in raw_routes:
            dist_m = float(r.get("distance", 0.0))
            dur_ms = float(r.get("duration", 0.0))

            dist_nm = round(dist_m / 1852.0, 2)
            dur_hrs = round(dur_ms / 3600000.0, 2)

            # Environmental Points Normalization
            raw_pts = r.get("environmentalPoints", [])
            norm_pts: List[NormalizedEnvironmentalPoint] = []
            for pt in raw_pts:
                norm_pts.append(
                    NormalizedEnvironmentalPoint(
                        latitude=pt.get("latitude"),
                        longitude=pt.get("longitude"),
                        timestamp=pt.get("timestamp"),
                        # Strict null preservation - do not convert None to 0
                        wind_speed_knots=pt.get("windSpeed"),
                        wind_direction_deg=pt.get("windDirection"),
                        significant_wave_height_m=pt.get("waveHeight"),
                        wave_direction_deg=pt.get("waveDirection"),
                        wave_period_s=pt.get("wavePeriod"),
                        ocean_current_velocity_knots=pt.get("oceanCurrentVelocity"),
                        ocean_current_direction_deg=pt.get("oceanCurrentDirection"),
                        sea_state=pt.get("seaState"),
                        along_track_current_knots=pt.get("alongTrackCurrent"),
                        storm_flag=pt.get("stormFlag"),
                        weather_risk_level=pt.get("weatherRiskLevel"),
                        visibility_m=pt.get("visibility"),
                    )
                )

            total_pts += len(norm_pts)

            # Optimization block
            opt_block: Optional[NormalizedRouteOptimization] = None
            raw_opt = r.get("optimization")
            if raw_opt:
                opt_block = NormalizedRouteOptimization(
                    score=float(raw_opt.get("score", 0.0)),
                    rank=int(raw_opt.get("rank", 1)),
                    distance_score=float(raw_opt.get("distanceScore", 0.0)),
                    wind_score=float(raw_opt.get("windScore", 0.0)),
                    wave_score=raw_opt.get("waveScore"),
                    current_score=raw_opt.get("currentScore"),
                    risk_score=float(raw_opt.get("riskScore", 0.0)),
                    storm_penalty=float(raw_opt.get("stormPenalty", 0.0)),
                    marine_coverage_ratio=float(raw_opt.get("marineCoverageRatio", 0.0)),
                    weather_coverage_ratio=float(raw_opt.get("weatherCoverageRatio", 0.0)),
                    explanation=raw_opt.get("explanation", ""),
                )
                marine_cov_sum += opt_block.marine_coverage_ratio
                weather_cov_sum += opt_block.weather_coverage_ratio

            plan = NormalizedRoutePlan(
                id=str(r.get("id", "")),
                is_primary=bool(r.get("isPrimary", False)),
                distance_m=dist_m,
                distance_nm=dist_nm,
                duration_ms=dur_ms,
                duration_hours=dur_hrs,
                geometry=r.get("geometry", {}),
                environmental_points=norm_pts,
                metadata=r.get("metadata", {}),
                optimization=opt_block,
            )
            normalized_routes.append(plan)
            if plan.is_primary:
                primary_route = plan

        # Fallback if primary is not explicitly marked
        if not primary_route and normalized_routes:
            primary_route = normalized_routes[0]
            primary_route.is_primary = True

        avg_marine_cov = round(marine_cov_sum / len(normalized_routes), 3) if normalized_routes else 0.0
        avg_weather_cov = round(weather_cov_sum / len(normalized_routes), 3) if normalized_routes else 0.0

        logger.info(
            "Normalized live voyage: %d routes, %d environmental points, marine coverage: %.1f%%, weather coverage: %.1f%%",
            len(normalized_routes),
            total_pts,
            avg_marine_cov * 100,
            avg_weather_cov * 100,
        )

        return LiveVoyageResponse(
            status="success",
            source_port=source_port,
            destination_port=destination_port,
            source_locode=source_locode,
            destination_locode=destination_locode,
            routes=normalized_routes,
            primary_route=primary_route,
            fuel_model_input=raw_data.get("fuelModelInput"),
            marine_coverage_ratio=avg_marine_cov,
            weather_coverage_ratio=avg_weather_cov,
        )
