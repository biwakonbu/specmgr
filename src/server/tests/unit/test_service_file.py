"""File service tests."""

import tempfile
from collections.abc import Generator
from datetime import datetime
from pathlib import Path

import pytest

from app.services.file_service import FileService


class TestFileService:
    """File service test class."""

    @pytest.fixture
    def file_service(self) -> FileService:
        """Create file service instance."""
        return FileService()

    @pytest.fixture
    def temp_dir(self) -> Generator[Path, None, None]:
        """Create temporary directory for tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    def test_init(self, file_service: FileService) -> None:
        """Test file service initialization."""
        assert file_service is not None

    @pytest.mark.asyncio
    async def test_get_files_basic(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test basic file listing."""
        # Create test files in temp directory
        test_file = temp_dir / "test.md"
        test_file.write_text("# Test content")

        # Mock the docs_path to use temp directory
        file_service.docs_path = temp_dir

        # Execute test
        result = await file_service.get_files(recursive=False)

        # Verify results
        assert result.total_count >= 1
        assert len(result.files) >= 1
        assert any(f.name == "test.md" for f in result.files)

    @pytest.mark.asyncio
    async def test_get_file_content_success(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test successful file content retrieval."""
        # Create test file
        content = "# Test File\nThis is test content."
        test_file = temp_dir / "test.md"
        test_file.write_text(content)

        # Mock the docs_path to use temp directory
        file_service.docs_path = temp_dir

        # Execute test
        result = await file_service.get_file_content("test.md")

        # Verify results
        assert result.content == content
        assert result.name == "test.md"

    @pytest.mark.asyncio
    async def test_get_file_content_not_found(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test file not found error."""
        file_service.docs_path = temp_dir

        # Execute test and verify exception
        with pytest.raises(FileNotFoundError):
            await file_service.get_file_content("nonexistent.md")

    @pytest.mark.asyncio
    async def test_get_file_content_not_a_file(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test error when path is not a file."""
        # Create directory instead of file
        dir_path = temp_dir / "testdir"
        dir_path.mkdir()

        file_service.docs_path = temp_dir

        # Execute test and verify exception
        with pytest.raises(ValueError):
            await file_service.get_file_content("testdir")

    @pytest.mark.asyncio
    async def test_calculate_file_hash(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test file hash calculation."""
        # Create test file
        test_file = temp_dir / "test.md"
        test_file.write_text("Test content for hash")

        # Execute test
        file_hash = await file_service._calculate_file_hash(test_file)

        # Verify result (should be a hash string)
        assert isinstance(file_hash, str)
        assert len(file_hash) > 0

    @pytest.mark.asyncio
    async def test_count_lines_words(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test line and word counting."""
        # Create test file with known content
        content = "Line 1\nLine 2 with multiple words\nLine 3"
        test_file = temp_dir / "test.md"
        test_file.write_text(content)

        # Execute test
        line_count, word_count = await file_service._count_lines_words(test_file)

        # Verify results
        assert line_count == 3
        # "Line", "1", "Line", "2", "with", "multiple", "words", "Line", "3" = 9 words
        assert word_count == 9

    @pytest.mark.asyncio
    async def test_get_file_metadata(
        self, file_service: FileService, temp_dir: Path
    ) -> None:
        """Test file metadata retrieval."""
        # Create test file
        test_file = temp_dir / "test.md"
        test_file.write_text("# Test\nContent")

        file_service.docs_path = temp_dir

        # Execute test
        metadata = await file_service._get_file_metadata(test_file)

        # Verify results
        assert metadata.name == "test.md"
        assert metadata.size > 0
        assert isinstance(metadata.last_modified, datetime)
        assert isinstance(metadata.created, datetime)
        assert metadata.hash
        assert metadata.line_count and metadata.line_count > 0
        assert metadata.word_count and metadata.word_count > 0
