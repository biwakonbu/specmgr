"""Sync service tests."""

import tempfile
from collections.abc import Generator
from pathlib import Path
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, Mock, patch

if TYPE_CHECKING:
    pass

import pytest

from app.services.sync_service import SyncService


class TestSyncService:
    """Sync service test class."""

    @pytest.fixture
    def mock_embedding_service(self) -> Generator[Mock, None, None]:
        """Mock embedding service."""
        mock_service = Mock()
        mock_service.is_available.return_value = False
        mock_service._get_zero_vector.return_value = [0.0] * 1536
        return mock_service

    @pytest.fixture
    def mock_qdrant_service(self) -> Generator[AsyncMock, None, None]:
        """Mock Qdrant service."""
        mock_service = AsyncMock()
        return mock_service

    @pytest.fixture
    def sync_service(self, mock_embedding_service, mock_qdrant_service) -> SyncService:
        """Create sync service instance with mocked dependencies."""
        with (
            patch(
                "app.services.sync_service.EmbeddingService",
                return_value=mock_embedding_service,
            ),
            patch(
                "app.services.sync_service.QdrantService",
                return_value=mock_qdrant_service,
            ),
            patch("app.services.sync_service.ManifestService") as mock_manifest,
            patch("app.services.sync_service.FileService"),
        ):
            # Configure manifest service mock
            mock_manifest_instance = mock_manifest.return_value
            mock_manifest_instance.get_file_changes = AsyncMock(
                return_value=([], [], [])
            )  # No changes
            mock_manifest_instance.update_file_in_manifest = AsyncMock(
                return_value=None
            )
            mock_manifest_instance.remove_file_from_manifest = AsyncMock(
                return_value=None
            )

            return SyncService()

    @pytest.fixture
    def temp_docs_dir(self) -> Generator[Path, None, None]:
        """Create temporary docs directory for tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_path = Path(tmpdir)

            # Create test markdown files
            (temp_path / "test1.md").write_text("# Test 1\nContent of test 1")
            (temp_path / "test2.md").write_text("# Test 2\nContent of test 2")

            yield temp_path

    def test_init(self, sync_service: SyncService) -> None:
        """Test sync service initialization."""
        assert sync_service is not None

    @pytest.mark.asyncio
    async def test_execute_bulk_sync_success(
        self, sync_service: SyncService, temp_docs_dir: Path, mock_qdrant_service
    ) -> None:
        """Test successful bulk sync execution."""
        # Mock the docs_path to use temp directory
        sync_service.docs_path = temp_docs_dir

        # Configure manifest service to return 2 files for sync
        test_files = ["test1.md", "test2.md"]

        with patch.object(
            sync_service.manifest_service, "get_file_changes", new_callable=AsyncMock
        ) as mock_changes:
            mock_changes.return_value = (
                test_files,
                [],
                [],
            )  # 2 added files, no modified/deleted

            # Mock the sync_file method to avoid actual processing
            with patch.object(
                sync_service, "sync_file", new_callable=AsyncMock
            ) as mock_sync:
                mock_sync.return_value = None  # sync_file doesn't return anything

                # Mock _get_current_file_hashes to return test files
                with patch.object(
                    sync_service, "_get_current_file_hashes", new_callable=AsyncMock
                ) as mock_hashes:
                    mock_hashes.return_value = {
                        "test1.md": "hash1",
                        "test2.md": "hash2",
                    }

                    # Execute test
                    result = await sync_service.execute_bulk_sync(force=False)

                    # Verify results
                    assert result.success is True
                    assert result.total_files == 2  # Two test files created
                    assert result.processed_files == 2
                    assert result.total_chunks > 0
                    assert len(result.errors) == 0

                    # Verify Qdrant initialization was called
                    mock_qdrant_service.initialize_collection.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_bulk_sync_with_errors(
        self, sync_service: SyncService, temp_docs_dir: Path
    ) -> None:
        """Test bulk sync execution with some errors."""
        # Mock the docs_path to use temp directory
        sync_service.docs_path = temp_docs_dir

        # Configure manifest service to return 2 files for sync
        test_files = ["test1.md", "test2.md"]

        with patch.object(
            sync_service.manifest_service, "get_file_changes", new_callable=AsyncMock
        ) as mock_changes:
            mock_changes.return_value = (
                test_files,
                [],
                [],
            )  # 2 added files, no modified/deleted

            # Mock sync_file to raise exception for some files
            with patch.object(
                sync_service, "sync_file", new_callable=AsyncMock
            ) as mock_sync:
                mock_sync.side_effect = [
                    None,
                    Exception("Test error"),
                ]  # First succeeds, second fails

                # Mock _get_current_file_hashes to return test files
                with patch.object(
                    sync_service, "_get_current_file_hashes", new_callable=AsyncMock
                ) as mock_hashes:
                    mock_hashes.return_value = {
                        "test1.md": "hash1",
                        "test2.md": "hash2",
                    }

                    # Execute test
                    result = await sync_service.execute_bulk_sync(force=False)

                    # Verify results
                    assert result.success is False  # Has errors
                    assert result.total_files == 2
                    assert result.processed_files == 1  # Only one successful
                    assert len(result.errors) == 1
                    assert "Test error" in result.errors[0]

    @pytest.mark.asyncio
    async def test_get_sync_status_running(self, sync_service: SyncService) -> None:
        """Test sync status when sync is running."""
        # Set running status
        sync_service._sync_status["is_running"] = True
        sync_service._sync_status["current"] = 5
        sync_service._sync_status["total"] = 10
        sync_service._sync_status["current_file"] = "/docs/current.md"

        # Execute test
        result = await sync_service.get_sync_status()

        # Verify results
        assert result.is_running is True
        assert result.current == 5
        assert result.total == 10
        assert result.current_file == "/docs/current.md"

    @pytest.mark.asyncio
    async def test_sync_file_with_embedding(
        self,
        sync_service: SyncService,
        temp_docs_dir: Path,
        mock_embedding_service: Mock,
        mock_qdrant_service: AsyncMock,
    ) -> None:
        """Test syncing individual file with embedding generation."""
        # Setup embedding service to be available
        mock_embedding_service.is_available.return_value = True
        mock_embedding_service.generate_embedding = AsyncMock(return_value=[0.1] * 1536)

        # Create test file
        test_file = temp_docs_dir / "test.md"
        test_content = "# Test\n\nTest content"
        test_file.write_text(test_content)

        # Mock docs_path
        sync_service.docs_path = temp_docs_dir

        # Execute sync
        await sync_service.sync_file(str(test_file))

        # Verify embedding was generated
        mock_embedding_service.generate_embedding.assert_called_once_with(test_content)

        # Verify document was stored in Qdrant
        mock_qdrant_service.store_document.assert_called_once_with(
            file_path="test.md", content=test_content, vector=[0.1] * 1536
        )

    @pytest.mark.asyncio
    async def test_sync_file_without_embedding(
        self,
        sync_service: SyncService,
        temp_docs_dir: Path,
        mock_embedding_service: Mock,
        mock_qdrant_service: AsyncMock,
    ) -> None:
        """Test syncing individual file without embedding (API key not available)."""
        # Setup embedding service to not be available
        mock_embedding_service.is_available.return_value = False

        # Create test file
        test_file = temp_docs_dir / "test.md"
        test_content = "# Test\n\nTest content"
        test_file.write_text(test_content)

        # Mock docs_path
        sync_service.docs_path = temp_docs_dir

        # Execute sync
        await sync_service.sync_file(str(test_file))

        # Verify embedding was NOT generated
        mock_embedding_service.generate_embedding.assert_not_called()

        # Verify zero vector was used
        mock_embedding_service._get_zero_vector.assert_called_once()

        # Verify document was stored in Qdrant with zero vector
        mock_qdrant_service.store_document.assert_called_once_with(
            file_path="test.md", content=test_content, vector=[0.0] * 1536
        )

    @pytest.mark.asyncio
    async def test_remove_file(
        self, sync_service: SyncService, temp_docs_dir: Path, mock_qdrant_service
    ) -> None:
        """Test file removal."""
        # Create test file path
        test_file_path = temp_docs_dir / "test.md"

        # Mock docs_path
        sync_service.docs_path = temp_docs_dir

        # Execute removal
        await sync_service.remove_file(str(test_file_path))

        # Verify document was deleted from Qdrant
        mock_qdrant_service.delete_document.assert_called_once_with("test.md")

    @pytest.mark.asyncio
    async def test_get_sync_status_idle(self, sync_service: SyncService) -> None:
        """Test sync status when sync is idle."""
        # Default status should be idle
        result = await sync_service.get_sync_status()

        # Verify results
        assert result.is_running is False
        assert result.current == 0
        assert result.total == 0
        assert result.current_file == ""

    @pytest.mark.asyncio
    async def test_sync_file_basic(
        self, sync_service: SyncService, temp_docs_dir: Path
    ) -> None:
        """Test basic file sync functionality."""
        # Create test file
        test_file = temp_docs_dir / "sync_test.md"
        test_file.write_text("# Sync Test\nContent for sync testing")

        # Mock the docs_path
        sync_service.docs_path = temp_docs_dir

        # Execute test (should not raise exception)
        await sync_service.sync_file(str(test_file))

        # If we get here without exception, the test passes
        assert True
