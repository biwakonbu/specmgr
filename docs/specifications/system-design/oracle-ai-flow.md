# Oracle AI Investigation Flow

## Overview
This document details how AI agents collaborate to investigate and answer specification queries using Claude Code SDK.

## AI-Driven Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User/Developer                        │
└───────────────────────────┬─────────────────────────────┘
                            │ Query: "How should password
                            │ reset work?"
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Oracle API Gateway                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│            Primary AI Agent (Claude Code SDK)            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. Query Understanding                          │   │
│  │  2. Investigation Planning                       │   │
│  │  3. Search Orchestration                        │   │
│  │  4. Response Generation                         │   │
│  └─────────────────────────────────────────────────┘   │
└───────────┬───────────────────────────────┬─────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│  Structured Search    │       │    RAG Search         │
│  - Spec IDs          │       │  - Vector similarity  │
│  - Tags              │       │  - Semantic search    │
│  - Keywords          │       │  - Context ranking    │
└───────────────────────┘       └───────────────────────┘
```

## AI Investigation Process

### 1. Query Understanding Phase
```python
class OracleAI:
    async def understand_query(self, user_query: str):
        # Use Claude to interpret the query
        analysis = await self.claude.analyze({
            "query": user_query,
            "task": "Extract intent and key concepts",
            "context": "User is asking about system specifications"
        })
        
        return {
            "intent": analysis.intent,  # e.g., "find_spec", "verify_compliance"
            "concepts": analysis.concepts,  # e.g., ["password", "reset", "security"]
            "confidence": analysis.confidence
        }
```

### 2. Investigation Planning
```python
async def plan_investigation(self, query_analysis):
    # AI decides investigation strategy
    plan = await self.claude.create_plan({
        "intent": query_analysis.intent,
        "concepts": query_analysis.concepts,
        "available_tools": ["structured_search", "rag_search", "cross_reference"],
        "instruction": "Create an investigation plan to find relevant specifications"
    })
    
    return plan.steps  # Ordered list of investigation steps
```

### 3. Autonomous Investigation Loop
```python
async def investigate(self, plan):
    results = []
    
    for step in plan.steps:
        if step.type == "search":
            result = await self.execute_search(step.params)
        elif step.type == "analyze":
            result = await self.claude.analyze_findings(results)
        elif step.type == "consult_agent":
            result = await self.consult_specialized_agent(step.agent_type)
        
        results.append(result)
        
        # AI decides if enough information gathered
        if await self.claude.is_sufficient(results, original_query):
            break
            
    return results
```

## AI-to-AI Dialogue Examples

### Example 1: Security Consultation
```
Primary AI: "I found password reset spec SPEC-045. Need security review."
Security AI: "Checking SPEC-045 against security standards..."
Security AI: "Found issues: Missing 2FA requirement, no rate limiting specified."
Primary AI: "Including security recommendations in response."
```

### Example 2: Cross-Specification Dependencies
```
Primary AI: "User asks about password reset. Found SPEC-045."
Dependency AI: "SPEC-045 depends on SPEC-012 (Email Service) and SPEC-089 (Audit Logging)."
Primary AI: "Should I include dependency details?"
Dependency AI: "Yes, email service configuration is critical for password reset."
```

## Configuration

### Claude Code SDK Integration
```python
# .env
ANTHROPIC_API_KEY=your-api-key
ORACLE_AI_MODEL=claude-3-opus-20240229
ORACLE_AI_MAX_INVESTIGATION_STEPS=10
ORACLE_AI_CONFIDENCE_THRESHOLD=0.8

# config.yaml
oracle:
  ai:
    enable_autonomous_investigation: true
    enable_agent_dialogue: true
    investigation_timeout: 30s
    agents:
      - type: security
        specialization: "Security and compliance requirements"
      - type: dependency
        specialization: "Cross-specification dependencies"
      - type: implementation
        specialization: "Implementation details and examples"
```

## Benefits of AI-Driven Investigation

1. **Natural Language Understanding**: Users can ask questions in their own words
2. **Comprehensive Answers**: AI explores multiple angles and related specs
3. **Context Awareness**: AI understands the broader context of queries
4. **Self-Improving**: AI learns from successful investigations
5. **Reduced Ambiguity**: AI clarifies vague queries before searching

## Example Interactions

### Simple Query
```
User: "What's the password policy?"
AI: Searches for "password policy" → Finds SPEC-003 → Returns direct answer
```

### Complex Investigation
```
User: "How do we handle account recovery for users who lost access to their email?"
AI: 
1. Understands this is about account recovery edge cases
2. Searches for account recovery specs (SPEC-046)
3. Identifies email dependency issue
4. Consults security agent for alternatives
5. Searches for identity verification specs (SPEC-091)
6. Synthesizes comprehensive answer with multiple recovery options
```

## Privacy and Security

- All AI processing happens within the Oracle system
- No specification content is sent to external services
- Claude Code SDK calls include only queries and metadata
- Audit logs track all AI investigations