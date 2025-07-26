# Technology Stack Documentation

## Overview

This document outlines the technology stack selection for the **Local DocSearch & Chat Assistant** system, including rationale for each choice and alternatives considered.

## Architecture Components

### 1. Backend Stack

#### **Python + FastAPI + AsyncIO**
- **Version**: Python 3.12+ with FastAPI 0.104+
- **Rationale**: 
  - Excellent async performance with AsyncIO
  - Strong AI/ML ecosystem integration
  - FastAPI provides automatic OpenAPI documentation
  - Type hints with Pydantic for robust data validation
  - Better integration with watchdog for file monitoring
- **Alternatives Considered**: Node.js (Express), Go, Rust
- **Decision Factors**: Python ecosystem maturity for AI APIs and file processing

#### **FastAPI**
- **Version**: 0.104+
- **Purpose**: High-performance web framework
- **Rationale**: Automatic validation, serialization, and documentation
- **Key Features**: 
  - Automatic OpenAPI/Swagger documentation
  - Pydantic model validation
  - Async/await support throughout

### 2. File System Monitoring

#### **Watchdog (Python)**
- **Version**: 3.0+
- **Purpose**: Markdown file change detection
- **Rationale**: 
  - Cross-platform file watching with Python integration
  - Atomic file operation support
  - Efficient handling of large directory trees
  - Better integration with Python async/await patterns
- **Configuration**: Event-based monitoring with file pattern filtering
- **Alternatives Considered**: Node.js chokidar, Python polling, inotify

### 3. Queue System

#### **Redis + Python AsyncIO**
- **Redis Version**: 7+ (Alpine)
- **Purpose**: Asynchronous job processing with retry logic
- **Rationale**:
  - Lightweight queue implementation with Python async
  - Built-in retry mechanisms (5 attempts)
  - Redis persistence for job durability
  - Simpler architecture without Node.js dependency
- **Configuration**: 
  - Async Python workers (5 concurrent)
  - Max retries: 5
  - Exponential backoff strategy
  - Initial delay: 2000ms
- **Services**: QueueService, SchedulerService
- **Alternatives Considered**: Celery, BullMQ, AWS SQS, RabbitMQ

### 4. Vector Database

#### **Qdrant**
- **Version**: Latest stable
- **Purpose**: Vector storage and similarity search
- **Rationale**:
  - Excellent performance for semantic search
  - RESTful API with TypeScript support
  - Efficient HNSW algorithm implementation
  - Docker-friendly deployment
  - Local-first architecture alignment
- **Configuration**:
  - HTTP port: 6333
  - gRPC port: 6334
  - Collections with cosine similarity
- **Alternatives Considered**: Weaviate, Pinecone, ChromaDB, pgvector

### 5. Embedding Generation

#### **Claude Code SDK**
- **Purpose**: Chat functionality and vector embeddings using Claude AI
- **Rationale**:
  - Unified AI platform for both chat and embeddings
  - High-quality embeddings optimized for document search
  - Seamless integration between chat and search functionality
  - Streaming response support for real-time chat
- **Requirements**: Claude Code SDK subscription (covers both chat and embeddings)
- **Fallback**: Local text search when API is unavailable
- **Configuration**: 
  - Model: claude-3-5-sonnet-20241022
  - Max tokens: 4096 (chat), 8191 (embeddings)
  - Chunking strategy for large documents
  - Timeout: 30 seconds
- **Alternatives Considered**: OpenAI, Cohere, Hugging Face transformers, local models

### 6. Frontend Stack

#### **React 18 + Custom Hooks**
- **Version**: 18.2+
- **Purpose**: User interface framework with state management
- **Rationale**:
  - Component-based architecture
  - Excellent ecosystem for complex UIs
  - Strong TypeScript integration
  - SSE support for real-time chat
  - Custom hooks for clean state management
- **Custom Hooks Implemented**:
  - `useUrlNavigation`: History API integration for browser navigation
  - URL state synchronization with file selection
  - Browser back/forward button support

#### **shadcn/ui + Tailwind CSS**
- **shadcn/ui**: Latest (copy-paste components)
- **Tailwind CSS**: 3.4+
- **Purpose**: CSS-free component development
- **Components Used**:
  - Radix UI primitives for accessibility
  - `lucide-react` for icons
  - `class-variance-authority` for component variants
  - `tailwind-merge` for class optimization
- **Rationale**:
  - **Zero CSS Maintenance**: Copy-paste components eliminate custom CSS
  - **Component Ownership**: Full control over component code
  - **Tailwind Integration**: Utility-first approach reduces styling overhead
  - **2025 Trendy**: Most popular approach for modern React development
  - **AI-Friendly**: LLMs can easily generate shadcn/ui code
- **Key Benefits**:
  - No CSS files to maintain
  - Copy components directly into codebase
  - Tailwind utilities handle all styling
  - Built-in accessibility via Radix UI
  - Dark mode support out of the box

#### **Vite**
- **Version**: 5.0+
- **Purpose**: Build tool and development server
- **Rationale**:
  - Fast development builds
  - Excellent TypeScript support
  - Modern ES modules handling
  - Optimized production builds

### 7. Markdown Processing

#### **react-markdown**
- **Version**: 9.0+
- **Purpose**: Markdown rendering in React
- **Extensions**:
  - `remark-gfm` for GitHub Flavored Markdown
  - `rehype-highlight` for syntax highlighting
- **Rationale**:
  - React-native implementation
  - Extensible plugin system
  - Good performance for large documents

### 7.1. Browser Navigation

#### **History API Integration**
- **Purpose**: URL-based state management for SPA navigation
- **Implementation**: Custom `useUrlNavigation` React hook
- **Features**:
  - File selection persistence in URL query parameters
  - Browser back/forward button support
  - Bookmarkable and shareable URLs
  - State synchronization between URL and React state
- **Rationale**:
  - Native browser navigation experience in SPA
  - Better UX with URL sharing and bookmarking
  - No additional routing library needed for simple file navigation
- **URL Format**: `?file=path/to/document.md` with proper URL encoding
- **Alternatives Considered**: React Router, Reach Router, hash-based routing

### 8. Development Tools

#### **TypeScript Configuration**
- **Server**: CommonJS modules, Node.js target
- **Client**: ESNext modules, DOM libraries
- **Shared**: Path mapping for clean imports

#### **Testing Stack**
- **pytest**: Python test runner and framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **httpx**: HTTP client for API testing
- **Coverage**: 80%+ coverage requirement with HTML reports

#### **Code Quality**
- **Python**: ruff (linting + formatting), mypy (type checking)
- **TypeScript**: ESLint, Prettier
- **Git Hooks**: Future consideration with pre-commit

### 9. Infrastructure

#### **Docker Compose**
- **Services**:
  - Redis (persistent storage)
  - Qdrant (vector database)
  - Application (development)
- **Rationale**: One-command development environment

#### **Environment Management**
- **dotenv**: Environment variable loading
- **Validation**: Runtime environment validation
- **Security**: No secrets in code/commits

## Performance Considerations

### 1. Embedding Generation
- **Batch Processing**: Multiple files per API call
- **Caching**: Avoid re-generating unchanged content
- **Rate Limiting**: Respect Claude Code SDK API limits

### 2. Vector Search
- **Index Optimization**: Proper HNSW configuration
- **Query Optimization**: Efficient similarity queries
- **Memory Usage**: Monitor Qdrant memory consumption

### 3. File Watching
- **Debouncing**: Avoid excessive file system events
- **Selective Watching**: Only monitor `.md` files
- **Memory Efficiency**: Proper cleanup of watchers

## Security Considerations

### 1. API Security
- **Rate Limiting**: Express rate limiting middleware
- **CORS**: Proper origin configuration
- **Helmet**: Security headers

### 2. Data Privacy
- **Local Processing**: No data leaves local environment
- **API Keys**: Secure storage in environment variables
- **Logging**: No sensitive data in logs

### 3. Input Validation
- **File Paths**: Sanitize file system operations
- **User Input**: Validate chat inputs
- **API Responses**: Validate external API responses

## Deployment Strategy

### Development
- Local development with Docker Compose
- Hot reloading for both frontend and backend
- Separate package.json for frontend/backend

### Production (Future)
- Docker multi-stage builds
- Environment-specific configurations
- Health checks and monitoring

## Future Considerations

### Potential Upgrades
- **Local LLM**: Add local models as additional fallback
- **Advanced Search**: Enhanced hybrid search algorithms
- **Monitoring**: Prometheus/Grafana integration
- **MCP Integration**: Tool integration for external LLMs

### Scalability
- **Horizontal Scaling**: Multiple worker processes
- **Database Sharding**: Qdrant collection partitioning
- **Caching Layers**: Redis caching for frequent queries

## Decision Log

| Decision | Date | Rationale | Alternatives |
|----------|------|-----------|--------------|
| Python over Node.js | 2025-01-26 | Better AI/ML ecosystem, FastAPI performance | Node.js Express |
| Qdrant over ChromaDB | 2025-07-26 | Better performance, Docker support | ChromaDB, Weaviate |
| Redis queues over BullMQ | 2025-01-26 | Simpler Python integration, async support | BullMQ, Celery, AWS SQS |
| FastAPI over Django | 2025-01-26 | Better async performance, automatic OpenAPI docs | Django, Flask, Starlette |
| uv over pip/poetry | 2025-01-26 | Faster dependency resolution, modern Python tooling | pip, poetry, pipenv |
| pytest over unittest | 2025-01-26 | Better async support, fixture system, plugins | unittest, nose2 |
| shadcn/ui over Mantine/MUI | 2025-07-26 | CSS-free development, component ownership, Tailwind integration | Mantine, Chakra UI, NextUI |
| Vite over Webpack | 2025-07-26 | Faster development builds | Create React App |
| Claude Code SDK over OpenAI | 2025-07-26 | Unified AI platform, subscription model, better integration | OpenAI API, local models |
| History API over React Router | 2025-01-26 | Simple navigation needs, no routing complexity | React Router, hash routing |
| Custom hooks over context | 2025-01-26 | Better performance, cleaner state management | React Context, Zustand |

---

*Last Updated: 2025-01-26*
*Next Review: When adding new major dependencies*