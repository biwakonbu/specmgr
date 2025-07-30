# Bidirectional Verification System

## Overview

Oracle provides bidirectional verification between specifications and implementations, allowing developers to work naturally from either direction while maintaining specification compliance.

## Core Concepts

### 1. Specification → Implementation
Traditional approach: Check if implementations satisfy specifications.

### 2. Implementation → Specification
Developer-friendly approach: Find and verify specifications from code files.

## Implementation Detection Methods

### Method 1: Explicit Annotations

```python
# src/auth/registration.py

# @implements: features/user-management/registration.yaml
# @requires: technical/security/password-policy.yaml
def register_user(email: str, password: str):
    """
    User registration implementation
    Spec: features/user-management/registration.yaml
    """
    pass
```

### Method 2: Naming Convention Mapping

```
# Automatic mapping rules
src/auth/registration.py      → features/*/registration.yaml
src/services/email_service.py → technical/*/email*.yaml
src/models/user.py           → domain/user.yaml
tests/auth/test_*.py         → features/auth/*.yaml
```

### Method 3: Code Analysis

Oracle analyzes code content to infer specifications:

```python
def process_payment(amount, card_number):
    validate_card(card_number)      # → payment validation spec
    check_fraud(amount)             # → fraud detection spec
    charge_card(amount)             # → payment processing spec
    send_receipt()                  # → notification spec
```

## Command Reference

### Finding Specifications from Code

```bash
# Find specification for a code file
oracle spec src/auth/registration.py

# Output:
Primary Specification:
  features/user-management/registration.yaml
  
Related Specifications:
  - domain/user.yaml (imports User model)
  - technical/security/password-policy.yaml (implements validation)
  - technical/messaging/email-service.yaml (uses email service)
```

### Checking Implementation Compliance

```bash
# Check if code matches its specification
oracle check src/auth/registration.py

# Output:
Checking: src/auth/registration.py
Against: features/user-management/registration.yaml

✅ Requirements Implemented:
  - Email validation
  - Password strength check
  - Terms acceptance

❌ Missing Requirements:
  - Email uniqueness check
  - Rate limiting
  
⚠️  Suggestions:
  - Consider adding retry logic for email sending
```

### Real-time Monitoring

```bash
# Watch file for specification compliance
oracle watch src/auth/registration.py

# Output:
Watching: src/auth/registration.py
Spec: features/user-management/registration.yaml

[10:30:15] ✅ Added email uniqueness check
[10:32:41] ⚠️  Removed password validation - violates spec!
[10:33:02] ✅ Password validation restored
```

## Practical Workflows

### 1. Development Workflow

```bash
# Start coding
$ vim src/auth/registration.py

# Check what needs to be implemented
$ oracle requirements src/auth/registration.py
Requirements from registration.yaml:
- ✅ Email format validation
- ❌ Email uniqueness check
- ❌ Password minimum 8 characters
- ✅ Send verification email

# After implementing
$ oracle check src/auth/registration.py
✅ All requirements satisfied!
```

### 2. Code Review Workflow

```bash
# Review a pull request
$ oracle check-pr PR-123

Files in PR:
1. src/auth/registration.py
   Spec: features/user-management/registration.yaml
   Status: ✅ Compliant
   
2. src/models/user.py
   Spec: domain/user.yaml
   Status: ❌ Missing required field 'created_at'
   
3. src/services/email.py
   Spec: technical/messaging/email-service.yaml
   Status: ⚠️  No rate limiting implemented

Overall: 2 issues need resolution
```

### 3. Refactoring Workflow

```bash
# Before refactoring, check impact
$ oracle impact src/auth/registration.py

This file implements:
- features/user-management/registration.yaml
- technical/security/password-policy.yaml

Used by:
- src/controllers/auth_controller.py
- tests/auth/test_registration.py

Refactoring will affect:
- User registration flow
- Password validation rules
- 2 dependent files
```

### 4. AI Agent Monitoring

```bash
# Monitor AI-generated code
$ oracle guard --ai-mode

[AI Session Started]
> AI: "I'll optimize the registration process..."

🔍 Monitoring changes...
⚠️  Line 45: Removed email validation
❌ BLOCKED: Violates features/user-management/registration.yaml
📋 Requirement: "Email must be validated before account creation"

> AI: "Let me add that validation back..."
✅ Email validation restored
✅ Changes now comply with specifications
```

## File Metadata Format

### Python Example

```python
"""
User Registration Module

Oracle Metadata:
  implements:
    - features/user-management/registration.yaml
    - technical/security/password-policy.yaml
  uses:
    - src/services/email_service.py
    - src/validators/email.py
  version: 2.1.0
"""

from typing import Optional
from src.models.user import User

class RegistrationService:
    """Handles user registration flow"""
    
    def register_user(self, email: str, password: str) -> User:
        """
        Register a new user account.
        
        Implements: registration.yaml#register_user
        """
        # Implementation here
        pass
```

### JavaScript/TypeScript Example

```typescript
/**
 * User Registration Service
 * 
 * @implements features/user-management/registration.yaml
 * @uses technical/messaging/email-service.yaml
 */

export class RegistrationService {
  /**
   * Register a new user
   * @specification registration.yaml#register_user
   */
  async registerUser(email: string, password: string): Promise<User> {
    // Implementation
  }
}
```

## Integration Points

### 1. IDE Integration

```json
// .vscode/settings.json
{
  "oracle.enableRealTimeValidation": true,
  "oracle.showSpecificationHints": true,
  "oracle.autoLinkSpecifications": true
}
```

### 2. Git Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check all modified files against specifications
oracle check $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(py|js|ts)$')

if [ $? -ne 0 ]; then
  echo "❌ Specification violations found. Commit blocked."
  exit 1
fi
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/oracle-check.yml
name: Oracle Specification Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Check Implementation Compliance
        run: |
          oracle check-all src/
          oracle coverage --min 95
          
      - name: Generate Compliance Report
        run: oracle report --format html > compliance.html
        
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: compliance-report
          path: compliance.html
```

## Best Practices

### 1. Code Organization

```
src/
├── auth/
│   ├── registration.py      # implements: features/user-management/registration.yaml
│   ├── login.py            # implements: features/user-management/login.yaml
│   └── password_reset.py   # implements: features/user-management/password-reset.yaml
├── models/
│   └── user.py            # implements: domain/user.yaml
└── services/
    └── email_service.py   # implements: technical/messaging/email-service.yaml
```

### 2. Clear Annotations

```python
# Good: Clear specification reference
# @implements: features/user-management/registration.yaml
def register_user(email, password):
    pass

# Better: Specific section reference
# @implements: features/user-management/registration.yaml#email_validation
def validate_email(email):
    pass
```

### 3. Consistent Naming

Keep implementation file names aligned with specification names:
- `registration.yaml` → `registration.py`
- `email-service.yaml` → `email_service.py`
- `user.yaml` → `user.py` or `user_model.py`

## Troubleshooting

### Specification Not Found

```bash
$ oracle spec src/helpers/utility.py
⚠️  No specification found for this file

Suggestions:
1. This might be a utility file without specifications
2. Add annotation: # @implements: path/to/spec.yaml
3. Create specification: oracle new-spec --from-code src/helpers/utility.py
```

### Multiple Specifications Detected

```bash
$ oracle spec src/services/user_service.py
Multiple specifications detected:

1. features/user-management/registration.yaml (register_user method)
2. features/user-management/profile-update.yaml (update_profile method)
3. domain/user.yaml (User model usage)

Use 'oracle spec <file> --detailed' for method-level mapping
```

### Ambiguous Mapping

```bash
$ oracle check src/auth/handler.py
⚠️  Ambiguous specification mapping

Found multiple possible specifications:
- features/auth/login.yaml
- features/auth/logout.yaml
- features/auth/session-management.yaml

Please add explicit annotation:
# @implements: features/auth/login.yaml
```

## Benefits

### 1. Natural Development Flow
- Start from code or specification
- No context switching
- Immediate feedback

### 2. Quality Assurance
- Continuous compliance checking
- Prevent specification drift
- Catch violations early

### 3. AI Safety
- Monitor AI-generated code
- Prevent specification violations
- Ensure test integrity

### 4. Team Collaboration
- Shared understanding
- Clear traceability
- Reduced miscommunication