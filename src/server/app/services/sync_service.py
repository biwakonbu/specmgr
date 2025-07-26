"""Synchronization service."""

import asyncio
import time
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.api_models import BulkSyncResult, SyncStatus
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService


class SyncService:
    """File synchronization service."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()
        self.embedding_service = EmbeddingService()
        self.qdrant_service = QdrantService()
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

            # Get Markdown files
            if not self.docs_path.exists():
                self.docs_path.mkdir(parents=True, exist_ok=True)

            markdown_files = list(self.docs_path.rglob("*.md"))
            total_files = len(markdown_files)

            self._sync_status["total"] = total_files
            self._sync_status["current"] = 0

            # Process each file
            for i, file_path in enumerate(markdown_files):
                self._sync_status["current"] = i + 1
                self._sync_status["current_file"] = str(
                    file_path.relative_to(self.docs_path)
                )

                try:
                    await self.sync_file(str(file_path))
                    processed_files += 1

                    # Estimate chunk count from file size
                    file_size = file_path.stat().st_size
                    estimated_chunks = max(1, file_size // 1000)
                    total_chunks += estimated_chunks

                    # Wait briefly for progress display
                    await asyncio.sleep(0.1)

                except Exception as e:
                    errors.append(f"{file_path.name}: {str(e)}")

            processing_time = time.time() - start_time

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
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to remove file {file_path}: {e}")
            raise
