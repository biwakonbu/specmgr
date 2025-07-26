# Project Documentation

Welcome to the Local DocSearch & Chat Assistant documentation! This directory contains all the technical documentation for the system.

## Overview

Local DocSearch & Chat Assistant is a powerful tool for managing and searching through your Git-local Markdown documentation using AI-powered semantic search and chat capabilities.

### Key Features

- **Document Tree Navigation**: Browse through your documentation hierarchy with an intuitive file tree
- **Markdown Rendering**: Full support for GitHub Flavored Markdown with syntax highlighting
- **AI-Powered Chat**: Ask questions about your documentation and get context-aware responses powered by Claude Code SDK
- **Real-time Sync**: Automatic synchronization with file changes using chokidar
- **Hybrid Search**: Combining text search and vector search using Claude Code SDK embeddings and Qdrant vector database

## Architecture

The system is built with modern web technologies:

- **Frontend**: React 18 + shadcn/ui + Tailwind CSS + Vite
- **Backend**: Python 3.12 + FastAPI + uvicorn
- **Package Management**: uv (Python), pnpm (JavaScript)
- **Vector Database**: Qdrant for storing document embeddings
- **Queue System**: Redis + BullMQ for asynchronous processing
- **AI Integration**: Claude Code SDK for embeddings and chat
- **File Monitoring**: chokidar for detecting Markdown file changes

## Getting Started

1. Install dependencies: `pnpm install`
2. Setup environment: `cp .env.example .env` (configure ANTHROPIC_API_KEY)
3. Start Docker services: `pnpm docker:up`
4. Start development servers: `pnpm dev`
5. Open http://localhost:5173 to view the application

## Documentation Structure

- `architecture/` - System design and technical architecture
- `api/` - API documentation and endpoint specifications  
- `claude-code-sdk-python.md` - Claude Code SDK integration guide
- `README.md` - This overview document

## Usage

Once running, you can:

1. **Browse Documents**: Use the left panel to navigate through your Markdown files
2. **View Content**: Select any document to view its rendered content in the center panel
3. **Ask Questions**: Use the chat panel on the right to ask questions about your documentation
4. **Search**: The AI assistant can help you find relevant information across all documents

The system automatically watches for changes to your Markdown files and updates the search index in real-time.

## Contributing

When adding new documentation:

1. Create Markdown files in the appropriate subdirectory
2. Use clear, descriptive filenames
3. Include proper headers and structure
4. The system will automatically detect and index new files

For technical contributions, see the main project README for development setup instructions.