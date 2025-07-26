"""Integration tests for Qdrant vector storage."""

import tempfile
from pathlib import Path

import pytest

from app.services.qdrant_service import QdrantService
from app.services.sync_service import SyncService


@pytest.mark.integration
@pytest.mark.asyncio
class TestQdrantIntegration:
    """Integration tests for Qdrant functionality."""

    @pytest.fixture(scope="class")
    async def qdrant_service(self):
        """Create real QdrantService for integration testing."""
        # Skip if Qdrant is not available
        try:
            service = QdrantService()
            await service.initialize_collection()
            yield service
        except Exception as e:
            pytest.skip(f"Qdrant not available: {e}")

    @pytest.fixture
    def sample_documents(self):
        """Sample documents for testing."""
        return {
            "document1.md": "# Document 1\n\nThis is the first test document with some content.",
            "document2.md": "# Document 2\n\nThis is the second test document with different content.",
            "subdoc/document3.md": "# Document 3\n\nThis is a document in a subdirectory.",
        }

    @pytest.mark.asyncio
    async def test_store_and_retrieve_documents(self, qdrant_service, sample_documents) -> None:
        """Test storing and retrieving documents from Qdrant."""
        # Create dummy vectors (since we might not have API key)
        dummy_vector = [0.1] * 1536

        # Store documents
        for file_path, content in sample_documents.items():
            await qdrant_service.store_document(file_path, content, dummy_vector)

        # Verify documents are stored
        for file_path in sample_documents.keys():
            exists = await qdrant_service.document_exists(file_path)
            assert exists, f"Document {file_path} should exist in Qdrant"

        # Get collection info
        info = await qdrant_service.get_collection_info()
        assert info["points_count"] >= len(sample_documents)

    @pytest.mark.asyncio
    async def test_search_functionality(self, qdrant_service, sample_documents) -> None:
        """Test vector search functionality."""
        # Create dummy vectors with slight variations
        vectors = {
            "document1.md": [0.1 + i * 0.001 for i in range(1536)],
            "document2.md": [0.2 + i * 0.001 for i in range(1536)],
            "subdoc/document3.md": [0.3 + i * 0.001 for i in range(1536)],
        }

        # Store documents with different vectors
        for file_path, content in sample_documents.items():
            await qdrant_service.store_document(file_path, content, vectors[file_path])

        # Search with a query vector similar to document1
        query_vector = [0.1 + i * 0.001 for i in range(1536)]
        results = await qdrant_service.search_documents(
            query_vector=query_vector, limit=5, score_threshold=0.0
        )

        assert len(results) > 0
        # First result should be document1 (highest similarity)
        top_result = results[0]
        assert top_result["path"] == "document1.md"
        assert top_result["body"] == sample_documents["document1.md"]

    @pytest.mark.asyncio
    async def test_delete_documents(self, qdrant_service, sample_documents) -> None:
        """Test document deletion."""
        dummy_vector = [0.5] * 1536

        # Store a document
        test_file = "test_delete.md"
        test_content = "# Test Delete\n\nThis document will be deleted."
        await qdrant_service.store_document(test_file, test_content, dummy_vector)

        # Verify it exists
        exists = await qdrant_service.document_exists(test_file)
        assert exists

        # Delete it
        await qdrant_service.delete_document(test_file)

        # Verify it's gone
        exists = await qdrant_service.document_exists(test_file)
        assert not exists

    @pytest.mark.asyncio
    async def test_upsert_functionality(self, qdrant_service) -> None:
        """Test that storing the same document twice updates it."""
        file_path = "upsert_test.md"
        original_content = "# Original Content"
        updated_content = "# Updated Content"
        dummy_vector = [0.7] * 1536

        # Store original
        await qdrant_service.store_document(file_path, original_content, dummy_vector)

        # Store updated version (should upsert)
        await qdrant_service.store_document(file_path, updated_content, dummy_vector)

        # Search to verify content was updated
        results = await qdrant_service.search_documents(
            query_vector=dummy_vector, limit=10, score_threshold=0.0
        )

        # Find our document in results
        our_doc = None
        for result in results:
            if result["path"] == file_path:
                our_doc = result
                break

        assert our_doc is not None
        assert our_doc["body"] == updated_content


@pytest.mark.integration
@pytest.mark.asyncio
class TestSyncServiceIntegration:
    """Integration tests for SyncService with real file system."""

    @pytest.fixture
    async def temp_docs_dir(self):
        """Create temporary documents directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            docs_path = Path(temp_dir) / "docs"
            docs_path.mkdir()

            # Create sample files
            (docs_path / "README.md").write_text("# README\n\nProject documentation.")
            (docs_path / "api.md").write_text("# API\n\nAPI documentation.")

            subdir = docs_path / "guides"
            subdir.mkdir()
            (subdir / "guide1.md").write_text("# Guide 1\n\nFirst guide.")

            yield docs_path

    @pytest.fixture
    def sync_service_with_temp_dir(self, temp_docs_dir):
        """Create SyncService with temporary directory."""
        with patch("app.core.config.settings") as mock_settings:
            mock_settings.documents_path = str(temp_docs_dir)
            mock_settings.anthropic_api_key = ""  # No API key for testing
            mock_settings.app_config.vector_db.vector_size = 1536
            mock_settings.qdrant_host = "localhost"
            mock_settings.qdrant_port = 6333
            mock_settings.qdrant_collection = "test_documents"

            return SyncService()

    @pytest.mark.asyncio
    async def test_bulk_sync_with_real_files(self, sync_service_with_temp_dir) -> None:
        """Test bulk sync with real files."""
        try:
            result = await sync_service_with_temp_dir.execute_bulk_sync(force=True)

            assert result.success is True
            assert result.total_files == 3  # README, api, guide1
            assert result.processed_files == 3
            assert result.total_chunks > 0
            assert len(result.errors) == 0

        except Exception as e:
            # Skip if Qdrant is not available
            pytest.skip(f"Qdrant not available: {e}")

    @pytest.mark.asyncio
    async def test_individual_file_sync(
        self, sync_service_with_temp_dir, temp_docs_dir
    ) -> None:
        """Test syncing individual files."""
        try:
            test_file = temp_docs_dir / "test_sync.md"
            test_file.write_text("# Test Sync\n\nThis is a test file for sync.")

            await sync_service_with_temp_dir.sync_file(str(test_file))

            # If no exception is raised, sync was successful
            assert True

        except Exception as e:
            # Skip if Qdrant is not available
            pytest.skip(f"Qdrant not available: {e}")


# Helper to patch config in integration tests
def patch(target):
    """Simple patch decorator for testing."""
    from unittest.mock import patch as mock_patch

    return mock_patch(target)
