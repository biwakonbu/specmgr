module OracleCli.Commands.CommandParser

open OracleCli.Core
open OracleCli.Commands

/// Parse command line arguments into Oracle commands
let parseCommand (args: string array) : Result<OracleCommand, string> =
    match args with
    | [| "find-spec"; query |] -> 
        Ok (FindSpec (Query query))
    | [| "check"; codePath; "--spec"; specPath |] ->
        Ok (CheckImpl (CodePath codePath, SpecificationPath specPath))
    | [| "generate-spec"; codePath |] ->
        Ok (GenerateSpec (CodePath codePath))
    | [| "show"; specPath |] ->
        Ok (ShowSpec (SpecificationPath specPath))
    | [| "list" |] ->
        Ok (ListSpecs None)
    | [| "list"; "--tag"; tag |] ->
        Ok (ListSpecs (Some tag))
    | [| "watch"; codePath |] ->
        Ok (Watch (CodePath codePath))
    | [| "ask"; query |] ->
        Ok (Ask (Query query))
    | [| "docs-sign"; specPath |] ->
        // Signer info will be resolved from git config at execution time
        Ok (DocsSign (SpecificationPath specPath, None))
    | [| "docs-sign"; specPath; "-m"; message |] ->
        // Signer info will be resolved from git config at execution time
        Ok (DocsSign (SpecificationPath specPath, Some message))
    | [| "help" |] | [| "--help" |] | [| "-h" |] ->
        Ok Help
    | _ ->
        Error """
Oracle CLI - Specification Management Tool

USAGE:
    oracle <COMMAND> [OPTIONS]

COMMANDS:
    find-spec <query>              Search specifications using natural language
    check <code> --spec <spec>     Check implementation against specification
    generate-spec <code>           Generate specification from code file
    show <spec-path>               Display specification content
    list [--tag <tag>]             List specifications, optionally filtered by tag
    watch <code>                   Watch code file for changes and validate
    ask <question>                 Ask questions about specifications
    docs-sign <spec-path> [-m <message>]  Digitally sign a specification document (uses git config for signer)
    help                           Show this help message

EXAMPLES:
    oracle find-spec "user registration"
    oracle check src/auth/login.py --spec features/auth/login.yaml
    oracle show features/user-management/registration.yaml
    oracle list --tag authentication
    oracle ask "How does password validation work?"
    oracle docs-sign docs/specifications/domain-features/user-auth.yaml
    oracle docs-sign docs/spec.yaml -m "Security review completed"

ENVIRONMENT VARIABLES:
    ANTHROPIC_API_KEY             Required for AI features
    QDRANT_URL                    Qdrant endpoint (default: http://localhost:6333)
    SPECMGR_URL                   SpecMgr API endpoint (default: http://localhost:3000)
    ORACLE_SECRET_KEY             Secret key for HMAC signature generation

GIT CONFIGURATION:
    git config user.email         Used as signer email address
    git config user.name          Used as signer name/role
"""

/// Parse and validate command
let parseAndValidateCommand (args: string array) : Result<OracleCommand, string> =
    parseCommand args