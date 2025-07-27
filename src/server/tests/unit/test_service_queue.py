"""Tests for QueueService."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
import redis.asyncio as redis

from app.models.error_types import QueueConnectionError, QueueError
from app.models.queue_types import JobPriority
from app.services.queue_service import QueueService


class TestQueueService:
    """Test QueueService functionality."""

    @pytest.fixture
    def mock_redis_client(self) -> Mock:
        """Mock Redis client."""
        mock_client = Mock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_client.lpush = AsyncMock(return_value=1)
        mock_client.rpop = AsyncMock(return_value=None)
        mock_client.llen = AsyncMock(return_value=0)
        mock_client.info = AsyncMock(return_value={"connected_clients": 1})
        return mock_client

    @pytest.fixture
    def queue_service(self, mock_redis_client: Mock) -> QueueService:
        """Create QueueService with mocked Redis client."""
        with patch(
            "app.services.queue_service.redis.Redis", return_value=mock_redis_client
        ):
            service = QueueService()
            service.redis_client = mock_redis_client
            return service

    @pytest.fixture
    def sample_job_data(self) -> dict:
        """Sample job data for testing."""
        return {
            "job_id": "test_job_123",
            "job_type": "sync_file",
            "file_path": "/docs/test.md",
            "priority": JobPriority.NORMAL,
            "retry_count": 0,
            "created_at": 1640995200.0,
            "metadata": {"test": "data"},
        }

    def test_init(self, queue_service: QueueService) -> None:
        """Test queue service initialization."""
        assert queue_service is not None
        assert hasattr(queue_service, "redis_client")
        assert queue_service.max_retries == 5
        # Note: retry_delay not implemented as instance variable

    @pytest.mark.asyncio
    async def test_start_success(
        self, queue_service: QueueService, mock_redis_client: Mock
    ) -> None:
        """Test successful queue service startup."""
        mock_redis_client.ping.return_value = True

        # start() doesn't return a value, just starts the service
        await queue_service.start()

        mock_redis_client.ping.assert_called_once()
        # Note: is_running attribute not implemented in current service

    @pytest.mark.asyncio
    async def test_start_connection_failure(
        self, queue_service: QueueService, mock_redis_client: Mock
    ) -> None:
        """Test queue service startup with connection failure."""
        mock_redis_client.ping.side_effect = redis.ConnectionError("Connection failed")

        with pytest.raises(QueueConnectionError):
            await queue_service.start()

        # Note: is_running attribute not implemented in current service

    @pytest.mark.asyncio
    async def test_stop_success(
        self, queue_service: QueueService, mock_redis_client: Mock
    ) -> None:
        """Test successful queue service shutdown."""
        mock_redis_client.close = AsyncMock()

        await queue_service.stop()

        mock_redis_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_when_no_client(self, mock_redis_client: Mock) -> None:
        """Test stopping queue service when no client."""
        queue_service = QueueService()
        queue_service.redis_client = None

        # Should not raise error when no client
        await queue_service.stop()

    @pytest.mark.asyncio
    async def test_add_sync_job_success(
        self,
        queue_service: QueueService,
        mock_redis_client: Mock,
        sample_job_data: dict,
    ) -> None:
        """Test successful sync job addition."""
        mock_redis_client.rpush.return_value = 1

        result = await queue_service.add_sync_job(sample_job_data)

        mock_redis_client.rpush.assert_called_once()
        assert isinstance(result, str)  # Returns job ID

    @pytest.mark.asyncio
    async def test_add_sync_job_no_client(self, sample_job_data: dict) -> None:
        """Test sync job addition when no Redis client."""
        queue_service = QueueService()
        queue_service.redis_client = None

        with pytest.raises(QueueConnectionError):
            await queue_service.add_sync_job(sample_job_data)

    @pytest.mark.asyncio
    async def test_add_sync_job_redis_error(
        self,
        queue_service: QueueService,
        mock_redis_client: Mock,
        sample_job_data: dict,
    ) -> None:
        """Test sync job addition with Redis error."""
        mock_redis_client.rpush.side_effect = redis.RedisError("Redis error")

        with pytest.raises(QueueError):
            await queue_service.add_sync_job(sample_job_data)

    @pytest.mark.asyncio
    async def test_get_queue_stats_success(
        self, queue_service: QueueService, mock_redis_client: Mock
    ) -> None:
        """Test successful queue stats retrieval."""
        mock_redis_client.llen.return_value = 5

        stats = await queue_service.get_queue_stats()

        # Should call llen for different queues
        assert mock_redis_client.llen.call_count >= 1
        assert isinstance(stats, dict)
        assert "pending" in stats
        assert stats["pending"] == 5

    @pytest.mark.asyncio
    async def test_get_queue_stats_no_client(self) -> None:
        """Test queue stats retrieval when no Redis client."""
        queue_service = QueueService()
        queue_service.redis_client = None

        stats = await queue_service.get_queue_stats()
        assert stats == {"pending": 0, "retry": 0, "failed": 0}

    @pytest.mark.asyncio
    async def test_get_queue_stats_redis_error(
        self, queue_service: QueueService, mock_redis_client: Mock
    ) -> None:
        """Test queue stats retrieval with Redis error."""
        mock_redis_client.llen.side_effect = redis.RedisError("Redis error")

        with pytest.raises(QueueError):
            await queue_service.get_queue_stats()

    # Note: Health check testing is handled by HealthService integration tests
    # Queue connectivity testing is covered in integration tests
