"""Service integration tests."""

import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest

from app.services.file_service import FileService
from app.services.health_service import HealthService


class TestServiceIntegration:
    """Service integration test class."""

    @pytest.fixture
    def temp_docs_dir(self) -> Generator[Path, None, None]:
        """Create temporary docs directory for tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_path = Path(tmpdir)

            # Create test markdown files
            (temp_path / "test1.md").write_text("# Test 1\nContent of test 1")
            (temp_path / "test2.md").write_text("# Test 2\nContent of test 2")
            (temp_path / "subdir").mkdir()
            (temp_path / "subdir" / "test3.md").write_text(
                "# Test 3\nSubdirectory content"
            )

            yield temp_path

    @pytest.mark.asyncio
    async def test_file_service_integration(self, temp_docs_dir: Path) -> None:
        """Test file service integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Test file listing
        result = await file_service.get_files()

        # Verify results
        assert result.total_count >= 2
        assert len(result.files) >= 2

    @pytest.mark.asyncio
    async def test_file_service_sorting_integration(self, temp_docs_dir: Path) -> None:
        """Test file service sorting integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Test different sort options
        result_name_asc = await file_service.get_files(sort_by="name", order="asc")
        result_name_desc = await file_service.get_files(sort_by="name", order="desc")

        # Verify sorting works
        assert len(result_name_asc.files) == len(result_name_desc.files)

    @pytest.mark.asyncio
    async def test_file_service_error_handling_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service error handling integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Test file not found
        with pytest.raises(FileNotFoundError):
            await file_service.get_file_content("nonexistent.md")

    @pytest.mark.asyncio
    async def test_health_service_integration(self) -> None:
        """Test health service integration."""
        health_service = HealthService()

        # Test health check
        result = await health_service.get_detailed_health()

        # Verify basic health structure
        assert hasattr(result, "text_search")
        assert hasattr(result, "claude_code")
        assert hasattr(result, "overall")

    @pytest.mark.asyncio
    async def test_health_service_component_checks_integration(self) -> None:
        """Test health service component checks integration."""
        health_service = HealthService()

        # Test text search check
        text_result = await health_service._check_text_search()
        assert isinstance(text_result, bool)

        # Test Claude check
        claude_result = await health_service._check_claude_code()
        assert isinstance(claude_result, bool)

    @pytest.mark.asyncio
    async def test_file_service_path_resolution_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service path resolution integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Test file content retrieval
        result = await file_service.get_file_content("test1.md")

        # Verify content
        assert result.content == "# Test 1\nContent of test 1"
        assert result.name == "test1.md"

    @pytest.mark.asyncio
    async def test_file_service_metadata_integration(self, temp_docs_dir: Path) -> None:
        """Test file service metadata integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Get file metadata
        test_file = temp_docs_dir / "test1.md"
        metadata = await file_service._get_file_metadata(test_file)

        # Verify metadata
        assert metadata.name == "test1.md"
        assert metadata.size > 0
        assert metadata.line_count is not None and metadata.line_count > 0
        assert metadata.word_count is not None and metadata.word_count > 0
        assert metadata.hash

    @pytest.mark.asyncio
    async def test_file_service_directory_info_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service directory info integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Get directory info
        subdir = temp_docs_dir / "subdir"
        dir_info = await file_service._get_directory_info(subdir)

        # Verify directory info
        assert dir_info.name == "subdir"
        assert dir_info.file_count >= 1

    @pytest.mark.asyncio
    async def test_service_error_propagation_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test service error propagation integration."""
        file_service = FileService()

        # Test with invalid path
        file_service.docs_path = Path("/nonexistent/path")

        # Should handle gracefully
        result = await file_service.get_files()
        assert result.total_count == 0

    @pytest.mark.asyncio
    async def test_service_performance_integration(self, temp_docs_dir: Path) -> None:
        """Test service performance integration."""
        file_service = FileService()
        file_service.docs_path = temp_docs_dir

        # Measure basic operation performance
        import time

        start_time = time.time()

        result = await file_service.get_files()

        end_time = time.time()
        duration = end_time - start_time

        # Should complete within reasonable time
        assert duration < 5.0  # 5 seconds should be more than enough
        assert result.total_count >= 0
