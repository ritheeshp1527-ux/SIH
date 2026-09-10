import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
import httpx

from backend.app.main import app
from backend.app.api.v1.endpoints.weather import get_live_weather_adapter
from backend.app.services.external.live_weather_route_adapter import (
    resolve_port_to_locode,
    LiveWeatherRouteAdapter,
    ReferenceServiceUnavailableException,
    ReferenceBadRequestException,
)

client = TestClient(app)

# Reusable mock reference response payload matching searoutes-weather RouteResponse
MOCK_REFERENCE_RESPONSE = {
    "voyageRequest": {
        "sourcePort": "SGSIN",
        "destinationPort": "AEDXB",
        "vesselSpeed": 14.0,
        "vesselDraft": 15.5,
    },
    "routes": [
        {
            "id": "mock-route-uuid-001",
            "isPrimary": True,
            "distance": 6485704.0,  # 6485704 meters = 3502.0 NM
            "duration": 900514285.0,  # 900514285 ms = 250.14 hours
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [103.85, 1.29],
                    [80.0, 6.0],
                    [55.06, 25.01]
                ]
            },
            "environmentalPoints": [
                {
                    "latitude": 1.29,
                    "longitude": 103.85,
                    "timestamp": "2026-10-01T12:00:00.000Z",
                    "windSpeed": 12.5,
                    "windDirection": 145.0,
                    "waveHeight": 1.4,
                    "waveDirection": 150.0,
                    "wavePeriod": 6.5,
                    "oceanCurrentVelocity": 0.8,
                    "oceanCurrentDirection": 135.0,
                    "seaState": 3,
                    "alongTrackCurrent": 0.6,
                    "stormFlag": False,
                    "weatherRiskLevel": "LOW",
                    "visibility": None,
                },
                {
                    "latitude": 6.0,
                    "longitude": 80.0,
                    "timestamp": "2026-10-05T00:00:00.000Z",
                    # Deliberately null / None values to test strict null preservation
                    "windSpeed": None,
                    "windDirection": None,
                    "waveHeight": None,
                    "waveDirection": None,
                    "wavePeriod": None,
                    "oceanCurrentVelocity": None,
                    "oceanCurrentDirection": None,
                    "seaState": None,
                    "alongTrackCurrent": None,
                    "stormFlag": None,
                    "weatherRiskLevel": None,
                    "visibility": None,
                }
            ],
            "metadata": {
                "provider": "Eurostat SeaRoute (searoute-ts)"
            },
            "optimization": {
                "score": 412.5,
                "rank": 1,
                "distanceScore": 3502.0,
                "windScore": 625.0,
                "waveScore": 280.0,
                "currentScore": -60.0,
                "riskScore": 0.0,
                "stormPenalty": 0.0,
                "marineCoverageRatio": 0.5,
                "weatherCoverageRatio": 0.5,
                "explanation": "Primary route candidate via Malacca & Arabian Sea"
            }
        }
    ],
    "fuelModelInput": {
        "sourcePort": "SGSIN",
        "destinationPort": "AEDXB",
        "routeId": "mock-route-uuid-001",
        "distanceNm": 3502.0,
        "durationHours": 250.14,
    }
}


@pytest.fixture(autouse=True)
def clean_dependency_overrides():
    """Ensure FastAPI dependency overrides are cleaned up after each test."""
    yield
    app.dependency_overrides.clear()


def set_mock_adapter(status_code: int = 200, json_data: dict = None, side_effect=None):
    """Configures LiveWeatherRouteAdapter with a mocked HTTP client via FastAPI dependency injection."""
    mock_http_client = MagicMock()
    if side_effect:
        mock_http_client.post.side_effect = side_effect
    else:
        resp = MagicMock()
        resp.status_code = status_code
        resp.json.return_value = json_data if json_data is not None else MOCK_REFERENCE_RESPONSE
        resp.text = str(json_data)
        mock_http_client.post.return_value = resp

    adapter = LiveWeatherRouteAdapter(http_client=mock_http_client)
    app.dependency_overrides[get_live_weather_adapter] = lambda: adapter
    return mock_http_client


# ---------------------------------------------------------------------------
# 1. UN/LOCODE Alias Resolution Tests
# ---------------------------------------------------------------------------

def test_alias_resolution_port_sg():
    """Verify PORT-SG resolves to SGSIN."""
    assert resolve_port_to_locode("PORT-SG") == "SGSIN"
    assert resolve_port_to_locode("port-sg  ") == "SGSIN"

def test_alias_resolution_port_rtm():
    """Verify PORT-RTM resolves to NLRTM."""
    assert resolve_port_to_locode("PORT-RTM") == "NLRTM"
    assert resolve_port_to_locode("  port-rtm") == "NLRTM"

def test_locode_resolution_native_ports():
    """Verify native 5-character UN/LOCODEs pass through cleanly."""
    assert resolve_port_to_locode("SGSIN") == "SGSIN"
    assert resolve_port_to_locode("NLRTM") == "NLRTM"
    assert resolve_port_to_locode("INBOM") == "INBOM"
    assert resolve_port_to_locode("AEDXB") == "AEDXB"
    assert resolve_port_to_locode("USNYC") == "USNYC"

def test_locode_resolution_global_arbitrary_port():
    """Verify arbitrary global UN/LOCODEs (e.g. Tokyo JPTYO, Los Angeles USLAX) are accepted."""
    assert resolve_port_to_locode("JPTYO") == "JPTYO"
    assert resolve_port_to_locode("USLAX") == "USLAX"
    assert resolve_port_to_locode("CNSHA") == "CNSHA"

def test_locode_resolution_invalid_format():
    """Verify invalid format strings raise ValueError."""
    with pytest.raises(ValueError, match="Invalid port identifier"):
        resolve_port_to_locode("INVALID_PORT_NAME")
    with pytest.raises(ValueError, match="Invalid port identifier"):
        resolve_port_to_locode("SG1")
    with pytest.raises(ValueError, match="non-empty string"):
        resolve_port_to_locode("")


# ---------------------------------------------------------------------------
# 2. End-to-End API Endpoint Tests with Mocked Reference Engine
# ---------------------------------------------------------------------------

def test_singapore_to_dubai_alias_request_mapping():
    """
    Test 1: Singapore -> Dubai
    Request with PORT-SG -> AEDXB
    Expected reference request: SGSIN -> AEDXB
    """
    mock_http = set_mock_adapter(json_data=MOCK_REFERENCE_RESPONSE)

    payload = {
        "source_port": "PORT-SG",
        "destination_port": "AEDXB",
        "departure_datetime": "2026-10-01T12:00:00Z",
        "vessel_id": "VES-001",
    }

    res = client.post("/api/v1/weather/live-voyage", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Verify reference service received resolved SGSIN -> AEDXB
    mock_http.post.assert_called_once()
    called_args, called_kwargs = mock_http.post.call_args
    ref_body = called_kwargs["json"]
    assert ref_body["sourcePort"] == "SGSIN"
    assert ref_body["destinationPort"] == "AEDXB"
    assert ref_body["vesselDraft"] == 15.5  # VES-001 design draft
    assert ref_body["vesselSpeed"] == 16.0  # VES-001 midpoint speed (10+22)/2

    # Verify normalized response structure
    assert data["status"] == "success"
    assert data["source_port"] == "PORT-SG"
    assert data["destination_port"] == "AEDXB"
    assert data["source_locode"] == "SGSIN"
    assert data["destination_locode"] == "AEDXB"
    assert len(data["routes"]) == 1
    assert data["primary_route"]["id"] == "mock-route-uuid-001"


def test_singapore_to_rotterdam_locode_request():
    """
    Test 2: Singapore -> Rotterdam (SGSIN -> NLRTM)
    """
    mock_http = set_mock_adapter(json_data=MOCK_REFERENCE_RESPONSE)

    payload = {
        "source_port": "SGSIN",
        "destination_port": "NLRTM",
    }
    res = client.post("/api/v1/weather/live-voyage", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["source_locode"] == "SGSIN"
    assert data["destination_locode"] == "NLRTM"

    called_kwargs = mock_http.post.call_args[1]
    assert called_kwargs["json"]["sourcePort"] == "SGSIN"
    assert called_kwargs["json"]["destinationPort"] == "NLRTM"


def test_mumbai_to_dubai_request():
    """
    Test 3: Mumbai -> Dubai (INBOM -> AEDXB)
    """
    mock_http = set_mock_adapter(json_data=MOCK_REFERENCE_RESPONSE)

    payload = {
        "source_port": "INBOM",
        "destination_port": "AEDXB",
    }
    res = client.post("/api/v1/weather/live-voyage", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["source_locode"] == "INBOM"
    assert data["destination_locode"] == "AEDXB"


# ---------------------------------------------------------------------------
# 3. Unit Conversion & Response Normalization Tests
# ---------------------------------------------------------------------------

def test_unit_conversions_distance_and_duration():
    """
    Test: Distance and duration conversion:
    distance_nm = meters / 1852
    duration_hours = ms / 3,600,000
    """
    custom_mock = {
        "routes": [
            {
                "id": "test-route-1",
                "isPrimary": True,
                "distance": 1852000.0,  # exactly 1,000 NM
                "duration": 72000000.0,  # exactly 20 hours
                "geometry": {"type": "LineString", "coordinates": []},
                "environmentalPoints": [],
            }
        ]
    }
    set_mock_adapter(json_data=custom_mock)

    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "SGSIN", "destination_port": "AEDXB"}
    )
    assert res.status_code == 200
    route = res.json()["routes"][0]
    assert route["distance_m"] == 1852000.0
    assert route["distance_nm"] == 1000.0
    assert route["duration_ms"] == 72000000.0
    assert route["duration_hours"] == 20.0


# ---------------------------------------------------------------------------
# 4. Strict Null Policy Tests
# ---------------------------------------------------------------------------

def test_strict_null_preservation():
    """
    Test: When reference engine returns null for weather/marine parameters,
    the normalized response MUST preserve null (None) and NEVER convert to 0 or False.
    """
    set_mock_adapter(json_data=MOCK_REFERENCE_RESPONSE)

    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "SGSIN", "destination_port": "AEDXB"}
    )
    assert res.status_code == 200
    pts = res.json()["routes"][0]["environmental_points"]
    assert len(pts) == 2

    # Point 0: Populated point
    assert pts[0]["wind_speed_knots"] == 12.5
    assert pts[0]["significant_wave_height_m"] == 1.4

    # Point 1: Deliberate null point
    pt_null = pts[1]
    assert pt_null["wind_speed_knots"] is None
    assert pt_null["wind_direction_deg"] is None
    assert pt_null["significant_wave_height_m"] is None
    assert pt_null["ocean_current_velocity_knots"] is None
    assert pt_null["sea_state"] is None
    assert pt_null["along_track_current_knots"] is None
    assert pt_null["storm_flag"] is None
    assert pt_null["weather_risk_level"] is None
    assert pt_null["visibility_m"] is None


# ---------------------------------------------------------------------------
# 5. Service URL Secrecy Tests
# ---------------------------------------------------------------------------

def test_reference_service_url_not_exposed_in_response():
    """
    Verify reference_service_url is implementation detail and NOT exposed in LiveVoyageResponse.
    """
    set_mock_adapter(json_data=MOCK_REFERENCE_RESPONSE)

    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "SGSIN", "destination_port": "AEDXB"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "reference_service_url" not in data
    assert "service_url" not in data


# ---------------------------------------------------------------------------
# 6. Error Handling Tests
# ---------------------------------------------------------------------------

def test_reference_service_unavailable_returns_503():
    """
    Test: When internal searoutes-weather service is down,
    returns structured HTTP 503 error without falling back to fake weather.
    """
    set_mock_adapter(side_effect=httpx.ConnectError("Connection refused"))

    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "SGSIN", "destination_port": "AEDXB"}
    )
    assert res.status_code == 503
    data = res.json()
    assert data["status"] == "unavailable"
    assert data["source"] == "live_weather_engine"
    assert "Live maritime routing/weather service unavailable" in data["message"]


def test_invalid_port_identifier_returns_400():
    """
    Test: Invalid port identifier (e.g. 'UNKNOWN-PORT-XYZ') returns HTTP 400.
    """
    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "UNKNOWN-PORT-XYZ", "destination_port": "AEDXB"}
    )
    assert res.status_code == 400
    assert "Invalid port identifier" in res.json()["detail"]


def test_identical_source_and_dest_returns_400():
    """
    Test: Identical source and destination ports (PORT-SG and SGSIN) return HTTP 400.
    """
    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "PORT-SG", "destination_port": "SGSIN"}
    )
    assert res.status_code == 400
    assert "cannot resolve to the same UN/LOCODE" in res.json()["detail"]


def test_reference_service_400_rejection_propagated():
    """
    Test: When reference engine rejects request with HTTP 400 (e.g. routing failure),
    the error message is cleanly returned to the client as HTTP 400.
    """
    set_mock_adapter(status_code=400, json_data={"error": "Routing failure: no path found between ports"})

    res = client.post(
        "/api/v1/weather/live-voyage",
        json={"source_port": "SGSIN", "destination_port": "USLAX"}
    )
    assert res.status_code == 400
    assert "Routing failure: no path found between ports" in res.json()["detail"]
