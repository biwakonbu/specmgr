# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Local DocSearch & Chat Assistant** - A system for managing Git-local Markdown documents with hybrid search (text + vector) and Claude Code SDK integration

### Documentation References
- **Technical Stack**: See @techstack.md for comprehensive technology selection rationale and architecture decisions
- **Product Requirements**: See @PRD.md for detailed functional and non-functional requirements

### Architecture
- **File Watcher (Python)**: Markdown file change monitoring with watchdog
- **Text Search Engine**: Local full-text search with relevance scoring
- **Claude Code SDK**: Chat functionality with document context
- **React UI**: Three-pane resizable layout with URL-based navigation
- **History API Integration**: Browser-native navigation with state persistence

### Tech Stack
- Backend: Python + FastAPI + AsyncIO
- Frontend: React + shadcn/ui + Tailwind CSS + react-markdown
- Search: Hybrid search system (Local text search + Qdrant vector search)
- Embeddings: Claude Code SDK for semantic embeddings (subscription required)
- Chat: Claude Code SDK Python for streaming responses (subscription required)
- Vector Database: Qdrant for semantic search
- Queue: Redis for async processing
- File Watching: watchdog (Python)
- Streaming: SSE (Server-Sent Events)
- **Oracle CLI**: F# with .NET 9.0 for specification management and bidirectional verification
  - **Purpose**: Prevent AI development agents from deviating from specifications
  - **Core Features**: 
    - Natural language specification search using RAG
    - Bidirectional verification (spec→code AND code→spec)
    - AI-powered implementation compliance checking
    - Specification generation from code analysis
  - **Architecture**: Functional programming with immutable types and pattern matching
  - **Type System**: Set-theoretic type constraints with transformations and validations
  - **Integration**: HTTP client to existing Python FastAPI endpoints via JSON serialization
  - **Test Framework**: xUnit with F# support
  - **Mocking**: NSubstitute for service mocks  
  - **Property Testing**: FsCheck for property-based testing
  - **Test Data**: Bogus for test data generation
  - **HTTP Testing**: Microsoft.AspNetCore.Mvc.Testing for API integration
  - **Logging**: Serilog for structured logging

## Development Guidelines

### Synchronization Flow Implementation Principles
1. **File Change Detection**: watchdog (Python) monitors Markdown files in real-time
2. **SHA-1 Manifest System**: `.specmgr-manifest.json` tracks file hashes for differential sync
3. **Differential Processing**: Only process changed, added, or deleted files (97%+ DB load reduction)
4. **Asynchronous Queue**: Redis queue with auto-retry (5 attempts, exponential backoff)
5. **Embedding Generation**: Claude Code SDK for semantic vectors (subscription required)
6. **Database Indexing**: Store in both Qdrant vector DB and text search index
7. **Atomic Manifest Updates**: Update manifest only after successful processing
8. **Force Sync Option**: `force=true` bypasses manifest for full re-sync

### UI Layout Specifications
- Left Pane (20%): DocTree (File tree + shadcn/ui) - Resizable (10-40%)
- Center Pane (55%): MarkdownPane (react-markdown + Enhanced Mermaid) - Auto-adjusts
- Right Pane (25%): ChatPane (LLM Q&A + SSE) - Resizable (15-50%)
- Drag handles between panes for user customization

### Enhanced Mermaid Diagram Rendering
- **Nord Dark Theme**: Complete integration with 140+ color variables
- **Animated Edges**: Flowing light effects along connection paths
- **Smart Edge Coloring**: 
  - Flowcharts: Source node type-based coloring (Frontend=Blue, API=Cyan, Services=Teal, etc.)
  - Sequence diagrams: Consistent golden edges with distinct actor styling
  - Automatic fallback for other diagram types
- **Visual Enhancements**:
  - Subgraph padding and styling
  - Professional drop shadows and glow effects
  - Optimized edge thickness and dash patterns
  - High-performance animations (0.8s linear infinite)
- **URL Navigation**: Browser History API integration for file selection state
- **Chat UI**: Compact design with 12px base font, enlarged 8x8px avatars, 98% message width

### CSS-Free Development Approach
- **shadcn/ui**: Copy-paste components with Tailwind CSS - no custom CSS needed
- **Radix UI**: Unstyled, accessible components as foundation
- **Tailwind CSS**: Utility-first styling - minimal CSS maintenance required

### Performance Requirements
- Vector search response: < 1.5 seconds (95th percentile)
- Text search fallback: < 0.5 seconds 
- Sync job success rate: 99%+
- Single file change reflection: < 5 seconds (including embedding generation)
- **Differential sync efficiency**: 97%+ reduction in DB operations for unchanged files
- **Manifest operations**: < 50ms for file change detection (JSON-based)

### Security Policy
- Local environment only operation
- External communication limited to Claude Code SDK API (TLS required)
- Prohibition of confidential information external transmission
- API key stored securely in environment variables

## Milestone Progress

Current Stage: **📊 MANIFEST OPTIMIZATION** - High-Performance Differential Sync with DB Load Reduction

1. **M1**: ✅ Sync Agent + manifest + queue implementation (Redis + SHA-1 differential sync)
2. **M2**: ✅ Search API + RAG functionality (Hybrid search + Claude Code SDK)
3. **M3**: ✅ React UI DocTree/Markdown display with resizable panes
4. **M4**: ✅ ChatPane streaming functionality (SSE + real-time responses)
5. **M5**: ✅ Backoff and retry monitoring (Redis exponential backoff)
6. **M6**: ✅ Comprehensive error detection system with TypeScript strict mode
7. **M7**: ✅ TypeScript compilation and lint error resolution
8. **M8**: ✅ URL-based navigation with History API integration
9. **M9**: ✅ Chat UI optimization (compact design, improved spacing)

## Oracle System - Specification Management

### Overview
Oracle is a specification management and validation system designed to prevent AI development agents from deviating from specifications or manipulating tests. It enforces ubiquitous language in code naming and ensures implementations match their specifications.

### Implementation Architecture
Oracle is implemented as an F# CLI tool located in `src/cli/`, providing a functional programming approach to specification management and verification.

### Project Structure
```
src/cli/
├── oracle-cli.sln                # Solution file
├── OracleCli.Core/               # Core types and domain models
│   ├── Types.fs                  # Domain types (SpecificationPath, CodePath, Query)
│   └── Domain.fs                 # Business logic types
├── OracleCli.Services/           # External service integrations
│   ├── SearchService.fs          # RAG search integration
│   ├── VerificationService.fs    # AI-based verification
│   └── SpecMgrBridge.fs          # Integration with existing system
├── OracleCli.Commands/           # Command handling and parsing
│   ├── CommandTypes.fs           # Command definitions (OracleCommand DU)
│   ├── CommandHandler.fs         # Command execution logic
│   └── CommandParser.fs          # CLI argument parsing
├── OracleCli/                    # CLI entry point
│   ├── Program.fs                # Main entry point
│   └── Configuration.fs          # Configuration management
└── OracleCli.Tests/              # Unit and integration tests
    ├── CommandParserTests.fs
    ├── TypeValidationTests.fs
    └── ServiceIntegrationTests.fs
```

### Key Features
- **Bidirectional Verification**: Check spec→code AND code→spec relationships
- **Real-time Monitoring**: Watch code changes for specification compliance
- **Natural Language Search**: Find specs using everyday language via RAG
- **AI Guardian**: Monitor and prevent AI-generated code violations
- **Ubiquitous Language Enforcement**: Validates naming conventions
- **Type Constraint Validation**: Set-theoretic type system with guarantees
- **Integration**: HTTP client to existing Python FastAPI endpoints

### Document Structure (v2 - Natural Language Approach)
```
specifications/
├── features/           # User-facing features organized by domain
│   ├── user-management/
│   │   ├── registration.yaml
│   │   ├── login.yaml
│   │   └── password-reset.yaml
│   ├── e-commerce/
│   │   ├── shopping-cart.yaml
│   │   └── checkout.yaml
│   └── messaging/
│       └── notifications.yaml
├── technical/         # Technical specifications
│   ├── infrastructure/
│   ├── security/
│   └── performance/
├── domain/           # Domain models and business rules
│   ├── user.yaml
│   ├── order.yaml
│   └── product.yaml
└── shared/          # Shared types and validators
    └── types/
```

### SDD YAML Format (v2 - ID-Free)
Oracle uses a simplified, natural language-first approach:
- **No IDs**: File paths serve as unique identifiers
- **Natural Search**: Find specs using everyday language
- **Tags & Keywords**: Enhanced discoverability
- **Simple References**: Use relative file paths

For the new simplified format, see [SDD YAML Format v2](docs/technical-docs/sdd-yaml-format-v2.md).
For the complete specification format, see [Specification Format v2](docs/technical-docs/specification-format-v2.md).

### Operational Documents
- **Naming Rules**: [Naming and File Placement Rules](docs/technical-docs/naming-and-file-placement-rules.md)
- **Operation Flow**: [Specification Operation Flow](docs/technical-docs/specification-operation-flow.md)
- **Type Theory**: [Type System Theory](docs/technical-docs/type-system-theory.md)
- **Bidirectional Verification**: [Bidirectional Verification System](docs/technical-docs/bidirectional-verification-system.md)
- **Format v2**: [Specification Format v2](docs/technical-docs/specification-format-v2.md)
- **F# CLI Design**: [Oracle F# CLI Design](docs/technical-docs/oracle-fsharp-cli-design.md)
- **CLI Implementation Memory**: See `src/cli/ORACLE.md` for detailed implementation specifications

### Type Constraint System
Oracle enforces a comprehensive set-theoretic type system including:
- **Set-based definitions**: Types as sets with subset/superset relationships
- **Type transformations**: Filters that convert between types with guarantees
- **Union/Intersection types**: Algebraic type composition
- **Refinement types**: Types refined by predicates
- **Value constraints**: required, immutable, unique
- **Domain constraints**: patterns, formats, ranges
- **Business rule constraints**: Complex cross-field validations

For theoretical foundation, see [Type System Theory](docs/technical-docs/type-system-theory.md).

### Oracle Commands (v2 - Natural Language)
```bash
# Natural language specification search
oracle find-spec "user registration"
oracle ask "How does email verification work?"

# Implementation compliance checking
oracle check src/auth/registration.py --spec features/user-management/registration.yaml

# Specification display and management
oracle show features/user-management/registration.yaml
oracle list --tag authentication

# Specification generation from code
oracle generate-spec src/auth/registration.py

# Real-time monitoring
oracle watch src/auth/registration.py

# Help and usage information
oracle help
```

## Implementation Notes

### Backend Services Architecture
- **SearchService**: Hybrid search service combining vector and text search with intelligent fallback
- **ChatService**: Claude Code SDK chat service with streaming responses and RAG context
- **FileService**: File system operations for markdown files with metadata extraction
- **EmbeddingService**: Claude Code SDK integration for semantic embeddings (subscription required)
- **QdrantService**: Vector database operations for semantic search
- **FileWatcherService**: Real-time file monitoring with watchdog (Python)
- **QueueService**: Redis-based async job processing with retry logic
- **SchedulerService**: Background task scheduling and management
- **HealthService**: System health monitoring and status checks
- **SyncService**: Document synchronization with differential sync and manifest management
- **ManifestService**: SHA-1 based file change tracking and manifest management

### Frontend Architecture

#### Enhanced Mermaid Diagram Rendering
- **Nord Dark Theme Integration**: Complete Nord color palette (Nord0-Nord15) with 140+ semantic color variables
- **Animated Edge Effects**: Flowing light animations on diagram edges with golden accents
- **Node Type Coloring**: Semantic coloring based on node types (Frontend, Backend, Service, Database, etc.)
- **Diagram Type Detection**: Conditional styling for flowcharts, sequence diagrams, and other diagram types
- **CSS-in-JS Implementation**: Runtime style injection without FOUC (Flash of Unstyled Content)
- **Class-Based Edge Coloring**: Edge colors inherit from source node groups using CSS class patterns (LS-/LE-)

#### React Component Architecture
- **ChatPane** (`src/client/src/components/ChatPane.tsx`)
  - SSE-based real-time chat streaming
  - Markdown rendering with syntax highlighting
  - Search command integration (`/search`)
  - Message history management with avatars
  - Compact UI design (12px base font, 8x8px avatars)
  
- **DocTree** (`src/client/src/components/DocTree.tsx`)
  - Hierarchical file tree visualization
  - Lazy loading for performance
  - File metadata display (size, type)
  - Keyboard navigation support
  - PATH-based collision prevention
  
- **MarkdownPane** (`src/client/src/components/MarkdownPane.tsx`)
  - Advanced Mermaid diagram support with animations
  - GitHub Flavored Markdown rendering
  - Code syntax highlighting
  - Resizable pane with drag handles
  - Comprehensive node name mapping for architecture diagrams

#### Custom Hooks
- **useUrlNavigation**: History API integration for browser-native navigation

### Search Processing
- **Real-time monitoring**: watchdog file watcher detects changes instantly
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

### Manifest-Based Differential Sync System

#### SHA-1 Manifest Implementation
- **Manifest File**: `.specmgr-manifest.json` in docs directory
- **File Tracking**: SHA-1 hash of each Markdown file for change detection
- **JSON Structure**: `{"files": {"path/to/file.md": "sha1hash"}, "last_updated": "ISO8601"}`
- **Atomic Updates**: Manifest updated only after successful DB operations

#### Differential Sync Process
1. **Hash Calculation**: Generate SHA-1 for all current Markdown files
2. **Change Detection**: Compare with manifest to identify:
   - **Added files**: New files not in manifest
   - **Modified files**: Files with different SHA-1 hashes
   - **Deleted files**: Files in manifest but not on filesystem
3. **Selective Processing**: Only process changed files (97%+ DB load reduction)
4. **Manifest Update**: Update hashes after successful processing

#### Performance Benefits
- **Before**: 100 files → 100 DB operations (every sync)
- **After**: 3 changed files → 3 DB operations (97% reduction)
- **Manifest Operations**: < 50ms for change detection
- **Memory Efficient**: Lightweight JSON-based tracking

#### Operational Features
- **Force Sync**: `force=true` bypasses manifest for complete re-indexing
- **Corruption Recovery**: Auto-reset to empty manifest on JSON corruption
- **Statistics**: Manifest size, file count, last update tracking
- **Clear Function**: Manual manifest reset for troubleshooting

#### FileWatcher Integration
- **Real-time Updates**: File changes trigger individual manifest updates
- **Queue Processing**: Changed files processed via Redis queue
- **Debouncing**: Prevent duplicate processing with 1-second cooldown

### Error Handling & Quality Assurance
- **Comprehensive Error Detection**: TypeScript strict mode with comprehensive static analysis
- **Import/Export Validation**: Circular dependency detection and missing file checks
- **Real-time Error Monitoring**: TypeScript, Biome lint, and syntax validation
- **pnpm Workspace Integration**: Multi-package error checking across client and server
- **Automated Validation Pipeline**: Complete project validation with single commands
- **Manifest Error Handling**: Graceful recovery from corrupted manifest files
- **File Hash Failures**: Continue processing with warnings for unreadable files
- **Atomic Operations**: Rollback manifest updates on sync failures
- Exponential backoff retry on Redis queue job failures
- Auto-recovery functionality during network outages
- Logging and monitoring for sync failures

### URL Navigation & State Management
- **History API Integration**: Seamless browser navigation without page reloads
- **URL State Persistence**: File selection preserved in URL query parameters (`?file=path`)
- **Browser Navigation**: Back/forward buttons work naturally with file selection
- **Bookmarkable URLs**: Direct file access via URL sharing
- **State Synchronization**: Automatic sync between URL state and application state

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
- **Claude Code SDK Subscription** (required for chat and embedding functionality)
- Redis (for queue processing)
- Qdrant (for vector search)

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
# - ANTHROPIC_API_KEY for Claude Code SDK (subscription required for chat and embeddings)
# - QDRANT_HOST, QDRANT_PORT for vector database connection
# - REDIS_HOST, REDIS_PORT for queue processing

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
uv run python main.py        # Start FastAPI server (http://localhost:3000)
uv run pytest               # Run all tests (unit/integration/e2e)
uv run pytest tests/unit/   # Run unit tests only
uv run pytest tests/integration/  # Run integration tests only
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

## Document Structure

### 5-Layer Specification Hierarchy
The project uses a 5-layer document structure for specifications:

```
docs/
├── specifications/              # All project specifications
│   ├── requirements/           # User requirements (what users need)
│   ├── domain-features/        # Business features (domain functionality)
│   ├── system-features/        # Technical features (infrastructure)
│   ├── system-design/          # Architecture and design decisions
│   └── components/             # Implementation specifications
│
└── technical-docs/             # Non-specification documentation
    ├── api/                    # API documentation
    ├── architecture/           # System architecture docs
    ├── development/            # Development guides
    └── testing/                # Test documentation
```

### Specification Classification Guidelines

**Domain Features** (`domain-features/`):
- Business logic and domain-specific functionality
- Core domain operations and workflows
- Domain rules and constraints
- Examples: User management, Order processing, Payment handling
- Oracle CLI domain functions: Specification status query, Lifecycle management, Document integrity verification, Digital signing

**System Features** (`system-features/`):
- Technical infrastructure and system-level capabilities
- User interfaces (CLI, Web UI, API interfaces)
- System integration points and protocols
- Technical constraints and non-functional requirements
- Examples: Authentication system, Caching strategy, API endpoints
- Oracle CLI system functions: Command-line interface design, Command options and arguments, Output formats

**Key Distinction**: Domain features focus on WHAT the system does (business capabilities), while system features focus on HOW the system provides those capabilities (technical implementation).

### Oracle System
Oracle is the specification management system that:
- Validates specifications against implementations
- Enforces ubiquitous language in naming conventions
- Prevents unauthorized specification changes via HMAC signatures
- Provides AI-driven specification queries using Claude Code SDK

Oracle specifications are integrated into the main specification structure as part of the specmgr system.

## Language and Interaction Guidelines

### Language Interaction Principles
- **Conversations**: Use the language the user speaks (adapt to their preferred language)
- **Documentation**: Always write in English (including GitHub issues, comments, commit messages, code comments, docstrings)
- **Code**: Use English for variable names, function names, and all code-related identifiers
- **Project Memory**: All project documentation and technical specifications in English
