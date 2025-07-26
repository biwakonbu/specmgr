# Claude Code SDK Python Guide

## Overview

Claude Code SDK Python is a library that provides a programmatic interface between Claude Code CLI and Python applications. This SDK enables AI-assisted code development workflows to be executed directly from Python.

## Installation

### Prerequisites
- Python 3.10+
- Node.js (required for Claude Code CLI)
- Claude Code CLI installed

### SDK Installation
```bash
pip install claude-code-sdk
```

## Basic Usage

### Simple Query
```python
import anyio
from claude_code_sdk import query

async def main():
    async for message in query(prompt="What is 2 + 2?"):
        print(message)

anyio.run(main)
```

### Query with Custom Options
```python
import anyio
from claude_code_sdk import (
    AssistantMessage,
    ClaudeCodeOptions,
    TextBlock,
    query,
)

async def with_options_example():
    options = ClaudeCodeOptions(
        system_prompt="You are a helpful assistant that explains things simply.",
        max_turns=1,
    )

    async for message in query(
        prompt="Explain what Python is in one sentence.", 
        options=options
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")

anyio.run(with_options_example)
```

### Query with Tools
```python
import anyio
from claude_code_sdk import (
    AssistantMessage,
    ClaudeCodeOptions,
    ResultMessage,
    TextBlock,
    query,
)

async def with_tools_example():
    options = ClaudeCodeOptions(
        allowed_tools=["Read", "Write"],
        system_prompt="You are a helpful file assistant.",
    )

    async for message in query(
        prompt="Create a file called hello.txt with 'Hello, World!' in it",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
        elif isinstance(message, ResultMessage) and message.total_cost_usd > 0:
            print(f"\nCost: ${message.total_cost_usd:.4f}")
```

## API Reference

### Main Functions

#### `query(prompt: str, options: ClaudeCodeOptions | None = None) -> AsyncIterator[Message]`
Sends a prompt to Claude Code and receives responses asynchronously.

**Parameters:**
- `prompt`: Text prompt to send to Claude
- `options`: Optional configuration settings for execution

### Message Types

#### `UserMessage`
Input message from the user

#### `AssistantMessage`
Response message from Claude (contains a list of content blocks)

#### `SystemMessage`
System message (includes subtype and metadata)

#### `ResultMessage`
Captures execution details (duration, cost, usage, etc.)

### Content Block Types

#### `TextBlock`
Simple text content

#### `ToolUseBlock`
Represents tool usage (includes ID, name, and input)

#### `ToolResultBlock`
Tool execution results (with optional content and error status)

### Configuration Options (ClaudeCodeOptions)

```python
@dataclass
class ClaudeCodeOptions:
    # Tool configuration
    allowed_tools: Optional[List[str]] = None
    disallowed_tools: Optional[List[str]] = None
    
    # System configuration
    system_prompt: Optional[str] = None
    
    # MCP (Model Context Protocol) configuration
    mcp_servers: Optional[List[McpServerConfig]] = None
    mcp_tools: Optional[List[str]] = None
    
    # Permission configuration
    permission_mode: Optional[PermissionMode] = None
    
    # Conversation management
    max_turns: Optional[int] = None
    
    # Model selection
    model: Optional[str] = None
    
    # Working directory
    working_directory: Optional[str] = None
```

### Error Handling

#### Available Error Types
- `ClaudeSDKError`: Base error class
- `CLIConnectionError`: Connection errors
- `CLINotFoundError`: CLI not found
- `ProcessError`: Process execution errors
- `CLIJSONDecodeError`: JSON decode errors

## Embedding Generation and Vectorization

**Important**: Claude Code SDK Python provides embedding generation capabilities through the Claude API. This integration allows for consistent semantic understanding between chat and search functionality.

## Integration with This Project

In the current project (Local DocSearch & Chat Assistant), Claude Code SDK Python can be utilized for the following purposes:

### 1. Chat Functionality
```python
# Implementation example in src/server/services/chatService.py
from claude_code_sdk import query, ClaudeCodeOptions

async def generate_chat_response(user_prompt: str, context_docs: List[str]):
    # System prompt including search results as context
    system_prompt = f"""
    You are a helpful assistant for document search and analysis.
    Use the following documents as context:
    
    {chr(10).join(context_docs)}
    """
    
    options = ClaudeCodeOptions(
        system_prompt=system_prompt,
        max_turns=1,
    )
    
    response_text = ""
    async for message in query(prompt=user_prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response_text += block.text
    
    return response_text
```

### 2. Document Summarization
```python
async def summarize_document(content: str):
    options = ClaudeCodeOptions(
        system_prompt="Summarize the following markdown document concisely:",
        max_turns=1,
    )
    
    summary = ""
    async for message in query(prompt=content, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    summary += block.text
    
    return summary
```

### 3. Embedding Generation (Using Claude Code SDK)
```python
# Implementation example in src/server/services/embeddingService.py
from anthropic import Anthropic

class EmbeddingService:
    def __init__(self):
        self.client = Anthropic()
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for markdown documents using Claude Code SDK"""
        # Implementation would use Claude's embedding capabilities
        # when available through the SDK
        pass
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for search query using Claude Code SDK"""
        # Implementation would use Claude's embedding capabilities
        # when available through the SDK
        pass
```

## Performance Considerations

### Rate Limiting
- Be aware of Claude Code SDK API rate limits
- Consider efficiency through batch processing

### Error Handling
- Proper fallbacks for network connection errors
- Retry functionality with exponential backoff

### Cost Management
- Monitor costs with `ResultMessage.total_cost_usd`
- Avoid unnecessarily long prompts

## Security

- Manage API keys through environment variables
- Do not include sensitive information in prompts
- Operate in local environments as a principle

## References

- [Claude Code SDK Python GitHub Repository](https://github.com/anthropics/claude-code-sdk-python)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic API Documentation](https://docs.anthropic.com/en/api)

---

*Last Updated: 2025-07-26*