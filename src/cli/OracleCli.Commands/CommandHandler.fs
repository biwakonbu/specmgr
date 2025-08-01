module OracleCli.Commands.CommandHandler

open System
open System.IO
open OracleCli.Core
open OracleCli.Commands
open OracleCli.Services.SigningService
open OracleCli.Services.GitService

/// Get all .md files in directory recursively
let getMarkdownFilesRecursively (directory: string) (excludePatterns: string list) : string list =
    let allMarkdownFiles = 
        Directory.GetFiles(directory, "*.md", SearchOption.AllDirectories)
        |> Array.toList
    
    // Filter out excluded patterns
    allMarkdownFiles
    |> List.filter (fun file ->
        let fileName = Path.GetFileName(file)
        not (excludePatterns |> List.exists (fun pattern ->
            // Simple pattern matching - contains check for now
            fileName.Contains(pattern.Replace("*", ""))))
    )

/// Sign a single file
let signSingleFile (context: CommandContext) (filePath: string) (customMessage: string option) : Result<string, string> =
    try
        let specPath = SpecificationPath filePath
        
        // Validate file exists and is a specification
        if not (File.Exists(filePath)) then
            Error $"Specification file not found: {filePath}"
        elif not (Paths.isValidSpecificationPath specPath) then
            Error $"Invalid specification file format. Expected .yaml, .yml, or .md file: {filePath}"
        else
            // Get git root directory for signer info resolution
            match getGitRootDirectory filePath with
            | Error gitErr -> Error $"Git repository required for digital signing: {gitErr}"
            | Ok gitRoot ->
                // Resolve signer information from git config
                let signerResult = getSignerFromGitConfig gitRoot
                
                match signerResult with
                | Error signerErr -> Error signerErr
                | Ok signerInfo ->
                    // Get secret key from environment
                    let secretKey = Environment.GetEnvironmentVariable("ORACLE_SECRET_KEY")
                    if String.IsNullOrWhiteSpace secretKey then
                        Error "ORACLE_SECRET_KEY environment variable is required for digital signing"
                    else
                        if context.DryRun then
                            // Dry run mode - simulate signature generation
                            match generateSignature filePath signerInfo secretKey with
                            | Error err -> Error err
                            | Ok signature ->
                                let signatureFilePath = getSignatureFilePath filePath
                                let validFromStr = signature.ValidFrom.ToString "yyyy-MM-dd HH:mm:ss UTC"
                                let expiresAtStr = signature.ExpiresAt.ToString "yyyy-MM-dd HH:mm:ss UTC"
                                let fileName = Path.GetFileName filePath
                                Ok $"[DRY RUN] Would create digital signature:\n\nSignature ID: {signature.SignatureId}\nFile: {filePath}\nSignature File: {signatureFilePath}\nSigner: {signerInfo.Email} ({signerInfo.Role})\nAlgorithm: {signature.Algorithm}\nValid From: {validFromStr}\nExpires At: {expiresAtStr}\nContent Hash: {signature.ContentHash}\n\nGit commit message would be:\ndocs: digitally sign {fileName}"
                        else
                            // Generate signature
                            match generateSignature filePath signerInfo secretKey with
                            | Error err -> Error $"Signature generation failed: {err}"
                            | Ok signature ->
                                // Check signature expiration status 
                                let currentStatus = checkSignatureExpiration signature
                                let updatedSignature = { signature with Status = currentStatus }
                                
                                // Save signature file
                                match saveSignatureToFile updatedSignature with
                                | Error err -> Error $"Failed to save signature file: {err}"
                                | Ok signatureFilePath ->
                                    // Commit to git
                                    match commitSignature gitRoot updatedSignature signatureFilePath customMessage with
                                    | Error err -> Error $"Git commit failed: {err}"
                                    | Ok commitHash ->
                                        let validFromStr = updatedSignature.ValidFrom.ToString "yyyy-MM-dd HH:mm:ss UTC"
                                        let expiresAtStr = updatedSignature.ExpiresAt.ToString "yyyy-MM-dd HH:mm:ss UTC"
                                        let successMessage = $"✅ Digital signature created successfully!\n\nSignature ID: {updatedSignature.SignatureId}\nFile: {filePath}\nSignature File: {signatureFilePath}\nSigner: {signerInfo.Email} ({signerInfo.Role})\nReason: {signerInfo.SigningReason}\nAlgorithm: {updatedSignature.Algorithm}\nValid From: {validFromStr}\nExpires At: {expiresAtStr}\nStatus: {updatedSignature.Status}\nGit Commit: {commitHash}\n\n🔐 Document is now digitally signed and committed to Git."
                                        
                                        if context.Verbose then
                                            Ok $"{successMessage}\n\n🔍 Signature Details:\n- Content Hash: {updatedSignature.ContentHash}\n- Key ID: {updatedSignature.KeyIdentifier}\n- Oracle Version: {updatedSignature.OracleVersion}"
                                        else
                                            Ok successMessage
    with
    | ex -> Error $"Command execution failed: {ex.Message}"

/// Execute docs-sign command with auto-detection
let executeDocsSignCommand (context: CommandContext) (path: string) (customMessage: string option) (excludePatterns: string list) : Result<string, string> =
    try
        // Auto-detect if path is file or directory
        if File.Exists(path) then
            // Single file signing
            signSingleFile context path customMessage
        elif Directory.Exists(path) then
            // Directory batch signing
            let markdownFiles = getMarkdownFilesRecursively path excludePatterns
            
            if markdownFiles.IsEmpty then
                Ok $"No .md files found in directory: {path}"
            else
                let mutable signedCount = 0
                let mutable skippedCount = 0
                let mutable failedCount = 0
                let mutable excludedCount = excludePatterns.Length
                let results = System.Text.StringBuilder()
                
                results.AppendLine($"Oracle CLI - Directory Signing Results") |> ignore
                results.AppendLine($"=====================================") |> ignore
                results.AppendLine($"Directory: {path}") |> ignore
                results.AppendLine($"Files processed: {markdownFiles.Length} (including subdirectories)") |> ignore
                
                for file in markdownFiles do
                    let relativePath = Path.GetRelativePath(path, file)
                    match signSingleFile context file customMessage with
                    | Ok _result ->
                        results.AppendLine($"- ✅ {relativePath} (newly signed)") |> ignore
                        signedCount <- signedCount + 1
                    | Error err when err.Contains("already signed") ->
                        results.AppendLine($"- ⚠️  {relativePath} (skipped - already signed, use --force to overwrite)") |> ignore
                        skippedCount <- skippedCount + 1
                    | Error err ->
                        results.AppendLine($"- ❌ {relativePath} (failed - {err})") |> ignore
                        failedCount <- failedCount + 1
                
                results.AppendLine() |> ignore
                results.AppendLine($"Total: {signedCount} signed, {skippedCount} skipped, {failedCount} failed, {excludedCount} excluded") |> ignore
                
                Ok (results.ToString())
        else
            Error $"Path not found: {path}"
    with
    | ex -> Error $"Command execution failed: {ex.Message}"

/// Execute Oracle CLI commands
let executeCommand (context: CommandContext) (command: OracleCommand) : Result<string, string> =
    match command with
    | DocsSign (path, customMessage, excludePatterns) ->
        executeDocsSignCommand context path customMessage excludePatterns
    | FindSpec _query ->
        Error "FindSpec command not implemented yet"
    | CheckImpl (_codePath, _specPath) ->
        Error "CheckImpl command not implemented yet"
    | GenerateSpec _codePath ->
        Error "GenerateSpec command not implemented yet"
    | ShowSpec _specPath ->
        Error "ShowSpec command not implemented yet"
    | ListSpecs _tagFilter ->
        Error "ListSpecs command not implemented yet"
    | Watch _codePath ->
        Error "Watch command not implemented yet"
    | Ask _query ->
        Error "Ask command not implemented yet"
    | Help ->
        Ok """Oracle CLI - Specification Management Tool

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
    docs-sign <path>               Digitally sign a specification file or directory
    help                           Show this help message

For more information, see: https://github.com/biwakonbu/specmgr"""

/// Validate command context and environment
let validateContext (context: CommandContext) : Result<unit, string> =
    // Basic validation
    if String.IsNullOrWhiteSpace context.Config.SpecMgrUrl then
        Error "SpecMgr URL is required in configuration"
    else
        Ok ()

/// Execute command with validation
let executeCommandWithValidation (context: CommandContext) (command: OracleCommand) : Result<string, string> =
    match validateContext context with
    | Error err -> Error err
    | Ok () -> executeCommand context command