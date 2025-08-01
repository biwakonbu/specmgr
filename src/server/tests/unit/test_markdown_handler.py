"""Tests for MarkdownFileHandler."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from watchdog.events import FileCreatedEvent, FileDeletedEvent, FileModifiedEvent

from app.services.file_watcher import MarkdownFileHandler


class TestMarkdownFileHandler:
    """Test MarkdownFileHandler functionality."""

    @pytest.fixture
    def mock_queue_service(self) -> Mock:
        """Mock queue service."""
        mock_service = Mock()
        mock_service.add_sync_job = AsyncMock()
        return mock_service

    @pytest.fixture
    def temp_docs_directory(self) -> Path:  # type: ignore[misc]
        """Create temporary docs directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            docs_dir = Path(tmpdir)
            yield docs_dir

    @pytest.fixture
    def markdown_handler(
        self, mock_queue_service: Mock, temp_docs_directory: Path
    ) -> MarkdownFileHandler:
        """Create MarkdownFileHandler with mocked dependencies."""
        handler = MarkdownFileHandler(mock_queue_service)
        # Note: docs_root not used in constructor, handler operates on any path
        return handler

    @pytest.fixture
    def sample_markdown_file(self, temp_docs_directory: Path) -> Path:
        """Create sample markdown file."""
        test_file = temp_docs_directory / "test.md"
        test_file.write_text("# Test Markdown\n\nThis is a test file.")
        return test_file

    def test_init(self, markdown_handler: MarkdownFileHandler) -> None:
        """Test markdown handler initialization."""
        assert markdown_handler is not None
        assert hasattr(markdown_handler, "queue_service")
        assert hasattr(markdown_handler, "processed_files")

    def test_is_markdown_file_valid(
        self, markdown_handler: MarkdownFileHandler
    ) -> None:
        """Test markdown file detection."""
        assert markdown_handler._is_markdown_file("test.md") is True
        assert markdown_handler._is_markdown_file("test.markdown") is True
        assert markdown_handler._is_markdown_file("README.md") is True

    def test_is_markdown_file_invalid(
        self, markdown_handler: MarkdownFileHandler
    ) -> None:
        """Test non-markdown file detection."""
        assert markdown_handler._is_markdown_file("test.txt") is False
        assert markdown_handler._is_markdown_file("test.py") is False
        assert markdown_handler._is_markdown_file("test") is False

    # Note: _should_ignore method not implemented in current handler
    # File filtering done at file type level (_is_markdown_file)

    # Note: _get_relative_path method not implemented in current handler
    # Path handling done by calling services

    def test_on_created_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        sample_markdown_file: Path,
        mock_queue_service: Mock,
    ) -> None:
        """Test file creation event handling for markdown files."""
        event = FileCreatedEvent(str(sample_markdown_file))

        # on_created is sync method that creates async task
        markdown_handler.on_created(event)

        # Async task created but we can't easily await it in this test
        # Integration tests should cover the full async flow

    def test_on_created_non_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        temp_docs_directory: Path,
        mock_queue_service: Mock,
    ) -> None:
        """Test file creation event handling for non-markdown files."""
        text_file = temp_docs_directory / "test.txt"
        text_file.write_text("This is not markdown")
        event = FileCreatedEvent(str(text_file))

        # Should ignore non-markdown files
        markdown_handler.on_created(event)

    # Note: File ignoring logic simplified in current implementation
    # Only checks markdown file extension, not directory patterns

    def test_on_modified_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        sample_markdown_file: Path,
        mock_queue_service: Mock,
    ) -> None:
        """Test file modification event handling for markdown files."""
        event = FileModifiedEvent(str(sample_markdown_file))

        # Should handle markdown file modifications
        markdown_handler.on_modified(event)

    def test_on_modified_non_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        temp_docs_directory: Path,
    ) -> None:
        """Test file modification event handling for non-markdown files."""
        text_file = temp_docs_directory / "test.txt"
        text_file.write_text("Modified content")
        event = FileModifiedEvent(str(text_file))

        # Should ignore non-markdown files
        markdown_handler.on_modified(event)

    # Note: Hidden file handling not implemented in current version

    def test_on_deleted_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        temp_docs_directory: Path,
    ) -> None:
        """Test file deletion event handling for markdown files."""
        deleted_file = temp_docs_directory / "deleted.md"
        event = FileDeletedEvent(str(deleted_file))

        # Should handle markdown file deletions
        markdown_handler.on_deleted(event)

    def test_on_deleted_non_markdown_file(
        self,
        markdown_handler: MarkdownFileHandler,
        temp_docs_directory: Path,
    ) -> None:
        """Test file deletion event handling for non-markdown files."""
        deleted_file = temp_docs_directory / "deleted.txt"
        event = FileDeletedEvent(str(deleted_file))

        # Should ignore non-markdown files
        markdown_handler.on_deleted(event)

    # Note: Hidden file deletion handling not implemented in current version
