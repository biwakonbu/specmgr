# Oracle CLI

Oracle CLI is an F# implementation of the specification management and verification system, providing bidirectional verification between specifications and implementations.

## Quick Start

### Prerequisites
- .NET 8.0 SDK
- Environment variables:
  - `ANTHROPIC_API_KEY`: Claude Code SDK API key
  - `QDRANT_URL`: Qdrant endpoint (default: http://localhost:6333)
  - `SPECMGR_URL`: SpecMgr API endpoint (default: http://localhost:3000)

### Installation
```bash
cd src/cli
dotnet build oracle-cli.sln
```

### Usage
```bash
# Search specifications
oracle find-spec "user registration"

# Check implementation against specification
oracle check src/auth/registration.py --spec features/user-management/registration.yaml

# Show specification content
oracle show features/user-management/registration.yaml

# List specifications
oracle list --tag authentication
```

## Development

### Build
```bash
dotnet build
```

### Test
```bash
dotnet test
```

### Run
```bash
dotnet run --project OracleCli -- find-spec "example query"
```

## Architecture

- **OracleCli.Core**: Domain types and business logic
- **OracleCli.Services**: External service integrations (RAG, AI, existing API)
- **OracleCli.Commands**: Command parsing and execution
- **OracleCli**: Main CLI application entry point

## Documentation

See [ORACLE.md](ORACLE.md) for detailed implementation documentation.