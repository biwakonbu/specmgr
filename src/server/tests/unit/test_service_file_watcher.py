"""Tests for FileWatcherService."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.models.watcher_types import (
    WatcherConfig,
)
from app.services.file_watcher import FileWatcherService


class TestFileWatcherService:
    """Test FileWatcherService functionality."""

    @pytest.fixture
    def mock_queue_service(self) -> Mock:
        """Mock queue service."""
        mock_service = Mock()
        mock_service.add_sync_job = AsyncMock()
        # Note: health_check removed - centralized in HealthService
        return mock_service

    @pytest.fixture
    def mock_observer(self) -> Mock:
        """Mock watchdog observer."""
        mock_observer = Mock()
        mock_observer.start = Mock()
        mock_observer.stop = Mock()
        mock_observer.join = Mock()
        mock_observer.is_alive = Mock(return_value=False)
        return mock_observer

    @pytest.fixture
    def file_watcher_service(
        self, mock_queue_service: Mock, mock_observer: Mock
    ) -> FileWatcherService:
        """Create FileWatcherService with mocked dependencies."""
        with (
            patch(
                "app.services.file_watcher.QueueService",
                return_value=mock_queue_service,
            ),
            patch("app.services.file_watcher.Observer", return_value=mock_observer),
        ):
            service = FileWatcherService()
            service.observer = mock_observer
            return service

    @pytest.fixture
    def temp_watch_directory(self) -> Path:  # type: ignore[misc]
        """Create temporary directory for watching."""
        with tempfile.TemporaryDirectory() as tmpdir:
            watch_dir = Path(tmpdir) / "watch_test"
            watch_dir.mkdir()
            yield watch_dir

    @pytest.fixture
    def watcher_config(self, temp_watch_directory: Path) -> WatcherConfig:
        """Sample watcher configuration."""
        return WatcherConfig(
            watch_directory=str(temp_watch_directory),
            file_patterns=["*.md"],
            ignore_patterns=[".git/*"],
            debounce_seconds=0.1,
            recursive=True,
        )

    def test_init(self, file_watcher_service: FileWatcherService) -> None:
        """Test file watcher service initialization."""
        assert file_watcher_service is not None
        assert hasattr(file_watcher_service, "observer")
        assert hasattr(file_watcher_service, "queue_service")

    @pytest.mark.asyncio
    async def test_start_success(
        self, file_watcher_service: FileWatcherService, mock_observer: Mock
    ) -> None:
        """Test successful watcher startup."""
        mock_observer.is_alive.return_value = False

        await file_watcher_service.start()

        mock_observer.start.assert_called_once()
        # Note: is_running attribute not implemented in current service

    @pytest.mark.asyncio
    async def test_start_already_running(
        self, file_watcher_service: FileWatcherService, mock_observer: Mock
    ) -> None:
        """Test starting watcher when already running."""
        # Set observer to simulate already running
        file_watcher_service.observer = mock_observer
        mock_observer.is_alive.return_value = True

        await file_watcher_service.start()

        # Should not start again if already running
        mock_observer.start.assert_not_called()

    @pytest.mark.asyncio
    async def test_stop_success(
        self, file_watcher_service: FileWatcherService, mock_observer: Mock
    ) -> None:
        """Test successful watcher shutdown."""
        file_watcher_service.observer = mock_observer
        mock_observer.is_alive.return_value = True

        await file_watcher_service.stop()

        mock_observer.stop.assert_called_once()
        mock_observer.join.assert_called_once()
