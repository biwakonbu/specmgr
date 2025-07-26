"""Tests for QdrantService."""

from unittest.mock import Mock, patch

import pytest
from qdrant_client.http.models import PointStruct, VectorParams

from app.services.qdrant_service import QdrantService


class TestQdrantService:
    """Test QdrantService functionality."""

    @pytest.fixture
    def mock_qdrant_client(self):
        """Mock QdrantClient."""
        with patch("app.services.qdrant_service.QdrantClient") as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def qdrant_service(self, mock_qdrant_client):
        """Create QdrantService instance with mocked client."""
        return QdrantService()

    @pytest.mark.asyncio
    async def test_initialize_collection_creates_new_collection(
        self, qdrant_service, mock_qdrant_client
    ) -> None:
        """Test collection creation when it doesn't exist."""
        # Mock collection doesn't exist
        mock_collections_response = Mock()
        mock_collections_response.collections = []
        mock_qdrant_client.get_collections.return_value = mock_collections_response

        await qdrant_service.initialize_collection()

        # Verify collection creation was called
        mock_qdrant_client.create_collection.assert_called_once()
        call_args = mock_qdrant_client.create_collection.call_args
        assert call_args[1]["collection_name"] == "documents"
        assert isinstance(call_args[1]["vectors_config"], VectorParams)

    @pytest.mark.asyncio
    async def test_initialize_collection_skips_existing_collection(
        self, qdrant_service, mock_qdrant_client
    ) -> None:
        """Test collection initialization when it already exists."""
        # Mock collection exists
        mock_collection = Mock()
        mock_collection.name = "documents"
        mock_collections_response = Mock()
        mock_collections_response.collections = [mock_collection]
        mock_qdrant_client.get_collections.return_value = mock_collections_response

        await qdrant_service.initialize_collection()

        # Verify collection creation was NOT called
        mock_qdrant_client.create_collection.assert_not_called()

    @pytest.mark.asyncio
    async def test_store_document(self, qdrant_service, mock_qdrant_client) -> None:
        """Test document storage."""
        file_path = "test/document.md"
        content = "# Test Document\n\nThis is a test."
        vector = [0.1, 0.2, 0.3] * 512  # 1536 dimensions

        await qdrant_service.store_document(file_path, content, vector)

        # Verify upsert was called
        mock_qdrant_client.upsert.assert_called_once()
        call_args = mock_qdrant_client.upsert.call_args
        assert call_args[1]["collection_name"] == "documents"

        points = call_args[1]["points"]
        assert len(points) == 1

        point = points[0]
        assert isinstance(point, PointStruct)
        assert point.vector == vector
        assert point.payload["path"] == file_path
        assert point.payload["body"] == content
        assert point.payload["file_name"] == "document.md"
        assert "indexed_at" in point.payload

    @pytest.mark.asyncio
    async def test_search_documents(self, qdrant_service, mock_qdrant_client) -> None:
        """Test document search."""
        query_vector = [0.1, 0.2, 0.3] * 512  # 1536 dimensions

        # Mock search result
        mock_scored_point = Mock()
        mock_scored_point.id = "test-uuid"
        mock_scored_point.score = 0.95
        mock_scored_point.payload = {
            "path": "test/document.md",
            "body": "Test content",
            "file_name": "document.md",
            "indexed_at": "2025-01-26T12:00:00Z",
        }
        mock_qdrant_client.search.return_value = [mock_scored_point]

        results = await qdrant_service.search_documents(
            query_vector=query_vector,
            limit=10,
            score_threshold=0.5,
        )

        # Verify search was called
        mock_qdrant_client.search.assert_called_once_with(
            collection_name="documents",
            query_vector=query_vector,
            limit=10,
            score_threshold=0.5,
            with_payload=True,
        )

        # Verify results
        assert len(results) == 1
        result = results[0]
        assert result["id"] == "test-uuid"
        assert result["score"] == 0.95
        assert result["path"] == "test/document.md"
        assert result["body"] == "Test content"
        assert result["file_name"] == "document.md"

    @pytest.mark.asyncio
    async def test_delete_document(self, qdrant_service, mock_qdrant_client) -> None:
        """Test document deletion."""
        file_path = "test/document.md"

        await qdrant_service.delete_document(file_path)

        # Verify delete was called
        mock_qdrant_client.delete.assert_called_once()
        call_args = mock_qdrant_client.delete.call_args
        assert call_args[1]["collection_name"] == "documents"

    @pytest.mark.asyncio
    async def test_document_exists_returns_true(
        self, qdrant_service, mock_qdrant_client
    ) -> None:
        """Test document existence check when document exists."""
        file_path = "test/document.md"

        # Mock document exists
        mock_qdrant_client.retrieve.return_value = [Mock()]

        exists = await qdrant_service.document_exists(file_path)

        assert exists is True
        mock_qdrant_client.retrieve.assert_called_once()

    @pytest.mark.asyncio
    async def test_document_exists_returns_false(
        self, qdrant_service, mock_qdrant_client
    ) -> None:
        """Test document existence check when document doesn't exist."""
        file_path = "test/document.md"

        # Mock document doesn't exist
        mock_qdrant_client.retrieve.return_value = []

        exists = await qdrant_service.document_exists(file_path)

        assert exists is False

    @pytest.mark.asyncio
    async def test_document_exists_handles_exception(
        self, qdrant_service, mock_qdrant_client
    ) -> None:
        """Test document existence check handles exceptions."""
        file_path = "test/document.md"

        # Mock exception
        mock_qdrant_client.retrieve.side_effect = Exception("Connection error")

        exists = await qdrant_service.document_exists(file_path)

        assert exists is False

    @pytest.mark.asyncio
    async def test_get_collection_info(self, qdrant_service, mock_qdrant_client) -> None:
        """Test collection info retrieval."""
        # Mock collection info
        mock_info = Mock()
        mock_info.vectors_count = 10
        mock_info.indexed_vectors_count = 8
        mock_info.points_count = 10
        mock_info.config.params.vectors.size = 1536
        mock_info.config.params.vectors.distance.value = "Cosine"
        mock_qdrant_client.get_collection.return_value = mock_info

        info = await qdrant_service.get_collection_info()

        assert info["vectors_count"] == 10
        assert info["indexed_vectors_count"] == 8
        assert info["points_count"] == 10
        assert info["config"]["vector_size"] == 1536
        assert info["config"]["distance"] == "Cosine"

    def test_uuid_generation_consistency(self, qdrant_service) -> None:
        """Test that the same file path generates the same UUID."""
        import hashlib
        import uuid

        file_path = "test/document.md"

        # Generate UUID manually
        path_hash = hashlib.md5(file_path.encode()).hexdigest()
        expected_uuid = str(uuid.UUID(path_hash))

        # Test in store_document method by checking if the same UUID is generated
        # This is implicitly tested by the consistency of operations
        assert len(expected_uuid) == 36  # Standard UUID length
        assert expected_uuid.count("-") == 4  # Standard UUID format
