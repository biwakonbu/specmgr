open System
open OracleCli.Core
open OracleCli.Commands.CommandParser
open OracleCli.Commands
open OracleCli.Commands.CommandHandler

/// Load configuration from environment variables
let loadConfig () : ServiceConfig =
    let getEnvVar name defaultValue =
        Environment.GetEnvironmentVariable(name) |> Option.ofObj |> Option.defaultValue defaultValue
    
    let getEnvVarOption name =
        Environment.GetEnvironmentVariable(name) |> Option.ofObj
    
    {
        SpecMgrUrl = getEnvVar "SPECMGR_URL" "http://localhost:3000"
        QdrantUrl = getEnvVar "QDRANT_URL" "http://localhost:6333"
        AnthropicApiKey = getEnvVarOption "ANTHROPIC_API_KEY"
        Timeout = 30000  // 30 seconds in milliseconds
        MaxRetries = 3
    }

/// Handle help command
let handleHelp () =
    printfn """
Oracle CLI - Specification Management Tool

A functional F# implementation providing bidirectional verification 
between specifications and implementations using RAG search and AI.

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

ENVIRONMENT VARIABLES:
    ANTHROPIC_API_KEY             Required for AI features
    QDRANT_URL                    Qdrant endpoint (default: http://localhost:6333)
    SPECMGR_URL                   SpecMgr API endpoint (default: http://localhost:3000)
    ORACLE_SECRET_KEY             Required for digital signing
    ORACLE_SIGNER_EMAIL           Default signer email
    ORACLE_SIGNER_ROLE            Default signer role

For detailed documentation, see: src/cli/ORACLE.md
"""

/// Execute command with context
let executeOracleCommand (config: ServiceConfig) (command: OracleCommand) : Result<unit, string> =
    let context = {
        Config = config
        Verbose = false
        DryRun = false
    }
    
    match command with
    | Help -> 
        handleHelp ()
        Ok ()
    | DocsSign (specPath, signerInfo) ->
        match executeCommandWithValidation context command with
        | Ok message ->
            printfn "%s" message
            Ok ()
        | Error err ->
            Error err
    | FindSpec (Query query) ->
        printfn "🔍 Searching for: %s" query
        printfn "🚧 RAG search not implemented yet"
        Ok ()
    | CheckImpl (CodePath codePath, SpecificationPath specPath) ->
        printfn "🔍 Checking implementation..."
        printfn "   Code: %s" codePath
        printfn "   Spec: %s" specPath
        printfn "🚧 AI verification not implemented yet"
        Ok ()
    | ShowSpec (SpecificationPath specPath) ->
        try
            let content = System.IO.File.ReadAllText(specPath)
            printfn "📋 %s" specPath
            printfn "%s" content
            Ok ()
        with
        | ex -> Error $"Failed to read specification: {ex.Message}"
    | ListSpecs tagFilter ->
        printfn "📋 Listing specifications..."
        match tagFilter with
        | Some tag -> printfn "   Filtered by tag: %s" tag
        | None -> printfn "   Showing all specifications"
        printfn "🚧 Specification listing not implemented yet"
        Ok ()
    | GenerateSpec (CodePath codePath) ->
        printfn "🔧 Generating specification from: %s" codePath
        printfn "🚧 Spec generation not implemented yet"
        Ok ()
    | Watch (CodePath codePath) ->
        printfn "👁️  Watching: %s" codePath
        printfn "🚧 File watching not implemented yet"
        Ok ()
    | Ask (Query query) ->
        printfn "🤖 Question: %s" query
        printfn "🚧 Q&A not implemented yet"
        Ok ()

[<EntryPoint>]
let main args =
    let config = loadConfig ()
    
    // Check for required configuration
    match config.AnthropicApiKey with
    | None -> printfn "⚠️  Warning: ANTHROPIC_API_KEY not set. AI features will not work."
    | Some _ -> ()
    
    // Parse and execute command
    match parseAndValidateCommand args with
    | Ok command ->
        try
            let result = executeOracleCommand config command
            match result with
            | Ok _ -> 0
            | Error msg -> 
                printfn "❌ Error: %s" msg
                1
        with
        | ex ->
            printfn "❌ Unexpected error: %s" ex.Message
            1
    | Error usage ->
        printfn "%s" usage
        1
