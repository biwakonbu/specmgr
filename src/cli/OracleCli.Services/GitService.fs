module OracleCli.Services.GitService

open System
open System.IO
open System.Diagnostics
open OracleCli.Core

/// Execute git command with safe argument list and return result  
let private executeGitCommandSafe (workingDir: string) (argumentList: string list) : Result<string, string> =
    try
        let startInfo = ProcessStartInfo()
        startInfo.FileName <- "git"
        startInfo.WorkingDirectory <- workingDir
        startInfo.RedirectStandardOutput <- true
        startInfo.RedirectStandardError <- true
        startInfo.UseShellExecute <- false
        startInfo.CreateNoWindow <- true
        
        // Use ArgumentList for safe argument passing
        argumentList |> List.iter (fun arg -> startInfo.ArgumentList.Add(arg))
        
        use proc = Process.Start(startInfo)
        if proc = null then
            Error "Failed to start git process"
        else
            proc.WaitForExit()
            
            let output = proc.StandardOutput.ReadToEnd().Trim()
            let error = proc.StandardError.ReadToEnd().Trim()
            
            if proc.ExitCode = 0 then
                Ok output
            else
                Error error
                
    with
    | ex -> Error $"Failed to execute git command: {ex.Message}"

/// Execute git command and return result (legacy method for simple commands)
let private executeGitCommand (workingDir: string) (args: string) : Result<string, string> =
    try
        let startInfo = ProcessStartInfo()
        startInfo.FileName <- "git"
        startInfo.Arguments <- args
        startInfo.WorkingDirectory <- workingDir
        startInfo.RedirectStandardOutput <- true
        startInfo.RedirectStandardError <- true
        startInfo.UseShellExecute <- false
        startInfo.CreateNoWindow <- true
        
        use proc = Process.Start(startInfo)
        proc.WaitForExit()
        
        let output = proc.StandardOutput.ReadToEnd().Trim()
        let error = proc.StandardError.ReadToEnd().Trim()
        
        if proc.ExitCode = 0 then
            Ok output
        else
            Error error
            
    with
    | ex -> Error $"Failed to execute git command: {ex.Message}"

/// Check if directory is a git repository
let isGitRepository (workingDir: string) : bool =
    Directory.Exists(Path.Combine(workingDir, ".git"))

/// Add file to git staging area
let addFileToGit (workingDir: string) (filePath: string) : Result<unit, string> =
    match executeGitCommandSafe workingDir ["add"; filePath] with
    | Ok _ -> Ok ()
    | Error err -> Error err

/// Commit files with message
let commitWithMessage (workingDir: string) (message: string) : Result<string, string> =
    match executeGitCommandSafe workingDir ["commit"; "-m"; message] with
    | Ok output -> 
        // Get the commit hash directly after committing
        match executeGitCommand workingDir "rev-parse HEAD" with
        | Ok hash -> Ok (hash.Trim())
        | Error _ -> Ok "committed"
    | Error err -> Error err

/// Create git commit for signature operation
let commitSignature (workingDir: string) (signature: DigitalSignature) (signatureFilePath: string) (customMessage: string option) : Result<string, string> =
    try
        if not (isGitRepository workingDir) then
            Error "Not a git repository"
        else
            // Add signature file to git
            match addFileToGit workingDir signatureFilePath with
            | Error err -> Error $"Failed to add signature file to git: {err}"
            | Ok () ->
                // Create commit message
                let specPath = Paths.getSpecificationPath signature.SpecificationPath
                let fileName = Path.GetFileName(specPath)
                let validUntil = signature.ExpiresAt.ToString("yyyy-MM-dd")
                let baseMessage = $"docs: digitally sign {fileName}"
                let customPart = match customMessage with
                                 | Some msg -> $"\n\n{msg}"
                                 | None -> ""
                let detailsPart = $"\n\nSignature ID: {signature.SignatureId}\nSigner: {signature.SignerInfo.Email} ({signature.SignerInfo.Role})\nReason: {signature.SignerInfo.SigningReason}\nAlgorithm: {signature.Algorithm}\nValid until: {validUntil}\n\n🤖 Generated with Oracle CLI Digital Signing"
                let commitMessage = baseMessage + customPart + detailsPart
                
                // Commit the signature
                commitWithMessage workingDir commitMessage
                
    with
    | ex -> Error $"Git commit failed: {ex.Message}"

/// Get current git commit hash
let getCurrentCommitHash (workingDir: string) : Result<string, string> =
    executeGitCommand workingDir "rev-parse HEAD"

/// Check if there are uncommitted changes
let hasUncommittedChanges (workingDir: string) : Result<bool, string> =
    match executeGitCommand workingDir "status --porcelain" with
    | Ok output -> Ok (not (String.IsNullOrWhiteSpace(output)))
    | Error err -> Error err

/// Get signer information from git config (repository -> global priority)
let getSignerFromGitConfig (workingDir: string) : Result<SignerInfo, string> =
    try
        // Try to get user.email and user.name from git config
        // Git config automatically handles repository -> global priority
        match executeGitCommand workingDir "config user.email",
              executeGitCommand workingDir "config user.name" with
        | Ok email, Ok name when not (String.IsNullOrWhiteSpace(email)) && not (String.IsNullOrWhiteSpace(name)) ->
            let signerInfo = {
                Email = email.Trim()
                Role = name.Trim()  // Use git user.name as role
                SigningReason = "Document approval"
            }
            Ok signerInfo
        | Ok email, Ok name ->
            let missing = 
                [if String.IsNullOrWhiteSpace(email) then "user.email"
                 if String.IsNullOrWhiteSpace(name) then "user.name"]
                |> String.concat ", "
            Error $"Git config missing: {missing}. Please configure with 'git config user.email <email>' and 'git config user.name <name>'"
        | Error emailErr, _ ->
            Error $"Failed to get user.email from git config: {emailErr}"
        | _, Error nameErr ->
            Error $"Failed to get user.name from git config: {nameErr}"
    with
    | ex -> Error $"Git config access failed: {ex.Message}"

/// Get git repository root directory
let getGitRootDirectory (startPath: string) : Result<string, string> =
    let rec findGitRoot (currentPath: string) =
        if String.IsNullOrEmpty(currentPath) || currentPath = Path.GetPathRoot(currentPath) then
            None
        elif Directory.Exists(Path.Combine(currentPath, ".git")) then
            Some currentPath
        else
            findGitRoot (Path.GetDirectoryName(currentPath))
    
    match findGitRoot startPath with
    | Some gitRoot -> Ok gitRoot
    | None -> Error "Not inside a git repository"

/// Commit multiple signature files to git (for claim-based signatures)
let commitSignatureFiles (workingDir: string) (signatureFilePaths: string list) (commitMessage: string) : Result<string, string> =
    try
        if not (isGitRepository workingDir) then
            Error "Not a git repository"
        else
            // Add all signature files to git
            let addResults = 
                signatureFilePaths 
                |> List.map (addFileToGit workingDir)
            
            // Check if all files were added successfully
            let failedAdds = 
                addResults 
                |> List.choose (function | Error err -> Some err | Ok _ -> None)
            
            if not failedAdds.IsEmpty then
                let errorMessage = String.concat "; " failedAdds
                Error $"Failed to add signature files to git: {errorMessage}"
            else
                // Create and execute commit
                match executeGitCommandSafe workingDir ["commit"; "-m"; commitMessage] with
                | Error err -> Error $"Git commit failed: {err}"
                | Ok _output ->
                    // Get the exact commit hash using git rev-parse HEAD
                    match executeGitCommandSafe workingDir ["rev-parse"; "HEAD"] with
                    | Error err -> Error $"Failed to get commit hash: {err}"
                    | Ok commitHash -> Ok (commitHash.Trim())
    with
    | ex -> Error $"Git commit operation failed: {ex.Message}"