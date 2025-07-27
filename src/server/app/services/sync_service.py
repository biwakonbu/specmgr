"""Synchronization service."""

import asyncio
import time
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.api_models import BulkSyncResult, SyncStatus
from app.services.embedding_service import EmbeddingService
from app.services.file_service import FileService
from app.services.manifest_service import ManifestService
from app.services.qdrant_service import QdrantService


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
            raise ValueError("Sync is already running")

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
                import logging

                logger = logging.getLogger(__name__)
                logger.info(
                    f"Force sync enabled, processing {len(files_to_sync)} files"
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

                import logging

                logger = logging.getLogger(__name__)
                msg = (
                    f"Differential sync: {len(added_files)} added, "
                    f"{len(modified_files)} modified, {len(deleted_files)} deleted"
                )
                logger.info(msg)

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
                    errors.append(f"Delete {relative_path}: {str(e)}")

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
                    errors.append(f"{relative_path}: {str(e)}")

            processing_time = time.time() - start_time

            # Report results
            total_files = len(current_files)
            import logging

            logger = logging.getLogger(__name__)
            msg = (
                f"Sync completed: {processed_files}/{total_operations} operations, "
                f"{len(errors)} errors"
            )
            logger.info(msg)

            return BulkSyncResult(
                success=len(errors) == 0,
                total_files=total_files,
                processed_files=processed_files,
                total_chunks=total_chunks,
                processing_time=processing_time,
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
            is_running=self._sync_status["is_running"],
            current=self._sync_status["current"],
            total=self._sync_status["total"],
            current_file=self._sync_status["current_file"],
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
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.info(f"Using dummy vector for {relative_path} (no API key)")
                    vector = self.embedding_service._get_zero_vector()

                # Qdrantに保存
                await self.qdrant_service.store_document(
                    file_path=relative_path,
                    content=content,
                    vector=vector,
                )
            except Exception as e:
                # 保存に失敗した場合はログに記録して続行
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to store document {relative_path}: {e}")

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to sync file {file_path}: {e}")
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
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to hash file {file_path}: {e}")

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
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to remove file {file_path}: {e}")
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
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to sync single file {file_path}: {e}")
            raise
