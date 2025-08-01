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
    help                           Show this help message

EXAMPLES:
    oracle find-spec "user registration"
    oracle check src/auth/login.py --spec features/auth/login.yaml
    oracle show features/user-management/registration.yaml
    oracle list --tag authentication
    oracle ask "How does password validation work?"

ENVIRONMENT VARIABLES:
    ANTHROPIC_API_KEY             Required for AI features
    QDRANT_URL                    Qdrant endpoint (default: http://localhost:6333)
    SPECMGR_URL                   SpecMgr API endpoint (default: http://localhost:3000)
"""

/// Parse and validate command
let parseAndValidateCommand (args: string array) : Result<OracleCommand, string> =
    parseCommand args