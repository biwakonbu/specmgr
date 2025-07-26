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
| Qdrant / Redis / Node server | External LLM API cost management   |

## 4. Target Users / Personas

- **Software Engineers** (individual or small teams)
  - Frequently reference design documents on Git
  - Seek high-speed search and summarization by LLM

## 5. Use Cases (Examples)

1. Engineer wants to check new API specifications → Ask chat for summary without opening files.
2. Edit and save Markdown → Immediately reflect in search results.
3. Sync failure (network disconnection) → Confirm recovery through automatic retry.

## 6. Core Functional Requirements

| ID | Requirement                               | Priority    |
| -- | -------------------------------- | ------ |
| F1 | Markdown change detection (chokidar)         | High   |
| F2 | SHA-1 manifest differential comparison                 | High   |
| F3 | Embedding generation (Claude Code SDK)     | High   |
| F4 | Upsert/Delete to Qdrant          | High   |
| F5 | Job & retry with BullMQ             | Medium |
| F6 | React UI: DocTree / MarkdownPane | High   |
| F7 | React UI: ChatPane + SSE         | High   |
| F8 | Source line highlighting (optional)                   | Low    |

## 7. Non-Functional Requirements

| Category      | Metrics                               |
| ------- | -------------------------------- |
| Performance | Vector search < 1.5s, Text search < 0.5s (95th percentile) |
| Reliability     | Sync job success rate 99%+ (including automatic retry)        |
| Security  | Local environment only. External communication only via Claude Code SDK with TLS |
| Portability     | One-command startup with Docker Compose              |

## 8. Architecture Diagram (Text)

```
Markdown (.md) ─▶ Sync Agent (Node) ─▶ Redis/BullMQ ─▶ Qdrant
                                 │                        ▲
                                 └───── Search API ───────┘
React UI (DocTree / Chat) ◀──── SSE/REST ────────────────────┘
```

## 9. Synchronization Flow Details

1. chokidar detects `add/change/unlink`
2. SHA-1 calculation → manifest comparison
3. Queue only differentials to BullMQ (attempts=5, exponential back-off)
4. Worker generates embeddings with Claude Code SDK → Qdrant Upsert/Delete
5. Update manifest on success

## 10. UI Requirements

### 10.1 Layout

| Area   | Width   | Content                            |
| ---- | --- | ----------------------------- |
| Left Pane | 20% | DocTree (MUI TreeView)        |
| Center   | 45% | MarkdownPane (react-markdown) |
| Right Pane | 35% | ChatPane (LLM Q&A)            |

### 10.2 Chat Specifications

- Token stream display with SSE (0.1s buffer)
- User input → `/chat` POST (JSON)
- Claude Code SDK generates RAG

## 11. KPIs / Metrics

| KPI          | Target Value           |
| ------------ | ------------- |
| Initial full sync time     | < 60s (10k lines) |
| Single file change reflection  | < 5s (including embedding generation) |
| RAG accuracy rate (@5) | > 80%         |

## 12. Milestones

| Phase | Content                        | Completion Criteria            |
| ---- | ------------------------- | --------------- |
| M1   | Sync Agent + manifest     | Confirm differential upsert operation  |
| M2   | Search API + RAG          | Get answers via CLI       |
| M3   | React UI DocTree/Markdown | Document browsing available       |
| M4   | ChatPane streaming            | Integrated chat fully operational        |
| M5   | Backoff & retry monitoring            | Pass 30-minute error injection test |

## 13. Risks & Countermeasures

| Risk            | Countermeasure                                  |
| -------------- | ----------------------------------- |
| Claude Code SDK rate limiting | Implement token limits in embedding queue, fallback to text search |
| Large Markdown files   | Re-split for max-token and above / operate with text search only |
| chokidar monitoring limit | `atomic: true` / `cwd` filtering         |

## 14. Future Extensions (Out-of-Scope)

- Integration with external LLM clients through MCP tooling
- PDF generation, Docusaurus site auto-build
- GUI for Docker Desktop (Electron)

---

*Update History*

- 2025-07-26  Initial version created