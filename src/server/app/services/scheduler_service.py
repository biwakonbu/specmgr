"""定期実行スケジューラーサービス."""

import asyncio
import logging

from app.services.sync_service import SyncService

logger = logging.getLogger(__name__)


class SchedulerService:
    """定期実行スケジューラーサービス."""

    def __init__(self) -> None:
        self.sync_service = SyncService()
        self.running = False
        self.tasks: list[asyncio.Task[None]] = []

    async def start(self) -> None:
        """スケジューラーを開始."""
        if self.running:
            return

        self.running = True
        logger.info("スケジューラーサービスを開始しました")

        # 30秒ごとのフル同期チェックタスクを開始
        full_sync_task = asyncio.create_task(self._periodic_full_sync_check())
        self.tasks.append(full_sync_task)

    async def stop(self) -> None:
        """スケジューラーを停止."""
        if not self.running:
            return

        self.running = False
        logger.info("スケジューラーサービスを停止しています...")

        # すべてのタスクをキャンセル
        for task in self.tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self.tasks.clear()
        logger.info("スケジューラーサービスを停止しました")

    async def _periodic_full_sync_check(self) -> None:
        """30秒ごとのフル同期チェック."""
        while self.running:
            try:
                await asyncio.sleep(30)  # 30秒待機

                if not self.running:
                    break  # type: ignore[unreachable]

                # 現在同期が実行されていない場合のみフル同期を実行
                status = await self.sync_service.get_sync_status()
                if not status.is_running:
                    logger.info("定期フル同期チェックを実行中...")

                    try:
                        result = await self.sync_service.execute_bulk_sync(force=False)
                        msg = (
                            f"定期フル同期完了: {result.processed_files}/"
                            f"{result.total_files}ファイル処理済み"
                        )
                        logger.info(msg)
                    except ValueError as e:
                        # 同期が既に実行中の場合はスキップ
                        if "already running" in str(e):
                            logger.debug(
                                "同期が既に実行中のため、定期フル同期をスキップ"
                            )
                        else:
                            logger.error(f"定期フル同期エラー: {e}")
                    except Exception as e:
                        logger.error(f"定期フル同期エラー: {e}")
                else:
                    logger.debug("同期が実行中のため、定期フル同期をスキップ")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"定期フル同期チェックでエラーが発生: {e}")
                # エラーが発生しても継続
                await asyncio.sleep(5)  # エラー時は5秒待機してから再試行
