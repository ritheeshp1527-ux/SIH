def test_root_health_endpoint(client):
    """Test the base health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "project" in data
    assert "Phase 0" in data["phase"]

def test_api_v1_health_endpoint(client):
    """Test the detailed API v1 health and diagnostic endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert data["demo_mode"]["use_demo_data"] is True
    assert "interfaces" in data

def test_api_v1_meta_pipeline(client):
    """Test metadata pipeline stages endpoint."""
    response = client.get("/api/v1/meta/pipeline")
    assert response.status_code == 200
    data = response.json()
    assert "pipeline" in data
    assert len(data["pipeline"]) == 8
    assert data["pipeline"][0]["name"] == "User Shipment Request"
