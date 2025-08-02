module OracleCli.Commands.CommandHandler

open System
open System.IO
open OracleCli.Core
open OracleCli.Commands
open OracleCli.Services.ClaimBasedSigningService
open OracleCli.Services.GitService

/// Format signature dates to UTC string format
let private formatSignatureDates (claims: SignatureClaims) : string * string =
    let issuedAt = DateTimeOffset.FromUnixTimeSeconds(claims.IssuedAt)
    let expiresAt = DateTimeOffset.FromUnixTimeSeconds(claims.ExpiresAt)
    let validFromStr = issuedAt.ToString "yyyy-MM-dd HH:mm:ss UTC"
    let expiresAtStr = expiresAt.ToString "yyyy-MM-dd HH:mm:ss UTC"
    (validFromStr, expiresAtStr)

/// Generate signature file path in .oracle/signatures/ directory
let private getSignatureFilePath (gitRoot: string) (filePath: string) : string =
    let signatureDir = Path.Combine(gitRoot, ".oracle", "signatures")
    Directory.CreateDirectory(signatureDir) |> ignore
    let signatureFileName = $"{Path.GetFileNameWithoutExtension(filePath)}.claim-signature"
    Path.Combine(signatureDir, signatureFileName)

/// Generate success message for claim-based signature creation
let private generateSuccessMessage (claims: SignatureClaims) (filePath: string) (signatureFilePath: string) (commitHash: string) : string =
    let validFromStr, expiresAtStr = formatSignatureDates claims
    $"✅ Claim-based signature created successfully!\n\nIssuer: {claims.Issuer}\nSubject: {claims.Subject}\nVersion: {claims.Version}\nFile: {filePath}\nSignature File: {signatureFilePath}\nSigner: {claims.SignerEmail} ({claims.SignerRole})\nReason: {claims.SigningReason}\nIssued: {validFromStr}\nExpires: {expiresAtStr}\nProject Root: {claims.ProjectRoot}\nDocuments: {claims.Documents.Length} file(s)\nGit Commit: {commitHash}\n\n🔐 Document is now digitally signed with claim-based signature."

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
            // Proper glob pattern matching using regex
            let regexPattern = pattern.Replace("*", ".*").Replace("?", ".") |> sprintf "^%s$"
            System.Text.RegularExpressions.Regex.IsMatch(fileName, regexPattern)))
    )

/// Sign a single file using digital signature
let signSingleFile (context: CommandContext) (filePath: string) (customMessage: string option) : Result<string, string> =
    try
        // Validate file exists and is a specification
        if not (File.Exists filePath) then
            Error $"Specification file not found: {filePath}"
        elif not (Path.GetExtension filePath |> fun ext -> [".yaml"; ".yml"; ".md"] |> List.contains ext) then
            Error $"Invalid specification file format. Expected .yaml, .yml, or .md file: {filePath}"
        else
            // Get git root directory
            match getGitRootDirectory filePath with
            | Error gitErr -> Error $"Git repository required for digital signing: {gitErr}"
            | Ok gitRoot ->
                // Resolve signer information from git config
                match OracleCli.Services.ClaimBasedSigningService.getSignerFromGitConfig gitRoot with
                | Error signerErr -> Error signerErr
                | Ok signerInfo ->
                    // Get secret key from environment
                    let secretKey = Environment.GetEnvironmentVariable "ORACLE_SECRET_KEY"
                    if String.IsNullOrWhiteSpace secretKey then
                        Error "ORACLE_SECRET_KEY environment variable is required for digital signing"
                    else
                        if context.DryRun then
                            // Dry run mode - simulate claim-based signature generation
                            match createSignatureClaims [filePath] signerInfo gitRoot with
                            | Error err -> Error err
                            | Ok claims ->
                                let fileName = Path.GetFileName filePath
                                let validFromStr, expiresAtStr = formatSignatureDates claims
                                Ok $"[DRY RUN] Would create claim-based signature:\n\nIssuer: {claims.Issuer}\nSubject: {claims.Subject}\nVersion: {claims.Version}\nFile: {filePath}\nSigner: {claims.SignerEmail} ({claims.SignerRole})\nReason: {claims.SigningReason}\nIssued: {validFromStr}\nExpires: {expiresAtStr}\nProject Root: {claims.ProjectRoot}\nDocuments: {claims.Documents.Length} file(s)\n\nGit commit message would be:\ndocs: digitally sign {fileName} (claim-based)"
                        else
                            // Generate claim-based signature
                            match createSignatureClaims [filePath] signerInfo gitRoot with
                            | Error err -> Error $"Claim creation failed: {err}"
                            | Ok claims ->
                                match generateClaimBasedSignature claims secretKey with
                                | Error err -> Error $"Signature generation failed: {err}"
                                | Ok signature ->
                                    // Save signature to .oracle/signatures/ directory
                                    let signatureFilePath = getSignatureFilePath gitRoot filePath
                                    
                                    try
                                        File.WriteAllText(signatureFilePath, signature.Raw)
                                        
                                        // Commit to git
                                        let fileName = Path.GetFileName filePath
                                        let commitMessage = 
                                            match customMessage with
                                            | Some msg -> msg
                                            | None -> $"docs: digitally sign {fileName} (claim-based)"
                                        
                                        match commitSignatureFiles gitRoot [signatureFilePath] commitMessage with
                                        | Error err -> Error $"Git commit failed: {err}"
                                        | Ok commitHash ->
                                            let successMessage = generateSuccessMessage claims filePath signatureFilePath commitHash
                                            
                                            if context.Verbose then
                                                let claimsDisplay = 
                                                    claims.Documents 
                                                    |> List.map (fun doc -> $"  - {doc.Path} (hash: {doc.ContentHash}, size: {doc.Size})")
                                                    |> String.concat "\n"
                                                Ok $"{successMessage}\n\n🔍 Signature Details:\n- Project Root: {claims.ProjectRoot}\n- Signature Version: {claims.Version}\n- Documents:\n{claimsDisplay}"
                                            else
                                                Ok successMessage
                                    with ex ->
                                        Error $"Failed to save signature file: {ex.Message}"
    with
    | ex -> Error $"Command execution failed: {ex.Message}"


/// Execute docs-sign command with auto-detection
let executeDocsSignCommand (context: CommandContext) (path: string) (customMessage: string option) (excludePatterns: string list) : Result<string, string> =
    try
        // Auto-detect if path is file or directory
        if File.Exists path then
            // Single file signing
            signSingleFile context path customMessage
        elif Directory.Exists path then
            // Directory batch signing
            let markdownFiles = getMarkdownFilesRecursively path excludePatterns
            
            if markdownFiles.IsEmpty then
                Ok $"No .md files found in directory: {path}"
            else
                // Calculate actual excluded files count
                let allMarkdownFiles = Directory.GetFiles(path, "*.md", SearchOption.AllDirectories) |> Array.length
                let excludedCount = allMarkdownFiles - markdownFiles.Length
                
                // Use immutable fold operation instead of mutable variables
                let (signedFiles, skippedFiles, failedFiles, resultLines) =
                    markdownFiles
                    |> List.fold (fun (signed, skipped, failed, lines) file ->
                        let relativePath = Path.GetRelativePath(path, file)
                        let signResult = signSingleFile context file customMessage
                        match signResult with
                        | Ok _result ->
                            let line = $"- ✅ {relativePath} (newly signed)"
                            (file :: signed, skipped, failed, line :: lines)
                        | Error err when err.Contains("already signed") ->
                            let line = $"- ⚠️  {relativePath} (skipped - already signed, use --force to overwrite)"
                            (signed, file :: skipped, failed, line :: lines)
                        | Error err ->
                            let line = $"- ❌ {relativePath} (failed - {err})"
                            (signed, skipped, file :: failed, line :: lines)
                    ) ([], [], [], [])
                
                let signedCount = List.length signedFiles
                let skippedCount = List.length skippedFiles
                let failedCount = List.length failedFiles
                
                // Build result string
                let header = [
                    "Oracle CLI - Directory Signing Results"
                    "====================================="
                    $"Directory: {path}"
                    $"Files processed: {markdownFiles.Length} (including subdirectories)"
                ]
                
                let footer = [
                    ""
                    $"Total: {signedCount} signed, {skippedCount} skipped, {failedCount} failed, {excludedCount} excluded"
                ]
                
                let allLines = header @ (List.rev resultLines) @ footer
                let result = String.concat "\n" allLines
                
                Ok result
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