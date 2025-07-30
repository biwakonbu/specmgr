# Specification Format v2 - ID-Free Natural Approach

## Overview

This document defines the simplified specification format that removes IDs in favor of natural language search and file-path based references.

## Core Principles

### 1. No IDs Required
- File paths serve as unique identifiers
- Natural language search is the primary discovery method
- References use relative file paths

### 2. Natural Organization
```
specifications/
├── user-management/
│   ├── registration.yaml
│   ├── login.yaml
│   ├── password-reset.yaml
│   └── account-deletion.yaml
├── order-processing/
│   ├── cart-management.yaml
│   ├── checkout-flow.yaml
│   ├── payment-processing.yaml
│   └── order-tracking.yaml
└── notifications/
    ├── email-templates.yaml
    ├── push-notifications.yaml
    └── sms-alerts.yaml
```

## Simplified YAML Format

### Feature Specification

```yaml
# specifications/user-management/registration.yaml
feature:
  title: "User Registration"
  description: |
    Allow new users to create accounts with email and password
    
  tags: ["user", "registration", "signup", "onboarding"]
  keywords: ["email verification", "password requirements", "terms acceptance"]
  
  requirements:
    - "Email must be unique"
    - "Password minimum 8 characters"
    - "Must accept terms of service"
    - "Email verification required"
    
  user_flow:
    - "User fills registration form"
    - "System sends verification email"
    - "User clicks verification link"
    - "Account becomes active"
    
  validation_rules:
    email:
      type: Email
      unique: true
      required: true
      
    password:
      type: String
      min_length: 8
      must_contain: ["uppercase", "lowercase", "number"]
      
  error_cases:
    - case: "Email already exists"
      message: "This email is already registered"
      
    - case: "Weak password"
      message: "Password must contain uppercase, lowercase, and number"
      
  dependencies:
    - "../email-service/send-verification.yaml"
    - "../database/user-schema.yaml"
    
  implementation:
    - "src/auth/registration.py"
    - "src/validators/email.py"
    - "tests/auth/test_registration.py"
```

### Technical Specification

```yaml
# specifications/infrastructure/caching-strategy.yaml
technical_spec:
  title: "Caching Strategy"
  description: |
    Redis-based caching for performance optimization
    
  tags: ["cache", "redis", "performance"]
  
  cache_layers:
    - name: "Session Cache"
      ttl: "15 minutes"
      key_pattern: "session:{user_id}"
      
    - name: "API Response Cache"
      ttl: "5 minutes"
      key_pattern: "api:{endpoint}:{params_hash}"
      
  invalidation_rules:
    - trigger: "User data update"
      invalidates: ["session:{user_id}", "api:user:*"]
      
  implementation:
    - "src/cache/redis_client.py"
    - "src/middleware/cache_middleware.py"
```

### Domain Model

```yaml
# specifications/domain/user-account.yaml
domain:
  title: "User Account"
  description: |
    Core user account entity and its lifecycle
    
  tags: ["user", "account", "domain"]
  
  states:
    - "pending"      # Awaiting email verification
    - "active"       # Verified and usable
    - "suspended"    # Temporarily disabled
    - "deleted"      # Soft deleted
    
  transitions:
    pending:
      - to: "active"
        when: "email verified"
        
    active:
      - to: "suspended"
        when: "admin action or policy violation"
      - to: "deleted"
        when: "user requests deletion"
        
    suspended:
      - to: "active"
        when: "suspension lifted"
      - to: "deleted"
        when: "grace period expired"
        
  business_rules:
    - "Email must be unique across all accounts"
    - "Suspended accounts cannot login"
    - "Deleted accounts retain data for 30 days"
    
  ubiquitous_language:
    Account: "User's presence in the system"
    Verification: "Email confirmation process"
    Suspension: "Temporary access restriction"
```

## Search and Discovery

### Natural Language Queries

```bash
# Find specifications
oracle find "user registration"
oracle find "password reset flow"
oracle find "email verification"

# Ask questions
oracle ask "How does user registration work?"
oracle ask "What are the password requirements?"
oracle ask "How to implement email verification?"

# Find related specs
oracle related "user-management/registration.yaml"
```

### Tag-Based Search

```bash
# Search by tags
oracle search --tag user
oracle search --tag cache
oracle search --tag payment

# Multiple tags
oracle search --tags user,registration
```

### Keyword Search

```bash
# Full-text search
oracle search "email verification"
oracle search "redis cache"
```

## File References

### Relative Paths

```yaml
# From user-management/registration.yaml
dependencies:
  - "../email-service/verification.yaml"  # Sibling directory
  - "./password-rules.yaml"               # Same directory
  - "../../shared/types/email.yaml"       # Parent directories
```

### Implementation References

```yaml
# Link to actual code
implementation:
  - "src/auth/registration.py"
  - "src/models/user.py"
  - "tests/auth/test_registration.py"
```

## Lifecycle Management Without IDs

### State Tracking

```yaml
# In each specification file
metadata:
  state: "approved"  # draft | review | approved | implementing | verified
  last_modified: "2024-01-26"
  approved_by: "alice@example.com"
  implemented_by: "bob@example.com"
```

### Commands Using File Paths

```bash
# Check status
oracle status user-management/registration.yaml

# Change state
oracle approve user-management/registration.yaml
oracle implement user-management/registration.yaml

# Bulk operations
oracle list --state draft
oracle list --state implementing --assigned-to me
```

## Type System Without IDs

### Inline Type Definitions

```yaml
# Define types where needed
types:
  Email:
    base: string
    pattern: "^[^@]+@[^@]+\\.[^@]+$"
    
  Password:
    base: string
    min_length: 8
    constraints:
      - "Must contain uppercase"
      - "Must contain lowercase"
      - "Must contain number"
```

### Shared Types via File Import

```yaml
# Import shared types
imports:
  - "../../shared/types/common.yaml"
  - "../../shared/types/domain.yaml"

# Use imported types
fields:
  email:
    type: Email  # From common.yaml
  status:
    type: AccountStatus  # From domain.yaml
```

## Benefits of ID-Free Approach

### 1. Intuitive Navigation
- Find specs by browsing familiar directory structure
- No need to memorize arbitrary IDs
- File names describe content

### 2. Natural Language First
- Search using terms you'd naturally use
- Ask questions in plain language
- Tags and keywords improve discoverability

### 3. Simplified References
- Use file paths everyone understands
- IDE can validate and auto-complete paths
- Refactoring tools can update references

### 4. Reduced Cognitive Load
- No ID allocation management
- No ID uniqueness concerns
- No mapping between IDs and files

## Migration from ID-Based System

### For Existing Specifications

```bash
# Remove ID fields
oracle migrate remove-ids

# This will:
# 1. Remove 'id' fields from all YAML files
# 2. Convert ID-based references to file paths
# 3. Update any ID-based indexes
```

### Reference Conversion

```yaml
# Before (with IDs)
implements: ["REQ-001", "DF-003"]

# After (with paths)
implements: 
  - "../requirements/user-registration.yaml"
  - "../domain/account-lifecycle.yaml"
```

## Bidirectional Verification

Oracle supports both specification-to-implementation and implementation-to-specification verification. See [Bidirectional Verification System](bidirectional-verification-system.md) for details.

### Key Features
- Find specifications from code files
- Check code compliance in real-time
- Monitor AI-generated code
- Natural development workflow

## Oracle Commands Summary

### Discovery Commands
```bash
oracle find "search terms"      # Natural language search
oracle search --tag tagname     # Tag-based search
oracle search "keywords"        # Full-text search
oracle related <file>          # Find related specs
```

### Implementation Commands
```bash
# From specification
oracle status <spec-file>       # Check implementation status
oracle implement <spec-file>    # List what needs implementing

# From code (bidirectional)
oracle spec <code-file>        # Find spec for code
oracle check <code-file>       # Check code against spec
oracle watch <code-file>       # Real-time monitoring
oracle requirements <code-file> # Show requirements for code
```

### Management Commands
```bash
oracle approve <file>          # Approve specification
oracle verify <file>           # Verify implementation
oracle guard --ai-mode         # Monitor AI changes
```

### Validation Commands
```bash
oracle validate <file>         # Validate specification format
oracle check-all src/          # Check all implementations
oracle check-pr PR-123         # Check pull request
oracle coverage --min 90       # Check specification coverage
```

## Best Practices

### 1. File Naming
- Use descriptive kebab-case names
- Group related specs in directories
- Keep names concise but clear

### 2. Organization
- Logical directory structure
- Maximum 3 levels deep
- Related specs near each other

### 3. Search Optimization
- Add relevant tags
- Include keywords users might search
- Write clear descriptions

### 4. References
- Use relative paths when possible
- Validate paths exist
- Update when moving files