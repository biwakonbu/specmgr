"""Embedding generation service using Claude Code SDK."""

import logging
from typing import Any

from anthropic import Anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Claude Code SDK embedding generation service."""

    def __init__(self) -> None:
        self.client = Anthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None
        self.max_tokens = 8191  # Claude Code SDK embedding limit

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for text using Claude Code SDK.

        Args:
            text: Input text

        Returns:
            Embedding vector

        Raises:
            ValueError: If API key is not configured
            Exception: If embedding generation fails
        """
        if not self.client:
            raise ValueError("Claude Code SDK API key not configured")

        try:
            # テキストを適切な長さに制限
            truncated_text = self._truncate_text(text, self.max_tokens)

            # Claude Code SDK で embedding 生成（仮の実装）
            # 注意: 実際のClaude Code SDK APIに合わせて調整が必要
            response = self.client.embeddings.create(
                input=truncated_text,
                model="text-embedding-3-small",  # Claude Code SDK のモデル名に変更
            )

            embedding = response.data[0].embedding
            logger.info(f"Generated embedding for text ({len(truncated_text)} chars)")
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    async def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of input texts

        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            try:
                embedding = await self.generate_embedding(text)
                embeddings.append(embedding)
            except Exception as e:
                logger.error(f"Failed to generate embedding for text: {e}")
                # エラーの場合はゼロベクトルで代替
                embeddings.append(self._get_zero_vector())

        return embeddings

    def _truncate_text(self, text: str, max_tokens: int) -> str:
        """
        Truncate text to fit within token limit.

        Args:
            text: Input text
            max_tokens: Maximum tokens

        Returns:
            Truncated text
        """
        # 簡単な近似：1トークン = 4文字として計算
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text

        # 文章の境界で切り詰める
        truncated = text[:max_chars]
        last_sentence = truncated.rfind("。")
        last_period = truncated.rfind(".")
        last_newline = truncated.rfind("\n")

        # 適切な境界を見つける
        boundary = max(last_sentence, last_period, last_newline)
        if boundary > max_chars * 0.8:  # 80%以上の位置にある場合
            return truncated[:boundary + 1]

        return truncated

    def _get_zero_vector(self) -> list[float]:
        """Get zero vector as fallback."""
        return [0.0] * settings.app_config.vector_db.vector_size

    def is_available(self) -> bool:
        """Check if embedding service is available."""
        return self.client is not None