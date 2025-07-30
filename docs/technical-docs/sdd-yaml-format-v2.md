# SDD YAML Format v2 - Simplified Natural Language Approach

## Overview

This guide defines the simplified YAML format for specifications without IDs, focusing on natural language discovery and intuitive organization.

## Basic Structure

### 1. Feature Specifications

```yaml
# Location: specifications/features/{domain}/{feature-name}.yaml
feature:
  title: "Human-readable title"
  description: |
    Clear description of what this feature does
    
  tags: ["searchable", "tags", "here"]
  keywords: ["additional", "search", "terms"]
  
  # What users need
  requirements:
    - "Clear requirement statement"
    - "Another requirement"
    
  # How it works
  flow:
    - "Step 1: User action"
    - "Step 2: System response"
    - "Step 3: Result"
    
  # Business rules
  rules:
    - "Rule that must always be true"
    - "Another business constraint"
    
  # Implementation hints
  implementation:
    files: ["src/feature.py"]
    notes: "Optional implementation guidance"
```

### 2. Technical Specifications

```yaml
# Location: specifications/technical/{area}/{topic}.yaml
technical:
  title: "Technical component name"
  description: |
    What this technical component does
    
  tags: ["technical", "infrastructure"]
  
  # Technical requirements
  requirements:
    performance: "< 100ms response time"
    availability: "99.9% uptime"
    security: "TLS 1.3 required"
    
  # Architecture decisions
  decisions:
    - choice: "Redis for caching"
      reason: "Low latency, simple deployment"
      alternatives: ["Memcached", "In-memory"]
      
  # Configuration
  configuration:
    redis:
      max_connections: 100
      timeout: 5000
      
  implementation:
    files: ["src/cache/redis_client.py"]
```

### 3. Domain Models

```yaml
# Location: specifications/domain/{entity}.yaml
domain:
  title: "Domain Entity Name"
  description: |
    Core domain concept description
    
  tags: ["domain", "entity"]
  
  # Domain language
  ubiquitous_language:
    Entity: "What this entity represents"
    RelatedTerm: "Definition of related concept"
    
  # Entity states
  states: ["created", "active", "archived"]
  
  # State transitions
  transitions:
    created:
      - to: "active"
        when: "activation criteria met"
    active:
      - to: "archived"
        when: "archival criteria met"
        
  # Invariants
  invariants:
    - "Entity must always have an owner"
    - "Archived entities cannot be modified"
```

## Type Definitions (Simplified)

### 1. Inline Types

```yaml
types:
  # Simple types with constraints
  Email:
    base: string
    pattern: "^[^@]+@[^@]+\\.[^@]+$"
    
  Age:
    base: integer
    min: 0
    max: 150
    
  Money:
    base: decimal
    precision: 2
    min: 0
```

### 2. Composite Types

```yaml
types:
  Address:
    street: string
    city: string
    postal_code:
      base: string
      pattern: "^\\d{5}$"
      
  User:
    email: Email  # Reference to defined type
    age: Age
    address: Address
```

### 3. Validation Rules

```yaml
validation:
  email:
    required: true
    unique: true
    
  password:
    required: true
    min_length: 8
    must_contain:
      - uppercase
      - lowercase
      - number
      
  age:
    required: false
    min: 18  # For this specific use case
```

## Real-World Examples

### 1. User Registration

```yaml
# specifications/features/user-management/registration.yaml
feature:
  title: "User Registration"
  description: |
    New users can create accounts using email and password
    
  tags: ["user", "registration", "authentication"]
  keywords: ["signup", "create account", "new user"]
  
  requirements:
    - "Unique email address required"
    - "Password must be secure"
    - "Email verification required"
    - "Terms must be accepted"
    
  flow:
    - "User provides email and password"
    - "System validates input"
    - "System sends verification email"
    - "User clicks verification link"
    - "Account becomes active"
    
  validation:
    email:
      type: email
      unique: true
      check: "not exists in database"
      
    password:
      min_length: 8
      requires: ["uppercase", "lowercase", "number"]
      
  errors:
    email_exists: "This email is already registered"
    weak_password: "Password doesn't meet requirements"
    
  dependencies:
    - "../email/verification-email.yaml"
    - "../../domain/user-account.yaml"
    
  implementation:
    backend: ["src/auth/registration.py"]
    frontend: ["src/components/RegistrationForm.tsx"]
    tests: ["tests/auth/test_registration.py"]
```

### 2. Shopping Cart

```yaml
# specifications/features/e-commerce/shopping-cart.yaml
feature:
  title: "Shopping Cart"
  description: |
    Users can add items to cart and proceed to checkout
    
  tags: ["e-commerce", "cart", "shopping"]
  keywords: ["add to cart", "remove item", "update quantity"]
  
  requirements:
    - "Cart persists across sessions"
    - "Real-time inventory checking"
    - "Price updates automatically"
    
  rules:
    - "Cannot add out-of-stock items"
    - "Maximum 99 quantity per item"
    - "Cart expires after 7 days"
    
  operations:
    add_item:
      input: ["product_id", "quantity"]
      validates: ["product exists", "in stock", "quantity > 0"]
      updates: ["cart total", "item count"]
      
    remove_item:
      input: ["cart_item_id"]
      updates: ["cart total", "item count"]
      
    update_quantity:
      input: ["cart_item_id", "new_quantity"]
      validates: ["quantity > 0", "quantity <= 99", "in stock"]
      
  implementation:
    api: ["src/api/cart.py"]
    state: ["src/store/cartSlice.ts"]
```

### 3. Email Service

```yaml
# specifications/technical/messaging/email-service.yaml
technical:
  title: "Email Service"
  description: |
    Centralized email sending with templates and tracking
    
  tags: ["email", "messaging", "infrastructure"]
  
  capabilities:
    - "Template-based emails"
    - "Delivery tracking"
    - "Retry on failure"
    - "Rate limiting"
    
  configuration:
    provider: "SendGrid"
    rate_limit: "100/minute"
    retry_attempts: 3
    retry_delay: "exponential"
    
  templates:
    verification:
      subject: "Verify your email"
      variables: ["name", "verification_link"]
      
    password_reset:
      subject: "Reset your password"
      variables: ["name", "reset_link", "expires_in"]
      
  error_handling:
    - error: "rate_limit_exceeded"
      action: "queue for later"
    - error: "invalid_email"
      action: "log and skip"
      
  implementation:
    service: ["src/services/email.py"]
    templates: ["templates/email/"]
```

## Best Practices

### 1. File Organization

```
specifications/
├── features/           # User-facing features
│   ├── user-management/
│   ├── e-commerce/
│   └── messaging/
├── technical/         # Technical components
│   ├── infrastructure/
│   ├── security/
│   └── performance/
├── domain/           # Business domain models
│   ├── user.yaml
│   ├── order.yaml
│   └── product.yaml
└── shared/          # Shared definitions
    ├── types/
    └── validators/
```

### 2. Writing Clear Specifications

- **Title**: Short, descriptive, searchable
- **Description**: Explain the "what" and "why"
- **Tags**: 3-5 relevant tags for search
- **Requirements**: Clear, testable statements
- **Examples**: Include realistic scenarios

### 3. Natural Language

```yaml
# Good: Natural, clear language
requirements:
  - "Users must verify their email before using the system"
  - "Passwords expire every 90 days"
  
# Avoid: Technical jargon in requirements
requirements:
  - "Implement JWT with RS256 algorithm"  # Too technical
  - "Use bcrypt with cost factor 12"      # Implementation detail
```

### 4. Cross-References

```yaml
# Use relative paths
dependencies:
  - "../email/send-verification.yaml"
  - "../../domain/user.yaml"
  
# Or from spec root
dependencies:
  - "/specifications/domain/user.yaml"
  - "/specifications/technical/email-service.yaml"
```

## Oracle Integration

### Discovery

```bash
# Natural language search
oracle find "user registration"
oracle find "email verification process"

# Tag search
oracle search --tags user,email

# Show related specs
oracle related features/user-management/registration.yaml
```

### Validation

```bash
# Validate specification
oracle validate features/user-management/registration.yaml

# Check implementation
oracle check src/auth/registration.py
# Automatically finds and validates against the corresponding spec
```

### Implementation Tracking

```bash
# See what's not implemented
oracle unimplemented

# See what's in progress
oracle in-progress

# Check coverage
oracle coverage features/
```

## Benefits Over ID-Based System

1. **No Mental Mapping**: No need to remember "REQ-042 is user registration"
2. **Natural Discovery**: Find specs the way you think about them
3. **Contextual Organization**: Related specs are physically near each other
4. **IDE-Friendly**: File paths work with autocomplete and navigation
5. **Git-Friendly**: Moving/renaming is tracked naturally
6. **Human-Readable**: Everything uses natural language

## Migration Tips

### From Version 1 to Version 2

```bash
# Automated migration
oracle migrate v1-to-v2

# What it does:
# 1. Removes 'id' fields
# 2. Converts ID references to file paths
# 3. Adds tags based on content
# 4. Reorganizes files by domain
```

### Manual Migration

1. Remove `id` fields from YAML
2. Replace ID references with file paths
3. Add meaningful tags and keywords
4. Organize files by domain/feature
5. Update implementation references