"""Sync service tests."""

import tempfile
from pathlib import Path
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, patch

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

    @pytest.fixture
    def temp_docs_dir(self) -> Path:
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
        self, sync_service: SyncService, temp_docs_dir: Path
    ) -> None:
        """Test successful bulk sync execution."""
        # Mock the docs_path to use temp directory
        sync_service.docs_path = temp_docs_dir

        # Mock the sync_file method to avoid actual processing
        with patch.object(
            sync_service, "sync_file", new_callable=AsyncMock
        ) as mock_sync:
            mock_sync.return_value = None  # sync_file doesn't return anything

            # Execute test
            result = await sync_service.execute_bulk_sync(force=False)

            # Verify results
            assert result.success is True
            assert result.total_files == 2  # Two test files created
            assert result.processed_files == 2
            assert result.total_chunks > 0
            assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_execute_bulk_sync_with_errors(
        self, sync_service: SyncService, temp_docs_dir: Path
    ) -> None:
        """Test bulk sync execution with some errors."""
        # Mock the docs_path to use temp directory
        sync_service.docs_path = temp_docs_dir

        # Mock sync_file to raise exception for some files
        with patch.object(
            sync_service, "sync_file", new_callable=AsyncMock
        ) as mock_sync:
            mock_sync.side_effect = [
                None,
                Exception("Test error"),
            ]  # First succeeds, second fails

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
