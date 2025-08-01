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
        // Default signer info - should be retrieved from config or environment
        let defaultSigner = {
            Email = System.Environment.GetEnvironmentVariable("ORACLE_SIGNER_EMAIL") |> Option.ofObj |> Option.defaultValue "user@example.com"
            Role = System.Environment.GetEnvironmentVariable("ORACLE_SIGNER_ROLE") |> Option.ofObj |> Option.defaultValue "developer"
            SigningReason = "Document approval"
        }
        Ok (DocsSign (SpecificationPath specPath, defaultSigner))
    | [| "docs-sign"; specPath; "--email"; email; "--role"; role; "--reason"; reason |] ->
        let signerInfo = {
            Email = email
            Role = role
            SigningReason = reason
        }
        Ok (DocsSign (SpecificationPath specPath, signerInfo))
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
    docs-sign <spec-path>          Digitally sign a specification document
    help                           Show this help message

EXAMPLES:
    oracle find-spec "user registration"
    oracle check src/auth/login.py --spec features/auth/login.yaml
    oracle show features/user-management/registration.yaml
    oracle list --tag authentication
    oracle ask "How does password validation work?"
    oracle docs-sign docs/specifications/domain-features/user-auth.yaml
    oracle docs-sign docs/spec.yaml --email user@corp.com --role tech-lead --reason "Security review approval"

ENVIRONMENT VARIABLES:
    ANTHROPIC_API_KEY             Required for AI features
    QDRANT_URL                    Qdrant endpoint (default: http://localhost:6333)
    SPECMGR_URL                   SpecMgr API endpoint (default: http://localhost:3000)
    ORACLE_SIGNER_EMAIL           Default signer email for digital signatures
    ORACLE_SIGNER_ROLE            Default signer role for digital signatures
    ORACLE_SECRET_KEY             Secret key for HMAC signature generation
"""

/// Parse and validate command
let parseAndValidateCommand (args: string array) : Result<OracleCommand, string> =
    parseCommand args