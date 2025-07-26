"""Search service."""

import time
from pathlib import Path

from app.core.config import settings
from app.models.api_models import (
    SearchResponse,
    SearchResult,
    SearchResultMetadata,
    SearchStats,
)


class SearchService:
    """Hybrid search service."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()

    async def search(
        self,
        query: str,
        limit: int | None = 10,
        score_threshold: float | None = None,
        file_path: str | None = None,
    ) -> SearchResponse:
        """
        ドキュメント検索.

        Args:
            query: 検索クエリ
            limit: 結果の最大数
            score_threshold: スコア閾値
            file_path: 特定ファイルに限定した検索

        Returns:
            検索結果
        """
        start_time = time.time()

        # シンプルなテキスト検索を実装（実際の実装では vector search + text search）
        results = await self._simple_text_search(
            query=query,
            limit=limit or 10,
            score_threshold=score_threshold,
            file_path=file_path,
        )

        processing_time = time.time() - start_time

        return SearchResponse(
            results=results,
            total_results=len(results),
            query=query,
            processing_time=processing_time,
        )

    async def get_stats(self) -> SearchStats:
        """
        検索統計情報を取得.

        Returns:
            検索統計
        """
        # ドキュメントディレクトリ内のMarkdownファイル数をカウント
        total_files = 0
        total_chunks = 0
        index_size = 0

        if self.docs_path.exists():
            markdown_files = list(self.docs_path.rglob("*.md"))
            total_files = len(markdown_files)

            # 各ファイルを大体のチャンク数として推定（1000文字あたり1チャンク）
            for file_path in markdown_files:
                try:
                    file_size = file_path.stat().st_size
                    estimated_chunks = max(1, file_size // 1000)
                    total_chunks += estimated_chunks
                    index_size += file_size
                except Exception:  # noqa: S112
                    continue

        return SearchStats(
            total_files=total_files,
            total_chunks=total_chunks,
            last_indexed="2025-01-26T12:00:00Z",  # TODO: Actual last index time
            index_size=index_size,
        )

    async def _simple_text_search(
        self,
        query: str,
        limit: int,
        score_threshold: float | None,
        file_path: str | None,
    ) -> list[SearchResult]:
        """
        シンプルなテキスト検索実装.

        Args:
            query: 検索クエリ
            limit: 結果の最大数
            score_threshold: スコア閾値
            file_path: 特定ファイル

        Returns:
            検索結果リスト
        """
        results: list[SearchResult] = []
        query_lower = query.lower()

        # 検索対象ファイルを決定
        if file_path:
            target_files = [self.docs_path / file_path]
        else:
            target_files = list(self.docs_path.rglob("*.md"))

        for file in target_files:
            if not file.exists() or not file.is_file():
                continue

            try:
                with open(file, encoding="utf-8") as f:
                    content = f.read()

                # 簡単なマッチング
                content_lower = content.lower()
                if query_lower in content_lower:
                    # マッチした部分のスニペットを作成
                    match_pos = content_lower.find(query_lower)
                    start = max(0, match_pos - 100)
                    end = min(len(content), match_pos + len(query) + 100)
                    snippet = content[start:end]

                    # スコア計算（単純な出現頻度）
                    score = content_lower.count(query_lower) / len(content_lower)

                    if score_threshold is None or score >= score_threshold:
                        relative_path = str(file.relative_to(self.docs_path))

                        result = SearchResult(
                            id=f"search_{len(results)}",
                            content=snippet,
                            score=score,
                            metadata=SearchResultMetadata(
                                filePath=relative_path,
                                fileName=file.name,
                                chunkIndex=0,
                                totalChunks=1,
                                modified=str(file.stat().st_mtime),
                                size=file.stat().st_size,
                            ),
                        )
                        results.append(result)

            except Exception:  # noqa: S112
                # ファイル読み込みエラーは無視
                continue

        # スコア順にソートして上位を返す
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
