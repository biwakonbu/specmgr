"""Synchronization service."""

import asyncio
import logging
import time
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.api_models import BulkSyncResult, SyncStatus
from app.services.embedding_service import EmbeddingService
from app.services.file_service import FileService
from app.services.manifest_service import ManifestService
from app.services.qdrant_service import QdrantService

# モジュールレベルでloggerを初期化
logger = logging.getLogger(__name__)


class SyncError(Exception):
    """Synchronization operation specific error."""

    pass


class SyncInProgressError(SyncError):
    """Sync is already in progress."""

    pass


class SyncService:
    """File synchronization service."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()
        self.embedding_service = EmbeddingService()
        self.qdrant_service = QdrantService()
        self.file_service = FileService()
        self.manifest_service = ManifestService()
        self._sync_status: dict[str, Any] = {
            "is_running": False,
            "current": 0,
            "total": 0,
            "current_file": "",
        }

    async def execute_bulk_sync(self, force: bool = False) -> BulkSyncResult:
        """
        Execute bulk synchronization.

        Args:
            force: Force sync flag

        Returns:
            Sync result
        """
        if self._sync_status["is_running"]:
            raise SyncInProgressError("Sync is already running")

        start_time = time.time()
        errors = []
        processed_files = 0
        total_chunks = 0

        try:
            self._sync_status["is_running"] = True

            # Initialize Qdrant collection
            await self.qdrant_service.initialize_collection()

            # Get current file hashes
            current_files = await self._get_current_file_hashes()

            if force:
                # Force sync all files
                files_to_sync = list(current_files.keys())
                files_to_delete = []
                logger.info(
                    "Force sync enabled",
                    extra={
                        "total_files": len(files_to_sync),
                        "operation": "force_sync",
                        "sync_type": "full",
                    },
                )
            else:
                # Differential sync using manifest
                (
                    added_files,
                    modified_files,
                    deleted_files,
                ) = await self.manifest_service.get_file_changes(current_files)
                files_to_sync = added_files + modified_files
                files_to_delete = deleted_files

                logger.info(
                    "Differential sync detected changes",
                    extra={
                        "added_files": len(added_files),
                        "modified_files": len(modified_files),
                        "deleted_files": len(deleted_files),
                        "operation": "differential_sync",
                        "sync_type": "incremental",
                    },
                )

            total_operations = len(files_to_sync) + len(files_to_delete)
            self._sync_status["total"] = total_operations
            self._sync_status["current"] = 0

            # Process deleted files first
            for i, relative_path in enumerate(files_to_delete):
                self._sync_status["current"] = i + 1
                self._sync_status["current_file"] = f"Deleting {relative_path}"

                try:
                    await self.qdrant_service.delete_document(relative_path)
                    await self.manifest_service.remove_file_from_manifest(relative_path)
                    processed_files += 1
                except Exception as e:
                    error_msg = f"Delete {relative_path}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(
                        "Failed to delete file during sync",
                        extra={
                            "file_path": relative_path,
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "operation": "sync_delete_file",
                        },
                    )

                await asyncio.sleep(0.05)

            # Process sync files
            for i, relative_path in enumerate(files_to_sync):
                self._sync_status["current"] = len(files_to_delete) + i + 1
                self._sync_status["current_file"] = relative_path

                file_path = self.docs_path / relative_path

                try:
                    await self.sync_file(str(file_path))
                    # Update manifest with new hash
                    await self.manifest_service.update_file_in_manifest(
                        relative_path, current_files[relative_path]
                    )
                    processed_files += 1

                    # Estimate chunk count from file size
                    file_size = file_path.stat().st_size
                    estimated_chunks = max(1, file_size // 1000)
                    total_chunks += estimated_chunks

                    await asyncio.sleep(0.05)

                except Exception as e:
                    error_msg = f"{relative_path}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(
                        "Failed to sync file during bulk sync",
                        extra={
                            "file_path": relative_path,
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "operation": "sync_process_file",
                        },
                    )

            processing_time = time.time() - start_time

            # Report results
            total_files = len(current_files)
            logger.info(
                "Bulk sync completed",
                extra={
                    "processed_files": processed_files,
                    "total_operations": total_operations,
                    "errors_count": len(errors),
                    "processing_time": processing_time,
                    "success": len(errors) == 0,
                    "operation": "bulk_sync_complete",
                },
            )

            return BulkSyncResult(
                success=len(errors) == 0,
                totalFiles=total_files,
                processedFiles=processed_files,
                totalChunks=total_chunks,
                processingTime=processing_time,
                errors=errors,
            )

        finally:
            self._sync_status["is_running"] = False
            self._sync_status["current_file"] = ""

    async def get_sync_status(self) -> SyncStatus:
        """
        Get sync status.

        Returns:
            Sync status
        """
        return SyncStatus(
            isRunning=self._sync_status["is_running"],
            current=self._sync_status["current"],
            total=self._sync_status["total"],
            currentFile=self._sync_status["current_file"],
        )

    async def sync_file(self, file_path: str) -> None:
        """
        File sync processing.

        Args:
            file_path: Target file path for sync
        """
        try:
            # ファイル読み込み
            with open(file_path, encoding="utf-8") as f:
                content = f.read()

            # 相対パスを取得
            relative_path = str(Path(file_path).relative_to(self.docs_path))

            # ベクトル化を実行（APIキーがない場合はダミーベクトルを使用）
            try:
                if self.embedding_service.is_available():
                    # Embedding生成
                    vector = await self.embedding_service.generate_embedding(content)
                else:
                    # APIキーがない場合はダミーベクトルを使用
                    logger.info(
                        "Using dummy vector (no API key available)",
                        extra={
                            "file_path": relative_path,
                            "operation": "sync_file_dummy_vector",
                        },
                    )
                    vector = self.embedding_service._get_zero_vector()

                # Qdrantに保存
                await self.qdrant_service.store_document(
                    file_path=relative_path,
                    content=content,
                    vector=vector,
                )
            except Exception as e:
                # 保存に失敗した場合はログに記録してraiseする
                logger.error(
                    "Failed to store document in vector database",
                    extra={
                        "file_path": relative_path,
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "operation": "sync_file_store_document",
                    },
                )
                raise SyncError(f"Failed to store document {relative_path}: {e}") from e

        except Exception as e:
            logger.error(
                "Failed to sync file",
                extra={
                    "file_path": file_path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "sync_file",
                },
            )
            if not isinstance(e, SyncError):
                raise SyncError(f"Failed to sync file {file_path}: {e}") from e
            raise

    async def _get_current_file_hashes(self) -> dict[str, str]:
        """
        Get current file hashes for all markdown files.

        Returns:
            Dict of {relative_path: sha1_hash}
        """
        if not self.docs_path.exists():
            self.docs_path.mkdir(parents=True, exist_ok=True)
            return {}

        file_hashes = {}
        markdown_files = list(self.docs_path.rglob("*.md"))

        for file_path in markdown_files:
            try:
                relative_path = str(file_path.relative_to(self.docs_path))
                file_hash = await self.file_service._calculate_file_hash(file_path)
                if file_hash:  # Only add if hash calculation succeeded
                    file_hashes[relative_path] = file_hash
            except Exception as e:
                logger.warning(
                    "Failed to calculate file hash",
                    extra={
                        "file_path": str(file_path),
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "operation": "get_current_file_hashes",
                    },
                )

        return file_hashes

    async def remove_file(self, file_path: str) -> None:
        """
        File removal processing.

        Args:
            file_path: Target file path for removal
        """
        try:
            # 相対パスに変換
            relative_path = str(Path(file_path).relative_to(self.docs_path))

            # Qdrantから削除
            await self.qdrant_service.delete_document(relative_path)

            # Manifestからも削除
            await self.manifest_service.remove_file_from_manifest(relative_path)

        except Exception as e:
            logger.error(
                "Failed to remove file",
                extra={
                    "file_path": file_path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "remove_file",
                },
            )
            if not isinstance(e, SyncError):
                raise SyncError(f"Failed to remove file {file_path}: {e}") from e
            raise

    async def sync_single_file(self, file_path: str) -> None:
        """
        Sync a single file with manifest update.

        Args:
            file_path: Full file path to sync
        """
        try:
            # Sync the file
            await self.sync_file(file_path)

            # Update manifest
            path_obj = Path(file_path)
            relative_path = str(path_obj.relative_to(self.docs_path))
            file_hash = await self.file_service._calculate_file_hash(path_obj)

            if file_hash:
                await self.manifest_service.update_file_in_manifest(
                    relative_path, file_hash
                )

        except Exception as e:
            logger.error(
                "Failed to sync single file",
                extra={
                    "file_path": file_path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "sync_single_file",
                },
            )
            if not isinstance(e, SyncError):
                raise SyncError(f"Failed to sync single file {file_path}: {e}") from e
            raise
