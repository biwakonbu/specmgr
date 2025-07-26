"""Health API endpoint tests."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models.api_models import HealthStatus
from main import app


class TestHealthAPI:
    """Health API endpoint test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @patch("app.services.health_service.HealthService.get_detailed_health")
    def test_get_detailed_health_success(self, mock_get_health, client: TestClient) -> None:
        """Test successful detailed health status retrieval."""
        mock_status = HealthStatus(textSearch=True, claudeCode=True, overall=True)
        mock_get_health.return_value = mock_status

        response = client.get("/api/health/detailed")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["textSearch"] is True
        assert data["data"]["claudeCode"] is True
        assert data["data"]["overall"] is True

    @patch("app.services.health_service.HealthService.get_detailed_health")
    def test_get_detailed_health_partial_failure(self, mock_get_health, client: TestClient) -> None:
        """Test health status with partial service failures."""
        mock_status = HealthStatus(textSearch=True, claudeCode=False, overall=False)
        mock_get_health.return_value = mock_status

        response = client.get("/api/health/detailed")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["textSearch"] is True
        assert data["data"]["claudeCode"] is False
        assert data["data"]["overall"] is False

    @patch("app.services.health_service.HealthService.get_detailed_health")
    def test_get_detailed_health_error(self, mock_get_health, client: TestClient) -> None:
        """Test health check error handling."""
        mock_get_health.side_effect = Exception("Health service error")

        response = client.get("/api/health/detailed")

        assert response.status_code == 500
        assert "Health status retrieval error" in response.json()["detail"]

