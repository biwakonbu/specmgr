# Oracle Command Reference

## Overview
Oracle is a CLI tool for specification management, querying, and validation.

## Installation
```bash
# Run in Python environment
pip install oracle-spec

# Or in development environment
cd specmgr
python -m oracle
```

## Commands

### 1. Specification Query: `oracle ask`
Ask questions about specifications during development.

```bash
# Basic query
oracle ask "Tell me about user authentication specifications"

# Compare with implementation
oracle ask "Does this code comply with the specification?" --file src/auth.py

# Reference specific version
oracle ask "Email validation spec" --version 2.1
```

### 2. Specification Update: `oracle update`
Safely update specifications through the system.

```bash
# Interactive update
oracle update

# Update with file specification
oracle update --spec docs/specifications/auth.yaml --reason "Enhanced security requirements"

# Specify approver
oracle update --approver tech-lead@example.com
```

### 3. Integrity Validation: `oracle verify`
Check for tampering of specification documents.

```bash
# Verify current branch
oracle verify

# Verify specific branch
oracle verify --branch feature/new-auth

# Verify with time period
oracle verify --since 2024-01-01

# Verbose output
oracle verify --verbose
```

### 4. List Specifications: `oracle list`
Display list of managed specifications.

```bash
# List all specifications
oracle list

# By category
oracle list --category auth

# Search
oracle list --search "authentication"
```

### 5. Show Specification Details: `oracle show`
Display details of a specific specification.

```bash
# By ID
oracle show SPEC-001

# Latest version
oracle show SPEC-001 --latest

# Show history
oracle show SPEC-001 --history
```

## Output Examples

### `oracle verify` output
```
Oracle: Specification Integrity Check
=====================================
Target: main branch
Period: 2024-01-01 to present

✅ Validation Result: OK
- Verified commits: 42
- Specification changes: 8
- Last checked: 2024-01-30 10:00:00
```

### `oracle ask` output
```
Oracle: Specification Query
===========================
Question: Tell me about user authentication specifications

Answer:
User Authentication Specification (SPEC-001 v2.1)
1. Email Address Validation
   - RFC5322 compliant
   - Maximum 254 characters
   
2. Password Requirements
   - Minimum 12 characters
   - Required: uppercase, lowercase, numbers, symbols
   
Related specs: SPEC-002 (2FA), SPEC-003 (Session Management)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| ORACLE_SECRET | Secret key for signature generation | ✓ |
| ORACLE_REPO | Path to specification repository | - |
| ORACLE_EDITOR | Editor for specification editing | - |

## Configuration File
Detailed configuration is possible with `.oracle/config.yaml`.

```yaml
# .oracle/config.yaml
signature:
  algorithm: "HMAC-SHA256"
  length: 8

paths:
  specifications: "docs/specifications"
  index: "docs/spec-index.json"

validation:
  strict_mode: true
  allow_unsigned_commits: false
```