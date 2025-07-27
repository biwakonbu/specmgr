"""Search service."""

import logging
import time
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.api_models import (
    SearchResponse,
    SearchResult,
    SearchResultMetadata,
    SearchStats,
)
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService

# モジュールレベルでloggerを初期化
logger = logging.getLogger(__name__)


class SearchError(Exception):
    """Search operation specific error."""

    pass


class SearchService:
    """Hybrid search service."""

    def __init__(self) -> None:
        self.docs_path = Path(settings.documents_path).resolve()
        self.embedding_service = EmbeddingService()
        self.qdrant_service = QdrantService()

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

        # ハイブリッド検索: ベクトル検索 + テキスト検索
        results: list[SearchResult] = []

        # ベクトル検索を試行（APIキーが設定されている場合）
        if self.embedding_service.is_available():
            try:
                vector_results: list[SearchResult] = await self._vector_search(
                    query=query,
                    limit=limit or 10,
                    score_threshold=score_threshold or 0.5,
                    file_path=file_path,
                )
                results.extend(vector_results)
            except Exception as e:
                logger.warning(
                    "Vector search failed, falling back to text search",
                    extra={
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "query": query,
                        "operation": "vector_search",
                    },
                )

        # テキスト検索でフォールバック/補完
        text_results: list[SearchResult] = await self._simple_text_search(
            query=query,
            limit=limit or 10,
            score_threshold=score_threshold,
            file_path=file_path,
        )

        # ベクトル検索結果がない場合はテキスト検索結果を使用
        if not results:
            results = text_results

        processing_time: float = time.time() - start_time

        return SearchResponse(
            results=results,
            totalResults=len(results),
            query=query,
            processingTime=processing_time,
        )

    async def get_stats(self) -> SearchStats:
        """
        検索統計情報を取得.

        Returns:
            検索統計
        """
        # ドキュメントディレクトリ内のMarkdownファイル数をカウント
        total_files: int = 0
        total_chunks: int = 0
        index_size: int = 0

        if self.docs_path.exists():
            markdown_files: list[Path] = list(self.docs_path.rglob("*.md"))
            total_files = len(markdown_files)

            # 各ファイルを大体のチャンク数として推定（1000文字あたり1チャンク）
            for file_path in markdown_files:
                try:
                    file_size: int = file_path.stat().st_size
                    estimated_chunks: int = max(1, file_size // 1000)
                    total_chunks += estimated_chunks
                    index_size += file_size
                except (OSError, UnicodeDecodeError) as e:
                    logger.debug(
                        "Failed to process file for stats",
                        extra={
                            "file_path": str(file_path),
                            "error": str(e),
                            "error_type": type(e).__name__,
                            "operation": "file_stats",
                        },
                    )
                    continue

        return SearchStats(
            totalFiles=total_files,
            totalChunks=total_chunks,
            lastIndexed="2025-01-26T12:00:00Z",  # TODO: Actual last index time
            indexSize=index_size,
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
        query_lower: str = query.lower()

        # 検索対象ファイルを決定
        target_files: list[Path]
        if file_path:
            target_files = [self.docs_path / file_path]
        else:
            target_files = list(self.docs_path.rglob("*.md"))

        for file in target_files:
            if not file.exists() or not file.is_file():
                continue

            try:
                with open(file, encoding="utf-8") as f:
                    content: str = f.read()

                # 簡単なマッチング
                content_lower: str = content.lower()
                if query_lower in content_lower:
                    # マッチした部分のスニペットを作成
                    match_pos: int = content_lower.find(query_lower)
                    start: int = max(0, match_pos - 100)
                    end: int = min(len(content), match_pos + len(query) + 100)
                    snippet: str = content[start:end]

                    # スコア計算（単純な出現頻度）
                    score: float = content_lower.count(query_lower) / len(content_lower)

                    if score_threshold is None or score >= score_threshold:
                        relative_path: str = str(file.relative_to(self.docs_path))

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

            except (OSError, UnicodeDecodeError) as e:
                logger.debug(
                    "Failed to read file for text search",
                    extra={
                        "file_path": str(file),
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "operation": "text_search_file_read",
                    },
                )
                continue

        # スコア順にソートして上位を返す
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

    async def _vector_search(
        self,
        query: str,
        limit: int,
        score_threshold: float,
        file_path: str | None,
    ) -> list[SearchResult]:
        """
        ベクトル検索実装.

        Args:
            query: 検索クエリ
            limit: 結果の最大数
            score_threshold: スコア閾値
            file_path: 特定ファイル

        Returns:
            検索結果リスト
        """
        try:
            # クエリのembeddingを生成
            query_vector: list[float] = await self.embedding_service.generate_embedding(
                query
            )

            # Qdrantで検索
            qdrant_results: list[
                dict[str, Any]
            ] = await self.qdrant_service.search_documents(
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
            )

            results: list[SearchResult] = []
            for idx, result in enumerate(qdrant_results):
                # ファイルパスフィルタ
                result_path: str = result.get("path", "")
                if file_path and result_path != file_path:
                    continue

                # ファイル情報取得
                file_full_path: Path = self.docs_path / result_path
                if not file_full_path.exists():
                    continue

                # スニペット作成（bodyから最初の200文字）
                content: str = result.get("body") or ""
                snippet: str = content[:200] + "..." if len(content) > 200 else content

                result_score: float = result.get("score", 0.0)
                result_file_name: str = result.get("file_name", "")

                search_result = SearchResult(
                    id=f"vector_{idx}",
                    content=snippet,
                    score=result_score,
                    metadata=SearchResultMetadata(
                        filePath=result_path,
                        fileName=result_file_name,
                        chunkIndex=0,
                        totalChunks=1,
                        modified=str(file_full_path.stat().st_mtime),
                        size=file_full_path.stat().st_size,
                    ),
                )
                results.append(search_result)

            return results

        except Exception as e:
            logger.error(
                "Vector search operation failed",
                extra={
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "query": query,
                    "limit": limit,
                    "score_threshold": score_threshold,
                    "operation": "vector_search_operation",
                },
            )
            raise SearchError(f"Vector search failed: {e}") from e
