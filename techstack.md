# Technology Stack Documentation

## Overview

This document outlines the technology stack selection for the **Local DocSearch & Chat Assistant** system, including rationale for each choice and alternatives considered.

## Architecture Components

### 1. Backend Stack

#### **Node.js + TypeScript**
- **Version**: Node.js 18+ with TypeScript 5.3+
- **Rationale**: 
  - Excellent file system monitoring capabilities
  - Large ecosystem for text processing and AI integrations
  - Strong async/await support for concurrent operations
  - TypeScript provides type safety for complex data flows
- **Alternatives Considered**: Python (FastAPI), Go, Rust
- **Decision Factors**: JavaScript ecosystem maturity for file watching and AI APIs

#### **Express.js**
- **Version**: 4.18+
- **Purpose**: Web framework and API server
- **Rationale**: Lightweight, well-established, excellent middleware ecosystem
- **Key Middleware**: 
  - `cors` for cross-origin requests
  - `helmet` for security headers
  - `express-rate-limit` for API protection

### 2. File System Monitoring

#### **Chokidar**
- **Version**: 3.5+
- **Purpose**: Markdown file change detection
- **Rationale**: 
  - Cross-platform file watching
  - Atomic file operation support
  - Efficient handling of large directory trees
  - Proven reliability in production systems
- **Configuration**: `atomic: true`, `ignoreInitial: false`
- **Alternatives Considered**: Node.js native `fs.watch`, `nodemon`

### 3. Queue System

#### **BullMQ + Redis**
- **BullMQ Version**: 4.15+
- **Redis Version**: 7+ (Alpine)
- **Purpose**: Asynchronous job processing with retry logic
- **Rationale**:
  - Robust job queuing with exponential backoff
  - Built-in retry mechanisms (5 attempts)
  - Job progress tracking and monitoring
  - Redis persistence for job durability
- **Configuration**: 
  - Concurrency: 5 workers
  - Max attempts: 5
  - Exponential backoff strategy
- **Alternatives Considered**: Agenda.js, AWS SQS, RabbitMQ

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
- **Purpose**: Convert text to vector embeddings using Claude AI
- **Rationale**:
  - Integrated with Claude AI for consistent semantic understanding
  - No separate API subscription needed (included with Claude Code SDK)
  - High-quality embeddings optimized for document search
  - Seamless integration with chat functionality
- **Requirements**: Claude Code SDK subscription
- **Fallback**: Local text search when API is unavailable
- **Configuration**: 
  - Max tokens: 8191
  - Chunking strategy for large documents
  - Semantic summary-based embedding generation
- **Alternatives Considered**: OpenAI, Cohere, Hugging Face transformers, local models

### 6. Frontend Stack

#### **React 18**
- **Version**: 18.2+
- **Purpose**: User interface framework
- **Rationale**:
  - Component-based architecture
  - Excellent ecosystem for complex UIs
  - Strong TypeScript integration
  - SSE support for real-time chat

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

### 8. Development Tools

#### **TypeScript Configuration**
- **Server**: CommonJS modules, Node.js target
- **Client**: ESNext modules, DOM libraries
- **Shared**: Path mapping for clean imports

#### **Testing Stack**
- **Jest**: Test runner and framework
- **ts-jest**: TypeScript integration
- **Coverage**: Server-side code coverage

#### **Code Quality**
- **ESLint**: TypeScript-aware linting
- **Prettier**: Code formatting (if needed)
- **Husky**: Git hooks (future consideration)

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
| Node.js over Python | 2025-07-26 | Better file watching ecosystem | Python FastAPI |
| Qdrant over ChromaDB | 2025-07-26 | Better performance, Docker support | ChromaDB, Weaviate |
| BullMQ over native queues | 2025-07-26 | Robust retry mechanisms | Agenda.js, AWS SQS |
| shadcn/ui over Mantine/MUI | 2025-07-26 | CSS-free development, component ownership, Tailwind integration | Mantine, Chakra UI, NextUI |
| Vite over Webpack | 2025-07-26 | Faster development builds | Create React App |
| Claude Code SDK over OpenAI | 2025-07-26 | Unified AI platform, subscription model, better integration | OpenAI API, local models |

---

*Last Updated: 2025-07-26*
*Next Review: When adding new major dependencies*