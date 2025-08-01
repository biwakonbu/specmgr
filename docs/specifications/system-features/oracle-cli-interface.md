# Oracle CLI Interface

## Overview

Command-line interface design for Oracle CLI. Provides a unified CLI experience for four domain functions: status query, lifecycle management, integrity verification, and digital signing.

## Functional Requirements

### 1. Command Structure Design
**Purpose**: Provide consistent hierarchical command structure

**Design Principles**:
- Intuitive verb-noun patterns
- Unified common options
- Comprehensive help and documentation
- Clear error messaging

**Command Categories**:
```bash
# Status and Query Commands
oracle status <spec-path>           # Individual status query
oracle list [options]               # Batch status listing
oracle history <spec-path>          # Transition history

# Lifecycle Management Commands  
oracle transition <spec-path> --to <status> [options]  # State transition
oracle approve <spec-path> [options]                   # Quick approval
oracle check-transition <spec-path> --to <status>      # Validation check

# Integrity and Security Commands
oracle verify <spec-path>           # Single file verification
oracle verify-all [options]         # Batch verification
oracle sign <spec-path> [options]   # Generate signature
oracle signatures [options]         # Signature management

# Utility Commands
oracle init [options]               # Initialize Oracle in repository
oracle config [options]             # Configuration management
oracle help [command]               # Help system
oracle version                      # Version information
```

### 2. Common Options and Flags
**Purpose**: Option system common to all commands

**Global Options**:
```bash
--config-path <path>      # Custom configuration file path
--verbose, -v             # Verbose output mode
--quiet, -q               # Suppress non-essential output
--json                    # JSON output format
--no-color               # Disable colored output
--dry-run                # Show what would be done without executing
--force                  # Override safety checks (use with caution)
```

**Output Format Options**:
```bash
--format <table|json|csv|yaml>    # Output format selection
--output <file>                   # Redirect output to file
--template <path>                 # Custom output template
```

**Filter and Selection Options**:
```bash
--status <status>                 # Filter by lifecycle status
--since <date>                    # Filter by date range (start)
--until <date>                    # Filter by date range (end)
--author <email>                  # Filter by author/signer
--tag <tag>                       # Filter by specification tags
--pattern <glob>                  # File pattern matching
```

### 3. Input Validation and Error Handling
**Purpose**: Robust and user-friendly input processing

**Validation Rules**:
- File path validation (existence, permissions, format)
- Status value validation against defined lifecycle states
- Date format validation (ISO 8601)
- Email format validation for signer information
- Configuration option validation

**Error Message Design**:
```bash
# Clear error identification
❌ Error: Specification file not found
   Path: specifications/nonexistent.yaml
   
# Actionable suggestions
💡 Suggestion: Check if the file path is correct or create the file using:
   oracle init-spec specifications/nonexistent.yaml

# Context information
🔍 Similar files found:
   - specifications/user-management/registration.yaml
   - specifications/user-management/login.yaml
```

### 4. Output Formatting and Display
**Purpose**: Effectively display information in various output formats

**Human-Readable Output**:
```bash
# Status display with visual indicators
📋 User Registration Specification
   Path: specifications/user-management/registration.yaml
   Status: approved ✅
   Updated: 2025-01-26 10:00:00 UTC (5 days ago)
   By: tech-lead@example.com
   Version: 1.2
   Signature: valid 🔒
   
# Table format for listings
┌─────────────────────────────────────────┬──────────┬─────────────────────┬──────────────────────┐
│ Specification                           │ Status   │ Last Updated        │ Updated By           │
├─────────────────────────────────────────┼──────────┼─────────────────────┼──────────────────────┤
│ user-management/registration.yaml       │ approved │ 2025-01-26 10:00:00 │ tech-lead@example.com│
│ user-management/login.yaml              │ review   │ 2025-01-25 14:30:00 │ dev@example.com      │
└─────────────────────────────────────────┴──────────┴─────────────────────┴──────────────────────┘
```

**Machine-Readable Output**:
```json
{
  "command": "oracle status",
  "timestamp": "2025-01-26T10:00:00Z",
  "version": "1.0.0",
  "result": {
    "specification_path": "specifications/user-management/registration.yaml",
    "status": "approved",
    "last_updated": "2025-01-26T10:00:00Z",
    "updated_by": "tech-lead@example.com",
    "version": "1.2",
    "signature_valid": true,
    "days_in_status": 5
  }
}
```

## Technical Requirements

### 1. CLI Framework and Architecture
**Implementation Stack**:
- **Language**: F# (.NET 8.0)
- **CLI Framework**: System.CommandLine
- **Configuration**: Microsoft.Extensions.Configuration
- **Logging**: Serilog with structured logging
- **Testing**: xUnit with FsCheck for property-based testing

**Architecture Pattern**:
```fsharp
// Command definition using discriminated unions
type OracleCommand =
    | Status of SpecificationPath
    | List of ListOptions
    | Transition of SpecificationPath * TargetStatus * TransitionOptions
    | Verify of VerificationTarget * VerificationOptions
    | Sign of SpecificationPath * SigningOptions
    | Help of CommandName option

// Command handler with dependency injection
type CommandHandler(
    statusService: IStatusService,
    lifecycleService: ILifecycleService,
    verificationService: IVerificationService,
    signingService: ISigningService) =
    
    member this.Execute (command: OracleCommand) (context: ExecutionContext) =
        // Implementation with proper error handling and logging
```

### 2. Configuration Management
**Configuration Hierarchy**:
1. Command-line arguments (highest priority)
2. Environment variables
3. User configuration file (`~/.oracle/config.yaml`)
4. Repository configuration file (`.oracle/config.yaml`)
5. System defaults (lowest priority)

**Configuration Schema**:
```yaml
# ~/.oracle/config.yaml
oracle:
  version: "1.0.0"
  
  defaults:
    signer_email: "tech-lead@example.com"
    signature_expiry: "3 months"
    output_format: "table"
    
  directories:
    specifications: "specifications/"
    signatures: ".oracle/signatures/"
    
  signing:
    algorithm: "HMAC-SHA256"
    key_source: "environment"  # environment | file | hsm
    
  notifications:
    enabled: true
    email_smtp: "smtp.example.com"
    slack_webhook: "https://hooks.slack.com/..."
    
  git:
    auto_commit: true
    commit_message_template: "[Oracle] {operation}: {specification}"
    tag_verified_specs: true
```

### 3. Help System and Documentation
**Multi-level Help System**:
```bash
# General help
oracle help
oracle --help

# Command-specific help
oracle help status
oracle status --help

# Examples and use cases
oracle help examples
oracle help getting-started

# Troubleshooting
oracle help troubleshoot
oracle doctor  # System health check
```

**Help Content Structure**:
```
USAGE:
    oracle <command> [options] [arguments]

COMMANDS:
    status      Query specification lifecycle status
    list        List specifications with filtering
    transition  Execute lifecycle state transitions
    verify      Verify document integrity
    sign        Generate digital signatures
    
OPTIONS:
    --config-path <path>    Configuration file path
    --verbose              Enable verbose output
    --json                 Output in JSON format
    
Use 'oracle help <command>' for detailed command information.
```

### 4. Exit Codes and Status Reporting
**Standardized Exit Codes**:
```fsharp
type ExitCode =
    | Success = 0
    | GeneralError = 1
    | InvalidArguments = 2
    | FileNotFound = 3
    | PermissionDenied = 4
    | ConfigurationError = 5
    | AuthenticationError = 6
    | AuthorizationError = 7
    | IntegrityViolation = 8
    | SignatureError = 9
    | NetworkError = 10
```

**Status Reporting**:
```bash
# Success with summary
✅ Operation completed successfully
   Processed: 5 specifications
   Success: 5, Failed: 0
   Duration: 2.3 seconds

# Partial success with warnings
⚠️  Operation completed with warnings
   Processed: 5 specifications  
   Success: 3, Failed: 2, Warnings: 1
   
   Warnings:
   - specifications/api/legacy.yaml: No signature found
   
   Failures:
   - specifications/broken.yaml: Invalid YAML format
```

## User Experience Design

### 1. Interactive Features
**Confirmation Prompts**:
```bash
# Destructive operations require confirmation
$ oracle sign specifications/critical-system.yaml --force
⚠️  This will overwrite the existing signature.
   Current signature: tech-lead@example.com (2025-01-20)
   New signature: architect@example.com (2025-01-26)
   
Continue? [y/N]: 
```

**Progress Indicators**:
```bash
# Long-running operations show progress
$ oracle verify-all
🔍 Verifying specifications...
[████████████████████████████████████████] 100% (25/25) Complete
✅ Verification completed in 3.2 seconds
```

**Auto-completion Support**:
```bash
# Bash/Zsh completion for commands, file paths, and options
$ oracle tr<TAB>
transition

$ oracle status spec<TAB>
specifications/
```

### 2. Color and Visual Design
**Color Scheme**:
- ✅ Green: Success, valid, approved
- ❌ Red: Error, invalid, failed
- ⚠️ Yellow: Warning, expiring, attention needed
- 🔍 Blue: Information, processing, neutral
- 🔒 Purple: Security, signatures, encryption

**Visual Hierarchy**:
```bash
# Primary information (bold, colored)
📋 Specification Status

# Secondary information (normal weight)
   Path: specifications/user-management/registration.yaml
   
# Metadata (subdued, smaller)
   Last modified: 5 days ago
```

### 3. Accessibility and Localization
**Accessibility Features**:
- `--no-color` flag for color-blind users
- Clear text alternatives for visual indicators
- Consistent formatting for screen readers
- High contrast mode support

**Internationalization Preparation**:
- String externalization for messages
- Date/time formatting based on locale
- Number formatting (decimal separators)
- Right-to-left text support preparation

## Integration Requirements

### 1. Shell Integration
**Environment Variables**:
```bash
export ORACLE_CONFIG_PATH="$HOME/.oracle/config.yaml"
export ORACLE_SIGNATURE_SECRET="your-secret-key"
export ORACLE_LOG_LEVEL="INFO"
export ORACLE_NO_COLOR="false"
```

**Shell Aliases and Functions**:
```bash
# Convenient aliases
alias os='oracle status'
alias ol='oracle list'
alias ov='oracle verify'

# Shell functions for common workflows
oracle-approve() {
    oracle transition "$1" --to approved --signer "$(git config user.email)"
}
```

### 2. Editor Integration
**VS Code Extension Support**:
- Command palette integration
- Status bar indicators for specification status
- Hover information for specification files
- Quick actions for common operations

**Vim/Neovim Integration**:
- Custom commands for Oracle operations
- Status line integration
- Syntax highlighting for Oracle output

### 3. CI/CD Integration
**GitHub Actions Example**:
```yaml
name: Oracle Verification
on: [push, pull_request]

jobs:
  verify-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Oracle CLI
        run: dotnet tool install -g oracle-cli
      - name: Verify Specifications
        run: oracle verify-all --format json --output verification-results.json
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: verification-results
          path: verification-results.json
```

## Performance Requirements

- **Command startup time**: < 500ms (cold start)
- **Help system response**: < 200ms
- **Auto-completion**: < 100ms
- **Configuration loading**: < 100ms
- **Output rendering**: < 200ms for typical results

## Success Criteria

### Usability Success
- [ ] Intuitive command structure requiring minimal learning
- [ ] Comprehensive help system with examples
- [ ] Clear error messages with actionable suggestions
- [ ] Consistent behavior across all commands

### Performance Success
- [ ] Fast command execution and startup times
- [ ] Efficient memory usage during operations
- [ ] Responsive auto-completion and help system
- [ ] Scalable output formatting for large datasets

### Integration Success
- [ ] Seamless shell integration with completion
- [ ] Effective editor and IDE integration
- [ ] Robust CI/CD pipeline integration
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

### Reliability Success
- [ ] Graceful handling of edge cases and errors
- [ ] Consistent behavior across different environments
- [ ] Reliable configuration management
- [ ] Comprehensive logging and debugging support