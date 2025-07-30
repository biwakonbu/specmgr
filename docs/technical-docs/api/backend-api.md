# Backend API Specification

## Overview

FastAPI-based backend server providing document search, chat, file management, and sync capabilities.

**Base URL**: `http://localhost:3000`  
**API Prefix**: `/api`

## API Endpoints

### Health Check

#### `GET /`
Root health check endpoint.

**Response**:
```json
{
  "message": "Local DocSearch & Chat Assistant API",
  "status": "running"
}
```

#### `GET /api/health`
Comprehensive health status check.

**Response**:
```json
{
  "success": true,
  "data": {
    "textSearch": true,
    "claudeCode": true,
    "overall": true
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

### Search API

#### `POST /api/search`
Document search with hybrid vector and text search.

**Request Body**:
```json
{
  "query": "search query",
  "limit": 10,
  "scoreThreshold": 0.1,
  "filePath": "optional/path/filter.md"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "doc_chunk_id",
        "content": "matching content snippet",
        "score": 0.95,
        "metadata": {
          "filePath": "docs/example.md",
          "fileName": "example.md",
          "chunkIndex": 0,
          "totalChunks": 3,
          "modified": "2025-01-26T10:00:00Z",
          "size": 1024
        }
      }
    ],
    "totalResults": 1,
    "query": "search query",
    "processingTime": 0.123
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

#### `GET /api/search/stats`
Search index statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFiles": 42,
    "totalChunks": 156,
    "lastIndexed": "2025-01-26T10:00:00Z",
    "indexSize": 1048576
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

### Chat API

#### `POST /api/chat/stream`
Streaming chat with RAG integration.

**Request Body**:
```json
{
  "message": "What is the project structure?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "previous message",
      "timestamp": "2025-01-26T09:59:00Z"
    },
    {
      "role": "assistant", 
      "content": "previous response",
      "timestamp": "2025-01-26T09:59:30Z"
    }
  ],
  "useRAG": true
}
```

**Response**: Server-Sent Events (SSE) stream
```
data: {"type": "chunk", "content": "This is a "}

data: {"type": "chunk", "content": "streaming response"}

data: {"type": "complete"}

data: {"type": "done"}
```

**Error Response**:
```
data: {"type": "error", "error": {"code": "CHAT_ERROR", "message": "Error details"}}
```

### File Management API

#### `GET /api/files`
Get file listing with metadata.

**Query Parameters**:
- `path` (optional): Target directory path
- `recursive` (default: true): Recursive directory traversal
- `sortBy` (default: "name"): Sort criteria (name|modified|size)
- `order` (default: "asc"): Sort order (asc|desc)

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "example.md",
        "path": "/full/path/to/example.md",
        "relativePath": "docs/example.md",
        "directory": "docs",
        "size": 1024,
        "lastModified": "2025-01-26T10:00:00Z",
        "created": "2025-01-20T10:00:00Z",
        "hash": "sha1hash",
        "lineCount": 42,
        "wordCount": 256
      }
    ],
    "directories": [
      {
        "name": "docs",
        "path": "/full/path/to/docs",
        "relativePath": "docs",
        "fileCount": 10
      }
    ],
    "totalCount": 11
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

#### `GET /api/files/content`
Get file content with metadata.

**Query Parameters**:
- `path` (required): File path

**Response**:
```json
{
  "success": true,
  "data": {
    "path": "/full/path/to/example.md",
    "name": "example.md",
    "content": "# Example\n\nFile content here...",
    "metadata": {
      "name": "example.md",
      "path": "/full/path/to/example.md",
      "relativePath": "docs/example.md",
      "directory": "docs",
      "size": 1024,
      "lastModified": "2025-01-26T10:00:00Z",
      "created": "2025-01-20T10:00:00Z",
      "hash": "sha1hash",
      "lineCount": 42,
      "wordCount": 256
    },
    "frontmatter": {
      "title": "Example Document",
      "tags": ["example", "doc"]
    }
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

### Sync API

#### `POST /api/sync/bulk`
Trigger bulk synchronization.

**Request Body**:
```json
{
  "force": false
}
```

**Parameters**:
- `force` (boolean): When `false` (default), performs differential sync using manifest. When `true`, forces full re-sync of all files.

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "totalFiles": 42,
    "processedFiles": 3,
    "totalChunks": 156,
    "processingTime": 1.234,
    "errors": []
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

**Note**: With differential sync, `processedFiles` will be much lower than `totalFiles` when only a few files have changed, resulting in significant performance improvement.

#### `GET /api/sync/manifest/stats`
Get manifest statistics and health information.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFiles": 42,
    "lastUpdated": "2025-01-26T10:00:00Z",
    "manifestExists": true,
    "manifestSize": 2048
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

#### `DELETE /api/sync/manifest`
Clear the manifest file to force full re-sync on next operation.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Manifest cleared successfully"
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

#### `GET /api/sync/status`
Get current sync status.

**Response**:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "current": 15,
    "total": 42,
    "currentFile": "docs/processing.md"
  },
  "timestamp": "2025-01-26T10:00:00Z"
}
```

## Service Architecture

### Core Services

#### SearchService
- **Purpose**: Hybrid search combining vector and text search
- **Dependencies**: EmbeddingService, QdrantService
- **Key Methods**:
  - `search()`: Execute hybrid search with fallback
  - `get_stats()`: Return search index statistics

#### ChatService  
- **Purpose**: Streaming chat with RAG integration
- **Dependencies**: SearchService
- **Key Methods**:
  - `chat_stream()`: Generate streaming responses with context
  - `_get_rag_context()`: Retrieve relevant document context

#### FileService
- **Purpose**: File system operations and metadata extraction
- **Key Methods**:
  - `get_files()`: List files with metadata
  - `get_file_content()`: Read file content with frontmatter parsing
  - `get_file_metadata()`: Extract file metadata and statistics

#### EmbeddingService
- **Purpose**: Claude Code SDK integration for embeddings
- **Key Methods**:
  - `generate_embedding()`: Create vector embeddings
  - `is_available()`: Check API availability

#### QdrantService
- **Purpose**: Vector database operations
- **Key Methods**:
  - `upsert_documents()`: Insert/update document vectors
  - `search_similar()`: Vector similarity search
  - `delete_documents()`: Remove documents from index

#### FileWatcherService
- **Purpose**: Real-time file monitoring
- **Dependencies**: QueueService
- **Key Methods**:
  - `start()`: Begin file watching
  - `stop()`: Stop file watching
  - `_handle_file_event()`: Process file change events

#### QueueService
- **Purpose**: Redis-based async job processing
- **Key Methods**:
  - `start()`: Initialize Redis connection and workers
  - `enqueue()`: Add job to processing queue
  - `process_jobs()`: Worker job processing loop

#### SchedulerService
- **Purpose**: Background task scheduling
- **Dependencies**: SyncService
- **Key Methods**:
  - `start()`: Begin scheduled tasks
  - `stop()`: Stop scheduler

#### HealthService
- **Purpose**: System health monitoring
- **Key Methods**:
  - `check_health()`: Comprehensive health check
  - `check_claude_code()`: Verify Claude Code SDK connectivity
  - `check_text_search()`: Verify search functionality

#### SyncService
- **Purpose**: Document synchronization with differential sync and manifest management
- **Dependencies**: FileService, EmbeddingService, QdrantService, ManifestService
- **Key Methods**:
  - `execute_bulk_sync(force=False)`: Differential or full document synchronization
  - `sync_single_file()`: Individual file processing with manifest update
  - `remove_file()`: File deletion with manifest cleanup
  - `get_sync_status()`: Current sync progress
  - `_get_current_file_hashes()`: SHA-1 hash calculation for all files

#### ManifestService
- **Purpose**: SHA-1 based file change tracking and manifest management
- **Key Methods**:
  - `get_file_changes()`: Compare current files with manifest (returns added/modified/deleted)
  - `update_file_in_manifest()`: Update single file hash
  - `remove_file_from_manifest()`: Remove file from tracking
  - `load_manifest()`: Load `.specmgr-manifest.json`
  - `save_manifest()`: Save manifest with timestamp
  - `clear_manifest()`: Reset manifest for force sync
  - `get_manifest_stats()`: Manifest statistics and health

## Configuration

### Environment Variables

**Required**:
- `ANTHROPIC_API_KEY`: Claude Code SDK API key (for chat and embeddings)

**Optional**:
- `QDRANT_HOST`: Qdrant server host (default: localhost)
- `QDRANT_PORT`: Qdrant server port (default: 6333)  
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `LOG_LEVEL`: Logging level (default: info)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 3000)

### Configuration File

Optional `specmgr.config.yaml` in project root:

```yaml
documents:
  path: "docs"
  extensions: [".md", ".markdown"]
  exclude: ["node_modules", ".git", ".specmgr-*"]
  watch:
    enabled: true
    debounce_ms: 500

server:
  host: "0.0.0.0"
  port: 3000
  cors:
    enabled: true
    origins: ["http://localhost:5173"]

search:
  max_results: 50
  score_threshold: 0.1
  chunk_size: 2000
  overlap_size: 100

vector_db:
  collection: "documents"
  vector_size: 1536
  distance: "Cosine"

queue:
  concurrency: 5
  max_retries: 5
  backoff_strategy: "exponential"
  initial_delay_ms: 2000

logging:
  level: "info"
  format: "json"
  file: null

claude:
  model: "claude-3-5-sonnet-20241022"
  max_tokens: 4096
  timeout_seconds: 30
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Error description: specific error details"
}
```

### Error Types

- **Validation Errors**: Pydantic model validation failures
- **File Errors**: File not found, permission issues
- **Search Errors**: Vector search API failures, index issues
- **Chat Errors**: Claude Code SDK API failures, context errors
- **Sync Errors**: Document processing failures, queue issues

## Development & Testing

### Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── test_api_*.py       # API endpoint tests
│   ├── test_service_*.py   # Service layer tests
│   └── test_*.py           # Core functionality tests
├── integration/            # Integration tests
│   ├── test_api_integration.py
│   ├── test_qdrant_integration.py
│   └── test_service_integration.py
└── e2e/                    # End-to-end tests
    └── test_full_workflow.py
```

### Running Tests

```bash
# All tests
uv run pytest

# Unit tests only  
uv run pytest tests/unit/

# Integration tests only
uv run pytest tests/integration/

# E2E tests only
uv run pytest tests/e2e/

# With coverage
uv run pytest --cov=app --cov-report=html
```

### API Testing

Use the built-in FastAPI documentation at `http://localhost:3000/docs` for interactive API testing.