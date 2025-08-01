module OracleCli.Commands.CommandHandler

open System
open System.IO
open OracleCli.Core
open OracleCli.Commands
open OracleCli.Services.SigningService
open OracleCli.Services.GitService

/// Execute docs-sign command
let executeDocsSignCommand (context: CommandContext) (specPath: SpecificationPath) (signerInfo: SignerInfo) : Result<string, string> =
    try
        let filePath = Paths.getSpecificationPath specPath
        
        // Validate file exists and is a specification
        if not (File.Exists(filePath)) then
            Error $"Specification file not found: {filePath}"
        elif not (Paths.isValidSpecificationPath specPath) then
            Error $"Invalid specification file format. Expected .yaml, .yml, or .md file: {filePath}"
        else
            // Get secret key from environment
            let secretKey = Environment.GetEnvironmentVariable("ORACLE_SECRET_KEY")
            if String.IsNullOrWhiteSpace(secretKey) then
                Error "ORACLE_SECRET_KEY environment variable is required for digital signing"
            else
                // Get git root directory
                match getGitRootDirectory filePath with
                | Error gitErr -> Error $"Git repository required for digital signing: {gitErr}"
                | Ok gitRoot ->
                    if context.DryRun then
                        // Dry run mode - simulate signature generation
                        match generateSignature filePath signerInfo secretKey with
                        | Error err -> Error err
                        | Ok signature ->
                            let signatureFilePath = getSignatureFilePath filePath
                            let validFromStr = signature.ValidFrom.ToString("yyyy-MM-dd HH:mm:ss UTC")
                            let expiresAtStr = signature.ExpiresAt.ToString("yyyy-MM-dd HH:mm:ss UTC")
                            let fileName = Path.GetFileName(filePath)
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
                                match commitSignature gitRoot updatedSignature signatureFilePath with
                                | Error err -> Error $"Git commit failed: {err}"
                                | Ok commitHash ->
                                    let validFromStr = updatedSignature.ValidFrom.ToString("yyyy-MM-dd HH:mm:ss UTC")
                                    let expiresAtStr = updatedSignature.ExpiresAt.ToString("yyyy-MM-dd HH:mm:ss UTC")
                                    let successMessage = $"✅ Digital signature created successfully!\n\nSignature ID: {updatedSignature.SignatureId}\nFile: {filePath}\nSignature File: {signatureFilePath}\nSigner: {signerInfo.Email} ({signerInfo.Role})\nReason: {signerInfo.SigningReason}\nAlgorithm: {updatedSignature.Algorithm}\nValid From: {validFromStr}\nExpires At: {expiresAtStr}\nStatus: {updatedSignature.Status}\nGit Commit: {commitHash}\n\n🔐 Document is now digitally signed and committed to Git."
                                    
                                    if context.Verbose then
                                        Ok $"{successMessage}\n\n🔍 Signature Details:\n- Content Hash: {updatedSignature.ContentHash}\n- Key ID: {updatedSignature.KeyIdentifier}\n- Oracle Version: {updatedSignature.OracleVersion}"
                                    else
                                        Ok successMessage
                                        
    with
    | ex -> Error $"Command execution failed: {ex.Message}"

/// Execute Oracle CLI commands
let executeCommand (context: CommandContext) (command: OracleCommand) : Result<string, string> =
    match command with
    | DocsSign (specPath, signerInfo) ->
        executeDocsSignCommand context specPath signerInfo
    | FindSpec query ->
        Error "FindSpec command not implemented yet"
    | CheckImpl (codePath, specPath) ->
        Error "CheckImpl command not implemented yet"
    | GenerateSpec codePath ->
        Error "GenerateSpec command not implemented yet"
    | ShowSpec specPath ->
        Error "ShowSpec command not implemented yet"
    | ListSpecs tagFilter ->
        Error "ListSpecs command not implemented yet"
    | Watch codePath ->
        Error "Watch command not implemented yet"
    | Ask query ->
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
    docs-sign <spec-path>          Digitally sign a specification document
    help                           Show this help message

For more information, see: https://github.com/biwakonbu/specmgr"""

/// Validate command context and environment
let validateContext (context: CommandContext) : Result<unit, string> =
    // Basic validation
    if String.IsNullOrWhiteSpace(context.Config.SpecMgrUrl) then
        Error "SpecMgr URL is required in configuration"
    else
        Ok ()

/// Execute command with validation
let executeCommandWithValidation (context: CommandContext) (command: OracleCommand) : Result<string, string> =
    match validateContext context with
    | Error err -> Error err
    | Ok () -> executeCommand context command