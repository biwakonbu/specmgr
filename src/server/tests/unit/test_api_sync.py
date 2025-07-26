"""Sync API endpoint tests."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models.api_models import BulkSyncResult, SyncStatus
from main import app


class TestSyncAPI:
    """Sync API endpoint test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @patch("app.services.sync_service.SyncService.execute_bulk_sync")
    def test_execute_bulk_sync_success(self, mock_sync, client: TestClient) -> None:
        """Test successful bulk sync execution."""
        mock_result = BulkSyncResult(
            success=True,
            totalFiles=10,
            processedFiles=10,
            totalChunks=50,
            processingTime=5.23,
            errors=[],
        )
        mock_sync.return_value = mock_result

        response = client.post("/api/sync/bulk", json={"force": False})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["success"] is True
        assert data["data"]["totalFiles"] == 10
        assert data["data"]["processedFiles"] == 10
        assert len(data["data"]["errors"]) == 0
        mock_sync.assert_called_once_with(force=False)

    @patch("app.services.sync_service.SyncService.execute_bulk_sync")
    def test_execute_bulk_sync_with_force(self, mock_sync, client: TestClient) -> None:
        """Test bulk sync execution with force flag."""
        mock_result = BulkSyncResult(
            success=True,
            totalFiles=5,
            processedFiles=5,
            totalChunks=25,
            processingTime=2.5,
            errors=[],
        )
        mock_sync.return_value = mock_result

        response = client.post("/api/sync/bulk", json={"force": True})

        assert response.status_code == 200
        mock_sync.assert_called_once_with(force=True)

    @patch("app.services.sync_service.SyncService.execute_bulk_sync")
    def test_execute_bulk_sync_with_errors(self, mock_sync, client: TestClient) -> None:
        """Test bulk sync execution with some errors."""
        mock_result = BulkSyncResult(
            success=False,
            totalFiles=10,
            processedFiles=8,
            totalChunks=40,
            processingTime=4.1,
            errors=["Error processing file1.md", "Error processing file2.md"],
        )
        mock_sync.return_value = mock_result

        response = client.post("/api/sync/bulk", json={"force": False})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["success"] is False
        assert len(data["data"]["errors"]) == 2

    @patch("app.services.sync_service.SyncService.execute_bulk_sync")
    def test_execute_bulk_sync_error(self, mock_sync, client: TestClient) -> None:
        """Test bulk sync error handling."""
        mock_sync.side_effect = Exception("Sync service error")

        response = client.post("/api/sync/bulk", json={"force": False})

        assert response.status_code == 500
        assert "一括同期エラー" in response.json()["detail"]

    @patch("app.services.sync_service.SyncService.get_sync_status")
    def test_get_sync_status_running(self, mock_get_status, client: TestClient) -> None:
        """Test sync status when sync is running."""
        mock_status = SyncStatus(
            isRunning=True, current=5, total=10, currentFile="/docs/file5.md"
        )
        mock_get_status.return_value = mock_status

        response = client.get("/api/sync/status")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["isRunning"] is True
        assert data["data"]["current"] == 5
        assert data["data"]["total"] == 10
        assert data["data"]["currentFile"] == "/docs/file5.md"

    @patch("app.services.sync_service.SyncService.get_sync_status")
    def test_get_sync_status_idle(self, mock_get_status, client: TestClient) -> None:
        """Test sync status when sync is idle."""
        mock_status = SyncStatus(isRunning=False, current=0, total=0, currentFile="")
        mock_get_status.return_value = mock_status

        response = client.get("/api/sync/status")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["isRunning"] is False

    @patch("app.services.sync_service.SyncService.get_sync_status")
    def test_get_sync_status_error(self, mock_get_status, client: TestClient) -> None:
        """Test sync status error handling."""
        mock_get_status.side_effect = Exception("Status service error")

        response = client.get("/api/sync/status")

        assert response.status_code == 500
        assert "同期状態取得エラー" in response.json()["detail"]

