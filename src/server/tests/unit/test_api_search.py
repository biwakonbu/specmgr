"""Search API endpoint tests."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.api_models import (
    SearchResponse,
    SearchResult,
    SearchResultMetadata,
    SearchStats,
)
from main import app


class TestSearchAPI:
    """Search API endpoint test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @patch("app.services.search_service.SearchService.search")
    def test_search_documents_success(
        self, mock_search: Mock, client: TestClient
    ) -> None:
        """Test successful document search."""
        mock_response = SearchResponse(
            results=[
                SearchResult(
                    id="1",
                    content="Test content with query match",
                    score=0.95,
                    metadata=SearchResultMetadata(
                        filePath="/docs/test.md",
                        fileName="test.md",
                        chunkIndex=0,
                        totalChunks=1,
                        modified="2025-01-01T00:00:00Z",
                        size=1024,
                    ),
                )
            ],
            totalResults=1,
            query="test query",
            processingTime=0.123,
        )
        mock_search.return_value = mock_response

        response = client.post(
            "/api/search",
            json={
                "query": "test query",
                "limit": 10,
                "scoreThreshold": 0.5,
                "filePath": "/docs",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["results"]) == 1
        assert data["data"]["query"] == "test query"
        mock_search.assert_called_once_with(
            query="test query", limit=10, score_threshold=0.5, file_path="/docs"
        )

    @patch("app.services.search_service.SearchService.search")
    def test_search_documents_minimal_request(
        self, mock_search: Mock, client: TestClient
    ) -> None:
        """Test search with minimal request parameters."""
        mock_search.return_value = SearchResponse(
            results=[], totalResults=0, query="simple", processingTime=0.05
        )

        response = client.post("/api/search", json={"query": "simple"})

        assert response.status_code == 200
        mock_search.assert_called_once_with(
            query="simple", limit=10, score_threshold=None, file_path=None
        )

    @patch("app.services.search_service.SearchService.search")
    def test_search_documents_error(
        self, mock_search: Mock, client: TestClient
    ) -> None:
        """Test search error handling."""
        mock_search.side_effect = Exception("Search service error")

        response = client.post("/api/search", json={"query": "test"})

        assert response.status_code == 500
        assert "検索エラー" in response.json()["detail"]

    @patch("app.services.search_service.SearchService.get_stats")
    def test_get_search_stats_success(
        self, mock_get_stats: Mock, client: TestClient
    ) -> None:
        """Test successful search stats retrieval."""
        mock_stats = SearchStats(
            totalFiles=100,
            totalChunks=500,
            lastIndexed="2025-01-01T00:00:00Z",
            indexSize=1048576,
        )
        mock_get_stats.return_value = mock_stats

        response = client.get("/api/search/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["totalFiles"] == 100
        assert data["data"]["totalChunks"] == 500

    @patch("app.services.search_service.SearchService.get_stats")
    def test_get_search_stats_error(
        self, mock_get_stats: Mock, client: TestClient
    ) -> None:
        """Test search stats error handling."""
        mock_get_stats.side_effect = Exception("Stats service error")

        response = client.get("/api/search/stats")

        assert response.status_code == 500
        assert "統計取得エラー" in response.json()["detail"]

    def test_search_invalid_request(self, client: TestClient) -> None:
        """Test search with invalid request data."""
        response = client.post("/api/search", json={})

        assert response.status_code == 422  # Validation error
