"""Manifest service for tracking file changes."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings


class ManifestService:
    """File change tracking service using SHA-1 manifest."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()
        self.manifest_path = self.docs_path / ".specmgr-manifest.json"

    async def load_manifest(self) -> dict[str, Any]:
        """
        Load manifest file.

        Returns:
            Manifest data (empty dict if not exists)
        """
        if not self.manifest_path.exists():
            return {"files": {}, "last_updated": None}

        try:
            with open(self.manifest_path, encoding="utf-8") as f:
                data: dict[str, Any] = json.load(f)
                return data
        except Exception:
            # If manifest is corrupted, start fresh
            return {"files": {}, "last_updated": None}

    async def save_manifest(self, manifest: dict[str, Any]) -> None:
        """
        Save manifest file.

        Args:
            manifest: Manifest data to save
        """
        manifest["last_updated"] = datetime.now().isoformat()

        # Ensure directory exists
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(self.manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to save manifest: {e}")

    async def get_file_changes(
        self, current_files: dict[str, str]
    ) -> tuple[list[str], list[str], list[str]]:
        """
        Compare current files with manifest to detect changes.

        Args:
            current_files: Dict of {relative_path: sha1_hash}

        Returns:
            Tuple of (added_files, modified_files, deleted_files)
        """
        manifest = await self.load_manifest()
        manifest_files = manifest.get("files", {})

        added_files = []
        modified_files = []
        deleted_files = []

        # Check for added and modified files
        for file_path, current_hash in current_files.items():
            if file_path not in manifest_files:
                added_files.append(file_path)
            elif manifest_files[file_path] != current_hash:
                modified_files.append(file_path)

        # Check for deleted files
        for file_path in manifest_files:
            if file_path not in current_files:
                deleted_files.append(file_path)

        return added_files, modified_files, deleted_files

    async def update_manifest(self, file_hashes: dict[str, str]) -> None:
        """
        Update manifest with new file hashes.

        Args:
            file_hashes: Dict of {relative_path: sha1_hash}
        """
        manifest = await self.load_manifest()
        manifest["files"] = file_hashes
        await self.save_manifest(manifest)

    async def update_file_in_manifest(self, file_path: str, file_hash: str) -> None:
        """
        Update single file in manifest.

        Args:
            file_path: Relative file path
            file_hash: SHA-1 hash of the file
        """
        manifest = await self.load_manifest()
        manifest["files"][file_path] = file_hash
        await self.save_manifest(manifest)

    async def remove_file_from_manifest(self, file_path: str) -> None:
        """
        Remove file from manifest.

        Args:
            file_path: Relative file path to remove
        """
        manifest = await self.load_manifest()
        manifest["files"].pop(file_path, None)
        await self.save_manifest(manifest)

    async def get_manifest_stats(self) -> dict[str, Any]:
        """
        Get manifest statistics.

        Returns:
            Statistics about the manifest
        """
        manifest = await self.load_manifest()
        return {
            "total_files": len(manifest.get("files", {})),
            "last_updated": manifest.get("last_updated"),
            "manifest_exists": self.manifest_path.exists(),
            "manifest_size": self.manifest_path.stat().st_size
            if self.manifest_path.exists()
            else 0,
        }

    async def clear_manifest(self) -> None:
        """Clear the manifest file (force full sync on next run)."""
        if self.manifest_path.exists():
            self.manifest_path.unlink()
