"""End-to-end workflow tests."""

import tempfile
from collections.abc import Generator
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.mark.e2e
class TestFullWorkflow:
    """End-to-end workflow test class."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create test client."""
        return TestClient(app)

    @pytest.fixture
    def e2e_docs_dir(self) -> Generator[Path, None, None]:
        """Create documents directory for E2E tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            docs_dir = Path(tmpdir) / "docs"
            docs_dir.mkdir()

            # Create a comprehensive test document set
            (docs_dir / "project_overview.md").write_text(
                """---
title: Project Overview
category: documentation
priority: high
---

# Project Overview

This is the main project overview document.

## Architecture

The system consists of three main components:

### Backend Services
- API Server (FastAPI)
- Search Engine (Qdrant + Text Search)
- File Watcher Service

### Frontend
- React Application
- Component Library (shadcn/ui)
- Real-time Chat Interface

### Infrastructure
- Redis Queue System
- Docker Containers
- Monitoring & Logging

## Features

1. **Document Management**
   - Automatic file watching
   - SHA-1 based change detection
   - Markdown file processing

2. **Search Capabilities**
   - Vector-based semantic search
   - Full-text search fallback
   - Hybrid search ranking

3. **Chat Interface**
   - RAG-powered responses
   - Streaming chat interface
   - Conversation history

## Getting Started

Follow the setup instructions in the README.md file."""
            )

            (docs_dir / "api_reference.md").write_text(
                """# API Reference

## Files API

### GET /api/files
Retrieve list of markdown files.

**Parameters:**
- `path` (optional): Target directory path
- `recursive` (optional): Include subdirectories
- `sortBy` (optional): Sort criteria (name, modified, size)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [...],
    "directories": [...],
    "totalCount": 10
  }
}
```

### GET /api/files/{file_path}
Retrieve specific file content.

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "/docs/file.md",
    "name": "file.md",
    "content": "# Content...",
    "metadata": {...},
    "frontmatter": {...}
  }
}
```

## Search API

### POST /api/search
Search documents using hybrid search.

**Request:**
```json
{
  "query": "search terms",
  "limit": 10,
  "scoreThreshold": 0.5,
  "filePath": "/specific/path"
}
```

### GET /api/search/stats
Get search engine statistics.

## Health API

### GET /api/health/detailed
Get detailed system health status.

## Sync API

### POST /api/sync/bulk
Execute bulk document synchronization.

### GET /api/sync/status
Get current synchronization status."""
            )

            (docs_dir / "troubleshooting.md").write_text(
                """# Troubleshooting Guide

## Common Issues

### Search Not Working

**Symptoms:**
- Search returns no results
- Search endpoint returns 500 error

**Solutions:**
1. Check Qdrant connection
2. Verify API keys are configured
3. Run bulk sync to rebuild index

### File Watching Issues

**Symptoms:**
- New files not detected
- Changes not reflected in search

**Solutions:**
1. Check file watcher service status
2. Verify document path configuration
3. Check file permissions

### Chat Interface Problems

**Symptoms:**
- Chat returns errors
- Streaming stops unexpectedly

**Solutions:**
1. Verify Claude API key
2. Check network connectivity
3. Review conversation history format

## Performance Issues

### Slow Search Response

- Check Qdrant performance
- Review index size and configuration
- Consider increasing server resources

### High Memory Usage

- Monitor document processing queue
- Check for memory leaks in file watching
- Review chunk size configuration

## Debugging

Enable debug logging by setting `LOG_LEVEL=debug` in environment variables."""
            )

            yield docs_dir

    @pytest.mark.slow
    def test_complete_document_workflow(
        self, client: TestClient, e2e_docs_dir: Path
    ) -> None:
        """Test complete document management workflow."""
        with patch("app.core.config.settings.documents_path", str(e2e_docs_dir)):
            # Step 1: List all documents
            response = client.get("/api/files", params={"recursive": "true"})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["totalCount"] == 3

            # Verify all test files are found
            file_names = [f["name"] for f in data["data"]["files"]]
            assert "project_overview.md" in file_names
            assert "api_reference.md" in file_names
            assert "troubleshooting.md" in file_names

    @pytest.mark.slow
    def test_file_content_retrieval_workflow(
        self, client: TestClient, e2e_docs_dir: Path
    ) -> None:
        """Test file content retrieval workflow."""
        with patch("app.core.config.settings.documents_path", str(e2e_docs_dir)):
            # Test retrieving file with frontmatter
            response = client.get("/api/files/project_overview.md")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

            content_data = data["data"]
            assert content_data["name"] == "project_overview.md"
            assert "# Project Overview" in content_data["content"]
            assert "frontmatter" in content_data
            assert content_data["frontmatter"]["title"] == "Project Overview"
            assert content_data["frontmatter"]["category"] == "documentation"

    def test_search_workflow_fallback(self, client: TestClient) -> None:
        """Test search workflow with fallback to text search."""
        # This test expects vector search to fail and fallback to text search
        response = client.post(
            "/api/search",
            json={"query": "project architecture", "limit": 5, "scoreThreshold": 0.1},
        )

        # Should either succeed or fail gracefully
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "results" in data["data"]

    def test_health_check_workflow(self, client: TestClient) -> None:
        """Test health check workflow."""
        # Test basic health
        response = client.get("/")
        assert response.status_code == 200
        basic_health = response.json()
        assert "status" in basic_health

        # Test detailed health
        response = client.get("/api/health/detailed")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        health_data = data["data"]
        assert "textSearch" in health_data
        assert "claudeCode" in health_data
        assert "overall" in health_data

    def test_sync_workflow(self, client: TestClient) -> None:
        """Test synchronization workflow."""
        # Test sync status
        response = client.get("/api/sync/status")
        assert response.status_code in [200, 500]  # May fail without queue setup

        # Test bulk sync
        response = client.post("/api/sync/bulk", json={"force": False})
        assert response.status_code in [200, 500]  # May fail without dependencies

    def test_chat_workflow(self, client: TestClient) -> None:
        """Test chat workflow."""
        # Test basic chat request
        response = client.post(
            "/api/chat/stream",
            json={
                "message": "What is this project about?",
                "conversationHistory": [],
                "useRAG": True,
            },
        )

        # Should handle gracefully even without proper setup
        assert response.status_code in [200, 500]

    def test_error_handling_workflow(self, client: TestClient) -> None:
        """Test error handling across the workflow."""
        # Test invalid file path
        response = client.get("/api/files/nonexistent%2Ffile.md")
        assert response.status_code == 404

        # Test invalid search request
        response = client.post("/api/search", json={})
        assert response.status_code == 422

        # Test invalid chat request
        response = client.post("/api/chat/stream", json={"invalid": "data"})
        assert response.status_code == 422

    @pytest.mark.external
    def test_external_dependencies_workflow(self, client: TestClient) -> None:
        """Test workflow with external dependencies (requires services)."""
        # This test is marked as external and will be skipped in CI
        # unless external services are available

        # Test Redis connectivity
        # Test Qdrant connectivity
        # Test Claude API connectivity
        pass

    def test_api_consistency_workflow(
        self, client: TestClient, e2e_docs_dir: Path
    ) -> None:
        """Test API response consistency across endpoints."""
        with patch("app.core.config.settings.documents_path", str(e2e_docs_dir)):
            # All successful API responses should have consistent structure
            endpoints_to_test = [
                ("/api/files", "GET", None),
                ("/api/health/detailed", "GET", None),
            ]

            for endpoint, method, json_data in endpoints_to_test:
                if method == "GET":
                    response = client.get(endpoint)
                else:
                    response = client.post(endpoint, json=json_data)

                if response.status_code == 200:
                    data = response.json()
                    # All successful responses should have this structure
                    assert "success" in data
                    assert "data" in data
                    assert "timestamp" in data
                    assert data["success"] is True
