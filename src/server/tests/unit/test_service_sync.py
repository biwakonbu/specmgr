"""Sync service tests."""

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, Mock, patch

if TYPE_CHECKING:
    pass

import pytest

from app.services.sync_service import SyncService


class TestSyncService:
    """Sync service test class."""

    @pytest.fixture
    def sync_service(self) -> SyncService:
        """Create sync service instance."""
        return SyncService()

    def test_init(self, sync_service: SyncService) -> None:
        """Test sync service initialization."""
        assert sync_service is not None

    @patch("app.services.sync_service.SyncService._get_queue")
    @patch("app.services.sync_service.SyncService._scan_documents")
    async def test_execute_bulk_sync_success(
        self, mock_scan, mock_get_queue, sync_service: SyncService
    ) -> None:
        """Test successful bulk sync execution."""
        # Setup mocks
        mock_queue = Mock()
        mock_get_queue.return_value = mock_queue
        mock_scan.return_value = ["/docs/file1.md", "/docs/file2.md"]

        with patch("app.services.sync_service.SyncService._process_file") as mock_process:
            mock_process.return_value = {"chunks": 5, "success": True}

            # Execute test
            result = await sync_service.execute_bulk_sync(force=False)

            # Verify results
            assert result.success is True
            assert result.total_files == 2
            assert result.processed_files == 2
            assert result.total_chunks == 10
            assert len(result.errors) == 0

    @patch("app.services.sync_service.SyncService._get_queue")
    @patch("app.services.sync_service.SyncService._scan_documents")
    async def test_execute_bulk_sync_with_errors(
        self, mock_scan, mock_get_queue, sync_service: SyncService
    ) -> None:
        """Test bulk sync execution with some errors."""
        # Setup mocks
        mock_queue = Mock()
        mock_get_queue.return_value = mock_queue
        mock_scan.return_value = ["/docs/file1.md", "/docs/file2.md", "/docs/file3.md"]

        with patch(
            "app.services.sync_service.SyncService._process_file"
        ) as mock_process:
            # First file succeeds, second fails, third succeeds
            mock_process.side_effect = [
                {"chunks": 3, "success": True},
                Exception("Processing error"),
                {"chunks": 7, "success": True},
            ]

            # Execute test
            result = await sync_service.execute_bulk_sync(force=False)

            # Verify results
            assert result.success is False  # Has errors
            assert result.total_files == 3
            assert result.processed_files == 2  # Only successful ones
            assert result.total_chunks == 10  # 3 + 7
            assert len(result.errors) == 1
            assert "Processing error" in result.errors[0]

    @patch("app.services.sync_service.SyncService._get_queue")
    async def test_get_sync_status_running(
        self, mock_get_queue: Mock, sync_service: SyncService
    ) -> None:
        """Test sync status when sync is running."""
        # Setup mock queue
        mock_queue = Mock()
        mock_get_queue.return_value = mock_queue

        # Mock queue status
        mock_queue.get_status.return_value = {
            "is_running": True,
            "current_job": {
                "file_path": "/docs/current.md",
                "progress": {"current": 5, "total": 10}
            },
        }

        # Execute test
        result = await sync_service.get_sync_status()

        # Verify results
        assert result.is_running is True
        assert result.current == 5
        assert result.total == 10
        assert result.current_file == "/docs/current.md"

    @patch("app.services.sync_service.SyncService._get_queue")
    async def test_get_sync_status_idle(
        self, mock_get_queue: Mock, sync_service: SyncService
    ) -> None:
        """Test sync status when sync is idle."""
        # Setup mock queue
        mock_queue = Mock()
        mock_get_queue.return_value = mock_queue

        # Mock queue status
        mock_queue.get_status.return_value = {"is_running": False, "current_job": None}

        # Execute test
        result = await sync_service.get_sync_status()

        # Verify results
        assert result.is_running is False
        assert result.current == 0
        assert result.total == 0
        assert result.current_file == ""

    async def test_scan_documents_success(self, sync_service: SyncService) -> None:
        """Test successful document scanning."""
        with patch("pathlib.Path.glob") as mock_glob:
            mock_files = [Mock(is_file=Mock(return_value=True)) for _ in range(3)]
            for i, mock_file in enumerate(mock_files):
                mock_file.__str__ = Mock(return_value=f"/docs/file{i}.md")

            mock_glob.return_value = mock_files

            # Execute test
            result = await sync_service._scan_documents()

            # Verify results
            assert len(result) == 3
            assert all("/docs/file" in path for path in result)

    async def test_process_file_success(self, sync_service: SyncService) -> None:
        """Test successful file processing."""
        with patch("app.services.sync_service.SyncService._read_file") as mock_read:
            mock_read.return_value = "# Test\nContent"
            with patch(
                "app.services.sync_service.SyncService._chunk_content"
            ) as mock_chunk:
                mock_chunk.return_value = ["chunk1", "chunk2", "chunk3"]
                with patch(
                    "app.services.sync_service.SyncService._index_chunks"
                ) as mock_index:
                    mock_index.return_value = True

                    # Execute test
                    result = await sync_service._process_file("/docs/test.md")

                    # Verify results
                    assert result["success"] is True
                    assert result["chunks"] == 3

    async def test_process_file_failure(self, sync_service: SyncService) -> None:
        """Test file processing failure."""
        with patch("app.services.sync_service.SyncService._read_file") as mock_read:
            mock_read.side_effect = Exception("File read error")

            # Execute test and verify exception
            with pytest.raises(Exception, match="File read error"):
                await sync_service._process_file("/docs/test.md")

    def test_chunk_content_basic(self, sync_service: SyncService) -> None:
        """Test basic content chunking."""
        content = (
            "# Title\n\nThis is paragraph 1.\n\nThis is paragraph 2.\n\n"
            "## Section\n\nMore content."
        )

        # Execute test
        result = sync_service._chunk_content(content)

        # Verify results
        assert len(result) > 0
        assert all(isinstance(chunk, str) for chunk in result)
        assert any("Title" in chunk for chunk in result)

    def test_chunk_content_large(self, sync_service: SyncService) -> None:
        """Test chunking of large content."""
        # Create large content (>chunk size)
        large_content = "Large content. " * 1000

        # Execute test
        result = sync_service._chunk_content(large_content)

        # Verify results
        assert len(result) > 1  # Should be split into multiple chunks
        assert all(len(chunk) > 0 for chunk in result)

    async def test_index_chunks_success(self, sync_service: SyncService) -> None:
        """Test successful chunk indexing."""
        chunks = ["chunk1", "chunk2", "chunk3"]

        with patch("app.services.sync_service.SearchService") as mock_search:
            mock_instance = Mock()
            mock_search.return_value = mock_instance
            mock_instance.index_document = AsyncMock(return_value=True)

            # Execute test
            result = await sync_service._index_chunks("/docs/test.md", chunks)

            # Verify results
            assert result is True
            assert mock_instance.index_document.call_count == 3

    async def test_index_chunks_failure(self, sync_service: SyncService) -> None:
        """Test chunk indexing failure."""
        chunks = ["chunk1", "chunk2"]

        with patch("app.services.sync_service.SearchService") as mock_search:
            mock_instance = Mock()
            mock_search.return_value = mock_instance
            mock_instance.index_document = AsyncMock(
                side_effect=Exception("Indexing error")
            )

            # Execute test and verify exception
            with pytest.raises(Exception, match="Indexing error"):
                await sync_service._index_chunks("/docs/test.md", chunks)

