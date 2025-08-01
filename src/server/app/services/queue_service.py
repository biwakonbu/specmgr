"""キューサービス（Redis + RQ）."""

import asyncio
import json
import logging
from typing import Any

import redis.asyncio as redis

from app.core.config import settings
from app.models.error_types import QueueConnectionError, QueueError

# モジュールレベルでloggerを初期化
logger = logging.getLogger(__name__)


class JobProcessingError(QueueError):
    """Job processing error."""

    pass


class QueueService:
    """非同期ジョブキューサービス."""

    def __init__(self) -> None:
        self.redis_client: redis.Redis | None = None
        self.job_queue = "sync_jobs"
        self.retry_queue = "retry_jobs"
        self.max_retries = 5

    async def start(self) -> None:
        """キューサービスを開始."""
        try:
            # Redis接続
            self.redis_client = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                db=settings.redis_db,
                decode_responses=True,
            )

            # 接続テスト
            await self.redis_client.ping()

            # ワーカーの開始
            asyncio.create_task(self._start_worker())

        except Exception as e:
            logger.error(
                "Failed to start queue service",
                extra={
                    "redis_host": settings.redis_host,
                    "redis_port": settings.redis_port,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "queue_start",
                },
            )
            raise QueueConnectionError(f"Failed to start queue service: {e}") from e

    async def stop(self) -> None:
        """キューサービスを停止."""
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Queue service stopped successfully")
            except Exception as e:
                logger.error(
                    "Error during queue service shutdown",
                    extra={
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "operation": "queue_stop",
                    },
                )

    async def add_sync_job(self, job_data: dict[str, Any]) -> str:
        """同期ジョブをキューに追加."""
        if not self.redis_client:
            raise QueueConnectionError("Redis client not connected")

        job_id = f"sync_{asyncio.get_event_loop().time()}"

        job = {
            "id": job_id,
            "type": "sync",
            "data": job_data,
            "retry_count": 0,
            "created_at": asyncio.get_event_loop().time(),
        }

        try:
            await self.redis_client.rpush(self.job_queue, json.dumps(job))
            logger.debug(
                "Sync job added to queue",
                extra={
                    "job_id": job_id,
                    "job_type": job["type"],
                    "event_type": job_data.get("event_type"),
                    "file_path": job_data.get("file_path"),
                    "operation": "add_sync_job",
                },
            )
        except Exception as e:
            logger.error(
                "Failed to add job to queue",
                extra={
                    "job_id": job_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "add_sync_job",
                },
            )
            raise QueueError(f"Failed to add job to queue: {e}") from e

        return job_id

    async def _start_worker(self) -> None:
        """ワーカープロセスを開始."""
        logger.info("Queue worker started")

        while True:
            try:
                if not self.redis_client:
                    logger.warning("Redis client not connected, waiting...")
                    await asyncio.sleep(1)
                    continue

                # ジョブを取得（ブロッキング）
                job_data = await self.redis_client.blpop(self.job_queue, timeout=1)

                if job_data:
                    queue_name, job_json = job_data
                    try:
                        job = json.loads(job_json)
                        logger.debug(
                            "Processing job from queue",
                            extra={
                                "job_id": job.get("id"),
                                "job_type": job.get("type"),
                                "retry_count": job.get("retry_count", 0),
                                "operation": "worker_process_job",
                            },
                        )
                        # ジョブを処理
                        await self._process_job(job)
                    except json.JSONDecodeError as e:
                        logger.error(
                            "Failed to decode job JSON",
                            extra={
                                "job_json": job_json,
                                "error": str(e),
                                "operation": "worker_json_decode",
                            },
                        )

            except Exception as e:
                logger.error(
                    "Worker error, retrying",
                    extra={
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "operation": "worker_loop",
                    },
                )
                await asyncio.sleep(1)

    async def _process_job(self, job: dict[str, Any]) -> None:
        """ジョブを処理."""
        job_id = job.get("id", "unknown")
        job_type = job.get("type", "unknown")

        try:
            logger.debug(
                "Starting job processing",
                extra={
                    "job_id": job_id,
                    "job_type": job_type,
                    "operation": "process_job_start",
                },
            )

            # ジョブタイプに応じた処理
            if job_type == "sync":
                await self._process_sync_job(job["data"])
            else:
                raise JobProcessingError(f"Unknown job type: {job_type}")

            logger.debug(
                "Job processing completed successfully",
                extra={
                    "job_id": job_id,
                    "job_type": job_type,
                    "operation": "process_job_success",
                },
            )

        except Exception as e:
            logger.warning(
                "Job processing failed, initiating retry",
                extra={
                    "job_id": job_id,
                    "job_type": job_type,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "retry_count": job.get("retry_count", 0),
                    "operation": "process_job_error",
                },
            )
            # リトライ処理
            await self._handle_job_retry(job, str(e))

    async def _process_sync_job(self, job_data: dict[str, Any]) -> None:
        """同期ジョブを処理."""
        from app.services.sync_service import SyncService

        event_type = job_data.get("event_type")
        file_path = job_data.get("file_path")

        if not event_type or not file_path:
            raise JobProcessingError(f"Invalid job data: {job_data}")

        try:
            sync_service = SyncService()

            if event_type in ["created", "modified"]:
                logger.info(
                    "Processing file sync job",
                    extra={
                        "event_type": event_type,
                        "file_path": file_path,
                        "operation": "sync_job_file_sync",
                    },
                )
                # manifest連携付きの単一ファイル同期
                await sync_service.sync_single_file(file_path)
            elif event_type == "deleted":
                logger.info(
                    "Processing file deletion job",
                    extra={
                        "event_type": event_type,
                        "file_path": file_path,
                        "operation": "sync_job_file_delete",
                    },
                )
                # manifestからも削除
                await sync_service.remove_file(file_path)
            else:
                raise JobProcessingError(f"Unknown event type: {event_type}")

        except Exception as e:
            logger.error(
                "Sync job processing failed",
                extra={
                    "event_type": event_type,
                    "file_path": file_path,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "sync_job_processing",
                },
            )
            raise JobProcessingError(f"Sync job failed: {e}") from e

    async def _handle_job_retry(self, job: dict[str, Any], error: str) -> None:
        """ジョブリトライ処理."""
        if not self.redis_client:
            logger.error("Cannot retry job: Redis client not connected")
            return

        job["retry_count"] += 1
        job["last_error"] = error
        job_id = job.get("id", "unknown")

        if job["retry_count"] <= self.max_retries:
            # 指数バックオフでリトライ
            delay = 2 ** job["retry_count"]

            logger.info(
                "Retrying job with exponential backoff",
                extra={
                    "job_id": job_id,
                    "retry_count": job["retry_count"],
                    "max_retries": self.max_retries,
                    "delay_seconds": delay,
                    "error": error,
                    "operation": "job_retry",
                },
            )

            await asyncio.sleep(delay)
            try:
                await self.redis_client.rpush(self.job_queue, json.dumps(job))
            except Exception as e:
                logger.error(
                    "Failed to requeue job for retry",
                    extra={
                        "job_id": job_id,
                        "error": str(e),
                        "operation": "job_requeue",
                    },
                )
        else:
            # 失敗ジョブを別キューに移動
            logger.error(
                "Job failed permanently after max retries",
                extra={
                    "job_id": job_id,
                    "retry_count": job["retry_count"],
                    "max_retries": self.max_retries,
                    "final_error": error,
                    "operation": "job_failed_permanently",
                },
            )
            try:
                await self.redis_client.rpush("failed_jobs", json.dumps(job))
            except Exception as e:
                logger.error(
                    "Failed to move job to failed queue",
                    extra={
                        "job_id": job_id,
                        "error": str(e),
                        "operation": "job_failed_queue",
                    },
                )

    async def get_queue_stats(self) -> dict[str, int]:
        """キューの統計情報を取得."""
        if not self.redis_client:
            logger.warning("Cannot get queue stats: Redis client not connected")
            return {"pending": 0, "retry": 0, "failed": 0}

        try:
            stats = {
                "pending": await self.redis_client.llen(self.job_queue),
                "retry": await self.redis_client.llen(self.retry_queue),
                "failed": await self.redis_client.llen("failed_jobs"),
            }
            logger.debug(
                "Queue stats retrieved",
                extra={"stats": stats, "operation": "get_queue_stats"},
            )
            return stats
        except Exception as e:
            logger.error(
                "Failed to get queue stats",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "operation": "get_queue_stats",
                },
            )
            raise QueueError(f"Failed to get queue stats: {e}") from e
