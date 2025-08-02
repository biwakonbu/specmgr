module OracleCli.Commands.CommandParser

open OracleCli.Core
open OracleCli.Commands

/// Parse docs-sign command arguments with exclude patterns and message
let parseDocsSignArgs (args: string list) : Result<string * string option * string list, string> =
    let rec loop (path: string option) (message: string option) (excludePatterns: string list) (remaining: string list) =
        match remaining with
        | [] ->
            match path with
            | Some p -> Ok (p, message, List.rev excludePatterns)
            | None -> Error "Path argument required for docs-sign command"
        | "--exclude" :: pattern :: rest -> 
            loop path message (pattern :: excludePatterns) rest
        | "-m" :: msg :: rest ->
            loop path (Some msg) excludePatterns rest
        | pathArg :: rest when path.IsNone && not (pathArg.StartsWith("-")) ->
            loop (Some pathArg) message excludePatterns rest
        | pathArg :: _ when pathArg.StartsWith("-") ->
            Error $"Unknown option: {pathArg}"
        | _ -> Error "Invalid arguments for docs-sign command"
    
    loop None None [] args

/// Parse command line arguments into Oracle commands
let parseCommand (args: string array) : Result<OracleCommand, string> =
    match args |> Array.toList with
    | "find-spec" :: query :: [] -> 
        Ok (FindSpec (Query query))
    | "check" :: codePath :: "--spec" :: specPath :: [] ->
        Ok (CheckImpl (CodePath codePath, SpecificationPath specPath))
    | "generate-spec" :: codePath :: [] ->
        Ok (GenerateSpec (CodePath codePath))
    | "show" :: specPath :: [] ->
        Ok (ShowSpec (SpecificationPath specPath))
    | "list" :: [] ->
        Ok (ListSpecs None)
    | "list" :: "--tag" :: tag :: [] ->
        Ok (ListSpecs (Some tag))
    | "watch" :: codePath :: [] ->
        Ok (Watch (CodePath codePath))
    | "ask" :: query :: [] ->
        Ok (Ask (Query query))
    | "verify" :: filePath :: [] ->
        Ok (Verify (filePath, false))
    | "verify" :: filePath :: "--timeline" :: [] ->
        Ok (Verify (filePath, true))
    | "verify-all" :: directoryPath :: [] ->
        Ok (VerifyAll (directoryPath, false))
    | "verify-all" :: directoryPath :: "--timeline" :: [] ->
        Ok (VerifyAll (directoryPath, true))
    | "docs-sign" :: rest ->
        match parseDocsSignArgs rest with
        | Ok (path, message, excludePatterns) ->
            Ok (DocsSign (path, message, excludePatterns))
        | Error err -> Error err
    | "help" :: [] | "--help" :: [] | "-h" :: [] ->
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
    docs-sign <path> [--exclude <pattern>] [-m <message>]  Digitally sign file or directory
    verify <file> [--timeline]     Verify digital signature of a specification file
    verify-all <dir> [--timeline]  Verify digital signatures of all files in directory
    help                           Show this help message

EXAMPLES:
    oracle find-spec "user registration"
    oracle check src/auth/login.py --spec features/auth/login.yaml
    oracle show features/user-management/registration.yaml
    oracle list --tag authentication
    oracle ask "How does password validation work?"
    oracle docs-sign docs/specifications/domain-features/user-auth.md
    oracle docs-sign docs/specifications/ --exclude "*.draft.md" -m "Batch signing"
    oracle docs-sign docs/spec.yaml -m "Security review completed"
    oracle docs-sign docs/spec.yaml  # Generate claim-based signature
    oracle verify docs/specifications/user-auth.md
    oracle verify docs/specifications/user-auth.md --timeline
    oracle verify-all docs/specifications/ --timeline

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