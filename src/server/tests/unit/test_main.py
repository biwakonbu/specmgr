"""メインアプリケーションのテスト."""

import pytest
from fastapi.testclient import TestClient

from main import app


class TestMainApp:
    """メインアプリケーションのテストクラス."""

    @pytest.fixture
    def client(self) -> TestClient:
        """テストクライアントを作成."""
        return TestClient(app)

    def test_root_endpoint(self, client: TestClient) -> None:
        """ルートエンドポイントのテスト."""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "status" in data
        assert data["status"] == "running"

    def test_health_check(self, client: TestClient) -> None:
        """ヘルスチェックのテスト."""
        response = client.get("/")
        assert response.status_code == 200

