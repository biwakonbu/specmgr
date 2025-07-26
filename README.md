# SpecMgr - Local DocSearch & Chat Assistant

A system for managing Git-local Markdown documents with vector search and LLM chat capabilities.

## Features

- **Document Tree Navigation**: Browse through your documentation hierarchy
- **Markdown Rendering**: Full support for GitHub Flavored Markdown with syntax highlighting
- **AI-Powered Chat**: Ask questions about your documentation with context-aware responses
- **Real-time Sync**: Automatic synchronization with file changes
- **Vector Search**: Semantic search using OpenAI embeddings and Qdrant
- **Dark Mode**: Built-in light/dark theme support

## Architecture

- **Frontend**: React + shadcn/ui + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Vector Database**: Qdrant for embedding storage
- **Queue System**: Redis + BullMQ for async processing
- **File Monitoring**: chokidar for Markdown change detection

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (required for workspace management)
- **Docker**: For running Redis and Qdrant services
- **Docker Compose**: For orchestrating services

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/specmgr.git
cd specmgr
```

### 2. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Qdrant Configuration
QDRANT_URL=http://localhost:6333

# OpenAI Configuration (required for embeddings)
OPENAI_API_KEY=your_openai_api_key_here

# File Watching Configuration
WATCH_DIRECTORY=./docs
```

### 5. Start Docker services

```bash
pnpm docker:up
```

This will start Redis and Qdrant services in the background.

## Development

### Start the development servers

```bash
# Start both frontend and backend
pnpm dev
```

This will start:
- Frontend dev server at http://localhost:5173
- Backend API server at http://localhost:3000

### Individual workspace commands

```bash
# Frontend only
pnpm --filter specmgr-client dev

# Backend only
pnpm --filter specmgr-server dev

# Run tests across all workspaces
pnpm -r test

# Lint all workspaces
pnpm -r lint

# Type checking
pnpm -r typecheck
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
│   ├── client/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utility functions
│   │   │   └── types/       # TypeScript definitions
│   │   └── package.json
│   ├── server/          # Node.js backend application
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── workers/     # BullMQ job workers
│   │   └── package.json
│   └── shared/          # Shared utilities and types
├── docs/                # Documentation files (watched directory)
├── docker-compose.yml   # Docker services configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package configuration
```

## Usage

1. **Browse Documents**: Use the left panel to navigate through your markdown files
2. **View Content**: Select any document to view its rendered content in the center panel
3. **Ask Questions**: Use the chat panel on the right to ask questions about your documentation
4. **Search**: The AI assistant can help you find relevant information across all documents

## Troubleshooting

### pnpm not found
```bash
npm install -g pnpm
```

### Docker services not starting
```bash
# Check Docker is running
docker --version

# Check ports are available
lsof -i :6379  # Redis
lsof -i :6333  # Qdrant
```

### Frontend build errors
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm -r test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.