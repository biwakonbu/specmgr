"""キューサービス（Redis + RQ）."""

import asyncio
import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings


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

        except Exception:
            raise

    async def stop(self) -> None:
        """キューサービスを停止."""
        if self.redis_client:
            await self.redis_client.close()

    async def add_sync_job(self, job_data: dict[str, Any]) -> str:
        """同期ジョブをキューに追加."""
        job_id = f"sync_{asyncio.get_event_loop().time()}"

        job = {
            "id": job_id,
            "type": "sync",
            "data": job_data,
            "retry_count": 0,
            "created_at": asyncio.get_event_loop().time(),
        }

        await self.redis_client.rpush(self.job_queue, json.dumps(job))

        return job_id

    async def _start_worker(self) -> None:
        """ワーカープロセスを開始."""

        while True:
            try:
                # ジョブを取得（ブロッキング）
                job_data = await self.redis_client.blpop(self.job_queue, timeout=1)

                if job_data:
                    queue_name, job_json = job_data
                    job = json.loads(job_json)

                    # ジョブを処理
                    await self._process_job(job)

            except Exception:
                await asyncio.sleep(1)

    async def _process_job(self, job: dict[str, Any]) -> None:
        """ジョブを処理."""
        job["id"]

        try:

            # ジョブタイプに応じた処理
            if job["type"] == "sync":
                await self._process_sync_job(job["data"])


        except Exception as e:

            # リトライ処理
            await self._handle_job_retry(job, str(e))

    async def _process_sync_job(self, job_data: dict[str, Any]) -> None:
        """同期ジョブを処理."""
        from app.services.sync_service import SyncService

        sync_service = SyncService()

        event_type = job_data["event_type"]
        file_path = job_data["file_path"]

        if event_type in ["created", "modified"]:
            await sync_service.sync_file(file_path)
        elif event_type == "deleted":
            await sync_service.remove_file(file_path)

    async def _handle_job_retry(self, job: dict[str, Any], error: str) -> None:
        """ジョブリトライ処理."""
        job["retry_count"] += 1
        job["last_error"] = error

        if job["retry_count"] <= self.max_retries:
            # 指数バックオフでリトライ
            delay = 2 ** job["retry_count"]

            await asyncio.sleep(delay)
            await self.redis_client.rpush(self.job_queue, json.dumps(job))
        else:
            # 失敗ジョブを別キューに移動
            await self.redis_client.rpush("failed_jobs", json.dumps(job))

    async def get_queue_stats(self) -> dict[str, int]:
        """キューの統計情報を取得."""
        return {
            "pending": await self.redis_client.llen(self.job_queue),
            "retry": await self.redis_client.llen(self.retry_queue),
            "failed": await self.redis_client.llen("failed_jobs"),
        }
