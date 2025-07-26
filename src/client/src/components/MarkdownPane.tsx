import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface MarkdownPaneProps {
  selectedFile: string | null
}

// Mock markdown content for demonstration
const mockMarkdownContent: Record<string, string> = {
  'docs/README.md': `# Documentation

Welcome to the project documentation!

## Overview

This is a comprehensive documentation system for managing your project specifications and knowledge base.

### Features

- **Document Tree Navigation**: Browse through your documentation hierarchy
- **Markdown Rendering**: Full support for GitHub Flavored Markdown
- **Search & Chat**: AI-powered search and chat functionality
- **Real-time Sync**: Automatic synchronization with file changes

## Getting Started

1. Browse documents using the tree navigation on the left
2. Select any markdown file to view its content
3. Use the chat pane to ask questions about your documentation

### Code Example

\`\`\`typescript
interface DocumentNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: DocumentNode[]
}
\`\`\`

### Task List

- [x] Set up project structure
- [x] Implement UI components
- [ ] Add backend API
- [ ] Implement search functionality
- [ ] Add real-time sync

> **Note**: This is a demo content. In production, this would be loaded from your actual markdown files.
`,
  'docs/getting-started.md': `# Getting Started

## Installation

Follow these steps to get the project running locally:

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Setup Steps

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-repo/specmgr.git
   cd specmgr
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   cd src/client && npm install
   \`\`\`

3. **Start services**
   \`\`\`bash
   npm run docker:up
   npm run dev
   \`\`\`

## Configuration

Create a \`.env\` file based on \`.env.example\`:

\`\`\`env
PORT=3000
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=your_api_key_here
\`\`\`

## Usage

Once running, you can:

- Browse documents in the left panel
- View markdown content in the center panel
- Chat with your documentation using the right panel
`,
  'docs/architecture/system-design.md': `# System Design

## Architecture Overview

The system follows a three-tier architecture:

### Frontend (React + shadcn/ui)
- **DocTree**: Document navigation
- **MarkdownPane**: Content rendering
- **ChatPane**: AI chat interface

### Backend (Node.js + Express)
- **API Server**: RESTful endpoints
- **File Watcher**: Monitors markdown changes
- **Queue System**: BullMQ for async processing

### Data Layer
- **Qdrant**: Vector database for embeddings
- **Redis**: Queue and cache storage
- **File System**: Source of truth for documents

## Data Flow

1. File changes detected by chokidar
2. SHA-1 hash comparison for diff detection
3. Changed files queued for processing
4. Embeddings generated and stored in Qdrant
5. UI reflects changes in real-time

## Key Components

### Sync Agent
Responsible for monitoring file system changes and maintaining synchronization.

### Search Engine
Vector-based semantic search using OpenAI embeddings and Qdrant.

### Chat Interface
LLM-powered chat with RAG (Retrieval Augmented Generation) capabilities.
`,
  'docs/api/endpoints.md': `# API Endpoints

## File Operations

### GET /api/files
List all markdown files in the watched directory.

**Response:**
\`\`\`json
{
  "files": [
    {
      "path": "docs/README.md",
      "name": "README.md",
      "lastModified": "2025-07-26T10:00:00Z"
    }
  ]
}
\`\`\`

### GET /api/files/:path
Get content of a specific file.

**Response:**
\`\`\`json
{
  "path": "docs/README.md",
  "content": "# Documentation\\n\\nWelcome...",
  "lastModified": "2025-07-26T10:00:00Z"
}
\`\`\`

## Search Operations

### POST /api/search
Perform vector search across documents.

**Request:**
\`\`\`json
{
  "query": "How to install the application?",
  "limit": 10
}
\`\`\`

**Response:**
\`\`\`json
{
  "results": [
    {
      "path": "docs/getting-started.md",
      "content": "## Installation\\n\\nFollow these steps...",
      "score": 0.95
    }
  ]
}
\`\`\`

## Chat Operations

### POST /api/chat
Send a chat message and get AI response.

**Request:**
\`\`\`json
{
  "message": "How do I set up the development environment?",
  "context": ["docs/getting-started.md"]
}
\`\`\`

**Response:** Server-Sent Events stream
\`\`\`
data: {"type": "token", "content": "To"}
data: {"type": "token", "content": " set"}
data: {"type": "token", "content": " up"}
data: {"type": "done"}
\`\`\`
`,
}

export function MarkdownPane({ selectedFile }: MarkdownPaneProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedFile) {
      setLoading(true)
      // Simulate API call delay
      setTimeout(() => {
        const mockContent =
          mockMarkdownContent[selectedFile] || `# ${selectedFile}\n\nContent not found.`
        setContent(mockContent)
        setLoading(false)
      }, 300)
    } else {
      setContent('')
    }
  }, [selectedFile])

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a document to view its content</p>
          <p className="text-sm mt-2">Choose a markdown file from the tree on the left</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold truncate">{selectedFile}</h2>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none p-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Custom components for better styling
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-4 text-foreground border-b border-border pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mb-3 text-foreground mt-6">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium mb-2 text-foreground mt-4">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-foreground leading-relaxed">{children}</p>
              ),
              code: ({ children, className }) => {
                const isInline = !className
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  )
                }
                return <code className={className}>{children}</code>
              },
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
