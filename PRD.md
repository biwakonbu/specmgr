# Product Requirements Document (PRD)

## 1. Product Name

**Local DocSearch & Chat Assistant**

## 2. Background and Objectives

- *Background*: There is a lack of environments where engineers can instantly perform full-text search, summarization, and Q&A in chat format for locally managed Markdown documents.
- *Objective*: Use Git-managed Markdown as the **single source of truth (SSOT)** and sync only change differentials with vector DB (Qdrant). Enable browsing and chatting on React UI.

## 3. Scope

| Included                        | Excluded               |
| ------------------------- | ------------------ |
| Local PC operation              | Cloud / SaaS deployment |
| Markdown (`.md`) files     | PDF, Word and other formats    |
| Qdrant / Redis / Python server | External LLM API cost management   |
| URL-based navigation | Complex multi-page routing |

## 4. Target Users / Personas

- **Software Engineers** (individual or small teams)
  - Frequently reference design documents on Git
  - Seek high-speed search and summarization by LLM

## 5. Use Cases (Examples)

1. Engineer wants to check new API specifications → Ask chat for summary without opening files.
2. Edit and save Markdown → Immediately reflect in search results (differential sync).
3. Sync failure (network disconnection) → Confirm recovery through automatic retry.
4. Share specific document → Copy URL and send to colleague for direct access.
5. Navigate between documents → Use browser back/forward buttons naturally.
6. Large codebase with 1000+ docs → Only changed files processed, 97%+ DB load reduction.
7. System restart after manifest corruption → Auto-recovery with empty manifest fallback.

## 6. Core Functional Requirements

| ID | Requirement                               | Priority    |
| -- | -------------------------------- | ------ |
| F1 | Markdown change detection (watchdog)         | High   |
| F2 | SHA-1 manifest differential comparison                 | High   |
| F3 | Embedding generation (Claude Code SDK)     | High   |
| F4 | Upsert/Delete to Qdrant          | High   |
| F5 | Job & retry with Redis queue             | Medium |
| F6 | React UI: DocTree / MarkdownPane | High   |
| F7 | React UI: ChatPane + SSE         | High   |
| F8 | URL-based navigation with History API | High |
| F9 | Compact chat UI with optimized sizing | Medium |
| F10 | Source line highlighting (optional)                   | Low    |

## 7. Non-Functional Requirements

| Category      | Metrics                               |
| ------- | -------------------------------- |
| Performance | Vector search < 1.5s, Text search < 0.5s (95th percentile), Differential sync 97%+ DB load reduction |
| Reliability     | Sync job success rate 99%+ (including automatic retry)        |
| Security  | Local environment only. External communication only via Claude Code SDK with TLS |
| Portability     | One-command startup with Docker Compose              |
| Navigation | URL state change < 100ms, browser back/forward support |
| UI Responsiveness | Chat message render < 200ms, compact design for space efficiency |

## 8. Architecture Diagram (Text)

```
Markdown (.md) ─▶ FileWatcher ─▶ ManifestService ─▶ Redis Queue ─▶ Qdrant
                     │              │ (SHA-1 diff)      │         ▲
                     │              └─── .specmgr-manifest.json   │
                     └──────── Search API ─────────────────────────┘
React UI (URL Navigation) ◀─── SSE/REST + History API ─────────────┘
     │
     ├── DocTree (File Navigation)
     ├── MarkdownPane (Document View)  
     └── ChatPane (AI Assistant)
```

## 9. Synchronization Flow Details

### 9.1 Differential Sync Process
1. **File Detection**: watchdog detects `add/change/unlink` events
2. **Hash Calculation**: Generate SHA-1 for changed files
3. **Manifest Comparison**: Compare against `.specmgr-manifest.json`
4. **Change Classification**: Identify added/modified/deleted files
5. **Selective Queueing**: Queue only differential changes to Redis (97%+ load reduction)
6. **Processing**: Worker generates embeddings → Qdrant Upsert/Delete (attempts=5, exponential back-off)
7. **Atomic Update**: Update manifest only after successful processing

### 9.2 Manifest Structure
```json
{
  "files": {
    "docs/api.md": "a1b2c3d4e5f6...",
    "docs/guide.md": "f6e5d4c3b2a1..."
  },
  "last_updated": "2025-01-26T10:00:00Z"
}
```

### 9.3 Performance Optimization
- **Before**: 100 files → 100 DB operations (every sync)
- **After**: 3 changed files → 3 DB operations (97% reduction)
- **Force Sync**: `force=true` bypasses manifest for complete re-indexing

## 10. UI Requirements

### 10.1 Layout

| Area   | Width   | Content                            |
| ---- | --- | ----------------------------- |
| Left Pane | 20% | DocTree (shadcn/ui TreeView)        |
| Center   | 55% | MarkdownPane (react-markdown) |
| Right Pane | 25% | ChatPane (LLM Q&A)            |

### 10.2 Navigation Specifications

- **URL Integration**: File selection preserved in URL (`?file=path/to/doc.md`)
- **Browser Navigation**: Back/forward buttons work naturally
- **State Synchronization**: Automatic sync between URL and app state
- **Sharing**: Direct file access via URL sharing

### 10.3 Chat Specifications

- **Compact Design**: 12px base font, 8x8px avatars, 98% message width
- **Token Stream**: Display with SSE (0.1s buffer)
- **User Input**: `/chat` POST (JSON)
- **RAG Generation**: Claude Code SDK with document context
- **Layout**: Stacked avatar/role above message content for better space utilization

## 11. KPIs / Metrics

| KPI          | Target Value           |
| ------------ | ------------- |
| Initial full sync time     | < 60s (10k lines) |
| Single file change reflection  | < 5s (including embedding generation) |
| RAG accuracy rate (@5) | > 80%         |
| URL navigation response time | < 100ms |
| Chat message render time | < 200ms |

## 12. Milestones

| Phase | Content                        | Completion Criteria            |
| ---- | ------------------------- | --------------- |
| M1   | Sync Agent + manifest     | Confirm differential upsert operation  |
| M2   | Search API + RAG          | Get answers via CLI       |
| M3   | React UI DocTree/Markdown | Document browsing available       |
| M4   | ChatPane streaming            | Integrated chat fully operational        |
| M5   | Backoff & retry monitoring            | Pass 30-minute error injection test |
| M6   | URL-based navigation | Browser back/forward works, URLs shareable |
| M7   | Chat UI optimization | Compact design with optimal space usage |

## 13. Risks & Countermeasures

| Risk            | Countermeasure                                  |
| -------------- | ----------------------------------- |
| Claude Code SDK rate limiting | Implement token limits in embedding queue, fallback to text search |
| Large Markdown files   | Re-split for max-token and above / operate with text search only |
| watchdog monitoring limit | Event filtering / pattern matching |
| URL state conflicts | Proper encoding/decoding and state validation |
| Browser history pollution | Smart history state management with replaceState |

## 14. Future Extensions (Out-of-Scope)

- Integration with external LLM clients through MCP tooling
- PDF generation, Docusaurus site auto-build
- GUI for Docker Desktop (Electron)
- Multi-tab document viewing
- Advanced URL routing with nested paths
- PWA (Progressive Web App) capabilities

---


---

*Update History*

- 2025-07-26  Initial version created
- 2025-01-26  Added URL navigation, chat UI optimization, and updated architecture
- 2025-08-01  Added Oracle CLI knowledge enhancement work in progress