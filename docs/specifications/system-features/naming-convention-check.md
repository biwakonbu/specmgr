# Naming Convention Check Service

## Technical Description
Enforce ubiquitous language usage across all code artifacts including classes, variables, database schemas, and API endpoints.

## Technical Requirements

### Validation Scope
- **Class/Type Names**: PascalCase matching ubiquitous language
- **Variables/Functions**: snake_case with domain terms
- **Database Tables/Columns**: snake_case following domain model
- **API Endpoints**: kebab-case RESTful resources
- **Configuration Keys**: Consistent with domain terminology

### Detection Capabilities
- Pattern matching against ubiquitous language dictionary
- Case convention verification
- Forbidden alias detection (e.g., "user" vs "customer")
- Compound term handling (e.g., "LineItem" variations)
- Context-aware suggestions

### Reporting Features
- Line-level violation reporting
- Suggested corrections with examples
- Reference links to specification documents
- Severity levels (error/warning/info)
- Batch reporting for CI/CD

## Integration Points
- **Uses**: AST parsers, regex engines, specification documents
- **Used by**: IDE plugins, CI/CD pipelines, CLI tools
- **Dependencies**: Ubiquitous language definitions
- **API**: Language-specific parsers and validators

## Performance Requirements
- Real-time validation in IDE: < 50ms
- File validation: < 200ms per 1000 lines
- Minimal memory footprint for IDE integration

## Extensibility
- Plugin architecture for new languages
- Custom rule definitions
- Domain-specific dictionaries
- Configurable severity levels