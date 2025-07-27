"""Test manifest service."""

import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

from app.services.manifest_service import ManifestService


@pytest.fixture
def temp_manifest_service() -> Iterator[ManifestService]:
    """Create temporary manifest service for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        service = ManifestService()
        service.docs_path = Path(temp_dir)
        service.manifest_path = service.docs_path / ".specmgr-manifest.json"
        yield service


@pytest.mark.asyncio
async def test_load_empty_manifest(temp_manifest_service: ManifestService) -> None:
    """Test loading non-existent manifest."""
    manifest = await temp_manifest_service.load_manifest()

    assert manifest["files"] == {}
    assert manifest["last_updated"] is None


@pytest.mark.asyncio
async def test_save_and_load_manifest(temp_manifest_service: ManifestService) -> None:
    """Test saving and loading manifest."""
    test_manifest = {
        "files": {"docs/test.md": "abc123", "docs/readme.md": "def456"},
        "last_updated": None,
    }

    await temp_manifest_service.save_manifest(test_manifest)
    loaded_manifest = await temp_manifest_service.load_manifest()

    assert loaded_manifest["files"] == test_manifest["files"]
    assert loaded_manifest["last_updated"] is not None


@pytest.mark.asyncio
async def test_get_file_changes_empty_manifest(
    temp_manifest_service: ManifestService,
) -> None:
    """Test change detection with empty manifest."""
    current_files = {"docs/new.md": "hash1", "docs/another.md": "hash2"}

    added, modified, deleted = await temp_manifest_service.get_file_changes(
        current_files
    )

    assert added == ["docs/new.md", "docs/another.md"]
    assert modified == []
    assert deleted == []


@pytest.mark.asyncio
async def test_get_file_changes_with_modifications(
    temp_manifest_service: ManifestService,
) -> None:
    """Test change detection with existing manifest."""
    # Setup existing manifest
    initial_manifest = {
        "files": {
            "docs/unchanged.md": "hash1",
            "docs/modified.md": "hash2",
            "docs/deleted.md": "hash3",
        }
    }
    await temp_manifest_service.save_manifest(initial_manifest)

    # Current files state
    current_files = {
        "docs/unchanged.md": "hash1",  # unchanged
        "docs/modified.md": "hash2_new",  # modified
        "docs/new.md": "hash4",  # added
        # docs/deleted.md is missing = deleted
    }

    added, modified, deleted = await temp_manifest_service.get_file_changes(
        current_files
    )

    assert added == ["docs/new.md"]
    assert modified == ["docs/modified.md"]
    assert deleted == ["docs/deleted.md"]


@pytest.mark.asyncio
async def test_update_file_in_manifest(temp_manifest_service: ManifestService) -> None:
    """Test updating single file in manifest."""
    # Initial manifest
    await temp_manifest_service.update_file_in_manifest("docs/test.md", "hash1")

    manifest = await temp_manifest_service.load_manifest()
    assert manifest["files"]["docs/test.md"] == "hash1"

    # Update same file
    await temp_manifest_service.update_file_in_manifest("docs/test.md", "hash2")

    manifest = await temp_manifest_service.load_manifest()
    assert manifest["files"]["docs/test.md"] == "hash2"


@pytest.mark.asyncio
async def test_remove_file_from_manifest(
    temp_manifest_service: ManifestService,
) -> None:
    """Test removing file from manifest."""
    # Add file first
    await temp_manifest_service.update_file_in_manifest("docs/test.md", "hash1")
    await temp_manifest_service.update_file_in_manifest("docs/keep.md", "hash2")

    # Remove one file
    await temp_manifest_service.remove_file_from_manifest("docs/test.md")

    manifest = await temp_manifest_service.load_manifest()
    assert "docs/test.md" not in manifest["files"]
    assert "docs/keep.md" in manifest["files"]


@pytest.mark.asyncio
async def test_get_manifest_stats(temp_manifest_service: ManifestService) -> None:
    """Test manifest statistics."""
    # Initially empty
    stats = await temp_manifest_service.get_manifest_stats()
    assert stats["total_files"] == 0
    assert stats["last_updated"] is None
    assert stats["manifest_exists"] is False

    # Add some files
    await temp_manifest_service.update_file_in_manifest("docs/test1.md", "hash1")
    await temp_manifest_service.update_file_in_manifest("docs/test2.md", "hash2")

    stats = await temp_manifest_service.get_manifest_stats()
    assert stats["total_files"] == 2
    assert stats["last_updated"] is not None
    assert stats["manifest_exists"] is True
    assert stats["manifest_size"] > 0


@pytest.mark.asyncio
async def test_clear_manifest(temp_manifest_service: ManifestService) -> None:
    """Test clearing manifest."""
    # Add some data
    await temp_manifest_service.update_file_in_manifest("docs/test.md", "hash1")

    # Clear manifest
    await temp_manifest_service.clear_manifest()

    stats = await temp_manifest_service.get_manifest_stats()
    assert stats["manifest_exists"] is False


@pytest.mark.asyncio
async def test_corrupted_manifest_handling(
    temp_manifest_service: ManifestService,
) -> None:
    """Test handling of corrupted manifest file."""
    # Write invalid JSON
    with open(temp_manifest_service.manifest_path, "w") as f:
        f.write("invalid json content")

    # Should return empty manifest without crashing
    manifest = await temp_manifest_service.load_manifest()
    assert manifest["files"] == {}
    assert manifest["last_updated"] is None
