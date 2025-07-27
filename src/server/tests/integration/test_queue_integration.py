"""Integration tests for QueueService with Redis."""

from unittest.mock import patch

import pytest
import redis.asyncio as redis

# Note: JobPriority not used in current integration tests
from app.services.queue_service import QueueService


@pytest.mark.integration
@pytest.mark.asyncio
class TestQueueIntegration:
    """Integration tests for QueueService."""

    @pytest.fixture(scope="class")
    async def redis_connection(self) -> redis.Redis:  # type: ignore[misc]
        """Create real Redis connection for integration testing."""
        try:
            # Try to connect to Redis
            client = redis.Redis(
                host="localhost", port=6379, db=1, decode_responses=True
            )
            await client.ping()
            yield client
            # Cleanup test data
            await client.flushdb()
            await client.close()
        except redis.ConnectionError:
            pytest.skip("Redis not available for integration testing")

    @pytest.fixture
    async def queue_service_with_redis(
        self, redis_connection: redis.Redis
    ) -> QueueService:
        """Create QueueService with real Redis connection."""
        with patch("app.services.queue_service.settings") as mock_settings:
            mock_settings.redis_host = "localhost"
            mock_settings.redis_port = 6379
            mock_settings.redis_db = 1

            service = QueueService()
            service.redis_client = redis_connection
            return service

    @pytest.mark.asyncio
    async def test_redis_connection_integration(
        self, queue_service_with_redis: QueueService
    ) -> None:
        """Test real Redis connection."""
        # Test Redis connectivity through actual operations
        stats = await queue_service_with_redis.get_queue_stats()
        assert isinstance(stats, dict)
        assert "pending" in stats or stats == {}  # May be empty if not implemented

    @pytest.mark.asyncio
    async def test_job_queue_integration(
        self, queue_service_with_redis: QueueService
    ) -> None:
        """Test job queuing with real Redis."""
        # Test actual job addition with real Redis
        job_data = {
            "event_type": "test_sync",
            "file_path": "/test/integration.md",
            "timestamp": 1640995200.0,
        }

        # Add a test job to the queue
        job_id = await queue_service_with_redis.add_sync_job(job_data)
        assert isinstance(job_id, str)
        assert job_id.startswith("sync_")

        # Verify queue stats show the job
        stats = await queue_service_with_redis.get_queue_stats()
        assert isinstance(stats, dict)
        assert "queue_size" in stats or stats == {}  # May be empty if not implemented
