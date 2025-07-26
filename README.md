# Local DocSearch & Chat Assistant

**Git-integrated Markdown Document Search & Chat System**

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://typescriptlang.org)

A system for managing Git-local Markdown documents with hybrid search (text + vector) and Claude Code SDK integration for intelligent chat functionality.

## Key Features

- 📝 **Real-time File Monitoring**: Instant detection of Markdown file changes using chokidar
- 🔍 **Hybrid Search**: High-precision search combining text and vector search capabilities
- 🤖 **AI Chat**: RAG (Retrieval-Augmented Generation) powered by Claude Code SDK
- 📊 **3-Pane UI**: Integrated interface with DocTree, MarkdownPreview, and ChatPane
- ⚡ **Fast Synchronization**: Efficient sync processing with SHA-1 based differential detection
- 🔄 **Auto Retry**: Exponential backoff retry functionality with BullMQ + Redis
- 🎨 **Modern UI**: CSS-free development experience with shadcn/ui + Tailwind CSS

## Architecture

- **Frontend**: React 18 + shadcn/ui + Tailwind CSS + Vite
- **Backend**: Python 3.12 + FastAPI + uvicorn
- **Package Management**: uv (Python), pnpm (JavaScript)
- **Vector Database**: Qdrant for semantic search
- **Queue System**: Redis + BullMQ for async processing
- **AI Integration**: Claude Code SDK for embeddings and chat
- **File Monitoring**: chokidar for real-time change detection

## Prerequisites

- **Node.js**: 18.0.0+
- **Python**: 3.12+
- **pnpm**: 8.0.0+ (required for workspace management)
- **uv**: Python package manager
- **Docker & Docker Compose**: For Redis and Qdrant services
- **Claude Code SDK Subscription**: Required for embedding generation and chat functionality

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd specmgr
```

### 2. Install Package Managers

```bash
# pnpm (for JavaScript/TypeScript)
npm install -g pnpm

# uv (for Python)
curl -LsSf https://astral.sh/uv/install.sh | sh
# or
pip install uv
```

### 3. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 4. Environment Configuration

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Qdrant Configuration
QDRANT_URL=http://localhost:6333

# Claude Code SDK Configuration (Required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# File Monitoring Configuration
DOCUMENTS_PATH=./docs

# Python Specific Configuration
PYTHONPATH=src/server
```

### 5. Start Docker Services

```bash
pnpm docker:up
```

This will start Redis and Qdrant services in the background.

## Development

### Start Development Servers

```bash
# Start both frontend and backend
pnpm dev
```

This will start:
- Frontend dev server at http://localhost:5173
- Backend API server at http://localhost:3000

### Individual Workspace Commands

```bash
# Frontend only
pnpm --filter specmgr-client dev

# Backend only (Python FastAPI)
pnpm dev:server

# Run tests across all workspaces
pnpm -r test

# Lint all workspaces
pnpm lint

# Type checking
pnpm typecheck
```

### Python Development Commands

```bash
# Server development (from project root)
pnpm dev:server

# Or directly with uv (from src/server)
cd src/server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 3000

# Run Python tests
cd src/server && uv run pytest

# Python linting and formatting
cd src/server && uv run ruff check .
cd src/server && uv run ruff format .

# Python type checking
cd src/server && uv run mypy .
```

## Production Build

```bash
# Build all workspaces
pnpm build

# Start production server
pnpm start
```

## Docker Management

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
│   ├── client/              # React frontend application
│   │   ├── src/
│   │   │   ├── components/  # React components (shadcn/ui)
│   │   │   ├── services/    # API client services
│   │   │   ├── types/       # TypeScript definitions
│   │   │   └── utils/       # Utility functions
│   │   └── package.json
│   ├── server/              # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── api/         # API routes and endpoints
│   │   │   ├── services/    # Business logic services
│   │   │   ├── models/      # Pydantic models
│   │   │   └── core/        # Configuration and settings
│   │   ├── tests/           # Python tests
│   │   ├── main.py          # FastAPI application entry point
│   │   └── pyproject.toml   # Python dependencies and config
│   └── shared/              # Shared utilities and types
├── docs/                    # Documentation files (watched directory)
├── docker-compose.yml       # Docker services configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
└── package.json             # Root package configuration
```

## API Endpoints

### File Management
- `GET /api/files` - Get file list
- `GET /api/files/{file_path}` - Get file content

### Search
- `POST /api/search` - Search documents
- `GET /api/search/stats` - Get search statistics

### Chat
- `POST /api/chat/stream` - Streaming chat (SSE)

### Synchronization
- `POST /api/sync/bulk` - Execute bulk synchronization
- `GET /api/sync/status` - Get sync status

### Health Check
- `GET /` - Basic health check
- `GET /api/health/detailed` - Detailed health status

## Usage

1. **Browse Documents**: Use the left panel to navigate through your markdown files
2. **View Content**: Select any document to view its rendered content in the center panel
3. **Ask Questions**: Use the chat panel on the right to ask questions about your documentation
4. **Search**: The AI assistant can help you find relevant information across all documents

## Performance Requirements

| Metric | Target |
|--------|---------|
| Vector search response | < 1.5s (95th percentile) |
| Text search fallback | < 0.5s |
| Sync job success rate | 99%+ |
| Single file change reflection | < 5s (including embedding generation) |

## Troubleshooting

### Common Issues

**Q: Claude Code SDK API key error**
```
A: Verify ANTHROPIC_API_KEY is correctly set in .env file
```

**Q: Docker services not starting**
```bash
# Check Docker is running
docker --version

# Check ports are available
lsof -i :6379  # Redis
lsof -i :6333  # Qdrant

# Restart services
pnpm docker:down && pnpm docker:up
```

**Q: pnpm commands not working**
```bash
# Install pnpm
npm install -g pnpm

# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Q: Python dependencies issues**
```bash
# Reinstall Python dependencies
cd src/server
uv sync --reinstall

# Check Python version
python --version  # Should be 3.12+
```

**Q: Type errors**
```bash
# Check TypeScript errors
pnpm typecheck

# Check Python type errors
cd src/server && uv run mypy .
```

### Log Analysis

```bash
# Docker service logs
pnpm docker:logs

# Python server logs
pnpm dev:server

# Frontend development logs
pnpm --filter specmgr-client dev

# Detailed debugging
DEBUG=* pnpm dev
```

## Security

- **Local Environment Only**: External communication limited to Claude Code SDK API
- **TLS Required**: All external API communications use TLS
- **Secret Management**: Secure API key storage in environment variables
- **Input Validation**: Comprehensive validation for all user inputs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm -r test`
5. Run quality checks: `pnpm check:all`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Detailed technical specifications in `docs/` directory

---

**Last Updated**: 2025-01-26