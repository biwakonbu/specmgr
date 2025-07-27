"""Integration tests for manifest and sync services."""

import tempfile
from collections.abc import Generator
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.manifest_service import ManifestService
from app.services.sync_service import SyncService


@pytest.fixture
def temp_sync_service() -> Generator[SyncService, None, None]:
    """Create temporary sync service for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        service = SyncService()
        service.docs_path = Path(temp_dir)
        service.manifest_service = ManifestService()
        service.manifest_service.docs_path = Path(temp_dir)
        service.manifest_service.manifest_path = (
            service.manifest_service.docs_path / ".specmgr-manifest.json"
        )

        # Mock external services
        service.embedding_service = MagicMock()
        service.embedding_service.is_available.return_value = False
        service.embedding_service._get_zero_vector.return_value = [0.0] * 1536

        service.qdrant_service = MagicMock()
        service.qdrant_service.initialize_collection = AsyncMock()
        service.qdrant_service.store_document = AsyncMock()
        service.qdrant_service.delete_document = AsyncMock()

        service.file_service = MagicMock()
        service.file_service._calculate_file_hash = AsyncMock()

        yield service


@pytest.mark.asyncio
async def test_differential_sync_empty_directory(
    temp_sync_service: SyncService,
) -> None:
    """Test differential sync with empty directory."""
    # Mock file service to return empty hashes
    temp_sync_service.file_service._calculate_file_hash.return_value = ""

    result = await temp_sync_service.execute_bulk_sync(force=False)

    assert result.success is True
    assert result.total_files == 0
    assert result.processed_files == 0


@pytest.mark.asyncio
async def test_differential_sync_new_files(temp_sync_service: SyncService) -> None:
    """Test differential sync with new files."""
    # Create test files
    test_file1 = temp_sync_service.docs_path / "test1.md"
    test_file2 = temp_sync_service.docs_path / "test2.md"

    test_file1.write_text("# Test 1")
    test_file2.write_text("# Test 2")

    # Mock file hashes
    hash_map = {test_file1: "hash1", test_file2: "hash2"}

    async def mock_hash(file_path):
        return hash_map.get(file_path, "")

    temp_sync_service.file_service._calculate_file_hash.side_effect = mock_hash

    result = await temp_sync_service.execute_bulk_sync(force=False)

    assert result.success is True
    assert result.total_files == 2
    assert result.processed_files == 2

    # Check manifest was updated
    manifest = await temp_sync_service.manifest_service.load_manifest()
    assert "test1.md" in manifest["files"]
    assert "test2.md" in manifest["files"]
    assert manifest["files"]["test1.md"] == "hash1"
    assert manifest["files"]["test2.md"] == "hash2"


@pytest.mark.asyncio
async def test_differential_sync_no_changes(temp_sync_service: SyncService) -> None:
    """Test differential sync with no changes."""
    # Create test file and initial manifest
    test_file = temp_sync_service.docs_path / "test.md"
    test_file.write_text("# Test")

    # Setup manifest with current hash
    await temp_sync_service.manifest_service.update_file_in_manifest("test.md", "hash1")

    # Mock file service to return same hash
    temp_sync_service.file_service._calculate_file_hash.return_value = "hash1"

    result = await temp_sync_service.execute_bulk_sync(force=False)

    assert result.success is True
    assert result.total_files == 1
    assert result.processed_files == 0  # No files processed due to no changes

    # Ensure no store_document calls were made
    temp_sync_service.qdrant_service.store_document.assert_not_called()


@pytest.mark.asyncio
async def test_differential_sync_modified_files(temp_sync_service: SyncService) -> None:
    """Test differential sync with modified files."""
    # Create test file and setup initial manifest
    test_file = temp_sync_service.docs_path / "test.md"
    test_file.write_text("# Test")

    await temp_sync_service.manifest_service.update_file_in_manifest(
        "test.md", "old_hash"
    )

    # Mock file service to return new hash
    temp_sync_service.file_service._calculate_file_hash.return_value = "new_hash"

    result = await temp_sync_service.execute_bulk_sync(force=False)

    assert result.success is True
    assert result.total_files == 1
    assert result.processed_files == 1

    # Check manifest was updated with new hash
    manifest = await temp_sync_service.manifest_service.load_manifest()
    assert manifest["files"]["test.md"] == "new_hash"

    # Ensure store_document was called
    temp_sync_service.qdrant_service.store_document.assert_called_once()


@pytest.mark.asyncio
async def test_differential_sync_deleted_files(temp_sync_service: SyncService) -> None:
    """Test differential sync with deleted files."""
    # Setup manifest with existing file
    await temp_sync_service.manifest_service.update_file_in_manifest(
        "deleted.md", "hash1"
    )

    # No actual files exist (simulating deletion)
    temp_sync_service.file_service._calculate_file_hash.return_value = ""

    result = await temp_sync_service.execute_bulk_sync(force=False)

    assert result.success is True
    assert result.total_files == 0
    assert result.processed_files == 1  # One deletion processed

    # Check file was removed from manifest
    manifest = await temp_sync_service.manifest_service.load_manifest()
    assert "deleted.md" not in manifest["files"]

    # Ensure delete_document was called
    temp_sync_service.qdrant_service.delete_document.assert_called_once_with(
        "deleted.md"
    )


@pytest.mark.asyncio
async def test_force_sync_ignores_manifest(temp_sync_service: SyncService) -> None:
    """Test that force sync processes all files regardless of manifest."""
    # Create test file and setup manifest (simulating no changes)
    test_file = temp_sync_service.docs_path / "test.md"
    test_file.write_text("# Test")

    await temp_sync_service.manifest_service.update_file_in_manifest("test.md", "hash1")

    # Mock file service to return same hash
    temp_sync_service.file_service._calculate_file_hash.return_value = "hash1"

    result = await temp_sync_service.execute_bulk_sync(force=True)

    assert result.success is True
    assert result.total_files == 1
    assert result.processed_files == 1  # Should process despite no changes

    # Ensure store_document was called even with same hash
    temp_sync_service.qdrant_service.store_document.assert_called_once()


@pytest.mark.asyncio
async def test_sync_single_file_updates_manifest(
    temp_sync_service: SyncService,
) -> None:
    """Test that sync_single_file updates manifest."""
    # Create test file
    test_file = temp_sync_service.docs_path / "test.md"
    test_file.write_text("# Test")

    # Mock file hash
    temp_sync_service.file_service._calculate_file_hash.return_value = "hash1"

    await temp_sync_service.sync_single_file(str(test_file))

    # Check manifest was updated
    manifest = await temp_sync_service.manifest_service.load_manifest()
    assert manifest["files"]["test.md"] == "hash1"

    # Ensure store_document was called
    temp_sync_service.qdrant_service.store_document.assert_called_once()


@pytest.mark.asyncio
async def test_remove_file_updates_manifest(temp_sync_service: SyncService) -> None:
    """Test that remove_file updates manifest."""
    # Setup manifest with existing file
    await temp_sync_service.manifest_service.update_file_in_manifest("test.md", "hash1")

    # Create file path (file doesn't need to exist for removal)
    test_file = temp_sync_service.docs_path / "test.md"

    await temp_sync_service.remove_file(str(test_file))

    # Check file was removed from manifest
    manifest = await temp_sync_service.manifest_service.load_manifest()
    assert "test.md" not in manifest["files"]

    # Ensure delete_document was called
    temp_sync_service.qdrant_service.delete_document.assert_called_once_with("test.md")
