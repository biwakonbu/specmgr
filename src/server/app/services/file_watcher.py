"""ファイル監視サービス."""

import asyncio
from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from app.core.config import settings
from app.services.queue_service import QueueService


class MarkdownFileHandler(FileSystemEventHandler):
    """Markdownファイル変更ハンドラー."""

    def __init__(self, queue_service: QueueService) -> None:
        self.queue_service = queue_service
        self.processed_files: set[str] = set()

    def on_created(self, event: FileSystemEvent) -> None:
        """ファイル作成時の処理."""
        if event.is_directory:
            return

        file_path = (
            str(event.src_path) if isinstance(event.src_path, bytes) else event.src_path
        )
        if self._is_markdown_file(file_path):
            asyncio.create_task(self._handle_file_change("created", file_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        """ファイル変更時の処理."""
        if event.is_directory:
            return

        file_path = (
            str(event.src_path) if isinstance(event.src_path, bytes) else event.src_path
        )
        if self._is_markdown_file(file_path):
            asyncio.create_task(self._handle_file_change("modified", file_path))

    def on_deleted(self, event: FileSystemEvent) -> None:
        """ファイル削除時の処理."""
        if event.is_directory:
            return

        file_path = (
            str(event.src_path) if isinstance(event.src_path, bytes) else event.src_path
        )
        if self._is_markdown_file(file_path):
            asyncio.create_task(self._handle_file_change("deleted", file_path))

    def on_moved(self, event: FileSystemEvent) -> None:
        """ファイル移動時の処理."""
        if event.is_directory:
            return

        # 移動元ファイルを削除として処理
        if hasattr(event, "src_path"):
            src_path = (
                str(event.src_path)
                if isinstance(event.src_path, bytes)
                else event.src_path
            )
            if self._is_markdown_file(src_path):
                asyncio.create_task(self._handle_file_change("deleted", src_path))

        # 移動先ファイルを作成として処理
        if hasattr(event, "dest_path"):
            dest_path = (
                str(event.dest_path)
                if isinstance(event.dest_path, bytes)
                else event.dest_path
            )
            if self._is_markdown_file(dest_path):
                asyncio.create_task(self._handle_file_change("created", dest_path))

    def _is_markdown_file(self, file_path: str) -> bool:
        """Markdownファイルかどうかを判定."""
        return file_path.lower().endswith((".md", ".markdown"))

    async def _handle_file_change(self, event_type: str, file_path: str) -> None:
        """ファイル変更の処理."""
        # 重複処理を防ぐ
        file_key = f"{event_type}:{file_path}"
        if file_key in self.processed_files:
            return

        self.processed_files.add(file_key)

        try:
            # キューにジョブを追加
            await self.queue_service.add_sync_job(
                {
                    "event_type": event_type,
                    "file_path": file_path,
                    "timestamp": asyncio.get_event_loop().time(),
                }
            )

        except Exception:  # noqa: S110
            pass

        finally:
            # 一定時間後に重複チェックから削除
            await asyncio.sleep(1.0)
            self.processed_files.discard(file_key)


class FileWatcherService:
    """ファイル監視サービス."""

    def __init__(self) -> None:
        self.observer: Observer | None = None
        self.queue_service = QueueService()
        self.handler = MarkdownFileHandler(self.queue_service)

    async def start(self) -> None:
        """ファイル監視を開始."""
        try:
            # 監視対象ディレクトリの確認
            watch_path = Path(settings.documents_path).resolve()
            if not watch_path.exists():
                watch_path.mkdir(parents=True, exist_ok=True)

            # Observer の設定
            self.observer = Observer()
            self.observer.schedule(self.handler, str(watch_path), recursive=True)

            # 監視開始
            self.observer.start()

        except Exception:
            raise

    async def stop(self) -> None:
        """ファイル監視を停止."""
        if self.observer and self.observer.is_alive():
            self.observer.stop()
            self.observer.join()

    async def get_watched_files(self) -> list[str]:
        """監視対象ファイル一覧を取得."""
        watch_path = Path(settings.documents_path).resolve()
        markdown_files = []

        for file_path in watch_path.rglob("*.md"):
            if file_path.is_file():
                markdown_files.append(str(file_path.relative_to(watch_path)))

        return markdown_files
