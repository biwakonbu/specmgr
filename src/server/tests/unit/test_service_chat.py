"""Tests for ChatService."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.models.api_models import ChatMessage
from app.services.chat_service import ChatService


class TestChatService:
    """Test ChatService functionality."""

    @pytest.fixture
    def mock_search_service(self) -> Mock:
        """Mock search service."""
        mock_service = Mock()
        mock_service.search = AsyncMock(
            return_value={
                "results": [
                    {
                        "id": "1",
                        "content": "Test search result",
                        "score": 0.95,
                        "metadata": {"filePath": "/test.md", "fileName": "test.md"},
                    }
                ],
                "totalResults": 1,
                "processingTime": 0.05,
            }
        )
        return mock_service

    @pytest.fixture
    def chat_service(self, mock_search_service: Mock) -> ChatService:
        """Create ChatService with mocked dependencies."""
        with patch(
            "app.services.chat_service.SearchService", return_value=mock_search_service
        ):
            service = ChatService()
            service.search_service = mock_search_service
            return service

    @pytest.fixture
    def sample_chat_message(self) -> ChatMessage:
        """Sample chat message for testing."""
        return ChatMessage(
            role="user",
            content="What is the purpose of this project?",
            timestamp="2024-01-01T00:00:00Z",
        )

    def test_init(self, chat_service: ChatService) -> None:
        """Test chat service initialization."""
        assert chat_service is not None
        assert hasattr(chat_service, "search_service")

    # Note: Health check testing is handled by HealthService integration tests
    # Individual service health checks are not needed as HealthService provides
    # centralized health monitoring for all components

    @pytest.mark.asyncio
    async def test_get_rag_context(
        self, chat_service: ChatService, mock_search_service: Mock
    ) -> None:
        """Test RAG context retrieval from search."""
        query = "test query"

        context = await chat_service._get_rag_context(query)

        mock_search_service.search.assert_called_once_with(
            query=query, limit=3, score_threshold=0.1
        )
        assert "Test search result" in context

    @pytest.mark.asyncio
    async def test_get_rag_context_no_results(
        self, chat_service: ChatService, mock_search_service: Mock
    ) -> None:
        """Test RAG context retrieval when no search results."""
        # Mock search service to return no results
        mock_search_service.search.return_value = type(
            "SearchResults", (), {"results": []}
        )()

        context = await chat_service._get_rag_context("empty query")

        assert context == ""

    @pytest.mark.asyncio
    async def test_build_rag_context_multiple_results(
        self, chat_service: ChatService, mock_search_service: Mock
    ) -> None:
        """Test RAG context building with multiple search results."""
        # Mock search results with proper structure
        mock_result_1 = type(
            "SearchResult",
            (),
            {
                "content": "First relevant document content",
                "metadata": type("Metadata", (), {"file_name": "first.md"})(),
            },
        )()
        mock_result_2 = type(
            "SearchResult",
            (),
            {
                "content": "Second relevant document content",
                "metadata": type("Metadata", (), {"file_name": "second.md"})(),
            },
        )()

        mock_search_service.search.return_value = type(
            "SearchResults", (), {"results": [mock_result_1, mock_result_2]}
        )()

        context = await chat_service._get_rag_context("test query")

        assert "First relevant document content" in context
        assert "Second relevant document content" in context
        assert "first.md" in context
        assert "second.md" in context

    @pytest.mark.asyncio
    async def test_build_rag_context_search_error(
        self, chat_service: ChatService, mock_search_service: Mock
    ) -> None:
        """Test RAG context building when search fails."""
        mock_search_service.search.side_effect = Exception("Search service error")

        # Should return empty string on error, not raise exception
        context = await chat_service._get_rag_context("test query")
        assert context == ""

    @pytest.mark.asyncio
    async def test_build_rag_context_default_limit(
        self, chat_service: ChatService, mock_search_service: Mock
    ) -> None:
        """Test RAG context building with default limit."""
        query = "complex query"
        mock_search_service.search.return_value = type(
            "SearchResults", (), {"results": []}
        )()

        await chat_service._get_rag_context(query)

        mock_search_service.search.assert_called_once_with(
            query=query, limit=3, score_threshold=0.1
        )

    # Note: _extract_keywords method not implemented in current ChatService
    # Keyword extraction functionality may be added in future iterations

    @pytest.mark.asyncio
    async def test_chat_stream_success(
        self, chat_service: ChatService, sample_chat_message: ChatMessage
    ) -> None:
        """Test successful chat streaming."""
        # Test the actual chat_stream method
        response_chunks = []
        async for chunk in chat_service.chat_stream(
            message=sample_chat_message.content,
            conversation_history=[sample_chat_message],
            use_rag=False,
        ):
            response_chunks.append(chunk)

        # Should receive some response chunks
        assert len(response_chunks) > 0
        full_response = "".join(response_chunks)
        assert len(full_response) > 0

    @pytest.mark.asyncio
    async def test_chat_stream_with_rag_context(
        self,
        chat_service: ChatService,
        sample_chat_message: ChatMessage,
        mock_search_service: Mock,
    ) -> None:
        """Test chat streaming with RAG context."""
        # Mock search context with proper structure
        mock_result = type(
            "SearchResult",
            (),
            {
                "content": "Context information",
                "metadata": type("Metadata", (), {"file_name": "context.md"})(),
            },
        )()
        mock_search_service.search.return_value = type(
            "SearchResults", (), {"results": [mock_result]}
        )()

        response_chunks = []
        async for chunk in chat_service.chat_stream(
            message=sample_chat_message.content,
            conversation_history=[sample_chat_message],
            use_rag=True,
        ):
            response_chunks.append(chunk)

        mock_search_service.search.assert_called()
        assert len(response_chunks) > 0

    @pytest.mark.asyncio
    async def test_chat_stream_error_handling(
        self, chat_service: ChatService, sample_chat_message: ChatMessage
    ) -> None:
        """Test chat streaming error handling."""
        # Test with search service error
        with patch.object(
            chat_service.search_service, "search", side_effect=Exception("Search error")
        ):
            response_chunks = []
            async for chunk in chat_service.chat_stream(
                message=sample_chat_message.content, use_rag=True
            ):
                response_chunks.append(chunk)

            # Should handle error gracefully and provide error message
            full_response = "".join(response_chunks)
            assert "error" in full_response.lower()

    # Note: _create_assistant_message method not implemented in current ChatService
    # Message creation handled by API layer

    # Note: _format_context method not implemented as separate function
    # Context formatting handled within _get_rag_context method

    # Note: _validate_message method not implemented in current ChatService
    # Message validation handled by Pydantic models

    # Note: _prepare_prompt method not implemented in current ChatService
    # Prompt preparation handled within chat_stream method
