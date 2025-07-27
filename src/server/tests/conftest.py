"""Pytest configuration and shared fixtures."""

import asyncio
import tempfile
from collections.abc import Generator, AsyncGenerator
from typing import Any
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.api_models import FileMetadata, SearchResult
from main import app


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_client() -> TestClient:
    """Create FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def temp_docs_directory() -> Generator[Path, None, None]:
    """Create temporary documents directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        docs_dir = Path(tmpdir) / "test_docs"
        docs_dir.mkdir(parents=True, exist_ok=True)

        # Create sample test files
        (docs_dir / "sample1.md").write_text(
            """# Sample Document 1

This is a sample document for testing.

## Features

- Feature A
- Feature B

## Usage

Instructions for usage."""
        )

        (docs_dir / "sample2.md").write_text(
            """---
title: Sample Document 2
author: Test Author
tags:
  - test
  - sample
---

# Sample Document 2

This document has frontmatter.

## Content

Sample content with metadata."""
        )

        # Create subdirectory with files
        subdir = docs_dir / "subdirectory"
        subdir.mkdir()
        (subdir / "nested.md").write_text(
            """# Nested Document

This is a nested document in a subdirectory.

Content for testing nested file handling."""
        )

        yield docs_dir


@pytest.fixture
def mock_settings() -> Generator[Mock, None, None]:
    """Mock application settings for testing."""
    with patch("app.core.config.settings") as mock:
        mock.documents_path = "/tmp/test_docs"  # noqa: S108
        mock.anthropic_api_key = "test-api-key"
        mock.qdrant_host = "localhost"
        mock.qdrant_port = 6333
        mock.qdrant_collection = "test_documents"
        mock.redis_host = "localhost"
        mock.redis_port = 6379
        mock.redis_db = 0
        mock.log_level = "debug"
        yield mock


@pytest.fixture
def mock_anthropic_client() -> Generator[Mock, None, None]:
    """Mock Anthropic client for testing."""
    with patch("anthropic.Anthropic") as mock_anthropic:
        mock_client = mock_anthropic.return_value

        # Mock embeddings response
        mock_client.embeddings.create.return_value.data = [
            type("EmbeddingData", (), {"embedding": [0.1, 0.2, 0.3, 0.4, 0.5]})()
        ]

        # Mock messages response
        mock_client.messages.create.return_value.content = [
            type("Content", (), {"text": "Test response from Claude"})()
        ]

        yield mock_client


@pytest.fixture
def mock_qdrant_client() -> Generator[Mock, None, None]:
    """Mock Qdrant client for testing."""
    with patch("qdrant_client.QdrantClient") as mock_qdrant:
        mock_client = mock_qdrant.return_value

        # Mock search response
        mock_client.search.return_value = type(
            "SearchResult",
            (),
            {
                "points": [
                    type(
                        "Point",
                        (),
                        {
                            "id": "test_id_1",
                            "score": 0.95,
                            "payload": {
                                "content": "Test search result content",
                                "file_path": "/test/path.md",
                                "file_name": "path.md",
                                "chunk_index": 0,
                                "total_chunks": 1,
                                "modified": "2025-01-01T00:00:00Z",
                                "size": 1024,
                            },
                        },
                    )()
                ]
            },
        )()

        # Mock collection info
        mock_client.get_collection.return_value = type(
            "CollectionInfo", (), {"points_count": 100, "vectors_count": 100}
        )()

        yield mock_client


@pytest.fixture
def mock_redis_client() -> Generator[Mock, None, None]:
    """Mock Redis client for testing."""
    with patch("redis.Redis") as mock_redis:
        mock_client = mock_redis.return_value

        # Mock Redis operations
        mock_client.ping.return_value = True
        mock_client.get.return_value = None
        mock_client.set.return_value = True
        mock_client.delete.return_value = 1

        yield mock_client


@pytest.fixture
async def mock_async_services() -> AsyncGenerator[
    tuple[Mock, Mock, Mock, Mock, Mock], None
]:
    """Mock async services for testing."""
    with (
        patch("app.services.file_service.FileService") as mock_file_service,
        patch("app.services.search_service.SearchService") as mock_search_service,
        patch("app.services.sync_service.SyncService") as mock_sync_service,
        patch("app.services.chat_service.ChatService") as mock_chat_service,
        patch("app.services.health_service.HealthService") as mock_health_service,
    ):
        # Configure mock returns
        mock_file_service.return_value.get_files.return_value = type(
            "FilesResponse", (), {"files": [], "directories": [], "total_count": 0}
        )()

        mock_search_service.return_value.search.return_value = type(
            "SearchResponse",
            (),
            {
                "results": [],
                "total_results": 0,
                "query": "test",
                "processing_time": 0.1,
            },
        )()

        mock_health_service.return_value.get_detailed_health.return_value = type(
            "HealthStatus",
            (),
            {"text_search": True, "claude_code": True, "overall": True},
        )()

        yield (
            mock_file_service,
            mock_search_service,
            mock_sync_service,
            mock_chat_service,
            mock_health_service,
        )


@pytest.fixture
def sample_file_metadata() -> FileMetadata:
    """Sample file metadata for testing."""
    from datetime import datetime

    from app.models.api_models import FileMetadata

    return FileMetadata(
        name="test.md",
        path="/docs/test.md",
        relativePath="test.md",
        directory="/docs",
        size=1024,
        lastModified=datetime.now(),
        created=datetime.now(),
        hash="abc123def456",
        lineCount=20,
        wordCount=150,
    )


@pytest.fixture
def sample_search_result() -> SearchResult:
    """Sample search result for testing."""
    from app.models.api_models import SearchResult, SearchResultMetadata

    return SearchResult(
        id="test_result_1",
        content="This is sample search result content",
        score=0.85,
        metadata=SearchResultMetadata(
            filePath="/docs/sample.md",
            fileName="sample.md",
            chunkIndex=0,
            totalChunks=2,
            modified="2025-01-01T00:00:00Z",
            size=2048,
        ),
    )


# Pytest markers for test categorization
pytest_plugins: list[str] = []


# Custom markers
def pytest_configure(config: Any) -> None:
    """Configure custom pytest markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "external: Tests requiring external services")
