# API Reference

This document provides detailed information about all API endpoints available in the Local DocSearch & Chat Assistant system.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: Configure based on deployment

## Authentication

Currently, the system operates in a local environment and does not require authentication for API access. However, the Claude Code SDK integration requires a valid `ANTHROPIC_API_KEY` configured in the server environment.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": "string",
    "message": "string"
  } | null,
  "timestamp": "ISO 8601 datetime string"
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

Error responses include detailed error information in the `error` field.

## Endpoints

### Health Check

#### GET /

Basic health check endpoint.

**Response:**
```json
{
  "message": "Local DocSearch & Chat Assistant API",
  "status": "running"
}
```

#### GET /api/health/detailed

Detailed health status including service availability.

**Response:**
```json
{
  "success": true,
  "data": {
    "textSearch": true,
    "claudeCode": true,
    "overall": true
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

### File Management

#### GET /api/files

Retrieve a list of files and directories.

**Query Parameters:**
- `path` (string, optional) - Target path to list
- `recursive` (boolean, default: true) - Whether to search recursively
- `sortBy` (string, default: "name") - Sort criteria: "name", "modified", or "size"
- `order` (string, default: "asc") - Sort order: "asc" or "desc"

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "name": "example.md",
        "relativePath": "docs/example.md",
        "size": 1024,
        "modified": "2025-01-26T12:00:00Z",
        "isDirectory": false
      }
    ],
    "directories": [
      {
        "name": "api",
        "relativePath": "docs/api",
        "modified": "2025-01-26T12:00:00Z"
      }
    ],
    "totalCount": 15
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

#### GET /api/files/{file_path}

Retrieve the content of a specific file.

**Path Parameters:**
- `file_path` (string) - URL-encoded file path

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "docs/example.md",
    "name": "example.md",
    "content": "# Example Document\n\nThis is example content.",
    "metadata": {
      "name": "example.md",
      "relativePath": "docs/example.md",
      "size": 1024,
      "modified": "2025-01-26T12:00:00Z",
      "isDirectory": false
    },
    "frontmatter": {
      "title": "Example Document",
      "author": "John Doe"
    }
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

### Search

#### POST /api/search

Search for documents using hybrid text and vector search.

**Request Body:**
```json
{
  "query": "search terms",
  "limit": 10,
  "scoreThreshold": 0.1,
  "filePath": "optional/specific/file.md"
}
```

**Parameters:**
- `query` (string, required) - Search query
- `limit` (number, default: 10) - Maximum number of results
- `scoreThreshold` (number, optional) - Minimum relevance score
- `filePath` (string, optional) - Limit search to specific file

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "search_0",
        "content": "This is a matching snippet from the document...",
        "score": 0.85,
        "metadata": {
          "filePath": "docs/example.md",
          "fileName": "example.md",
          "chunkIndex": 0,
          "totalChunks": 3,
          "modified": "1642780800",
          "size": 1024
        }
      }
    ],
    "totalResults": 5,
    "query": "search terms",
    "processingTime": 0.123
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

#### GET /api/search/stats

Retrieve search index statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 42,
    "totalChunks": 156,
    "lastIndexed": "2025-01-26T12:00:00Z",
    "indexSize": 2048576
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

### Chat

#### POST /api/chat/stream

Start a streaming chat conversation with RAG context.

**Request Body:**
```json
{
  "message": "What is the system architecture?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant", 
      "content": "Previous assistant response"
    }
  ]
}
```

**Parameters:**
- `message` (string, required) - User message
- `conversationHistory` (array, optional) - Previous conversation context

**Response:**
Server-Sent Events (SSE) stream with `Content-Type: text/event-stream`

Each event contains JSON data:
```json
{
  "type": "content",
  "content": "Response text chunk",
  "timestamp": "2025-01-26T12:00:00Z"
}
```

Event types:
- `content` - Text content chunk
- `done` - End of response
- `error` - Error occurred

### Synchronization

#### POST /api/sync/bulk

Execute bulk synchronization of all documents.

**Request Body:**
```json
{
  "force": false
}
```

**Parameters:**
- `force` (boolean, default: false) - Force resync of all files

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "totalFiles": 42,
    "processedFiles": 38,
    "totalChunks": 156,
    "processingTime": 45.67,
    "errors": [
      "file1.md: Permission denied",
      "file2.md: Invalid format"
    ]
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

#### GET /api/sync/status

Get current synchronization status.

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "current": 38,
    "total": 42,
    "currentFile": "docs/architecture/system-design.md"
  },
  "error": null,
  "timestamp": "2025-01-26T12:00:00Z"
}
```

## Rate Limiting

Currently, no rate limiting is implemented for local development. In production environments, consider implementing rate limiting for:

- Search endpoints: 60 requests/minute
- Chat endpoints: 10 requests/minute (due to Claude Code SDK limits)
- File access: 300 requests/minute

## SDK Integration

### Claude Code SDK

The system integrates with Claude Code SDK for:

- **Embedding Generation**: Converting documents to vector embeddings
- **Chat Functionality**: RAG-powered conversational AI

**Requirements:**
- Valid `ANTHROPIC_API_KEY` in environment
- Active Claude Code SDK subscription

**Error Handling:**
- API key validation on startup
- Graceful degradation to text-only search when Claude Code SDK is unavailable
- Automatic retry with exponential backoff for transient failures

## WebSocket Events (Future)

While currently using SSE for chat streaming, future versions may implement WebSocket support for:

- Real-time file change notifications
- Live collaboration features
- Status updates for long-running operations

## Example Usage

### JavaScript/TypeScript Client

```javascript
// Search documents
const searchResponse = await fetch('/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'FastAPI setup',
    limit: 5
  })
});

const searchData = await searchResponse.json();

// Stream chat response
const chatResponse = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'How do I set up the development environment?'
  })
});

const reader = chatResponse.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Chat chunk:', data);
    }
  }
}
```

### Python Client

```python
import requests
import json

# Search documents
search_response = requests.post(
    'http://localhost:3000/api/search',
    json={
        'query': 'FastAPI setup',
        'limit': 5
    }
)

search_data = search_response.json()

# Stream chat (requires additional SSE handling)
import sseclient

chat_response = requests.post(
    'http://localhost:3000/api/chat/stream',
    json={
        'message': 'How do I set up the development environment?'
    },
    stream=True
)

client = sseclient.SSEClient(chat_response)
for event in client.events():
    data = json.loads(event.data)
    print('Chat chunk:', data)
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `FILE_NOT_FOUND` | Requested file does not exist | Verify file path and permissions |
| `SEARCH_ERROR` | Search operation failed | Check search service status |
| `CHAT_ERROR` | Chat service unavailable | Verify Claude Code SDK configuration |
| `SYNC_ERROR` | Synchronization failed | Check file permissions and disk space |
| `VALIDATION_ERROR` | Invalid request parameters | Review request format and parameters |

---

**Last Updated**: 2025-01-26