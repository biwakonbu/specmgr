"""ファイルサービス."""

import hashlib
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models.api_models import (
    DirectoryInfo,
    FileContent,
    FileMetadata,
    FilesResponse,
)


class FileService:
    """ファイル管理サービス."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()

    async def get_files(
        self,
        path: str | None = None,
        recursive: bool = True,
        sort_by: str = "name",
        order: str = "asc",
    ) -> FilesResponse:
        """
        ファイル一覧取得.

        Args:
            path: 対象パス
            recursive: 再帰的検索
            sort_by: ソート基準
            order: ソート順序

        Returns:
            ファイル一覧
        """
        target_path = self.docs_path
        if path:
            target_path = self.docs_path / path

        if not target_path.exists():
            return FilesResponse(files=[], directories=[], totalCount=0)

        files = []
        directories = []

        # ファイルとディレクトリを取得
        if recursive:
            for file_path in target_path.rglob("*.md"):
                if file_path.is_file():
                    metadata = await self._get_file_metadata(file_path)
                    files.append(metadata)
        else:
            for item in target_path.iterdir():
                if item.is_file() and item.suffix.lower() in [".md", ".markdown"]:
                    metadata = await self._get_file_metadata(item)
                    files.append(metadata)
                elif item.is_dir():
                    dir_info = await self._get_directory_info(item)
                    directories.append(dir_info)

        # ソート
        reverse = order == "desc"
        if sort_by == "name":
            files.sort(key=lambda x: x.name, reverse=reverse)
        elif sort_by == "modified":
            files.sort(key=lambda x: x.last_modified, reverse=reverse)
        elif sort_by == "size":
            files.sort(key=lambda x: x.size, reverse=reverse)

        return FilesResponse(
            files=files,
            directories=directories,
            totalCount=len(files) + len(directories),
        )

    async def get_file_content(self, file_path: str) -> FileContent:
        """
        ファイル内容取得.

        Args:
            file_path: ファイルパス

        Returns:
            ファイル内容
        """
        full_path = self.docs_path / file_path

        if not full_path.exists():
            raise FileNotFoundError(f"ファイルが見つかりません: {file_path}")

        if not full_path.is_file():
            raise ValueError(f"指定されたパスはファイルではありません: {file_path}")

        # ファイル内容を読み込み
        try:
            with open(full_path, encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            # UTF-8で読めない場合はShift_JISで試す
            with open(full_path, encoding="shift_jis") as f:
                content = f.read()

        # メタデータを取得
        metadata = await self._get_file_metadata(full_path)

        # フロントマター解析（簡易版）
        frontmatter = None
        if content.startswith("---\n"):
            try:
                end_pos = content.find("\n---\n", 4)
                if end_pos > 0:
                    frontmatter_text = content[4:end_pos]
                    # 簡易的なYAMLパース（実際にはyamlライブラリを使用すべき）
                    frontmatter = {}
                    for line in frontmatter_text.split("\n"):
                        if ":" in line:
                            key, value = line.split(":", 1)
                            frontmatter[key.strip()] = value.strip()
            except Exception:  # noqa: S110
                # フロントマター解析に失敗してもエラーにしない
                pass

        return FileContent(
            path=file_path,
            name=full_path.name,
            content=content,
            metadata=metadata,
            frontmatter=frontmatter,
        )

    async def _get_file_metadata(self, file_path: Path) -> FileMetadata:
        """ファイルメタデータを取得."""
        stat = file_path.stat()
        relative_path = str(file_path.relative_to(self.docs_path))

        # ファイルハッシュを計算
        file_hash = await self._calculate_file_hash(file_path)

        # 行数とワード数を計算
        line_count, word_count = await self._count_lines_words(file_path)

        return FileMetadata(
            name=file_path.name,
            path=str(file_path),
            relativePath=relative_path,
            directory=str(file_path.parent.relative_to(self.docs_path)),
            size=stat.st_size,
            lastModified=datetime.fromtimestamp(stat.st_mtime),
            created=datetime.fromtimestamp(stat.st_ctime),
            hash=file_hash,
            lineCount=line_count,
            wordCount=word_count,
        )

    async def _get_directory_info(self, dir_path: Path) -> DirectoryInfo:
        """ディレクトリ情報を取得."""
        relative_path = str(dir_path.relative_to(self.docs_path))

        # ディレクトリ内のMarkdownファイル数をカウント
        file_count = len(list(dir_path.rglob("*.md")))

        return DirectoryInfo(
            name=dir_path.name,
            path=str(dir_path),
            relativePath=relative_path,
            fileCount=file_count,
        )

    async def _calculate_file_hash(self, file_path: Path) -> str:
        """ファイルのSHA-1ハッシュを計算."""
        hasher = hashlib.sha1()  # noqa: S324
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""

    async def _count_lines_words(self, file_path: Path) -> tuple[int, int]:
        """ファイルの行数とワード数をカウント."""
        try:
            with open(file_path, encoding="utf-8") as f:
                content = f.read()

            line_count = len(content.splitlines())
            word_count = len(content.split())

            return line_count, word_count
        except Exception:
            return 0, 0
