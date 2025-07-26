"""Service integration tests."""

import tempfile
from collections.abc import Generator
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.file_service import FileService
from app.services.health_service import HealthService


class TestServiceIntegration:
    """Service integration test class."""

    @pytest.fixture
    def temp_docs_dir(self) -> Generator[Path, None, None]:
        """Create temporary documents directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            docs_dir = Path(tmpdir) / "docs"
            docs_dir.mkdir()

            # Create test structure
            (docs_dir / "root.md").write_text("# Root Document\n\nRoot content.")

            subdir = docs_dir / "subdir"
            subdir.mkdir()
            (subdir / "sub.md").write_text("# Sub Document\n\nSub content.")

            nested = subdir / "nested"
            nested.mkdir()
            (nested / "deep.md").write_text("# Deep Document\n\nDeep content.")

            yield docs_dir

    async def test_file_service_integration(self, temp_docs_dir: Path) -> None:
        """Test file service integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            # Test file listing
            result = await file_service.get_files()

            assert result.total_count >= 3
            assert any(f.name == "root.md" for f in result.files)

            # Test recursive listing
            result_recursive = await file_service.get_files(recursive=True)
            assert result_recursive.total_count >= 3

            # Test file content
            content = await file_service.get_file_content("root.md")
            assert content.name == "root.md"
            assert "# Root Document" in content.content

    async def test_file_service_sorting_integration(self, temp_docs_dir: Path) -> None:
        """Test file service sorting integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            # Test name sorting
            result_asc = await file_service.get_files(sort_by="name", order="asc")
            result_desc = await file_service.get_files(sort_by="name", order="desc")

            if len(result_asc.files) > 1:
                assert result_asc.files[0].name != result_desc.files[0].name

    async def test_file_service_error_handling_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service error handling integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            # Test non-existent file
            with pytest.raises(FileNotFoundError):
                await file_service.get_file_content("nonexistent.md")

    async def test_health_service_integration(self) -> None:
        """Test health service integration."""
        health_service = HealthService()

        # Test health check (may partially fail due to missing dependencies)
        result = await health_service.get_detailed_health()

        # Should at least return a result structure
        assert hasattr(result, "text_search")
        assert hasattr(result, "claude_code")
        assert hasattr(result, "overall")
        assert isinstance(result.text_search, bool)
        assert isinstance(result.claude_code, bool)
        assert isinstance(result.overall, bool)

    async def test_health_service_component_checks_integration(self) -> None:
        """Test individual health component checks."""
        health_service = HealthService()

        # Test text search check (may fail due to missing dependencies)
        text_result = await health_service._check_text_search()
        assert isinstance(text_result, bool)

        # Test Claude Code check (will fail without API key)
        claude_result = await health_service._check_claude_code()
        assert isinstance(claude_result, bool)

    async def test_file_service_path_resolution_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service path resolution integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            # Test different path formats
            content1 = await file_service.get_file_content("subdir/sub.md")
            assert content1.name == "sub.md"
            assert "# Sub Document" in content1.content

            # Test nested path
            content2 = await file_service.get_file_content("subdir/nested/deep.md")
            assert content2.name == "deep.md"
            assert "# Deep Document" in content2.content

    async def test_file_service_metadata_integration(self, temp_docs_dir: Path) -> None:
        """Test file service metadata integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            result = await file_service.get_files()

            # Verify metadata fields are populated
            for file_meta in result.files:
                assert file_meta.name
                assert file_meta.path
                assert file_meta.relative_path
                assert file_meta.directory
                assert file_meta.size > 0
                assert file_meta.hash
                assert len(file_meta.hash) == 40  # SHA-1 hash

    async def test_file_service_directory_info_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test file service directory info integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            result = await file_service.get_files(recursive=True)

            # Should include directory information
            assert len(result.directories) >= 2  # subdir and nested

            for dir_info in result.directories:
                assert dir_info.name
                assert dir_info.path
                assert dir_info.relative_path
                assert dir_info.file_count >= 0

    async def test_service_error_propagation_integration(
        self, temp_docs_dir: Path
    ) -> None:
        """Test error propagation between services."""
        file_service = FileService()

        # Test with invalid configuration
        with patch("app.core.config.settings.documents_path", "/nonexistent/path"):
            with pytest.raises(FileNotFoundError):
                await file_service.get_files()

    async def test_service_performance_integration(self, temp_docs_dir: Path) -> None:
        """Test service performance integration."""
        file_service = FileService()

        with patch("app.core.config.settings.documents_path", str(temp_docs_dir)):
            import time

            # Measure file listing performance
            start_time = time.time()
            result = await file_service.get_files()
            end_time = time.time()

            # Should complete reasonably quickly
            assert end_time - start_time < 5.0  # 5 seconds max
            assert result.total_count > 0
