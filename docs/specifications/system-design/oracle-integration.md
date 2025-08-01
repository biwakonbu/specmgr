# Oracle Integration with specmgr

## Overview
This document describes how the Oracle specification system integrates with the existing specmgr RAG infrastructure.

## Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Oracle System                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Structured  │  │   Hybrid    │  │  Signature  │ │
│  │   Search    │  │   Search    │  │ Validation  │ │
│  └─────────────┘  └──────┬──────┘  └─────────────┘ │
└────────────────────────────┼────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ specmgr RAG API │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │ Qdrant  │      │ Text Search │    │ File Watch  │
    │ Vector  │      │   Engine    │    │   Service   │
    │   DB    │      └─────────────┘    └─────────────┘
    └─────────┘
```

## Integration Points

### 1. Specification Documents as Special Markdown Files

Specification documents are treated as a special class of Markdown files:
- Stored in `docs/specifications/` directory
- Automatically indexed by specmgr's file watcher
- Searchable through existing RAG infrastructure
- Additional metadata for specification tracking

### 2. Hybrid Search Implementation

```python
class OracleSearchService:
    def __init__(self, specmgr_search_service):
        self.specmgr_search = specmgr_search_service
        self.spec_index = SpecificationIndex()
    
    async def search(self, query: str) -> List[Specification]:
        # Phase 1: Try structured search
        exact_matches = self.spec_index.search_by_id_or_tag(query)
        if exact_matches:
            return exact_matches
        
        # Phase 2: Fall back to RAG search
        rag_results = await self.specmgr_search.search(
            query=query,
            path_filter="docs/specifications/",
            limit=10
        )
        
        # Convert RAG results to specifications
        return self.parse_specifications(rag_results)
```

### 3. Specification Metadata Enhancement

Each specification document includes frontmatter for enhanced search:

```yaml
---
id: SPEC-001
title: User Authentication
tags: [auth, security, login]
version: 2.1
category: authentication
---

# User Authentication Specification
...
```

### 4. File Watcher Integration

The existing specmgr file watcher automatically:
- Detects changes to specification files
- Triggers re-indexing for vector search
- Oracle system hooks into these events for validation

### 5. Search Result Ranking

When using RAG search, results are ranked by:
1. **Relevance score** from vector similarity
2. **Specification metadata** (tags, category)
3. **Version recency** (prefer latest versions)
4. **Usage frequency** (popular specs ranked higher)

## Benefits of Integration

1. **No Duplicate Infrastructure**: Reuse existing RAG components
2. **Consistent Search Experience**: Same search quality as document search
3. **Automatic Scaling**: As specmgr scales, Oracle scales with it
4. **Unified Maintenance**: Single system to maintain

## Configuration

Add to specmgr configuration:

```yaml
# .env
ORACLE_SECRET=your-secret-key
ORACLE_SPEC_PATH=docs/specifications

# Search configuration
oracle:
  search:
    use_rag: true  # Enable RAG fallback
    rag_threshold: 0.7  # Minimum similarity score
    structured_first: true  # Try structured search first
```

## Migration Path

### Phase 1: Structured Only (Initial)
- Oracle operates independently
- Simple keyword search
- No RAG integration

### Phase 2: Optional RAG (Growth)
- Enable RAG fallback for complex queries
- Maintain structured search as primary
- Monitor usage patterns

### Phase 3: Full Integration (Scale)
- RAG as default for all searches
- Structured search for performance optimization
- Advanced features like semantic specification linking