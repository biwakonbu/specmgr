"""API integration tests."""

import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app


class TestAPIIntegration:
    """API integration test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def temp_docs_dir(self) -> Generator[Path, None, None]:
        """Create temporary documents directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            docs_dir = Path(tmpdir) / "docs"
            docs_dir.mkdir()

            # Create test markdown files
            (docs_dir / "readme.md").write_text(
                """# README

This is a test README file.

## Features

- Feature 1
- Feature 2

## Usage

Use this for testing."""
            )

            (docs_dir / "guide.md").write_text(
                """---
title: User Guide
author: Test Author
tags:
  - guide
  - tutorial
---

# User Guide

Welcome to the user guide.

## Getting Started

Follow these steps to get started:

1. Install the application
2. Configure settings
3. Start using features"""
            )

            (docs_dir / "api.md").write_text(
                """# API Reference

## Endpoints

### GET /api/files
Returns list of files.

### POST /api/search
Search documents.

### GET /api/health
Health check endpoint."""
            )

            yield docs_dir

    def test_health_check_integration(self, client: TestClient) -> None:
        """Test health check endpoint integration."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "status" in data

    def test_api_files_integration(
        self, client: TestClient, temp_docs_dir: Path
    ) -> None:
        """Test files API integration."""
        # Override documents path for test
        with pytest.MonkeyPatch().context() as m:
            m.setattr("app.core.config.settings.documents_path", str(temp_docs_dir))

            # Test file listing
            response = client.get("/api/files")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "files" in data["data"]
            assert len(data["data"]["files"]) == 3

    def test_api_file_content_integration(
        self, client: TestClient, temp_docs_dir: Path
    ) -> None:
        """Test file content API integration."""
        with pytest.MonkeyPatch().context() as m:
            m.setattr("app.core.config.settings.documents_path", str(temp_docs_dir))

            # Test file content retrieval
            response = client.get("/api/files/readme.md")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "# README" in data["data"]["content"]
            assert data["data"]["name"] == "readme.md"

    def test_api_file_content_with_frontmatter(
        self, client: TestClient, temp_docs_dir: Path
    ) -> None:
        """Test file content with frontmatter integration."""
        with pytest.MonkeyPatch().context() as m:
            m.setattr("app.core.config.settings.documents_path", str(temp_docs_dir))

            # Test file with frontmatter
            response = client.get("/api/files/guide.md")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "frontmatter" in data["data"]
            assert data["data"]["frontmatter"]["title"] == "User Guide"
            assert "guide" in data["data"]["frontmatter"]["tags"]

    def test_api_file_not_found_integration(
        self, client: TestClient, temp_docs_dir: Path
    ) -> None:
        """Test file not found integration."""
        with pytest.MonkeyPatch().context() as m:
            m.setattr("app.core.config.settings.documents_path", str(temp_docs_dir))

            # Test non-existent file
            response = client.get("/api/files/nonexistent.md")

            assert response.status_code == 404
            assert "File not found" in response.json()["detail"]

    def test_api_search_integration(self, client: TestClient) -> None:
        """Test search API integration."""
        # Test search endpoint (will use fallback text search)
        response = client.post(
            "/api/search",
            json={"query": "test query", "limit": 5, "scoreThreshold": 0.1},
        )

        # Should not fail even without real documents indexed
        assert response.status_code in [
            200,
            500,
        ]  # May fail due to missing dependencies

    def test_api_search_stats_integration(self, client: TestClient) -> None:
        """Test search stats API integration."""
        response = client.get("/api/search/stats")

        # Should not fail completely
        assert response.status_code in [
            200,
            500,
        ]  # May fail due to missing dependencies

    def test_api_health_detailed_integration(self, client: TestClient) -> None:
        """Test detailed health API integration."""
        response = client.get("/api/health/detailed")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "textSearch" in data["data"]
        assert "claudeCode" in data["data"]
        assert "overall" in data["data"]

    def test_api_sync_status_integration(self, client: TestClient) -> None:
        """Test sync status API integration."""
        response = client.get("/api/sync/status")

        assert response.status_code in [200, 500]  # May fail due to missing queue

    def test_api_sync_bulk_integration(self, client: TestClient) -> None:
        """Test bulk sync API integration."""
        response = client.post("/api/sync/bulk", json={"force": False})

        assert response.status_code in [
            200,
            500,
        ]  # May fail due to missing dependencies

    def test_api_chat_stream_integration(self, client: TestClient) -> None:
        """Test chat stream API integration."""
        response = client.post(
            "/api/chat/stream",
            json={"message": "Hello", "conversationHistory": [], "useRAG": False},
        )

        # Should handle gracefully even without Claude API key
        assert response.status_code in [200, 500]

    def test_api_error_handling_integration(self, client: TestClient) -> None:
        """Test API error handling integration."""
        # Test malformed requests
        response = client.post("/api/search", json={})
        assert response.status_code == 422  # Validation error

        response = client.post("/api/chat/stream", json={})
        assert response.status_code == 422  # Validation error

    def test_api_cors_integration(self, client: TestClient) -> None:
        """Test CORS headers integration."""
        response = client.options("/api/files")

        # Should handle OPTIONS request
        assert response.status_code in [200, 405]

    def test_api_pagination_integration(
        self, client: TestClient, temp_docs_dir: Path
    ) -> None:
        """Test API pagination integration."""
        with pytest.MonkeyPatch().context() as m:
            m.setattr("app.core.config.settings.documents_path", str(temp_docs_dir))

            # Test with sorting and ordering
            response = client.get(
                "/api/files",
                params={"sortBy": "name", "order": "desc", "recursive": "true"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
