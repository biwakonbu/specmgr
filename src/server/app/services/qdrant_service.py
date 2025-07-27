"""Qdrant vector database service."""

import logging
from datetime import UTC
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantService:
    """Qdrant vector database operations."""

    def __init__(self) -> None:
        self.client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
            timeout=30,
        )
        self.collection_name = settings.qdrant_collection

    async def initialize_collection(self) -> None:
        """Initialize Qdrant collection if it doesn't exist."""
        try:
            # コレクション存在確認
            collections = self.client.get_collections()
            collection_exists = any(
                col.name == self.collection_name for col in collections.collections
            )

            if not collection_exists:
                # コレクション作成
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=settings.app_config.vector_db.vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
            else:
                logger.info(f"Qdrant collection already exists: {self.collection_name}")

        except Exception as e:
            logger.error(f"Failed to initialize Qdrant collection: {e}")
            raise

    async def store_document(
        self, file_path: str, content: str, vector: list[float]
    ) -> None:
        """
        Store document in Qdrant.

        Args:
            file_path: File path (used as key)
            content: Markdown content
            vector: Embedding vector
        """
        try:
            # ファイルパスからUUIDを生成
            import hashlib
            import uuid

            # ファイルパスのハッシュからUUIDを生成（SHA-256使用）
            path_hash = hashlib.sha256(file_path.encode()).hexdigest()[:32]
            point_id = str(uuid.UUID(path_hash))

            # ポイントを作成
            point = models.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "path": file_path,
                    "body": content,
                    "file_name": file_path.split("/")[-1],
                    "indexed_at": self._get_current_timestamp(),
                },
            )

            # Qdrantに保存
            self.client.upsert(
                collection_name=self.collection_name,
                points=[point],
            )

            logger.info(f"Stored document in Qdrant: {file_path}")

        except Exception as e:
            logger.error(f"Failed to store document {file_path}: {e}")
            raise

    async def search_documents(
        self, query_vector: list[float], limit: int = 10, score_threshold: float = 0.5
    ) -> list[dict[str, Any]]:
        """
        Search documents by vector similarity.

        Args:
            query_vector: Query embedding vector
            limit: Maximum results
            score_threshold: Minimum similarity score

        Returns:
            Search results with payload data
        """
        try:
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True,
            )

            results = []
            for scored_point in search_result:
                # payloadがNoneの場合を安全に処理
                payload = scored_point.payload or {}
                result = {
                    "id": scored_point.id,
                    "score": scored_point.score,
                    "path": payload.get("path"),
                    "body": payload.get("body"),
                    "file_name": payload.get("file_name"),
                    "indexed_at": payload.get("indexed_at"),
                }
                results.append(result)

            logger.info(f"Found {len(results)} documents in vector search")
            return results

        except Exception as e:
            logger.error(f"Failed to search documents: {e}")
            raise

    async def delete_document(self, file_path: str) -> None:
        """
        Delete document from Qdrant.

        Args:
            file_path: File path (key)
        """
        try:
            # ファイルパスからUUIDを生成（store_documentと同じ方法）
            import hashlib
            import uuid

            path_hash = hashlib.sha256(file_path.encode()).hexdigest()[:32]
            point_id = str(uuid.UUID(path_hash))

            # Qdrantから削除
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.PointIdsList(points=[point_id]),
            )

            logger.info(f"Deleted document from Qdrant: {file_path}")

        except Exception as e:
            logger.error(f"Failed to delete document {file_path}: {e}")
            raise

    async def document_exists(self, file_path: str) -> bool:
        """
        Check if document exists in Qdrant.

        Args:
            file_path: File path (key)

        Returns:
            True if document exists
        """
        try:
            # ファイルパスからUUIDを生成（store_documentと同じ方法）
            import hashlib
            import uuid

            path_hash = hashlib.sha256(file_path.encode()).hexdigest()[:32]
            point_id = str(uuid.UUID(path_hash))

            # ポイント取得を試行
            points = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[point_id],
            )

            return len(points) > 0

        except Exception as e:
            logger.error(f"Failed to check document existence {file_path}: {e}")
            return False

    async def get_collection_info(self) -> dict[str, Any]:
        """
        Get collection information.

        Returns:
            Collection stats
        """
        try:
            info = self.client.get_collection(self.collection_name)

            # config.params.vectorsの型安全性を確保
            vectors_config = info.config.params.vectors

            # VectorParamsの場合とdict[str, VectorParams]の場合を処理
            if isinstance(vectors_config, dict):
                # 最初のベクトル設定を取得
                first_vector_name = next(iter(vectors_config.keys()))
                vector_params = vectors_config[first_vector_name]
                vector_size = vector_params.size
                distance = vector_params.distance.value
            else:
                # VectorParamsの場合
                vector_size = vectors_config.size if vectors_config else 0
                distance = (
                    vectors_config.distance.value if vectors_config else "unknown"
                )

            return {
                "vectors_count": info.vectors_count,
                "indexed_vectors_count": info.indexed_vectors_count,
                "points_count": info.points_count,
                "config": {
                    "vector_size": vector_size,
                    "distance": distance,
                },
            }

        except Exception as e:
            logger.error(f"Failed to get collection info: {e}")
            raise

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime

        return datetime.now(UTC).isoformat()
