# Document Digital Signing

## Overview

A feature for generating and managing cryptographic digital signatures for specification documents. Provides signature lifecycle for approval process proof, document authenticity assurance, and tampering prevention.

## Functional Requirements

### 1. Signature Generation
**Purpose**: Generate digital signatures for specification documents and create approval evidence

**Input**:
- Specification file path
- Signer identity (email, role)
- Signing reason/context
- Optional: Custom commit message
- Optional: Signature expiration time
- Optional: Additional metadata

**Output**:
- Generated signature file
- Signature metadata record
- Verification instructions
- Signing timestamp
- Success confirmation

**Business Rules**:
- Use HMAC-SHA256 algorithm
- Signer authority verification required
- Confirmation before overwriting existing signatures
- Accurately record file content at signing time

### 2. Signature Management
**Purpose**: Manage existing signatures (update, revoke, re-sign)

**Input**:
- Target specification or signature file
- Management operation (renew, revoke, update)
- Authorized actor information
- Operation reason
- Optional: New expiration time

**Output**:
- Updated signature status
- Operation audit record
- Affected stakeholder notifications
- Rollback information if needed

**Business Rules**:
- Only approvers can execute signature revocation
- Re-signing executable by original signer or higher authority
- Complete operation history preservation
- Do not break existing verification chains

### 3. Bulk Signing Operations
**Purpose**: Batch signing processing for multiple specifications

**Input**:
- File pattern or directory path
- Selection criteria (status, author, date)
- Batch signing parameters
- Signer credentials
- Optional: Parallel processing settings

**Output**:
- Batch operation summary
- Individual signing results
- Failed operations with error details
- Performance metrics
- Recommendations for failed items

**Business Rules**:
- Individual permission verification per file
- Signing order based on dependencies
- Rollback strategy for partial failures
- Parallel processing within resource limits

### 4. Signature Lifecycle Tracking
**Purpose**: Manage signature lifecycle from generation to revocation

**Input**:
- Signature identifier or file path
- Optional: Lifecycle event filter
- Optional: Time range specification

**Output**:
- Signature lifecycle timeline
- Current signature status
- Expiration and renewal information
- Related events and dependencies
- Upcoming maintenance actions

**Business Rules**:
- Automatic monitoring of signature expiration
- Notification system before expiration
- Automatic renewal policy application
- Safe storage of deprecated signatures

## Data Models

### Digital Signature
```yaml
digital_signature:
  signature_id: "sig_20250126_100000_registration"
  specification_path: "specifications/user-management/registration.yaml"
  
  cryptographic_info:
    algorithm: "HMAC-SHA256"
    signature_value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    content_hash: "sha256:a1b2c3d4e5f6..."
    key_identifier: "oracle-key-2025-01"
    
  signer_info:
    signer_email: "tech-lead@example.com"
    signer_role: "technical_lead"
    signing_timestamp: "2025-01-26T10:00:00Z"
    signing_reason: "Approval after security review"
    
  validity_info:
    valid_from: "2025-01-26T10:00:00Z"
    expires_at: "2025-04-26T10:00:00Z"  # 3 months default
    status: "active"  # active | expired | revoked | suspended
    
  metadata:
    specification_version: "1.2"
    specification_status_at_signing: "approved"
    related_approvals: ["approval_001", "approval_002"]
    oracle_version: "1.0.0"
```

### Signature Operation Record
```yaml
signature_operation:
  operation_id: "op_20250126_100500_renew"
  timestamp: "2025-01-26T10:05:00Z"
  operation_type: "signature_renewal"
  
  target_info:
    signature_id: "sig_20250126_100000_registration"
    specification_path: "specifications/user-management/registration.yaml"
    
  actor_info:
    actor_email: "tech-lead@example.com"
    actor_role: "technical_lead"
    authorization_verified: true
    
  operation_details:
    reason: "Periodic renewal before expiration"
    previous_expiry: "2025-04-26T10:00:00Z"
    new_expiry: "2025-07-26T10:00:00Z"
    
  result:
    success: true
    new_signature_id: "sig_20250126_100500_registration"
    error_message: null
    
  audit_info:
    git_commit: "b2c3d4e5f6a7"
    affected_files: [".oracle/signatures/user-management-registration.yaml.sig"]
    notifications_sent: ["tech-lead@example.com", "domain-expert@example.com"]
```

### Bulk Signing Result
```yaml
bulk_signing_result:
  operation_id: "bulk_20250126_101000"
  started_at: "2025-01-26T10:10:00Z"
  completed_at: "2025-01-26T10:12:30Z"
  
  input_parameters:
    target_pattern: "specifications/user-management/*.yaml"
    signer: "tech-lead@example.com"
    batch_size: 10
    parallel_workers: 3
    
  results_summary:
    total_files: 8  
    successful: 6
    failed: 2
    skipped: 0
    
  successful_signings:
    - file: "specifications/user-management/registration.yaml"
      signature_id: "sig_20250126_101030_registration"
      duration: "0.8s"
      
    - file: "specifications/user-management/login.yaml"
      signature_id: "sig_20250126_101045_login"
      duration: "0.7s"
      
  failed_signings:
    - file: "specifications/user-management/password-reset.yaml"
      error: "Signer lacks authority for this specification"
      recommendation: "Request approval from domain expert"
      
    - file: "specifications/user-management/account-deletion.yaml"
      error: "File has been modified since approval"
      recommendation: "Re-approve specification before signing"
```

## Business Logic

### Signature Generation Algorithm
```fsharp
let generateSignature (filePath: string) (signerInfo: SignerInfo) (secretKey: string) =
    // 1. Read and normalize file content
    let content = File.ReadAllText(filePath).Replace("\r\n", "\n")
    let contentHash = SHA256.HashData(Encoding.UTF8.GetBytes(content))
    
    // 2. Create signing payload
    let timestamp = DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    let payload = $"{filePath}|{Convert.ToHexString(contentHash)}|{timestamp}|{signerInfo.Email}|{signerInfo.Role}"
    
    // 3. Generate HMAC signature
    let signatureBytes = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secretKey), Encoding.UTF8.GetBytes(payload))
    let signature = Convert.ToHexString(signatureBytes)
    
    // 4. Create signature record
    {
        SignatureId = $"sig_{timestamp.Replace(":", "").Replace("-", "")}_{Path.GetFileNameWithoutExtension(filePath)}"
        Algorithm = "HMAC-SHA256"
        SignatureValue = signature
        ContentHash = Convert.ToHexString(contentHash)
        SignerInfo = signerInfo
        ValidFrom = DateTimeOffset.UtcNow
        ExpiresAt = DateTimeOffset.UtcNow.AddMonths(3)
        Status = SignatureStatus.Active
    }
```

### Authority Verification Matrix
```yaml
signing_authority_matrix:
  specification_types:
    requirements:
      draft_to_review: ["product_owner", "domain_expert"]
      review_to_approved: ["product_owner"]
      approved_maintenance: ["product_owner", "technical_lead"]
      
    domain_features:
      draft_to_review: ["domain_expert", "technical_lead"]
      review_to_approved: ["domain_expert", "technical_lead"]
      approved_maintenance: ["domain_expert", "technical_lead", "architect"]
      
    system_features:
      draft_to_review: ["technical_lead", "architect"]
      review_to_approved: ["technical_lead", "architect"]
      approved_maintenance: ["architect", "technical_director"]
      
  emergency_override:
    allowed_roles: ["technical_director", "security_officer"]
    requires_justification: true
    auto_expire_hours: 24
    mandatory_review: true
```

### Signature Expiration Management
```fsharp
let checkSignatureExpiration (signature: DigitalSignature) =
    let now = DateTimeOffset.UtcNow
    let daysUntilExpiry = (signature.ExpiresAt - now).TotalDays
    
    match daysUntilExpiry with
    | d when d < 0.0 -> SignatureStatus.Expired
    | d when d < 7.0 -> SignatureStatus.ExpiringWarn  // Warning period
    | d when d < 30.0 -> SignatureStatus.ExpiringInfo // Info period  
    | _ -> SignatureStatus.Active

let scheduleRenewalNotification (signature: DigitalSignature) =
    let notificationSchedule = [
        (30, "Signature expires in 30 days")
        (7, "Signature expires in 7 days")  
        (1, "Signature expires tomorrow")
        (0, "Signature has expired")
    ]
    
    notificationSchedule
    |> List.map (fun (days, message) -> 
        createScheduledNotification signature.SignerInfo.Email message (signature.ExpiresAt.AddDays(-days)))
```

## Command Line Interface

### Basic Signature Command
```bash
oracle docs-sign <specification-path>
```

**Description**: Generate a digital signature for the specified document using environment-configured signer information.

**Prerequisites**:
- `ORACLE_SIGNER_EMAIL`: Signer's email address
- `ORACLE_SIGNER_ROLE`: Signer's role in the organization
- `ORACLE_SECRET_KEY`: Secret key for HMAC signature generation

**Example**:
```bash
export ORACLE_SIGNER_EMAIL="tech-lead@example.com"
export ORACLE_SIGNER_ROLE="technical_lead"
export ORACLE_SECRET_KEY="your-secret-key"

oracle docs-sign docs/specifications/domain-features/user-registration.md
```

### Custom Commit Message
```bash
oracle docs-sign <specification-path> -m "Custom commit message"
```

**Description**: Generate a digital signature with a custom commit message that will be included in the Git commit.

**Examples**:
```bash
# Security review completion
oracle docs-sign user-registration.md -m "Security review completed, approved for production deployment"

# Post-audit approval
oracle docs-sign payment-processing.md -m "Approved after security audit - all vulnerabilities addressed"

# Milestone signing
oracle docs-sign api-specification.md -m "Version 2.0 API specification - ready for implementation"
```

**Resulting Commit Message**:
```
docs: digitally sign user-registration.md

Security review completed, approved for production deployment

Signature ID: sig_20250801T073409Z_user-registration
Signer: tech-lead@example.com (technical_lead)
Reason: Document approval
Algorithm: HMAC-SHA256
Valid until: 2025-11-01

🤖 Generated with Oracle CLI Digital Signing
```

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|------------|---------|
| `ORACLE_SIGNER_EMAIL` | Yes | Signer's email address | `tech-lead@example.com` |
| `ORACLE_SIGNER_ROLE` | Yes | Signer's organizational role | `technical_lead` |
| `ORACLE_SECRET_KEY` | Yes | Secret key for signature generation | `your-secret-key-here` |
| `ORACLE_KEY_IDENTIFIER` | No | Key identifier for signatures | `oracle-key-2025-01` (default) |

### Command Validation

The command performs the following validations:
1. **File Existence**: Target specification file must exist
2. **File Format**: Must be `.md`, `.yaml`, or `.yml` file
3. **Environment Variables**: Required environment variables must be set
4. **Git Repository**: Must be executed within a Git repository
5. **Write Permissions**: Must have write access to `.oracle/signatures/` directory

### Error Handling

Common error scenarios and their messages:

```bash
# Missing file
oracle docs-sign nonexistent.md
# Error: Specification file not found: nonexistent.md

# Invalid file format
oracle docs-sign document.txt
# Error: Invalid specification file format. Expected .yaml, .yml, or .md file: document.txt

# Missing environment variable
oracle docs-sign spec.md
# Error: ORACLE_SIGNER_EMAIL environment variable is required for signing

# Not in Git repository
oracle docs-sign spec.md
# Error: Git repository required for digital signing: not a git repository
```

## Implementation Details

### Oracle CLI Architecture

Oracle CLI is implemented in F# with functional programming principles:

#### Project Structure
```
src/cli/
├── OracleCli.Core/               # Domain types and models
│   ├── Types.fs                  # Core types (SpecificationPath, SignerInfo, etc.)
│   └── Domain.fs                 # Business logic types
├── OracleCli.Services/           # Service implementations
│   ├── SigningService.fs         # HMAC signature generation
│   ├── GitService.fs             # Git operations and commits
│   └── SpecMgrBridge.fs          # Integration with specmgr system
├── OracleCli.Commands/           # Command handling
│   ├── CommandTypes.fs           # Command type definitions
│   ├── CommandParser.fs          # CLI argument parsing
│   └── CommandHandler.fs         # Command execution logic
└── OracleCli/                    # Application entry point
    └── Program.fs                # Main program and configuration
```

#### Key F# Types
```fsharp
type SignerInfo = {
    Email: string
    Role: string
    SigningReason: string
}

type DigitalSignature = {
    SignatureId: string
    SpecificationPath: SpecificationPath
    Algorithm: string
    SignatureValue: string
    ContentHash: string
    KeyIdentifier: string
    SignerInfo: SignerInfo
    ValidFrom: DateTimeOffset
    ExpiresAt: DateTimeOffset
    Status: SignatureStatus
    OracleVersion: string
}

type OracleCommand =
    | DocsSign of SpecificationPath * SignerInfo * string option
    // ... other commands
```

#### Security Implementation
- **HMAC-SHA256**: Cryptographic signatures using .NET's built-in HMACSHA256
- **Content Hashing**: SHA-256 hashing of normalized file content
- **Environment Variables**: Secure key management via environment configuration
- **Git Integration**: Atomic commits with secure argument passing to prevent injection

### Technical Features Implemented

- ✅ **Digital Signature Generation**: HMAC-SHA256 with content hashing
- ✅ **CLI Interface**: Argument parsing with validation
- ✅ **Git Integration**: Atomic commits with structured messages
- ✅ **Custom Messages**: `-m` option for personalized commit messages
- ✅ **Environment Configuration**: Secure key and signer management
- ✅ **File Validation**: Support for `.md`, `.yaml`, `.yml` files
- ✅ **Error Handling**: Comprehensive validation and error reporting
- ✅ **Signature Storage**: YAML-based signature file format

## Integration Points

### Git Integration
- Signature operations as atomic Git commits
- Commit messages with signature metadata and optional custom messages
- Tag creation for signed milestones
- Branch protection for signed specifications

#### Commit Message Format
```
docs: digitally sign {filename}

[Custom message if provided via -m option]

Signature ID: {signature_id}
Signer: {email} ({role})
Reason: {signing_reason}
Algorithm: {algorithm}
Valid until: {expiry_date}

🤖 Generated with Oracle CLI Digital Signing
```

### File System Integration
- Signature files stored in `.oracle/signatures/` directory
- Atomic file operations for signature creation
- Backup and recovery for signature files
- Permission management for signature directories

### Notification System
- Email notifications for signing events
- Slack/Teams integration for team alerts
- Calendar integration for expiration reminders
- Dashboard updates for signature status

### Audit and Compliance
- Complete audit trail for all signature operations
- Compliance reporting for regulatory requirements
- Forensic evidence collection capabilities
- Non-repudiation guarantees

## Security Considerations

### Cryptographic Security
- Use of HMAC-SHA256 for signature generation
- Secure key derivation and storage
- Protection against timing attacks
- Regular key rotation procedures

### Access Control
- Multi-factor authentication for signing operations
- Role-based authorization enforcement
- Segregation of duties for critical signatures
- Audit logging for all access attempts

### Attack Prevention
- Protection against signature replay attacks
- Mitigation of key compromise scenarios
- Detection of unauthorized signature attempts
- Secure deletion of revoked signatures

### Key Management
- Hardware security module (HSM) integration options
- Key escrow and recovery procedures
- Secure key distribution mechanisms
- Key lifecycle management automation

## Error Conditions

### Cryptographic Errors
- Invalid or corrupted secret key
- Signature generation algorithm failures
- Hash collision detection
- Insufficient entropy for key operations

### Authorization Errors
- Insufficient signing privileges
- Expired or suspended user credentials
- Role assignment inconsistencies
- Policy violation attempts

### File System Errors
- Signature file creation failures
- Disk space exhaustion
- Permission denied for signature directory
- Concurrent access conflicts

### Business Logic Errors
- Attempt to sign unapproved specifications
- Circular dependency in signature requirements
- Inconsistent specification state
- Violated signing policy constraints

## Performance Requirements

- **Single signature generation**: < 200ms
- **Signature verification**: < 100ms
- **Bulk signing**: < 10 seconds for 50 files
- **Authority verification**: < 50ms
- **Signature file I/O**: < 100ms per operation

## Success Criteria

### Security Success
- [ ] Cryptographic signatures meet industry standards
- [ ] Zero false authentication or authorization
- [ ] Complete audit trail for all operations
- [ ] Resistance to known attack vectors

### Functional Success
- [x] Accurate signature generation and verification
- [x] Command-line interface with custom message support
- [x] Git integration with structured commit messages  
- [x] Environment variable-based configuration
- [ ] Proper authority enforcement
- [ ] Reliable bulk operations
- [ ] Comprehensive lifecycle management

### Performance Success
- [ ] Response times meet requirements
- [ ] Efficient resource utilization
- [ ] Scalable to large repositories
- [ ] Minimal impact on Git repository size

### Operational Success  
- [ ] Clear error messages and recovery procedures
- [ ] Automated maintenance and monitoring
- [ ] Integration with existing workflows
- [ ] Comprehensive documentation and training