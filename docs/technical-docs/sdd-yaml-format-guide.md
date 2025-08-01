# SDD YAML Format Guide

## Overview

This guide defines the detailed YAML format for Specification-Driven Development (SDD) across all layers of the specification hierarchy. Each layer has specific fields and structures optimized for its purpose.

## Layer-Specific YAML Formats

### 1. Requirements Layer (requirements/)

User-facing requirements focusing on what users need.

```yaml
requirement:
  id: "REQ-001"
  title: "User account creation"
  description: |
    Users need to create accounts to access personalized features
  
  user_stories:
    - as: "new visitor"
      want: "create an account"
      so_that: "access personalized features"
      
  acceptance_criteria:
    - "User can register with email and password"
    - "Email verification is required"
    - "User receives welcome email after verification"
    
  priority: "high"
  stakeholders: ["product_owner", "ux_team"]
```

### 2. Domain Features Layer (domain-features/)

Business logic and domain concepts.

```yaml
domain_feature:
  id: "DF-001"
  title: "Account lifecycle management"
  description: |
    Manages the complete lifecycle of user accounts from registration to deletion
    
  requirements: ["REQ-001", "REQ-002"]
  
  ubiquitous_language:
    entities:
      Registrant: "A user who has started but not completed registration"
      PendingAccount: "An account awaiting email verification"
      ActiveAccount: "A verified, usable account"
      SuspendedAccount: "An account temporarily disabled"
      
    value_objects:
      Email: "User's email address"
      VerificationToken: "Token sent for email verification"
      
    states:
      - "registrant"
      - "pending"
      - "active"
      - "suspended"
      - "deleted"
      
    transitions:
      registrant: ["pending"]
      pending: ["active", "deleted"]
      active: ["suspended", "deleted"]
      suspended: ["active", "deleted"]
      
  business_rules:
    - id: "BR-001"
      rule: "Email must be unique across all accounts"
      enforcement: "database_constraint"
      
    - id: "BR-002"
      rule: "Verification must complete within 24 hours"
      enforcement: "scheduled_job"
      
  domain_events:
    - "RegistrantCreated"
    - "AccountVerified"
    - "AccountSuspended"
    - "AccountDeleted"
```

### 3. System Features Layer (system-features/)

Technical implementation features.

```yaml
system_feature:
  id: "SF-001"
  title: "Authentication system"
  description: |
    JWT-based authentication with refresh tokens
    
  domain_features: ["DF-001"]
  
  technical_requirements:
    - "Support JWT with RS256 signing"
    - "Refresh token rotation"
    - "Session management with Redis"
    
  api_specifications:
    - endpoint: "POST /auth/login"
      request:
        email: "string"
        password: "string"
      response:
        access_token: "string"
        refresh_token: "string"
        expires_in: "number"
        
    - endpoint: "POST /auth/refresh"
      request:
        refresh_token: "string"
      response:
        access_token: "string"
        refresh_token: "string"
        
  performance_requirements:
    - "Login response < 200ms (p95)"
    - "Token validation < 10ms"
    
  security_requirements:
    - "Tokens expire in 15 minutes"
    - "Refresh tokens single use only"
    - "Rate limiting: 5 attempts per minute"
```

### 4. System Design Layer (system-design/)

Architecture and design decisions.

```yaml
system_design:
  id: "SD-001"
  title: "Authentication architecture"
  description: |
    Microservice architecture for authentication subsystem
    
  system_features: ["SF-001", "SF-002"]
  
  architecture_decisions:
    - decision: "Use separate auth service"
      rationale: "Isolation of security concerns"
      consequences: 
        - "Additional service to maintain"
        - "Network latency for auth checks"
        
    - decision: "Redis for session storage"
      rationale: "Fast access and TTL support"
      alternatives_considered: ["PostgreSQL", "In-memory"]
      
  components:
    AuthService:
      type: "microservice"
      responsibilities:
        - "User authentication"
        - "Token generation and validation"
        - "Session management"
      interfaces:
        - "REST API"
        - "gRPC for internal calls"
        
    TokenValidator:
      type: "library"
      responsibilities:
        - "JWT validation"
        - "Claims extraction"
        
  data_flow:
    login:
      - "Client sends credentials to AuthService"
      - "AuthService validates against UserDB"
      - "Generate JWT and refresh token"
      - "Store session in Redis"
      - "Return tokens to client"
      
  deployment:
    containerization: "Docker"
    orchestration: "Kubernetes"
    scaling: "Horizontal with load balancer"
```

### 5. Components Layer (components/)

Detailed implementation specifications.

```yaml
component:
  id: "COMP-001"
  title: "JWT token generator"
  description: |
    Generates and signs JWT tokens for authentication
    
  system_design: ["SD-001"]
  
  types:
    TokenPayload:
      properties:
        user_id: 
          type: UserId
          constraints:
            required: true
            immutable: true
        roles: 
          type: string[]
          constraints:
            minItems: 1
            itemType: Role
        issued_at: 
          type: datetime
          constraints:
            immutable: true
            default: "now()"
        expires_at:
          type: datetime
          constraints:
            future: true
            
    TokenPair:
      properties:
        access_token:
          type: string
          constraints:
            pattern: "^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$"
        refresh_token:
          type: string
          constraints:
            format: uuid
            
  operations:
    generateTokenPair:
      inputs:
        user:
          type: AuthenticatedUser
          constraints:
            required: true
        device_id:
          type: string
          constraints:
            optional: true
            
      outputs:
        token_pair:
          type: TokenPair
          
      errors:
        - code: "INVALID_USER"
          condition: "user.status != 'active'"
          message: "User account is not active"
          
      test_cases:
        - name: "Generate tokens for active user"
          input:
            user: { id: "123", status: "active", roles: ["user"] }
          expect: "success"
          
        - name: "Reject suspended user"
          input:
            user: { id: "456", status: "suspended", roles: ["user"] }
          expect: "error:INVALID_USER"
```

## Type Constraint System

**Note**: For the theoretical foundation of types as sets, type relationships, and transformation filters, see the [Type System Theory](type-system-theory.md) document.

### Basic Constraints

```yaml
types:
  Email:
    base: string
    constraints:
      format: email
      maxLength: 255
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      
  UserId:
    base: string
    constraints:
      format: uuid
      immutable: true
      
  Age:
    base: integer
    constraints:
      min: 0
      max: 150
      
  Price:
    base: decimal
    constraints:
      min: 0
      precision: 10
      scale: 2
```

### Constraint Types

#### Value Constraints
- `required`: Field must be present
- `optional`: Field may be omitted (default)
- `nullable`: Field may be null
- `default`: Default value if omitted
- `immutable`: Cannot be changed after creation
- `unique`: Must be unique across all instances

#### String Constraints
- `minLength`: Minimum character count
- `maxLength`: Maximum character count
- `pattern`: Regex pattern to match
- `format`: Predefined format (email, url, uuid, date, time, datetime, ip, hostname)
- `enum`: List of allowed values
- `encoding`: Character encoding (utf-8, ascii, etc.)

#### Numeric Constraints
- `min`: Minimum value (inclusive)
- `max`: Maximum value (inclusive)
- `exclusiveMin`: Minimum value (exclusive)
- `exclusiveMax`: Maximum value (exclusive)
- `multipleOf`: Must be multiple of specified value
- `precision`: Total digits (for decimal)
- `scale`: Decimal places (for decimal)

#### Array Constraints
- `minItems`: Minimum array length
- `maxItems`: Maximum array length
- `uniqueItems`: All items must be unique
- `itemType`: Type of array elements

#### Temporal Constraints
- `future`: Must be future date/time
- `past`: Must be past date/time
- `after`: Must be after specified date/time
- `before`: Must be before specified date/time
- `timezone`: Required timezone

#### Custom Constraints
- `businessRule`: Business rule expression
- `validator`: Custom validator function name
- `depends`: Dependencies on other fields
- `crossField`: Cross-field validation

### Set-Based Type Definitions

```yaml
types:
  # Define types as sets
  Natural:
    set: "{ x ∈ ℤ | x ≥ 0 }"
    subset_of: Integer
    
  Email:
    set: "{ s ∈ String | s matches RFC5322 }"
    subset_of: String
    
  # Union types
  NullableEmail:
    union_of: [Email, Null]
    
  # Intersection types  
  SecurePassword:
    intersection_of: [
      MinLength8String,
      ContainsUppercase,
      ContainsLowercase,
      ContainsDigit
    ]
    
  # Refinement types
  AdultAge:
    base: Age
    refine: "x ≥ 18"
```

### Type Transformation Filters

```yaml
filters:
  NormalizeEmail:
    input: String
    output: Email
    transform: "x => toLowerCase(trim(x))"
    validates: "IsValidEmail(result)"
    throws: "InvalidEmailError"
    
  ParseAge:
    input: BirthDate
    output: Age
    transform: "date => yearsBetween(date, today())"
    
  RequireAdult:
    input: Age
    output: AdultAge
    validates: "age ≥ 18"
    throws: "UnderageError"
```

### Complex Type Examples

```yaml
types:
  Address:
    properties:
      street: 
        type: string
        constraints:
          required: true
          maxLength: 100
      city:
        type: string
        constraints:
          required: true
          maxLength: 50
      postalCode:
        type: string
        constraints:
          pattern: "^\\d{3}-\\d{4}$"  # Japanese postal code
      country:
        type: string
        constraints:
          enum: ["JP", "US", "UK", "DE", "FR"]
          default: "JP"
          
  OrderStatus:
    base: string
    constraints:
      enum: ["draft", "pending", "confirmed", "shipped", "delivered", "cancelled"]
      transitions:  # State transition constraints
        draft: ["pending", "cancelled"]
        pending: ["confirmed", "cancelled"]
        confirmed: ["shipped", "cancelled"]
        shipped: ["delivered"]
        delivered: []  # End state
        cancelled: []  # End state
```

### Business Rule Constraints

```yaml
types:
  AccountBalance:
    base: decimal
    constraints:
      min: 0  # Balance cannot be negative
      precision: 15
      scale: 2
      businessRule: "balance >= sum(pending_withdrawals)"
      
  RegistrationRequest:
    properties:
      email:
        type: Email
      password:
        type: string
        constraints:
          minLength: 8
          maxLength: 128
          pattern: "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]"
          description: "Must contain uppercase, lowercase, digit, and special character"
      passwordConfirm:
        type: string
        constraints:
          crossField: "value == password"  # Must match password
      birthDate:
        type: date
        constraints:
          past: true
          after: "1900-01-01"
      termsAccepted:
        type: boolean
        constraints:
          const: true  # Must be true
```

### Type Inheritance

```yaml
types:
  BaseEntity:
    abstract: true
    properties:
      id:
        type: string
        constraints:
          format: uuid
          immutable: true
      createdAt:
        type: datetime
        constraints:
          immutable: true
          default: "now()"
          
  User:
    extends: BaseEntity
    properties:
      email:
        type: Email
      name:
        type: string
        constraints:
          maxLength: 100
```

## File Naming Conventions

### Directory Structure
```
specifications/
├── requirements/
│   └── user-account-management.yaml
├── domain-features/
│   └── account-lifecycle.yaml
├── system-features/
│   └── authentication-system.yaml
├── system-design/
│   └── auth-architecture.yaml
└── components/
    └── jwt-token-generator.yaml
```

### Naming Rules
- Use kebab-case for file names
- Be descriptive but concise
- Group related specifications
- No version numbers in filenames (Git handles versioning)

## Oracle Integration

### Validation Commands
```bash
# Validate YAML syntax and structure
oracle validate specifications/components/jwt-token-generator.yaml

# Check type constraints in implementation
oracle verify-types src/auth/token_generator.py

# Verify naming conventions
oracle check-naming --spec specifications/domain-features/account-lifecycle.yaml
```

### Example Validation Output
```
Oracle: Type Constraint Validation
==================================
Checking: TokenPayload.user_id

✅ Constraint satisfied: required=true
✅ Constraint satisfied: format=uuid
❌ Constraint violated: immutable=true
  Implementation allows modification after creation
  
Suggestion: Make user_id property read-only:
  @property
  def user_id(self) -> str:
      return self._user_id
```

## Best Practices

1. **Start High-Level**: Begin with requirements, work down to components
2. **Maintain Traceability**: Always reference parent specifications
3. **Use Ubiquitous Language**: Consistent terminology across all layers
4. **Define Clear Constraints**: Be explicit about validation rules
5. **Test Everything**: Every constraint should have test cases
6. **Version Through Git**: Let Git handle versioning, not filenames
7. **Review Regularly**: Specifications evolve with understanding

## Common Pitfalls

1. **Over-Specification**: Don't specify implementation details too early
2. **Under-Specification**: Don't leave ambiguous requirements
3. **Missing Constraints**: Always define validation rules
4. **Inconsistent Language**: Use the same terms everywhere
5. **Orphaned Specs**: Ensure all specs trace to requirements
6. **Outdated Specs**: Review and update as system evolves