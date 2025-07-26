# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Local DocSearch & Chat Assistant** - A system for managing Git-local Markdown documents with hybrid search (text + vector) and Claude Code SDK integration

### Documentation References
- **Technical Stack**: See @techstack.md for comprehensive technology selection rationale and architecture decisions
- **Product Requirements**: See @PRD.md for detailed functional and non-functional requirements

### Architecture
- **File Watcher (Node.js)**: Markdown file change monitoring with chokidar
- **Text Search Engine**: Local full-text search with relevance scoring
- **Claude Code SDK**: Chat functionality with document context
- **React UI**: Three-pane layout with DocTree, MarkdownPreview, and ChatPane

### Tech Stack
- Backend: Python + FastAPI + AsyncIO
- Frontend: React + shadcn/ui + Tailwind CSS + react-markdown
- Search: Hybrid search system (Local text search + Qdrant vector search)
- Embeddings: Voyage AI for semantic embeddings (subscription required)
- Chat: Claude Code SDK Python for streaming responses (subscription required)
- Vector Database: Qdrant for semantic search
- Queue: Redis for async processing
- File Watching: watchdog (Python)
- Streaming: SSE (Server-Sent Events)

## Development Guidelines

### Synchronization Flow Implementation Principles
1. Detect Markdown file changes with chokidar
2. SHA-1 based manifest for differential detection
3. Asynchronous processing with BullMQ (auto-retry: 5 times, exponential backoff)
4. Generate embeddings using Claude Code SDK (requires subscription)
5. Index documents in both text search and Qdrant vector database
6. Update manifest only on success

### UI Layout Specifications
- Left Pane (20%): DocTree (Radix Tree + shadcn/ui) - Resizable (10-40%)
- Center Pane (55%): MarkdownPane (react-markdown) - Auto-adjusts
- Right Pane (25%): ChatPane (LLM Q&A + SSE) - Resizable (15-50%)
- Drag handles between panes for user customization

### CSS-Free Development Approach
- **shadcn/ui**: Copy-paste components with Tailwind CSS - no custom CSS needed
- **Radix UI**: Unstyled, accessible components as foundation
- **Tailwind CSS**: Utility-first styling - minimal CSS maintenance required

### Performance Requirements
- Vector search response: < 1.5 seconds (95th percentile)
- Text search fallback: < 0.5 seconds 
- Sync job success rate: 99%+
- Single file change reflection: < 5 seconds (including embedding generation)

### Security Policy
- Local environment only operation
- External communication limited to Claude Code SDK API (TLS required)
- Prohibition of confidential information external transmission
- API key stored securely in environment variables

## Milestone Progress

Current Stage: **🔧 ERROR DETECTION & QUALITY ASSURANCE** - Comprehensive Error Checking System Operational

1. **M1**: ✅ Sync Agent + manifest + queue implementation (BullMQ + Redis + SHA-1)
2. **M2**: ✅ Search API + RAG functionality (Hybrid search + Claude Code SDK)
3. **M3**: ✅ React UI DocTree/Markdown display with resizable panes
4. **M4**: ✅ ChatPane streaming functionality (SSE + real-time responses)
5. **M5**: ✅ Backoff and retry monitoring (BullMQ exponential backoff)
6. **M6**: ✅ Comprehensive error detection system with TypeScript strict mode
7. **M7**: 🔄 TypeScript compilation error fixes (in progress)

## Implementation Notes

### Backend Services Architecture
- **TextSearchService**: Local full-text search with relevance scoring and snippet extraction
- **EmbeddingService**: Claude Code SDK integration for semantic embeddings (subscription required)
- **SearchService**: Hybrid search combining text and vector search with intelligent fallback
- **ChatService**: Claude Code SDK integration for chat with document context (subscription required)
- **QdrantService**: Vector database operations for semantic search
- **FileService**: File system operations for markdown files
- **FileWatcher**: Real-time file monitoring with chokidar

### Search Processing
- **Real-time monitoring**: chokidar file watcher detects changes instantly
- **Hybrid search system**: 
  - **Primary**: Vector search using Claude Code SDK embeddings (semantic similarity)
  - **Fallback**: Local text search with relevance scoring (keyword matching)
- **Text search scoring** based on:
  - Exact phrase matches (highest weight)
  - Filename matches (high weight) 
  - Header matches (medium weight)
  - Word matches (standard weight)
- **Vector search features**:
  - Semantic similarity using Claude Code SDK embeddings
  - Qdrant vector database for fast similarity search
  - Automatic fallback to text search on API failures
- **Context extraction**: Automatic snippet generation around matches
- **Relevance scoring**: Normalized 0-1 score with multiple factors

### Error Handling & Quality Assurance
- **Comprehensive Error Detection**: TypeScript strict mode with comprehensive static analysis
- **Import/Export Validation**: Circular dependency detection and missing file checks
- **Real-time Error Monitoring**: TypeScript, Biome lint, and syntax validation
- **pnpm Workspace Integration**: Multi-package error checking across client and server
- **Automated Validation Pipeline**: Complete project validation with single commands
- Exponential backoff retry on BullMQ job failures
- Auto-recovery functionality during network outages
- Logging and monitoring for sync failures

### Docker Configuration
- Design for one-command startup with Docker Compose
- Container inter-communication setup for development environment

## Development Commands

### Prerequisites
- Python 3.12+
- uv (Python package manager)
- Node.js 18.0.0+ (for client)
- pnpm 8.0.0+ (for client workspace)
- Docker & Docker Compose
- **Claude Code SDK Subscription** (required for chat functionality)
- **Voyage AI API Key** (required for embeddings)

### Python Environment Setup
```bash
# Server setup with uv
cd src/server
uv python install 3.12  # Install Python 3.12
uv venv                  # Create virtual environment
uv sync                  # Install dependencies
```

### Full Project Setup
```bash
# Install client dependencies (pnpm required)
pnpm install

# Copy environment configuration (REQUIRED)
cp .env.example .env
# Edit .env and set:
# - ANTHROPIC_API_KEY for Claude Code SDK (subscription required)
# - VOYAGE_API_KEY for Voyage AI embeddings (subscription required)

# Start Docker services (Redis + Qdrant)
pnpm docker:up

# Start development servers 
pnpm dev
```

### Build & Test
```bash
# Build client
pnpm build

# Run tests
cd src/server && uv run pytest  # Python tests
pnpm -r test                    # Client tests

# Lint and type checking
cd src/server && uv run ruff check  # Python linting
cd src/server && uv run mypy .      # Python type checking
pnpm lint                           # Client linting
pnpm typecheck                      # Client type checking
```

### Python Development Commands
```bash
# Server development
cd src/server
uv run python main.py        # Start FastAPI server
uv run pytest               # Run tests
uv run ruff check           # Lint check
uv run ruff format          # Format code
uv run mypy .               # Type checking
```

### Client Development Commands
```bash
# Frontend development
pnpm --filter specmgr-client dev
pnpm --filter specmgr-client build
pnpm --filter specmgr-client test
```

### Docker Management
```bash
# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs
```

## Project Structure

```
├── src/
│   ├── client/          # React frontend (pnpm workspace)
│   │   ├── src/
│   │   │   ├── components/  # React components (shadcn/ui + Tailwind)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utility functions
│   │   │   ├── services/    # API client services
│   │   │   └── types/       # TypeScript definitions
│   │   └── package.json     # Client dependencies
│   ├── server/          # Python FastAPI backend
│   │   ├── app/         # FastAPI application
│   │   │   ├── api/     # API routes and endpoints
│   │   │   ├── core/    # Core configuration
│   │   │   ├── models/  # Pydantic models
│   │   │   ├── services/ # Business logic services
│   │   │   └── utils/   # Utility functions
│   │   ├── tests/       # Python tests
│   │   ├── main.py      # FastAPI application entry point
│   │   ├── pyproject.toml # Python dependencies and config
│   │   └── .python-version # Python version specification
│   └── shared/          # Shared utilities and types
├── docs/                # Project documentation
│   ├── sync/           # Synchronization specifications
│   ├── api/            # API documentation
│   └── architecture/   # System architecture docs
├── pnpm-workspace.yaml  # pnpm workspace configuration
├── CLAUDE.md           # Project memory and guidelines
├── techstack.md        # Technology stack documentation
├── PRD.md              # Product requirements document
└── package.json         # Root workspace configuration
```

## Development Principles

### Python Environment Management
- **Python Version**: 3.12+ (specified in `.python-version`)
- **Package Manager**: uv (modern, fast Python package manager)
- **Virtual Environment**: Managed by uv (`uv venv`, `uv sync`)
- **Dependencies**: Defined in `pyproject.toml` with proper version constraints
- **Development Dependencies**: Separate dev group for testing and linting tools

### Python Development Workflow
1. **Environment Setup**: `uv venv` to create virtual environment
2. **Dependencies**: `uv sync` to install all dependencies
3. **Development**: `uv run python main.py` to start server
4. **Testing**: `uv run pytest` for test execution
5. **Linting**: `uv run ruff check` and `uv run ruff format`
6. **Type Checking**: `uv run mypy .` for static analysis

### Language and Documentation Guidelines
- Write all documentation, commits, comments, docstrings, and system messages in English

## Critical Development Standards

### Warning and Feedback Response Policy
**Always respond to warnings and feedback with sincere consideration - never force through resistance**

#### Core Principle: Respect System Feedback
When any system (pre-commit hooks, linters, tests, etc.) raises warnings or errors:
- **Listen carefully** to what the warning is communicating
- **Take time** to understand the underlying issue
- **Address the root cause** rather than bypassing symptoms
- **Never force through** when systems indicate problems

#### Lesson Learned (2025-01-26)
**Issue**: After implementing a comprehensive pre-commit warning system that clearly stated "These are NOT minor issues", immediately used `--no-verify` to bypass 127 lint errors without addressing them.

**Root Problem**: Failed to practice what was preached - ignored own implementation of quality standards.

**Key Insight**: Warnings exist for important reasons. When systems push back, it's usually because there's a legitimate concern that needs attention.

**Better Approach**: 
- When warnings appear, pause and truly listen
- Understand why the system is raising concerns
- Address issues systematically rather than bypassing them
- Recognize that "forcing through" often creates technical debt
- If bypass is necessary, ensure it's for valid reasons with user agreement

**Mindset**: Warnings are guidance from experienced developers embedded in tools - treat them as valuable input, not obstacles to overcome.

## Language and Interaction Guidelines

### Language Interaction Principles
- Claude Code will communicate in the language used by the user
- Programming-related discussions will be conducted in English
- Project memories and documentation will be written in English
- When interacting with users, adapt to their preferred language
