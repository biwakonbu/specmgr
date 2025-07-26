# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Local DocSearch & Chat Assistant** - A system for managing Git-local Markdown documents with vector search and LLM chat capabilities

### Documentation References
- **Technical Stack**: See @techstack.md for comprehensive technology selection rationale and architecture decisions
- **Product Requirements**: See @PRD.md for detailed functional and non-functional requirements

### Architecture
- **Sync Agent (Node.js)**: Markdown file change monitoring and differential synchronization
- **Vector DB (Qdrant)**: Embedding vector search
- **Queue (Redis/BullMQ)**: Asynchronous job processing with retry functionality
- **React UI**: Three-pane layout with DocTree, MarkdownPreview, and ChatPane

### Tech Stack
- Backend: Node.js + Express + TypeScript
- Frontend: React + shadcn/ui + Tailwind CSS + react-markdown
- Queue: Redis + BullMQ 
- Vector DB: Qdrant
- Embedding: OpenAI API or OSS alternatives
- File Watching: chokidar
- Chat: SSE (Server-Sent Events)

## Development Guidelines

### Synchronization Flow Implementation Principles
1. Detect Markdown file changes with chokidar
2. SHA-1 based manifest for differential detection
3. Asynchronous processing with BullMQ (auto-retry: 5 times, exponential backoff)
4. Generate embeddings, then upsert/delete in Qdrant
5. Update manifest only on success

### UI Layout Specifications
- Left Pane (20%): DocTree (Radix Tree + shadcn/ui)
- Center Pane (45%): MarkdownPane (react-markdown)
- Right Pane (35%): ChatPane (LLM Q&A + SSE)

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

Current Stage: **Project Initialization Phase**

1. **M1**: Sync Agent + manifest implementation
2. **M2**: Search API + RAG functionality
3. **M3**: React UI DocTree/Markdown display
4. **M4**: ChatPane streaming functionality
5. **M5**: Backoff and retry monitoring

## Implementation Notes

### Synchronization Processing
- Use chokidar `atomic: true` option
- Split large Markdown files with max-token limit
- Implement token limiting for LLM API rate limits

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

# Start Docker services (Redis, Qdrant)
pnpm docker:up

# Start development servers
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