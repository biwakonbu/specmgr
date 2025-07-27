"""Search service tests."""

from unittest.mock import AsyncMock, patch

import pytest

from app.models.api_models import SearchResult, SearchResultMetadata
from app.services.search_service import SearchService


class TestSearchService:
    """Search service test class."""

    @pytest.fixture
    def search_service(self) -> SearchService:
        """Create search service instance."""
        return SearchService()

    def test_init(self, search_service: SearchService) -> None:
        """Test search service initialization."""
        assert search_service is not None

    @pytest.mark.asyncio
    @patch("app.services.search_service.SearchService._simple_text_search")
    async def test_search_text_success(
        self, mock_text_search: AsyncMock, search_service: SearchService
    ) -> None:
        """Test successful text search."""
        # Setup mock - return list of proper SearchResult objects
        search_result = SearchResult(
            id="1",
            content="test result",
            score=0.9,
            metadata=SearchResultMetadata(
                filePath="/docs/test.md",
                fileName="test.md",
                chunkIndex=0,
                totalChunks=1,
                modified="2025-01-01T00:00:00Z",
                size=100,
            ),
        )
        mock_text_search.return_value = [search_result]

        # Execute test
        result = await search_service.search("test query")

        # Verify results
        assert result.total_results == 1  # Should have 1 result from mock
        assert result.query == "test query"

    @pytest.mark.asyncio
    async def test_get_stats_success(self, search_service: SearchService) -> None:
        """Test successful stats retrieval."""
        # Execute test
        result = await search_service.get_stats()

        # Verify results (basic check that it returns a stats object)
        assert hasattr(result, "total_files")
        assert hasattr(result, "total_chunks")

    @pytest.mark.asyncio
    @patch("app.services.search_service.SearchService._simple_text_search")
    async def test_search_with_parameters(
        self, mock_text_search: AsyncMock, search_service: SearchService
    ) -> None:
        """Test search with custom parameters."""
        # Setup mock - return empty list directly
        mock_text_search.return_value = []

        # Execute test with parameters
        result = await search_service.search(
            query="test query", limit=5, score_threshold=0.8, file_path="/docs"
        )

        # Verify results
        assert result.query == "test query"
        assert result.total_results == 0  # Empty list should give 0 results

    @pytest.mark.asyncio
    async def test_search_empty_query(self, search_service: SearchService) -> None:
        """Test search with empty query."""
        # Execute test
        result = await search_service.search("")

        # Verify results (should handle empty query gracefully)
        assert result.query == ""
        assert result.total_results >= 0
