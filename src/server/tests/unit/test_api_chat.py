"""Chat API endpoint tests."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


class TestChatAPI:
    """Chat API endpoint test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @patch("app.services.chat_service.ChatService.chat_stream")
    def test_chat_stream_success(self, mock_chat_stream: Mock, client: TestClient) -> None:
        """Test successful chat streaming."""

        async def mock_stream():
            yield "Hello"
            yield " "
            yield "World"

        mock_chat_stream.return_value = mock_stream()

        response = client.post(
            "/api/chat/stream",
            json={
                "message": "Hello",
                "conversationHistory": [],
                "useRAG": True,
            },
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # Check streaming response format
        content = response.text
        assert "data:" in content
        assert '"type":"chunk"' in content
        assert '"type":"complete"' in content
        assert '"type":"done"' in content

    @patch("app.services.chat_service.ChatService.chat_stream")
    def test_chat_stream_with_history(self, mock_chat_stream: Mock, client: TestClient) -> None:
        """Test chat streaming with conversation history."""

        async def mock_stream():
            yield "Response"

        mock_chat_stream.return_value = mock_stream()

        response = client.post(
            "/api/chat/stream",
            json={
                "message": "Follow up question",
                "conversationHistory": [
                    {"role": "user", "content": "Previous question", "timestamp": "2025-01-01T00:00:00Z"},
                    {
                        "role": "assistant",
                        "content": "Previous answer",
                        "timestamp": "2025-01-01T00:00:01Z",
                    },
                ],
                "useRAG": False,
            },
        )

        assert response.status_code == 200
        mock_chat_stream.assert_called_once()

    @patch("app.services.chat_service.ChatService.chat_stream")
    def test_chat_stream_service_error(self, mock_chat_stream: Mock, client: TestClient) -> None:
        """Test chat streaming with service error."""
        mock_chat_stream.side_effect = Exception("Chat service error")

        response = client.post(
            "/api/chat/stream",
            json={
                "message": "Test message",
                "conversationHistory": [],
                "useRAG": True,
            },
        )

        # Streaming responses may return 200 with error in stream
        assert response.status_code in [200, 500]
        if response.status_code == 500:
            assert "Streaming chat error" in response.json()["detail"]
        elif response.status_code == 200:
            # Check if error is in the stream content
            assert '"type":"error"' in response.text

    def test_chat_stream_invalid_request(self, client: TestClient) -> None:
        """Test chat streaming with invalid request data."""
        response = client.post("/api/chat/stream", json={})

        assert response.status_code == 422  # Validation error

    def test_chat_stream_missing_message(self, client: TestClient) -> None:
        """Test chat streaming with missing message field."""
        response = client.post(
            "/api/chat/stream",
            json={
                "conversationHistory": [],
                "useRAG": True,
            },
        )

        assert response.status_code == 422  # Validation error

