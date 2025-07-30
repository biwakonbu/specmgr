# ID Assignment and Lifecycle Transition Details

## ID Assignment to Files

### 1. ID Location in YAML Files

IDs (REQ-001, DF-001, etc.) are assigned **inside YAML specification files**, not in the filename itself.

```yaml
# File: specifications/requirements/user-account-management.yaml
requirement:
  id: "REQ-001"  # ← This ID is inside the file
  title: "User account creation"
  description: |
    Users need to create accounts to access personalized features
```

### 2. File Structure Examples

#### Requirements File
```yaml
# File path: specifications/requirements/payment-processing.yaml
requirement:
  id: "REQ-017"
  title: "Secure payment processing"
  state: "approved"  # ← Current lifecycle state
  description: |
    Users must be able to make payments securely
  
  # Other requirement fields...
```

#### Domain Feature File
```yaml
# File path: specifications/domain-features/account-lifecycle.yaml
domain_feature:
  id: "DF-003"
  title: "Account lifecycle management"
  state: "implementing"
  requirements: ["REQ-001", "REQ-002"]  # ← References to requirements
  
  # Other domain feature fields...
```

#### Component File
```yaml
# File path: specifications/components/jwt-token-generator.yaml
component:
  id: "COMP-042"
  title: "JWT token generator"
  state: "verified"
  implements: ["SF-001", "SD-001"]  # ← What this component implements
  
  # Other component fields...
```

### 3. ID to File Mapping

Oracle maintains an index for quick ID lookups:

```yaml
# Auto-generated file: specifications/_index.yaml
index:
  REQ-001: "requirements/user-account-management.yaml"
  REQ-002: "requirements/email-verification.yaml"
  REQ-017: "requirements/payment-processing.yaml"
  
  DF-001: "domain-features/user-registration.yaml"
  DF-003: "domain-features/account-lifecycle.yaml"
  
  SF-001: "system-features/authentication-system.yaml"
  
  COMP-042: "components/jwt-token-generator.yaml"
```

## Lifecycle State Transitions

### 1. State Transition Conditions

#### Draft → Review

**Automatic Checks Required:**
- ✅ YAML syntax valid
- ✅ All required fields present
- ✅ ID assigned and unique
- ✅ At least one test case (for components)
- ✅ References exist and are valid

**Manual Actions:**
```bash
oracle submit-review REQ-001
```

**Conditions:**
```yaml
transition_conditions:
  from: "draft"
  to: "review"
  automated_checks:
    - yaml_valid: true
    - required_fields: ["id", "title", "description"]
    - unique_id: true
    - references_valid: true
    - test_cases_present: true  # For components only
  manual_trigger: "developer submits for review"
```

#### Review → Approved

**Required Approvals:**
- Domain expert approval (for domain features)
- Technical lead approval (for system features/design)
- Product owner approval (for requirements)

**Conditions:**
```yaml
transition_conditions:
  from: "review"
  to: "approved"
  approvals_required:
    requirements: ["product_owner"]
    domain_features: ["domain_expert", "technical_lead"]
    system_features: ["technical_lead", "architect"]
    system_design: ["architect", "technical_lead"]
    components: ["technical_lead"]
  automated_checks:
    - no_blocking_comments: true
    - all_references_approved: true
    - no_conflicts: true
```

#### Approved → Implementing

**Conditions:**
```yaml
transition_conditions:
  from: "approved"
  to: "implementing"
  conditions:
    - developer_assigned: true
    - implementation_branch_created: true
    - parent_specs_implemented: true  # Parent specs can't be in draft/review
  command: "oracle claim REQ-001"
```

#### Implementing → Implemented

**Automated Verification:**
- ✅ All specification types implemented
- ✅ All error cases handled
- ✅ All test cases pass
- ✅ Code coverage meets threshold
- ✅ No TODO/FIXME comments related to spec

**Conditions:**
```yaml
transition_conditions:
  from: "implementing"
  to: "implemented"
  automated_checks:
    - implementation_exists: true
    - types_match_spec: true
    - error_cases_handled: true
    - test_cases_pass: true
    - code_coverage: ">= 90%"
    - no_spec_todos: true
  manual_action: "developer marks complete"
  command: "oracle complete REQ-001 --impl src/feature.py"
```

#### Implemented → Verified

**Verification Requirements:**
- ✅ Automated spec compliance check passes
- ✅ Security review complete (if applicable)
- ✅ Performance benchmarks met (if defined)
- ✅ Integration tests pass
- ✅ Manual QA sign-off

**Conditions:**
```yaml
transition_conditions:
  from: "implemented"
  to: "verified"
  automated_checks:
    - spec_compliance: "100%"
    - integration_tests_pass: true
    - performance_benchmarks_met: true
    - security_scan_pass: true
  manual_reviews:
    - qa_approval: true
    - security_review: true  # If security-related
  command: "oracle verify REQ-001"
```

#### Any State → Deprecated

**Conditions:**
```yaml
transition_conditions:
  from: "*"
  to: "deprecated"
  conditions:
    - replacement_spec_exists: true  # Usually
    - no_active_dependencies: true
    - deprecation_notice_period: "30 days"
  manual_action: "architect approves deprecation"
  command: "oracle deprecate REQ-001 --replaced-by REQ-050"
```

### 2. State Transition Matrix

| From State | To State | Automatic Triggers | Manual Action Required | Approval Required |
|------------|----------|-------------------|----------------------|-------------------|
| Draft | Review | Validation passes | Submit for review | No |
| Review | Draft | Validation fails | Request changes | No |
| Review | Approved | All reviews complete | Approve | Yes (role-based) |
| Approved | Implementing | Parent specs ready | Claim spec | No |
| Implementing | Implemented | Tests pass | Mark complete | No |
| Implemented | Verified | Compliance check | Verify | Yes (QA) |
| Any | Deprecated | Replacement ready | Deprecate | Yes (Architect) |

### 3. Blocking Conditions

#### Cannot Transition When:

```yaml
blocking_conditions:
  draft_to_review:
    - "Syntax errors in YAML"
    - "Missing required fields"
    - "Duplicate ID"
    - "Invalid references"
    
  review_to_approved:
    - "Unresolved review comments"
    - "Missing approvals"
    - "Conflicts with other specs"
    - "Parent spec not approved"
    
  approved_to_implementing:
    - "No developer assigned"
    - "Dependencies not ready"
    - "Parent specs still in draft/review"
    
  implementing_to_implemented:
    - "Test failures"
    - "Type mismatches"
    - "Missing error handling"
    - "Coverage below threshold"
    
  implemented_to_verified:
    - "Spec compliance < 100%"
    - "Security vulnerabilities"
    - "Performance regressions"
    - "Missing QA approval"
```

### 4. Practical Examples

#### Example 1: Requirements Lifecycle
```bash
# Create new requirement
oracle new-spec --layer requirements --name "user-notifications"
# Creates: requirements/user-notifications.yaml with id: REQ-043, state: draft

# Submit for review (automated checks run)
oracle submit-review REQ-043
# State: draft → review

# Product owner approves
oracle approve REQ-043 --role product_owner
# State: review → approved

# Developer claims it
oracle claim REQ-043
# State: approved → implementing

# After implementation
oracle complete REQ-043 --impl src/notifications.py
# Automated tests run
# State: implementing → implemented

# QA verification
oracle verify REQ-043
# State: implemented → verified
```

#### Example 2: Blocked Transition
```bash
# Try to submit incomplete spec
oracle submit-review REQ-044

# Output:
Error: Cannot transition from 'draft' to 'review'
Validation failures:
- Missing required field: 'acceptance_criteria'
- No test cases defined
- Invalid reference: REQ-099 does not exist

Fix these issues before submitting for review.
```

### 5. State Query Commands

```bash
# Check current state
oracle status REQ-001

# Find all specs in a state
oracle list --state implementing

# Show transition history
oracle history REQ-001

# Check transition eligibility
oracle can-transition REQ-001 --to approved

# Show blocking conditions
oracle why-blocked REQ-001 --to approved
```

### 6. Automation Rules

```yaml
# .oracle/lifecycle.yaml
lifecycle_automation:
  auto_transitions:
    # Automatically move to review when all checks pass
    draft_to_review:
      enabled: true
      delay: "5 minutes"  # Give developer time to make changes
      
    # Automatically verify when all automated checks pass
    implemented_to_verified:
      enabled: false  # Requires manual QA
      
  notifications:
    on_state_change:
      - email: stakeholders
      - slack: "#spec-updates"
      
  enforcement:
    prevent_implementation_without_approval: true
    prevent_merge_without_verification: true
```

## Summary

1. **IDs are inside YAML files**, not in filenames
2. **Filenames use descriptive kebab-case** without IDs
3. **Each state transition has specific conditions** that must be met
4. **Transitions can be blocked** by failing conditions
5. **Some transitions require approvals** from specific roles
6. **Oracle tracks and enforces** all state transitions