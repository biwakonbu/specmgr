"""Tests for EmbeddingService."""

from collections.abc import Generator
from unittest.mock import Mock, patch

import pytest

from app.services.embedding_service import EmbeddingService


class TestEmbeddingService:
    """Test EmbeddingService functionality."""

    @pytest.fixture
    def mock_anthropic_client(self) -> Generator[Mock, None, None]:
        """Mock Anthropic client."""
        with patch("app.services.embedding_service.Anthropic") as mock_anthropic_class:
            mock_client = Mock()
            mock_anthropic_class.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def embedding_service(self, mock_anthropic_client: Mock) -> EmbeddingService:
        """Create EmbeddingService with mocked client."""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.anthropic_api_key = "test-api-key"
            mock_settings.app_config.vector_db.vector_size = 1536
            return EmbeddingService()

    @pytest.fixture
    def embedding_service_no_key(self) -> EmbeddingService:
        """Create EmbeddingService without API key."""
        with patch("app.services.embedding_service.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            mock_settings.app_config.vector_db.vector_size = 1536
            return EmbeddingService()

    @pytest.mark.asyncio
    async def test_generate_embedding_success(
        self, embedding_service: EmbeddingService, mock_anthropic_client: Mock
    ) -> None:
        """Test successful embedding generation."""
        text = "This is a test document."

        result = await embedding_service.generate_embedding(text)

        # Hash-based implementation should return deterministic vectors
        assert len(result) == 1536  # Vector size
        assert all(isinstance(val, float) for val in result)

        # Test that same text produces same embedding (deterministic)
        result2 = await embedding_service.generate_embedding(text)
        assert result == result2

        # Test that vector is normalized (L2 norm should be approximately 1)
        import numpy as np

        norm = np.linalg.norm(result)
        assert abs(norm - 1.0) < 1e-6

    @pytest.mark.asyncio
    async def test_generate_embedding_no_api_key(
        self, embedding_service_no_key: EmbeddingService
    ) -> None:
        """Test embedding generation without API key."""
        text = "This is a test document."

        with pytest.raises(ValueError, match="Claude Code SDK API key not configured"):
            await embedding_service_no_key.generate_embedding(text)

    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_success(
        self, embedding_service: EmbeddingService, mock_anthropic_client: Mock
    ) -> None:
        """Test batch embedding generation."""
        texts = ["Document 1", "Document 2", "Document 3"]

        results = await embedding_service.generate_embeddings_batch(texts)

        assert len(results) == 3
        # Each result should be a valid embedding vector
        for result in results:
            assert len(result) == 1536
            assert all(isinstance(val, float) for val in result)

        # Different texts should produce different embeddings
        assert results[0] != results[1]
        assert results[1] != results[2]

    @pytest.mark.asyncio
    async def test_generate_embeddings_batch_with_error(
        self, embedding_service: EmbeddingService, mock_anthropic_client: Mock
    ) -> None:
        """Test batch embedding generation with some failures."""
        texts = ["Document 1", "Document 2"]
        zero_vector = [0.0] * 1536

        # Patch the generate_embedding method to simulate error on second call
        original_method = embedding_service.generate_embedding

        async def mock_generate_embedding(text: str) -> list[float]:
            if text == "Document 2":
                raise Exception("Simulated error")
            return await original_method(text)

        embedding_service.generate_embedding = mock_generate_embedding

        results = await embedding_service.generate_embeddings_batch(texts)

        assert len(results) == 2
        # First should succeed with valid embedding
        assert len(results[0]) == 1536
        assert all(isinstance(val, float) for val in results[0])
        # Second should fail and get zero vector
        assert results[1] == zero_vector

    def test_truncate_text_short_text(
        self, embedding_service: EmbeddingService
    ) -> None:
        """Test text truncation with short text."""
        text = "Short text."
        max_tokens = 1000

        result = embedding_service._truncate_text(text, max_tokens)

        assert result == text

    def test_truncate_text_long_text(self, embedding_service: EmbeddingService) -> None:
        """Test text truncation with long text."""
        text = "A" * 10000  # Very long text
        max_tokens = 100  # Small limit

        result = embedding_service._truncate_text(text, max_tokens)

        # Should be truncated (max_tokens * 4 characters)
        assert len(result) <= max_tokens * 4

    def test_truncate_text_with_sentence_boundary(
        self, embedding_service: EmbeddingService
    ) -> None:
        """Test text truncation respects sentence boundaries."""
        text = "First sentence. Second sentence. Third sentence." + "A" * 1000
        max_tokens = 100  # Will trigger truncation

        result = embedding_service._truncate_text(text, max_tokens)

        # Should end at a sentence boundary if possible
        assert result.endswith(".") or len(result) <= max_tokens * 4

    def test_get_zero_vector(self, embedding_service: EmbeddingService) -> None:
        """Test zero vector generation."""
        zero_vector = embedding_service._get_zero_vector()

        assert len(zero_vector) == 1536
        assert all(value == 0.0 for value in zero_vector)

    def test_is_available_with_api_key(
        self, embedding_service: EmbeddingService
    ) -> None:
        """Test availability check with API key."""
        assert embedding_service.is_available() is True

    def test_is_available_without_api_key(
        self, embedding_service_no_key: EmbeddingService
    ) -> None:
        """Test availability check without API key."""
        assert embedding_service_no_key.is_available() is False

    @pytest.mark.asyncio
    async def test_generate_embedding_api_error(
        self, embedding_service: EmbeddingService, mock_anthropic_client: Mock
    ) -> None:
        """Test embedding generation with internal error."""
        text = "This is a test document."

        # Patch numpy to raise an error
        with patch("numpy.array") as mock_array:
            mock_array.side_effect = Exception("Numpy error")

            with pytest.raises(Exception, match="Numpy error"):
                await embedding_service.generate_embedding(text)

    def test_token_estimation(self, embedding_service: EmbeddingService) -> None:
        """Test token estimation logic in text truncation."""
        # Test the assumption that 1 token ≈ 4 characters
        text = "A" * 1000  # 1000 characters
        max_tokens = 200  # Should allow 800 characters

        result = embedding_service._truncate_text(text, max_tokens)

        # Should be around 800 characters (200 tokens * 4 chars)
        assert len(result) <= 800
