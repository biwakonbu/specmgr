"""File service tests."""

import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from app.services.file_service import FileService


class TestFileService:
    """File service test class."""

    @pytest.fixture
    def file_service(self) -> FileService:
        """Create file service instance."""
        return FileService()

    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    def test_init(self, file_service: FileService) -> None:
        """Test file service initialization."""
        assert file_service is not None

    @patch("app.services.file_service.FileService._get_base_path")
    @patch("pathlib.Path.glob")
    async def test_get_files_basic(self, mock_glob, mock_base_path, file_service: FileService) -> None:
        """Test basic file listing."""
        # Setup mocks
        mock_base_path.return_value = Path("/docs")
        mock_file = Mock()
        mock_file.is_file.return_value = True
        mock_file.name = "test.md"
        mock_file.stat.return_value.st_size = 1024
        mock_file.stat.return_value.st_mtime = datetime.now().timestamp()
        mock_file.stat.return_value.st_ctime = datetime.now().timestamp()
        mock_glob.return_value = [mock_file]

        with patch("hashlib.sha1") as mock_sha1:
            mock_sha1.return_value.hexdigest.return_value = "abc123"

            # Execute test
            result = await file_service.get_files()

            # Verify results
            assert result.total_count == 1
            assert len(result.files) == 1
            assert result.files[0].name == "test.md"

    @patch("app.services.file_service.FileService._get_base_path")
    async def test_get_file_content_success(self, mock_base_path, file_service: FileService) -> None:
        """Test successful file content retrieval."""
        # Setup
        mock_base_path.return_value = Path("/docs")
        content = "# Test\nThis is test content."

        with patch("pathlib.Path.read_text") as mock_read_text:
            mock_read_text.return_value = content
            with patch("pathlib.Path.exists") as mock_exists:
                mock_exists.return_value = True
                with patch("pathlib.Path.is_file") as mock_is_file:
                    mock_is_file.return_value = True

                    # Execute test
                    result = await file_service.get_file_content("test.md")

                    # Verify results
                    assert result.content == content
                    assert result.name == "test.md"

    @patch("app.services.file_service.FileService._get_base_path")
    async def test_get_file_content_not_found(self, mock_base_path, file_service: FileService) -> None:
        """Test file not found error."""
        mock_base_path.return_value = Path("/docs")

        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = False

            # Execute test and verify exception
            with pytest.raises(FileNotFoundError):
                await file_service.get_file_content("nonexistent.md")

    @patch("app.services.file_service.FileService._get_base_path")
    async def test_get_file_content_not_a_file(self, mock_base_path, file_service: FileService) -> None:
        """Test error when path is not a file."""
        mock_base_path.return_value = Path("/docs")

        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.return_value = True
            with patch("pathlib.Path.is_file") as mock_is_file:
                mock_is_file.return_value = False

                # Execute test and verify exception
                with pytest.raises(FileNotFoundError):
                    await file_service.get_file_content("directory")

    def test_calculate_file_hash(self, file_service: FileService, temp_dir: Path) -> None:
        """Test file hash calculation."""
        # Create test file
        test_file = temp_dir / "test.md"
        test_file.write_text("test content")

        # Calculate hash
        result = file_service._calculate_file_hash(test_file)

        # Verify hash format
        assert len(result) == 40  # SHA-1 hash length
        assert all(c in "0123456789abcdef" for c in result)

    @patch("app.core.config.settings.documents_path", "/custom/docs")
    def test_get_base_path_custom(self, file_service: FileService) -> None:
        """Test custom base path configuration."""
        result = file_service._get_base_path()
        assert str(result) == "/custom/docs"

    def test_parse_frontmatter_with_yaml(self, file_service: FileService) -> None:
        """Test frontmatter parsing with YAML."""
        content = """---
title: Test Document
author: Test Author
tags:
  - test
  - markdown
---

# Content

This is the main content."""

        result = file_service._parse_frontmatter(content)

        assert "title" in result
        assert result["title"] == "Test Document"
        assert result["author"] == "Test Author"
        assert "test" in result["tags"]

    def test_parse_frontmatter_without_yaml(self, file_service: FileService) -> None:
        """Test content without frontmatter."""
        content = """# Test Document

This is just markdown content without frontmatter."""

        result = file_service._parse_frontmatter(content)

        assert result == {}

    def test_parse_frontmatter_invalid_yaml(self, file_service: FileService) -> None:
        """Test invalid YAML frontmatter."""
        content = """---
title: Test Document
invalid: [unclosed list
---

# Content"""

        result = file_service._parse_frontmatter(content)

        assert result == {}  # Should return empty dict on parse error

