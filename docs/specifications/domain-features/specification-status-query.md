# Specification Status Query

## Overview

A feature that queries the lifecycle status of specification documents. Provides current status, transition history, and related metadata to enable development teams to understand the progress of specifications.

## Functional Requirements

### 1. Individual Status Query
**Purpose**: Display detailed status information for a specific specification document

**Input**: 
- Specification file path (relative or absolute)
- Optional: Include history flag

**Output**:
- Current lifecycle status (draft, review, approved, implementing, implemented, verified, deprecated)
- Last update timestamp
- Last updated by (user email)
- Version number
- Optional: State transition history

**Business Rules**:
- Return error for non-existent file paths
- Only YAML format files are supported
- Display available information with warnings when metadata is invalid

### 2. Batch Status Query
**Purpose**: Display status list for multiple specification documents

**Input**:
- Directory path or file pattern
- Optional: Status filter (specific lifecycle states)
- Optional: Date range filter
- Optional: Output format (table, json, csv)

**Output**:
- Tabular list of specifications with key metadata
- Summary statistics (count by status)
- Highlighting of status inconsistencies or issues

**Business Rules**:
- By default, target all YAML specification documents
- Return empty results when no files match filter conditions
- Display progress indicators for large file processing

### 3. Status-based Filtering
**Purpose**: Search for specifications in specific lifecycle states

**Input**:
- Target lifecycle status
- Optional: Directory scope
- Optional: Additional metadata filters (author, date range)

**Output**:
- Filtered list of specifications matching criteria
- Count of results
- Suggested next actions for each status

**Business Rules**:
- Accept only valid lifecycle states
- Support combination searches for multiple states
- Sort results by last update timestamp in descending order

### 4. Transition History Tracking
**Purpose**: Provide transition history for specification documents

**Input**:
- Specification file path
- Optional: Date range for history

**Output**:
- Chronological list of status changes
- Each transition with timestamp, previous/new status, and actor
- Duration spent in each state
- Transition trigger information (manual, automated, approval)

**Business Rules**:
- Track based on Git history
- Recognize only metadata changes as state transitions
- Detect and warn about invalid state transitions

## Data Models

### Status Information
```yaml
status_info:
  file_path: "specifications/user-management/registration.yaml"
  current_status: "approved"
  last_updated: "2025-01-26T10:00:00Z"
  updated_by: "tech-lead@example.com"
  version: "1.2"
  
  # Optional extended information
  created_at: "2025-01-20T14:30:00Z"
  created_by: "product-owner@example.com"
  total_transitions: 3
  days_in_current_status: 5
```

### Status History Entry
```yaml
history_entry:
  timestamp: "2025-01-26T10:00:00Z"
  from_status: "review"
  to_status: "approved"
  actor: "tech-lead@example.com"
  trigger: "manual_approval"
  duration_in_previous_state: "2 days"
  commit_hash: "a1b2c3d4"
  notes: "Approved after security review"
```

### Batch Query Result
```yaml
batch_result:
  total_files: 25
  processed_files: 25
  summary:
    draft: 5
    review: 3
    approved: 8
    implementing: 4
    implemented: 3
    verified: 2
    deprecated: 0
  
  specifications:
    - file_path: "specifications/user-management/registration.yaml"
      status: "approved"
      last_updated: "2025-01-26T10:00:00Z"
      updated_by: "tech-lead@example.com"
      version: "1.2"
```

## Business Logic

### Status Validation Rules
1. **Required Metadata Fields**:
   - `metadata.status` must be present and valid
   - `metadata.last_updated` must be valid ISO 8601 timestamp
   - `metadata.updated_by` must be non-empty string

2. **Status Consistency**:
   - File modification time should align with `last_updated`
   - Git commit history should reflect status changes
   - No direct status downgrades without proper justification

3. **Warning Conditions**:
   - Status unchanged for extended periods (>30 days in review/implementing)
   - Missing or incomplete metadata
   - File modified without status update
   - Inconsistent version numbering

### Query Performance Rules
1. **Caching Strategy**:
   - Cache frequently accessed status information
   - Invalidate cache on file system changes
   - Use file modification time for cache validation

2. **Batch Processing**:
   - Process files in parallel for large directories
   - Implement progress reporting for >100 files
   - Provide early termination on user interrupt

3. **Error Handling**:
   - Continue processing on individual file errors
   - Collect and report all errors at completion
   - Provide detailed error context for troubleshooting

## Integration Points

### File System Integration
- Monitor YAML files in specifications directories
- Handle file system permissions and access errors
- Support both relative and absolute path specifications

### Git Integration
- Extract commit history for transition tracking
- Identify commits that modified specification metadata
- Link status changes to specific Git commits and authors

### Metadata Integration
- Parse YAML metadata sections consistently
- Handle missing or malformed metadata gracefully
- Maintain backward compatibility with legacy formats

## Error Conditions

### Input Validation Errors
- Invalid file paths or patterns
- Unsupported file formats
- Invalid status filter values
- Malformed date range specifications

### Processing Errors
- File system access denied
- Corrupted or unparseable YAML files
- Git repository access issues
- Missing metadata sections

### Business Logic Errors
- Inconsistent status transitions in history
- Metadata-file modification time mismatches
- Invalid lifecycle state values
- Circular dependency detection in specifications

## Output Formats

### Human-Readable Display
```
📋 specifications/user-management/registration.yaml
   Status: approved ✅
   Updated: 2025-01-26 10:00:00 UTC (5 days ago)
   By: tech-lead@example.com
   Version: 1.2
   
   Recent History:
   • 2025-01-26: review → approved (tech-lead@example.com)
   • 2025-01-24: draft → review (product-owner@example.com)
```

### JSON Output
```json
{
  "file_path": "specifications/user-management/registration.yaml",
  "status": "approved",
  "last_updated": "2025-01-26T10:00:00Z",
  "updated_by": "tech-lead@example.com",
  "version": "1.2",
  "days_in_status": 5,
  "history": [
    {
      "timestamp": "2025-01-26T10:00:00Z",
      "from": "review",
      "to": "approved",
      "actor": "tech-lead@example.com"
    }
  ]
}
```

### CSV Output
```csv
file_path,status,last_updated,updated_by,version,days_in_status
specifications/user-management/registration.yaml,approved,2025-01-26T10:00:00Z,tech-lead@example.com,1.2,5
specifications/user-management/login.yaml,implementing,2025-01-25T14:30:00Z,developer@example.com,1.0,2
```

## Performance Requirements

- **Single file query**: < 50ms response time
- **Directory scan**: < 2 seconds for 100 files
- **Large repository**: < 30 seconds for 1000+ files
- **Memory usage**: < 100MB for typical repositories
- **Concurrent queries**: Support 10+ parallel requests

## Success Criteria

### Functional Success
- [ ] Accurate status reporting for all valid specification files
- [ ] Complete transition history tracking via Git integration
- [ ] Reliable batch processing with error handling
- [ ] Consistent output formatting across all modes

### Performance Success
- [ ] Response times meet specified requirements
- [ ] Graceful handling of large repositories
- [ ] Efficient memory usage during batch operations
- [ ] Responsive progress reporting for long operations

### Usability Success
- [ ] Clear and informative error messages
- [ ] Intuitive output formatting for human readers
- [ ] Comprehensive machine-readable JSON/CSV output
- [ ] Helpful warnings for potential issues