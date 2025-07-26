"""Search service tests."""

from unittest.mock import Mock, patch

import pytest

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

    @patch("app.services.search_service.SearchService._vector_search")
    @patch("app.services.search_service.SearchService._text_search")
    async def test_search_vector_success(
        self,
        mock_text_search: Mock,
        mock_vector_search: Mock,
        search_service: SearchService,
    ) -> None:
        """Test successful vector search."""
        # Setup mock vector search response
        mock_vector_result = Mock()
        mock_vector_result.results = [
            Mock(
                id="1",
                payload={
                    "content": "Test content",
                    "file_path": "/docs/test.md",
                    "file_name": "test.md",
                    "chunk_index": 0,
                    "total_chunks": 1,
                    "modified": "2025-01-01T00:00:00Z",
                    "size": 1024,
                },
                score=0.95,
            )
        ]
        mock_vector_search.return_value = mock_vector_result

        # Execute test
        result = await search_service.search("test query")

        # Verify results
        assert result.query == "test query"
        assert len(result.results) == 1
        assert result.results[0].score == 0.95
        assert result.results[0].content == "Test content"
        mock_vector_search.assert_called_once()
        mock_text_search.assert_not_called()

    @patch("app.services.search_service.SearchService._vector_search")
    @patch("app.services.search_service.SearchService._text_search")
    async def test_search_fallback_to_text(
        self,
        mock_text_search: Mock,
        mock_vector_search: Mock,
        search_service: SearchService,
    ) -> None:
        """Test fallback to text search when vector search fails."""
        # Setup mocks
        mock_vector_search.side_effect = Exception("Vector search error")
        mock_text_search.return_value = Mock(
            results=[
                {
                    "id": "text_1",
                    "content": "Text search result",
                    "score": 0.8,
                    "metadata": {
                        "file_path": "/docs/text.md",
                        "file_name": "text.md",
                        "chunk_index": 0,
                        "total_chunks": 1,
                        "modified": "2025-01-01T00:00:00Z",
                        "size": 512,
                    },
                }
            ],
            total_results=1,
            processing_time=0.1,
        )

        # Execute test
        result = await search_service.search("test query")

        # Verify fallback occurred
        assert result.query == "test query"
        assert len(result.results) == 1
        assert result.results[0].id == "text_1"
        mock_vector_search.assert_called_once()
        mock_text_search.assert_called_once()

    @patch("app.services.search_service.SearchService._get_qdrant_client")
    async def test_vector_search_success(
        self, mock_get_client: Mock, search_service: SearchService
    ) -> None:
        """Test successful vector search."""
        # Setup mock Qdrant client
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        # Setup mock search response
        mock_response = Mock()
        mock_response.points = [
            Mock(
                id="1",
                payload={
                    "content": "Vector content",
                    "file_path": "/docs/vector.md",
                    "file_name": "vector.md",
                    "chunk_index": 0,
                    "total_chunks": 1,
                    "modified": "2025-01-01T00:00:00Z",
                    "size": 2048,
                },
                score=0.92,
            )
        ]
        mock_client.search.return_value = mock_response

        with patch(
            "app.services.search_service.SearchService._generate_embedding"
        ) as mock_embedding:
            mock_embedding.return_value = [0.1, 0.2, 0.3]  # Mock embedding vector

            # Execute test
            result = await search_service._vector_search("vector query", limit=5)

            # Verify results
            assert len(result.results) == 1
            mock_client.search.assert_called_once()
            mock_embedding.assert_called_once_with("vector query")

    @patch("app.services.search_service.SearchService._get_text_search_engine")
    async def test_text_search_success(
        self, mock_get_engine: Mock, search_service: SearchService
    ) -> None:
        """Test successful text search."""
        # Setup mock text search engine
        mock_engine = Mock()
        mock_get_engine.return_value = mock_engine
        mock_engine.search.return_value = {
            "results": [
                {
                    "id": "text_1",
                    "content": "Text search content",
                    "score": 0.75,
                    "metadata": {
                        "file_path": "/docs/text.md",
                        "file_name": "text.md",
                        "chunk_index": 0,
                        "total_chunks": 1,
                        "modified": "2025-01-01T00:00:00Z",
                        "size": 1536,
                    },
                }
            ],
            "total_results": 1,
            "processing_time": 0.05,
        }

        # Execute test
        result = await search_service._text_search("text query", limit=10)

        # Verify results
        assert len(result.results) == 1
        assert result.processing_time == 0.05
        mock_engine.search.assert_called_once_with(
            "text query", limit=10, score_threshold=None
        )

    @patch("app.services.search_service.SearchService._get_qdrant_client")
    async def test_get_stats_success(
        self, mock_get_client: Mock, search_service: SearchService
    ) -> None:
        """Test successful stats retrieval."""
        # Setup mock client
        mock_client = Mock()
        mock_get_client.return_value = mock_client

        # Setup mock collection info
        mock_info = Mock()
        mock_info.points_count = 1000
        mock_info.vectors_count = 1000
        mock_client.get_collection.return_value = mock_info

        with patch("os.path.getsize") as mock_getsize:
            mock_getsize.return_value = 5242880  # 5MB

            # Execute test
            result = await search_service.get_stats()

            # Verify results
            assert result.total_chunks == 1000
            assert result.index_size == 5242880

    @patch("anthropic.Anthropic")
    async def test_generate_embedding_success(
        self, mock_anthropic: Mock, search_service: SearchService
    ) -> None:
        """Test successful embedding generation."""
        # Setup mock Claude client
        mock_client = Mock()
        mock_anthropic.return_value = mock_client
        mock_response = Mock()
        mock_response.data = [Mock(embedding=[0.1, 0.2, 0.3, 0.4, 0.5])]
        mock_client.embeddings.create.return_value = mock_response

        # Execute test
        with patch("app.core.config.settings.anthropic_api_key", "test-key"):
            result = await search_service._generate_embedding("test text")

            # Verify results
            assert result == [0.1, 0.2, 0.3, 0.4, 0.5]
            mock_client.embeddings.create.assert_called_once()

    async def test_generate_embedding_no_api_key(
        self, search_service: SearchService
    ) -> None:
        """Test embedding generation without API key."""
        with patch("app.core.config.settings.anthropic_api_key", ""):
            with pytest.raises(ValueError, match="API key not configured"):
                await search_service._generate_embedding("test text")
