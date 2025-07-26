"""File API endpoint tests."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.api_models import FileContent, FileMetadata, FilesResponse
from main import app


class TestFilesAPI:
    """File API endpoint test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @patch("app.services.file_service.FileService.get_files")
    def test_get_files_success(self, mock_get_files: Mock, client: TestClient) -> None:
        """Test successful file list retrieval."""
        # Mock response
        mock_response = FilesResponse(
            files=[
                FileMetadata(
                    name="test.md",
                    path="/docs/test.md",
                    relativePath="test.md",
                    directory="/docs",
                    size=1024,
                    lastModified="2025-01-01T00:00:00Z",
                    created="2025-01-01T00:00:00Z",
                    hash="abc123",
                )
            ],
            directories=[],
            totalCount=1,
        )
        mock_get_files.return_value = mock_response

        # Execute request
        response = client.get("/api/files")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert len(data["data"]["files"]) == 1
        assert data["data"]["files"][0]["name"] == "test.md"

    @patch("app.services.file_service.FileService.get_files")
    def test_get_files_with_params(
        self, mock_get_files: Mock, client: TestClient
    ) -> None:
        """Test file list retrieval with parameters."""
        mock_get_files.return_value = FilesResponse(
            files=[], directories=[], totalCount=0
        )

        response = client.get(
            "/api/files",
            params={
                "path": "/docs",
                "recursive": "true",
                "sortBy": "modified",
                "order": "desc",
            },
        )

        assert response.status_code == 200
        mock_get_files.assert_called_once_with(
            path="/docs", recursive=True, sort_by="modified", order="desc"
        )

    @patch("app.services.file_service.FileService.get_file_content")
    def test_get_file_content_success(
        self, mock_get_content: Mock, client: TestClient
    ) -> None:
        """Test successful file content retrieval."""
        mock_content = FileContent(
            path="/docs/test.md",
            name="test.md",
            content="# Test\nContent",
            metadata=FileMetadata(
                name="test.md",
                path="/docs/test.md",
                relativePath="test.md",
                directory="/docs",
                size=15,
                lastModified="2025-01-01T00:00:00Z",
                created="2025-01-01T00:00:00Z",
                hash="abc123",
            ),
        )
        mock_get_content.return_value = mock_content

        response = client.get("/api/files/docs%2Ftest.md")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["content"] == "# Test\nContent"

    @patch("app.services.file_service.FileService.get_file_content")
    def test_get_file_content_not_found(
        self, mock_get_content: Mock, client: TestClient
    ) -> None:
        """Test file not found error."""
        mock_get_content.side_effect = FileNotFoundError("File not found")

        response = client.get("/api/files/nonexistent.md")

        assert response.status_code == 404
        assert "File not found" in response.json()["detail"]

    @patch("app.services.file_service.FileService.get_files")
    def test_get_files_server_error(
        self, mock_get_files: Mock, client: TestClient
    ) -> None:
        """Test server error handling."""
        mock_get_files.side_effect = Exception("Database error")

        response = client.get("/api/files")

        assert response.status_code == 500
        assert "File list retrieval error" in response.json()["detail"]
