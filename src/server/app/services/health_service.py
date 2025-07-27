"""ヘルスチェックサービス."""

from app.core.config import settings
from app.models.api_models import HealthStatus


class HealthService:
    """システムヘルスチェックサービス."""

    def __init__(self) -> None:
        pass

    async def get_detailed_health(self) -> HealthStatus:
        """
        詳細ヘルス状態を取得.

        Returns:
            ヘルス状態
        """
        # テキスト検索サービスの状態チェック
        text_search_healthy = await self._check_text_search()

        # Claude Code SDKの状態チェック
        claude_code_healthy = await self._check_claude_code()

        # 全体的な健全性
        overall_healthy = text_search_healthy and claude_code_healthy

        return HealthStatus(
            textSearch=text_search_healthy,
            claudeCode=claude_code_healthy,
            overall=overall_healthy,
        )

    async def _check_text_search(self) -> bool:
        """テキスト検索サービスの状態チェック."""
        try:
            # TODO: 実際のテキスト検索サービスの接続チェック
            return True
        except Exception:
            return False

    async def _check_claude_code(self) -> bool:
        """Claude Code SDKの状態チェック."""
        try:
            # APIキーの存在確認
            if not settings.anthropic_api_key:
                return False

            # TODO: 実際のAPIへの接続テスト
            return True
        except Exception:
            return False
