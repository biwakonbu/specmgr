# Specification-Driven Development (SDD) Format

## Overview

This document defines the format for writing executable specifications that can be automatically validated against implementations.

## Specification Structure

### 1. YAML Format

```yaml
specification:
  id: "SPEC-XXX"  # Unique identifier
  title: "Brief description"
  description: |
    Detailed explanation of what this specification covers
  category: "feature|api|validation|business-logic"
  priority: "critical|high|medium|low"
  
  # Given-When-Then format
  given:
    # Input parameters with types
    param_name: "type"
    
  when: "action_or_function_name"
  
  then:
    # Expected outcomes as conditions
    - condition: "validation_expression"
      error: "ERROR_CODE"
      message: "Human-readable error message"
    
  # Test cases that must pass
  test_cases:
    - name: "test case description"
      input:
        param_name: value
      expect: "success|error:ERROR_CODE"
      
  # Implementation hints (optional)
  implementation:
    files:
      - "path/to/implementation.py"
    functions:
      - "function_name"
```

### 2. Type Definitions

Supported types for parameters:
- `string`: Text values
- `number`: Numeric values (int or float)
- `boolean`: True/False values
- `array`: List of values
- `object`: Complex objects with properties
- `email`: Email address (validated)
- `url`: URL (validated)
- `date`: ISO 8601 date
- `datetime`: ISO 8601 datetime

### 3. Condition Expressions

Conditions can use:
- Built-in validators: `is_valid_email()`, `is_valid_url()`, `matches_regex()`
- Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical operators: `and`, `or`, `not`
- Custom validators: `custom_validator_name()`

## Example Specifications

### Example 1: User Registration

```yaml
specification:
  id: "SPEC-001"
  title: "User Registration Email Validation"
  description: |
    Validates email addresses during user registration to ensure:
    - Correct format according to RFC 5322
    - Not from banned domains
    - Not already registered
  category: "validation"
  priority: "critical"
  
  given:
    email: "email"
    password: "string"
    
  when: "register_user"
  
  then:
    - condition: "is_valid_email(email)"
      error: "INVALID_EMAIL_FORMAT"
      message: "Email address format is invalid"
      
    - condition: "len(password) >= 8"
      error: "WEAK_PASSWORD"
      message: "Password must be at least 8 characters"
      
    - condition: "not in_banned_domains(email)"
      error: "BANNED_DOMAIN"
      message: "Email domain is not allowed"
      
    - condition: "not exists_in_database(email)"
      error: "EMAIL_ALREADY_EXISTS"
      message: "Email address is already registered"
    
  test_cases:
    - name: "Valid registration"
      input:
        email: "user@example.com"
        password: "SecurePass123"
      expect: "success"
      
    - name: "Invalid email format"
      input:
        email: "invalid-email"
        password: "SecurePass123"
      expect: "error:INVALID_EMAIL_FORMAT"
      
    - name: "Banned domain"
      input:
        email: "user@banned.com"
        password: "SecurePass123"
      expect: "error:BANNED_DOMAIN"
      
    - name: "Weak password"
      input:
        email: "user@example.com"
        password: "short"
      expect: "error:WEAK_PASSWORD"
      
  implementation:
    files:
      - "src/auth/registration.py"
    functions:
      - "register_user"
```

### Example 2: API Rate Limiting

```yaml
specification:
  id: "SPEC-002"
  title: "API Rate Limiting"
  description: |
    Implements rate limiting for API endpoints to prevent abuse
  category: "api"
  priority: "high"
  
  given:
    user_id: "string"
    endpoint: "string"
    timestamp: "datetime"
    
  when: "check_rate_limit"
  
  then:
    - condition: "requests_per_minute(user_id, endpoint) <= 60"
      error: "RATE_LIMIT_EXCEEDED"
      message: "Too many requests. Please try again later."
      
    - condition: "requests_per_hour(user_id, endpoint) <= 1000"
      error: "HOURLY_LIMIT_EXCEEDED"
      message: "Hourly request limit exceeded"
    
  test_cases:
    - name: "Within limits"
      input:
        user_id: "user123"
        endpoint: "/api/search"
        timestamp: "2024-01-01T10:00:00Z"
      expect: "success"
      
    - name: "Minute limit exceeded"
      setup: "create_requests(user_id='user123', count=61, timespan='1m')"
      input:
        user_id: "user123"
        endpoint: "/api/search"
        timestamp: "2024-01-01T10:00:59Z"
      expect: "error:RATE_LIMIT_EXCEEDED"
```

## Specification Validation Rules

1. **Unique IDs**: Each specification must have a unique ID
2. **Complete Test Coverage**: All error conditions must have at least one test case
3. **Deterministic Tests**: Test cases must produce consistent results
4. **No Test Modification**: Generated tests are immutable
5. **Implementation Tracking**: All implementations must reference their specifications

## Protected Elements

The following elements cannot be modified by AI agents:
- Specification files once approved
- Generated test files
- Test expected values
- Error codes and conditions

## Integration with Development Workflow

1. **Pre-commit Hooks**: Validate that implementations match specifications
2. **CI/CD Pipeline**: Run specification tests before deployment
3. **Code Review**: Display specification compliance in PRs
4. **Documentation**: Auto-generate docs from specifications

## Benefits

1. **Clarity**: No ambiguous requirements
2. **Testability**: Automatic test generation
3. **Traceability**: Clear specification-to-implementation mapping
4. **Protection**: Prevents test manipulation
5. **Documentation**: Specifications serve as living documentation