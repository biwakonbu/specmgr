# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Local DocSearch & Chat Assistant** - A system for managing Git-local Markdown documents with vector search and LLM chat capabilities

### Documentation References
- **Technical Stack**: See @techstack.md for comprehensive technology selection rationale and architecture decisions
- **Product Requirements**: See @PRD.md for detailed functional and non-functional requirements

### Architecture
- **File Watcher (Node.js)**: Markdown file change monitoring with chokidar
- **Text Search Engine**: Local full-text search with relevance scoring
- **Claude Code SDK**: Chat functionality with document context
- **React UI**: Three-pane layout with DocTree, MarkdownPreview, and ChatPane

### Tech Stack
- Backend: Node.js + Express + TypeScript
- Frontend: React + shadcn/ui + Tailwind CSS + react-markdown
- Search: Local text search with scoring algorithms
- Chat: Claude Code SDK with streaming responses
- File Watching: chokidar
- Streaming: SSE (Server-Sent Events)

## Development Guidelines

### Synchronization Flow Implementation Principles
1. Detect Markdown file changes with chokidar
2. SHA-1 based manifest for differential detection
3. Asynchronous processing with BullMQ (auto-retry: 5 times, exponential backoff)
4. Generate embeddings, then upsert/delete in Qdrant
5. Update manifest only on success

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
- Search response: < 1.5 seconds (95th percentile)
- Sync job success rate: 99%+
- Single file change reflection: < 2 seconds

### Security Policy
- Local environment only operation
- External communication limited to LLM API (TLS required)
- Prohibition of confidential information external transmission

## Milestone Progress

Current Stage: **🎉 DEVELOPMENT COMPLETE** - Full-Stack RAG System Operational

1. **M1**: ✅ Sync Agent + manifest + queue implementation (BullMQ + Redis + SHA-1)
2. **M2**: ✅ Search API + RAG functionality (Qdrant + OpenAI embeddings)
3. **M3**: ✅ React UI DocTree/Markdown display with resizable panes
4. **M4**: ✅ ChatPane streaming functionality (SSE + real-time responses)
5. **M5**: ✅ Backoff and retry monitoring (BullMQ exponential backoff)

## Implementation Notes

### Backend Services Architecture
- **TextSearchService**: Local full-text search with relevance scoring and snippet extraction
- **ClaudeCodeService**: Claude Code SDK integration for chat with document context
- **FileService**: File system operations for markdown files
- **FileWatcher**: Real-time file monitoring with chokidar

### Search Processing
- **Real-time monitoring**: chokidar file watcher detects changes instantly
- **Text-based search**: Full-text search with scoring based on:
  - Exact phrase matches (highest weight)
  - Filename matches (high weight) 
  - Header matches (medium weight)
  - Word matches (standard weight)
- **Context extraction**: Automatic snippet generation around matches
- **Relevance scoring**: Normalized 0-1 score with multiple factors

### Error Handling
- Exponential backoff retry on BullMQ job failures
- Auto-recovery functionality during network outages
- Logging and monitoring for sync failures

### Docker Configuration
- Design for one-command startup with Docker Compose
- Container inter-communication setup for development environment

## Development Commands

**IMPORTANT**: This project uses **pnpm** for workspace management. npm will not work correctly.

### Prerequisites
- Node.js 18.0.0+
- pnpm 8.0.0+ (install with: `npm install -g pnpm`)
- Docker & Docker Compose

### Setup
```bash
# Install dependencies (pnpm required)
pnpm install

# Copy environment configuration (optional)
cp .env.example .env
# Edit .env if needed (ANTHROPIC_API_KEY for Claude Code SDK)

# Start development servers (no Docker required for basic functionality)
pnpm dev
```

### Build & Test
```bash
# Build project
pnpm build

# Run tests across all workspaces
pnpm -r test

# Lint and type checking
pnpm -r lint
pnpm -r typecheck
```

### Workspace Commands
```bash
# Frontend only
pnpm --filter specmgr-client dev

# Backend only
pnpm --filter specmgr-server dev

# Install workspace-specific dependency
pnpm --filter specmgr-client add <package>
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
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utility functions
│   │   │   └── types/       # TypeScript definitions
│   │   └── package.json     # Client dependencies
│   ├── server/          # Node.js backend (pnpm workspace)
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── workers/     # BullMQ job workers
│   │   └── package.json     # Server dependencies
│   └── shared/          # Shared utilities and types
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root workspace configuration
```