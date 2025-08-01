# Naming and File Placement Rules

## Overview

This document defines the naming conventions and file placement rules for the Oracle specification system. These rules ensure consistency, traceability, and maintainability across all specification documents.

## File Naming Conventions

### 1. General Rules

- **Case**: Use kebab-case (lowercase with hyphens)
- **Language**: English only
- **Length**: Maximum 50 characters
- **Characters**: Only lowercase letters, numbers, and hyphens
- **No versioning**: Git handles versions (no v1, v2, etc.)

### 2. Layer-Specific Naming

#### Requirements Layer
```
requirements/
├── {feature-area}-{requirement-type}.yaml
├── user-account-management.yaml
├── payment-processing.yaml
├── order-fulfillment.yaml
└── notification-system.yaml
```

#### Domain Features Layer
```
domain-features/
├── {domain}-{feature}.yaml
├── account-lifecycle.yaml
├── order-state-machine.yaml
├── payment-validation.yaml
└── inventory-management.yaml
```

#### System Features Layer
```
system-features/
├── {system}-{capability}.yaml
├── authentication-system.yaml
├── api-gateway.yaml
├── message-queue.yaml
└── caching-strategy.yaml
```

#### System Design Layer
```
system-design/
├── {component}-architecture.yaml
├── auth-architecture.yaml
├── data-flow-design.yaml
├── microservice-topology.yaml
└── deployment-strategy.yaml
```

#### Components Layer
```
components/
├── {module}-{component}.yaml
├── jwt-token-generator.yaml
├── email-validator.yaml
├── password-hasher.yaml
└── rate-limiter.yaml
```

### 3. Special Files

```
specifications/
├── _index.yaml              # Directory index (auto-generated)
├── _relationships.yaml      # Cross-references between specs
└── _validation-rules.yaml   # Custom validation rules
```

## ID Naming Conventions

**Note**: IDs are assigned INSIDE the YAML files, not in the filenames. See [ID and Lifecycle Details](id-and-lifecycle-details.md) for complete information.

### 1. ID Format

```yaml
# Pattern: {PREFIX}-{NUMBER}
# PREFIX: Layer-specific prefix (3-4 letters)
# NUMBER: Sequential number (3+ digits)

# These IDs go inside the YAML files:
REQ-001   # In requirements/*.yaml files
DF-001    # In domain-features/*.yaml files
SF-001    # In system-features/*.yaml files
SD-001    # In system-design/*.yaml files
COMP-001  # In components/*.yaml files
```

### Example: ID in File
```yaml
# File: specifications/requirements/payment-processing.yaml
requirement:
  id: "REQ-017"  # ← ID is here, inside the file
  title: "Secure payment processing"
  # ... rest of specification
```

### 2. ID Assignment Rules

- IDs are immutable once assigned
- Never reuse deleted IDs
- Sequential within each layer
- Zero-padded to minimum 3 digits

### 3. ID Namespaces

```yaml
namespaces:
  requirements:
    prefix: "REQ"
    start: 001
    current: 042
    
  domain_features:
    prefix: "DF"
    start: 001
    current: 028
```

## Directory Structure Rules

### 1. Hierarchy Principles

```
specifications/
├── requirements/           # What users need
│   ├── core/              # Core business requirements
│   ├── integrations/      # External system requirements
│   └── compliance/        # Regulatory requirements
│
├── domain-features/       # Business logic
│   ├── entities/          # Domain entities
│   ├── workflows/         # Business processes
│   └── rules/            # Business rules
│
├── system-features/       # Technical capabilities
│   ├── infrastructure/    # Infrastructure features
│   ├── security/         # Security features
│   └── performance/      # Performance features
│
├── system-design/        # Architecture
│   ├── patterns/         # Design patterns
│   ├── decisions/        # ADRs
│   └── diagrams/         # Architecture diagrams
│
└── components/           # Implementation specs
    ├── services/         # Service components
    ├── libraries/        # Shared libraries
    └── utilities/        # Utility components
```

### 2. Subdirectory Rules

- Maximum depth: 3 levels
- Subdirectories for logical grouping only
- Each subdirectory must have README.md
- Maintain consistent structure across layers

### 3. File Placement Decision Tree

```
Is it about what users need?
  → requirements/
  
Is it about business concepts/rules?
  → domain-features/
  
Is it about technical implementation?
  → system-features/
  
Is it about architecture/design?
  → system-design/
  
Is it about specific code components?
  → components/
```

## Cross-Reference Naming

### 1. Reference Format

```yaml
# In domain-features/order-processing.yaml
references:
  requirements: ["REQ-001", "REQ-002"]
  
# In components/order-validator.yaml  
references:
  domain_features: ["DF-001"]
  system_design: ["SD-003"]
```

### 2. Backward References

```yaml
# Automatically maintained by Oracle
implemented_by:
  - "components/order-validator.yaml"
  - "components/order-state-machine.yaml"
```

## Ubiquitous Language in Naming

### 1. Term Consistency

```yaml
# Good - Consistent terminology
account-lifecycle.yaml
account-activation.yaml
account-suspension.yaml

# Bad - Inconsistent terminology
user-lifecycle.yaml      # Should be "account"
profile-activation.yaml  # Should be "account"
```

### 2. Domain Term Mapping

```yaml
ubiquitous_terms:
  Account:
    files:
      - "domain-features/account-*.yaml"
      - "components/account-*.yaml"
    not_allowed:
      - "user"
      - "profile"
      - "member"
      
  Order:
    files:
      - "domain-features/order-*.yaml"
      - "components/order-*.yaml"
    not_allowed:
      - "purchase"
      - "transaction"
      - "sale"
```

## Type Definition File Naming

### 1. Shared Types

```yaml
types/
├── common/
│   ├── identifiers.yaml    # UUID, ID types
│   ├── timestamps.yaml     # Date/time types
│   └── money.yaml         # Financial types
│
├── domain/
│   ├── account-types.yaml
│   ├── order-types.yaml
│   └── payment-types.yaml
│
└── api/
    ├── request-types.yaml
    ├── response-types.yaml
    └── error-types.yaml
```

### 2. Type Import Conventions

```yaml
# In specifications
imports:
  - "../types/domain/account-types.yaml"
  - "../types/common/identifiers.yaml"
```

## Validation Rules

### 1. File Name Validation

```regex
^[a-z0-9]+(-[a-z0-9]+)*\.yaml$
```

### 2. ID Validation

```regex
^(REQ|DF|SF|SD|COMP)-[0-9]{3,}$
```

### 3. Oracle Validation Commands

```bash
# Validate file naming
oracle validate-naming specifications/

# Check for naming conflicts
oracle check-conflicts specifications/

# Verify ubiquitous language compliance
oracle check-ubiquitous-language specifications/
```

## Migration Guidelines

### 1. Renaming Files

```bash
# Use Oracle to maintain references
oracle rename-spec old-name.yaml new-name.yaml

# This will:
# 1. Rename the file
# 2. Update all references
# 3. Update the index
# 4. Create redirect entry
```

### 2. Moving Files

```bash
# Move between layers with reference updates
oracle move-spec requirements/feature.yaml domain-features/feature.yaml
```

## Best Practices

### 1. Naming Checklist

- [ ] Uses kebab-case
- [ ] Under 50 characters
- [ ] Reflects domain language
- [ ] No version numbers
- [ ] No implementation details
- [ ] Consistent with existing files

### 2. Placement Checklist

- [ ] Correct layer for abstraction level
- [ ] Appropriate subdirectory
- [ ] Cross-references updated
- [ ] Index updated
- [ ] README updated if new directory

### 3. Common Mistakes

```yaml
# ❌ Bad Examples
UserManagement.yaml          # Wrong case
user-mgmt-v2.yaml           # Version number
user-crud-operations.yaml   # Implementation detail
temp-user-handling.yaml     # Not ubiquitous language
user_management.yaml        # Underscore instead of hyphen

# ✅ Good Examples
user-management.yaml
account-lifecycle.yaml
order-processing.yaml
payment-validation.yaml
```

## Automation Support

### 1. File Templates

```bash
# Generate new specification file
oracle new-spec --layer domain-features --name "inventory-tracking"

# Creates: domain-features/inventory-tracking.yaml
# With template content and next available ID
```

### 2. Naming Suggestions

```bash
# Get naming suggestions
oracle suggest-name --description "handles user login and logout"

# Suggestions:
# - authentication-flow.yaml
# - session-management.yaml
# - login-process.yaml
```

### 3. Continuous Validation

```yaml
# .github/workflows/validate-specs.yml
- name: Validate Specifications
  run: |
    oracle validate-naming specifications/
    oracle check-ubiquitous-language specifications/
    oracle verify-references specifications/
```

## Quick Reference

### Layer Prefixes
- `REQ-` : Requirements
- `DF-`  : Domain Features
- `SF-`  : System Features  
- `SD-`  : System Design
- `COMP-`: Components

### File Patterns
- Requirements: `{feature-area}-{requirement-type}.yaml`
- Domain: `{domain}-{feature}.yaml`
- System: `{system}-{capability}.yaml`
- Design: `{component}-architecture.yaml`
- Components: `{module}-{component}.yaml`

### Validation Regex
- File names: `^[a-z0-9]+(-[a-z0-9]+)*\.yaml$`
- IDs: `^(REQ|DF|SF|SD|COMP)-[0-9]{3,}$`