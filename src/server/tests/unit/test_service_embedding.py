"""Tests for EmbeddingService."""

from unittest.mock import Mock, patch

import pytest

from app.services.embedding_service import EmbeddingService


class TestEmbeddingService:
    """Test EmbeddingService functionality."""

    @pytest.fixture
    def mock_anthropic_client(self):
        """Mock Anthropic client."""
        with patch("app.services.embedding_service.Anthropic") as mock_anthropic_class:
            mock_client = Mock()
            mock_anthropic_class.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def embedding_service(self, mock_anthropic_client):
        """Create EmbeddingService with mocked client."""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.anthropic_api_key = "test-api-key"
            mock_settings.app_config.vector_db.vector_size = 1536
            return EmbeddingService()

    @pytest.fixture
    def embedding_service_no_key(self):
        """Create EmbeddingService without API key."""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            mock_settings.app_config.vector_db.vector_size = 1536
            return EmbeddingService()

    @pytest.mark.asyncio
    async def test_generate_embedding_success(
        self, embedding_service, mock_anthropic_client
    ) -> None:
        """Test successful embedding generation."""
        text = "This is a test document."
        expected_embedding = [0.1, 0.2, 0.3] * 512  # 1536 dimensions

        # Mock API response
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = expected_embedding
        mock_anthropic_client.embeddings.create.return_value = mock_response

        result = await embedding_service.generate_embedding(text)

        assert result == expected_embedding
        mock_anthropic_client.embeddings.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_embedding_no_api_key(self, embedding_service_no_key) -> None:
        """Test embedding generation without API key."""
        text = "This is a test document."

        with pytest.raises(ValueError, match="Claude Code SDK API key not configured"):
            await embedding_service_no_key.generate_embedding(text)

    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_success(
        self, embedding_service, mock_anthropic_client
    ) -> None:
        """Test batch embedding generation."""
        texts = ["Document 1", "Document 2", "Document 3"]
        expected_embedding = [0.1, 0.2, 0.3] * 512  # 1536 dimensions

        # Mock API response
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = expected_embedding
        mock_anthropic_client.embeddings.create.return_value = mock_response

        results = await embedding_service.generate_embeddings_batch(texts)

        assert len(results) == 3
        assert all(result == expected_embedding for result in results)
        assert mock_anthropic_client.embeddings.create.call_count == 3

    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_with_error(
        self, embedding_service, mock_anthropic_client
    ) -> None:
        """Test batch embedding generation with some failures."""
        texts = ["Document 1", "Document 2"]
        expected_embedding = [0.1, 0.2, 0.3] * 512  # 1536 dimensions
        zero_vector = [0.0] * 1536

        # Mock API response: first succeeds, second fails
        mock_response = Mock()
        mock_response.data = [Mock()]
        mock_response.data[0].embedding = expected_embedding

        mock_anthropic_client.embeddings.create.side_effect = [
            mock_response,  # First call succeeds
            Exception("API error"),  # Second call fails
        ]

        results = await embedding_service.generate_embeddings_batch(texts)

        assert len(results) == 2
        assert results[0] == expected_embedding  # First succeeded
        assert results[1] == zero_vector  # Second failed, got zero vector

    def test_truncate_text_short_text(self, embedding_service) -> None:
        """Test text truncation with short text."""
        text = "Short text."
        max_tokens = 1000

        result = embedding_service._truncate_text(text, max_tokens)

        assert result == text

    def test_truncate_text_long_text(self, embedding_service) -> None:
        """Test text truncation with long text."""
        text = "A" * 10000  # Very long text
        max_tokens = 100  # Small limit

        result = embedding_service._truncate_text(text, max_tokens)

        # Should be truncated (max_tokens * 4 characters)
        assert len(result) <= max_tokens * 4

    def test_truncate_text_with_sentence_boundary(self, embedding_service) -> None:
        """Test text truncation respects sentence boundaries."""
        text = "First sentence. Second sentence. Third sentence." + "A" * 1000
        max_tokens = 100  # Will trigger truncation

        result = embedding_service._truncate_text(text, max_tokens)

        # Should end at a sentence boundary if possible
        assert result.endswith(".") or len(result) <= max_tokens * 4

    def test_get_zero_vector(self, embedding_service) -> None:
        """Test zero vector generation."""
        zero_vector = embedding_service._get_zero_vector()

        assert len(zero_vector) == 1536
        assert all(value == 0.0 for value in zero_vector)

    def test_is_available_with_api_key(self, embedding_service) -> None:
        """Test availability check with API key."""
        assert embedding_service.is_available() is True

    def test_is_available_without_api_key(self, embedding_service_no_key) -> None:
        """Test availability check without API key."""
        assert embedding_service_no_key.is_available() is False

    @pytest.mark.asyncio
    async def test_generate_embedding_api_error(
        self, embedding_service, mock_anthropic_client
    ) -> None:
        """Test embedding generation with API error."""
        text = "This is a test document."

        # Mock API error
        mock_anthropic_client.embeddings.create.side_effect = Exception(
            "API rate limit"
        )

        with pytest.raises(Exception, match="API rate limit"):
            await embedding_service.generate_embedding(text)

    def test_token_estimation(self, embedding_service) -> None:
        """Test token estimation logic in text truncation."""
        # Test the assumption that 1 token ≈ 4 characters
        text = "A" * 1000  # 1000 characters
        max_tokens = 200  # Should allow 800 characters

        result = embedding_service._truncate_text(text, max_tokens)

        # Should be around 800 characters (200 tokens * 4 chars)
        assert len(result) <= 800
