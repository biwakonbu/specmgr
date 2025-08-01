"""Manifest service for tracking file changes."""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings

# モジュールレベルでloggerを初期化
logger = logging.getLogger(__name__)


class ManifestError(Exception):
    """Manifest operation specific error."""

    pass


class ManifestCorruptedError(ManifestError):
    """Manifest file is corrupted."""

    pass


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
                logger.debug(
                    "Manifest loaded successfully",
                    extra={
                        "files_count": len(data.get("files", {})),
                        "last_updated": data.get("last_updated"),
                        "operation": "load_manifest",
                    },
                )
                return data
        except OSError as e:
            logger.warning(
                "Failed to read manifest file, using empty manifest",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "load_manifest_io_error",
                },
            )
            return {"files": {}, "last_updated": None}
        except json.JSONDecodeError as e:
            logger.error(
                "Manifest file is corrupted, starting fresh",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "operation": "load_manifest_json_error",
                },
            )
            # Backup corrupted manifest for debugging
            try:
                corrupted_path = self.manifest_path.with_suffix(".corrupted")
                self.manifest_path.rename(corrupted_path)
                logger.info(
                    "Corrupted manifest backed up",
                    extra={"backup_path": str(corrupted_path)},
                )
            except Exception as backup_error:
                logger.warning(
                    "Failed to backup corrupted manifest",
                    extra={"error": str(backup_error)},
                )
            return {"files": {}, "last_updated": None}
        except Exception as e:
            logger.error(
                "Unexpected error loading manifest",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "load_manifest_unexpected",
                },
            )
            raise ManifestError(f"Failed to load manifest: {e}") from e

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
            # Atomic write using temporary file
            temp_path = self.manifest_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

            # Atomic rename
            temp_path.replace(self.manifest_path)

            logger.debug(
                "Manifest saved successfully",
                extra={
                    "files_count": len(manifest.get("files", {})),
                    "last_updated": manifest.get("last_updated"),
                    "manifest_path": str(self.manifest_path),
                    "operation": "save_manifest",
                },
            )
        except OSError as e:
            logger.error(
                "Failed to save manifest file",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "save_manifest_io",
                },
            )
            raise ManifestError(f"Failed to save manifest: {e}") from e
        except Exception as e:
            logger.error(
                "Unexpected error saving manifest",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "save_manifest_unexpected",
                },
            )
            raise ManifestError(f"Failed to save manifest: {e}") from e

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

        logger.info(
            "File changes detected",
            extra={
                "added_files": len(added_files),
                "modified_files": len(modified_files),
                "deleted_files": len(deleted_files),
                "total_current_files": len(current_files),
                "total_manifest_files": len(manifest_files),
                "operation": "get_file_changes",
            },
        )

        return added_files, modified_files, deleted_files

    async def update_manifest(self, file_hashes: dict[str, str]) -> None:
        """
        Update manifest with new file hashes.

        Args:
            file_hashes: Dict of {relative_path: sha1_hash}
        """
        try:
            manifest = await self.load_manifest()
            old_count = len(manifest.get("files", {}))
            manifest["files"] = file_hashes
            await self.save_manifest(manifest)

            logger.info(
                "Manifest updated with new file hashes",
                extra={
                    "old_files_count": old_count,
                    "new_files_count": len(file_hashes),
                    "operation": "update_manifest",
                },
            )
        except Exception as e:
            logger.error(
                "Failed to update manifest",
                extra={
                    "files_count": len(file_hashes),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "update_manifest",
                },
            )
            if not isinstance(e, ManifestError):
                raise ManifestError(f"Failed to update manifest: {e}") from e
            raise

    async def update_file_in_manifest(self, file_path: str, file_hash: str) -> None:
        """
        Update single file in manifest.

        Args:
            file_path: Relative file path
            file_hash: SHA-1 hash of the file
        """
        try:
            manifest = await self.load_manifest()
            old_hash = manifest["files"].get(file_path)
            manifest["files"][file_path] = file_hash
            await self.save_manifest(manifest)

            logger.debug(
                "File updated in manifest",
                extra={
                    "file_path": file_path,
                    "old_hash": old_hash,
                    "new_hash": file_hash,
                    "is_new_file": old_hash is None,
                    "operation": "update_file_in_manifest",
                },
            )
        except Exception as e:
            logger.error(
                "Failed to update file in manifest",
                extra={
                    "file_path": file_path,
                    "file_hash": file_hash,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "update_file_in_manifest",
                },
            )
            if not isinstance(e, ManifestError):
                raise ManifestError(f"Failed to update file in manifest: {e}") from e
            raise

    async def remove_file_from_manifest(self, file_path: str) -> None:
        """
        Remove file from manifest.

        Args:
            file_path: Relative file path to remove
        """
        try:
            manifest = await self.load_manifest()
            old_hash = manifest["files"].pop(file_path, None)
            await self.save_manifest(manifest)

            logger.debug(
                "File removed from manifest",
                extra={
                    "file_path": file_path,
                    "had_hash": old_hash is not None,
                    "old_hash": old_hash,
                    "operation": "remove_file_from_manifest",
                },
            )
        except Exception as e:
            logger.error(
                "Failed to remove file from manifest",
                extra={
                    "file_path": file_path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "remove_file_from_manifest",
                },
            )
            if not isinstance(e, ManifestError):
                raise ManifestError(f"Failed to remove file from manifest: {e}") from e
            raise

    async def get_manifest_stats(self) -> dict[str, Any]:
        """
        Get manifest statistics.

        Returns:
            Statistics about the manifest
        """
        try:
            manifest = await self.load_manifest()
            manifest_exists = self.manifest_path.exists()
            manifest_size = self.manifest_path.stat().st_size if manifest_exists else 0

            stats = {
                "total_files": len(manifest.get("files", {})),
                "last_updated": manifest.get("last_updated"),
                "manifest_exists": manifest_exists,
                "manifest_size": manifest_size,
            }

            logger.debug(
                "Manifest stats retrieved",
                extra={"stats": stats, "operation": "get_manifest_stats"},
            )

            return stats
        except Exception as e:
            logger.error(
                "Failed to get manifest stats",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "get_manifest_stats",
                },
            )
            if not isinstance(e, ManifestError):
                raise ManifestError(f"Failed to get manifest stats: {e}") from e
            raise

    async def clear_manifest(self) -> None:
        """Clear the manifest file (force full sync on next run)."""
        try:
            if self.manifest_path.exists():
                # Backup before clearing
                backup_path = self.manifest_path.with_suffix(".backup")
                try:
                    self.manifest_path.rename(backup_path)
                    logger.info(
                        "Manifest cleared and backed up",
                        extra={
                            "backup_path": str(backup_path),
                            "operation": "clear_manifest",
                        },
                    )
                except Exception as backup_error:
                    # If backup fails, just delete
                    self.manifest_path.unlink()
                    logger.warning(
                        "Manifest cleared without backup",
                        extra={
                            "backup_error": str(backup_error),
                            "operation": "clear_manifest_no_backup",
                        },
                    )
            else:
                logger.debug(
                    "Manifest file does not exist, nothing to clear",
                    extra={"operation": "clear_manifest_not_exists"},
                )
        except Exception as e:
            logger.error(
                "Failed to clear manifest",
                extra={
                    "manifest_path": str(self.manifest_path),
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "clear_manifest",
                },
            )
            raise ManifestError(f"Failed to clear manifest: {e}") from e
