# Oracle Engine Component

## Component Overview
Core implementation of the Oracle specification management system.

## API Contract

```python
class OracleEngine:
    """Main Oracle system interface"""
    
    async def query_specification(self, query: str) -> SpecificationResponse:
        """
        Process natural language queries about specifications
        using AI-driven investigation
        """
        
    async def validate_naming(self, file_path: str) -> ValidationResult:
        """
        Check naming conventions against ubiquitous language
        """
        
    async def update_specification(
        self, 
        spec_path: str, 
        content: str,
        reason: str,
        approver: str
    ) -> UpdateResult:
        """
        Update specification with signature and audit trail
        """
        
    async def verify_integrity(
        self,
        branch: str = "main",
        since: Optional[datetime] = None
    ) -> IntegrityReport:
        """
        Verify specification commit signatures
        """
```

## Data Models

```python
@dataclass
class SpecificationResponse:
    query: str
    answer: str
    confidence: float
    sources: List[SpecificationSource]
    investigation_steps: List[str]

@dataclass
class ValidationResult:
    file_path: str
    valid: bool
    violations: List[NamingViolation]
    suggestions: List[str]

@dataclass
class NamingViolation:
    line: int
    column: int
    found: str
    expected: str
    severity: Literal["error", "warning"]
    reference: str  # Link to specification
```

## Implementation Requirements

### AI Integration
- Use Claude Code SDK for query understanding
- Implement multi-step investigation logic
- Support AI-to-AI dialogue for complex queries
- Cache investigation results

### Validation Engine
- AST parsing for multiple languages
- Efficient pattern matching
- Incremental validation support
- IDE protocol compatibility

### Signature System
- HMAC-SHA256 implementation
- Git integration for commit signing
- Signature verification algorithm
- Secret key management

### Performance Optimization
- Query result caching
- Lazy specification loading
- Parallel validation execution
- Streaming response support

## Dependencies
- Claude Code SDK
- Git Python library
- Language-specific parsers
- HMAC cryptography library