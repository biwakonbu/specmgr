# System Architecture

## Overview

The Local DocSearch & Chat Assistant follows a modern three-tier architecture with real-time synchronization and hybrid search capabilities.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI]
        DT[DocTree Component]
        MP[MarkdownPane Component] 
        CP[ChatPane Component]
    end
    
    subgraph "Backend Layer"
        API[FastAPI Server]
        FS[File Service]
        SS[Search Service]
        CS[Chat Service]
        SYS[Sync Service]
        FW[File Watcher]
    end
    
    subgraph "Data Layer"
        MD[Markdown Files]
        QD[Qdrant Vector DB]
        RD[Redis Queue]
        MF[Manifest Files]
    end
    
    subgraph "External Services"
        CC[Claude Code SDK]
        VA[Voyage AI]
    end
    
    UI --> API
    DT --> FS
    MP --> FS
    CP --> CS
    
    API --> FS
    API --> SS
    API --> CS
    API --> SYS
    
    FW --> SYS
    SYS --> RD
    SS --> QD
    CS --> CC
    SYS --> VA
    
    FS --> MD
    SYS --> MF
    RD --> QD
```

## Component Architecture

```mermaid
graph LR
    subgraph "Client Components"
        App[App.tsx]
        DocTree[DocTree.tsx]
        MarkdownPane[MarkdownPane.tsx]
        ChatPane[ChatPane.tsx]
        MermaidDiagram[MermaidDiagram]
    end
    
    subgraph "API Services"
        FileAPI[File API]
        SearchAPI[Search API]
        ChatAPI[Chat API]
        SyncAPI[Sync API]
    end
    
    subgraph "Business Services"
        FileService[File Service]
        SearchService[Search Service]
        ChatService[Chat Service]
        SyncService[Sync Service]
        QueueService[Queue Service]
        FileWatcher[File Watcher]
    end
    
    App --> DocTree
    App --> MarkdownPane
    App --> ChatPane
    
    DocTree --> FileAPI
    MarkdownPane --> FileAPI
    ChatPane --> ChatAPI
    
    FileAPI --> FileService
    SearchAPI --> SearchService
    ChatAPI --> ChatService
    SyncAPI --> SyncService
    
    FileWatcher --> QueueService
    QueueService --> SyncService
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant API as FastAPI
    participant Watcher as File Watcher
    participant Queue as Redis Queue
    participant Search as Search Service
    participant Vector as Qdrant
    participant LLM as Claude Code SDK
    
    Note over User, LLM: File Change Detection Flow
    User->>+Watcher: Edit Markdown File
    Watcher->>+Queue: Queue Sync Job
    Queue->>+Search: Process File
    Search->>+LLM: Generate Embedding
    LLM-->>-Search: Return Vectors
    Search->>+Vector: Store Vectors
    Vector-->>-Search: Confirm Storage
    Search-->>-Queue: Job Complete
    Queue-->>-Watcher: Success
    
    Note over User, LLM: Search Flow
    User->>+UI: Enter Search Query
    UI->>+API: POST /search
    API->>+Search: Hybrid Search
    Search->>+Vector: Vector Search
    Vector-->>-Search: Similar Docs
    Search->>Search: Text Search Fallback
    Search-->>-API: Combined Results
    API-->>-UI: Search Response
    UI-->>-User: Display Results
    
    Note over User, LLM: Chat Flow
    User->>+UI: Ask Question
    UI->>+API: POST /chat (SSE)
    API->>+Search: Retrieve Context
    Search-->>-API: Relevant Docs
    API->>+LLM: Generate Response
    LLM-->>-API: Stream Response
    API-->>-UI: SSE Stream
    UI-->>-User: Real-time Answer
```

## Technology Stack Architecture

```mermaid
graph TB
    subgraph "Frontend Stack"
        React[React 18]
        Vite[Vite Build Tool]
        Tailwind[Tailwind CSS]
        ShadcnUI[shadcn/ui Components]
        ReactMD[react-markdown]
        Mermaid[Mermaid Diagrams]
    end
    
    subgraph "Backend Stack"
        FastAPI[FastAPI Framework]
        Uvicorn[Uvicorn Server]
        Pydantic[Pydantic Models]
        AsyncIO[AsyncIO Runtime]
    end
    
    subgraph "Search Stack"
        QdrantDB[Qdrant Vector DB]
        RedisQueue[Redis Queue]
        Watchdog[Python Watchdog]
        TextSearch[Local Text Search]
    end
    
    subgraph "AI Stack"
        ClaudeSDK[Claude Code SDK]
        VoyageAI[Voyage AI Embeddings]
        SSE[Server-Sent Events]
    end
    
    subgraph "Development Stack"
        Python[Python 3.12+]
        NodeJS[Node.js 18+]
        pnpm[pnpm Workspace]
        UV[uv Package Manager]
        Docker[Docker Compose]
    end
    
    React --> FastAPI
    FastAPI --> QdrantDB
    FastAPI --> RedisQueue
    FastAPI --> ClaudeSDK
    RedisQueue --> Watchdog
    QdrantDB --> VoyageAI
    ClaudeSDK --> SSE
```

## Security Architecture

```mermaid
graph TB
    subgraph "Local Environment"
        Client[Client App]
        Server[Local Server]
        Files[Local Files]
        DB[Local Databases]
    end
    
    subgraph "External APIs"
        Claude[Claude Code SDK]
        Voyage[Voyage AI API]
    end
    
    subgraph "Security Layers"
        TLS[TLS Encryption]
        ENV[Environment Variables]
        CORS[CORS Policy]
        Rate[Rate Limiting]
    end
    
    Client --> Server
    Server --> Files
    Server --> DB
    
    Server --> TLS
    TLS --> Claude
    TLS --> Voyage
    
    Server --> ENV
    Server --> CORS
    Server --> Rate
    
    note1[No Data Leaves Local Environment<br/>Except API Calls to Claude/Voyage]
    note2[API Keys Stored in .env File<br/>Never Committed to Git]
    note3[Local-First Architecture<br/>Full Offline Capability]
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DevClient[Dev Client :5173]
        DevServer[Dev Server :3000]
        DevRedis[Redis :6379]
        DevQdrant[Qdrant :6333]
    end
    
    subgraph "Docker Services"
        Redis[Redis Container]
        Qdrant[Qdrant Container]
        Compose[Docker Compose]
    end
    
    subgraph "Local File System"
        Docs[docs Directory]
        Manifest[manifest Files]
        Env[env Configuration]
    end
    
    DevClient --> DevServer
    DevServer --> DevRedis
    DevServer --> DevQdrant
    DevServer --> Docs
    DevServer --> Manifest
    DevServer --> Env
    
    DevRedis --> Redis
    DevQdrant --> Qdrant
    Redis --> Compose
    Qdrant --> Compose
```

## Key Design Patterns

### 1. Event-Driven Architecture
- File system events trigger sync jobs
- Queue-based processing with retry logic
- Real-time UI updates via SSE

### 2. Hybrid Search Pattern
- Vector search for semantic similarity
- Text search for exact matches
- Intelligent fallback mechanisms

### 3. Component-Based UI
- Resizable pane layout
- Independent component state
- Shared service layer

### 4. Service Layer Pattern
- Clear separation of concerns
- Dependency injection
- Mock-friendly testing

### 5. Local-First Design
- Offline capability
- Local data storage
- Minimal external dependencies