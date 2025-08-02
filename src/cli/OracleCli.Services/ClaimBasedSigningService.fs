module OracleCli.Services.ClaimBasedSigningService

open System
open System.IO
open System.Text
open System.Text.Json
open System.Security.Cryptography
open System.Diagnostics
open OracleCli.Core

/// Execute git command safely to get configuration values
let private executeGitConfig (workingDir: string) (configKey: string) : Result<string, string> =
    try
        let startInfo = ProcessStartInfo()
        startInfo.FileName <- "git"
        startInfo.ArgumentList.Add("config")
        startInfo.ArgumentList.Add(configKey)
        startInfo.WorkingDirectory <- workingDir
        startInfo.RedirectStandardOutput <- true
        startInfo.RedirectStandardError <- true
        startInfo.UseShellExecute <- false
        startInfo.CreateNoWindow <- true
        
        use proc = Process.Start(startInfo)
        if proc = null then
            Error "Failed to start git process"
        else
            proc.WaitForExit()
            
            let output = proc.StandardOutput.ReadToEnd().Trim()
            let error = proc.StandardError.ReadToEnd().Trim()
            
            if proc.ExitCode = 0 && not (String.IsNullOrWhiteSpace(output)) then
                Ok output
            else
                Error $"Git config '{configKey}' not found or empty"
                
    with
    | ex -> Error $"Failed to execute git config: {ex.Message}"

/// Get signer information from git config
let getSignerFromGitConfig (workingDir: string) : Result<SignerInfo, string> =
    match executeGitConfig workingDir "user.email", executeGitConfig workingDir "user.name" with
    | Ok email, Ok name ->
        Ok {
            Email = email
            Role = name
            SigningReason = "Digital signature for specification integrity"
        }
    | Error emailErr, _ -> Error $"Failed to get user.email: {emailErr}"
    | _, Error nameErr -> Error $"Failed to get user.name: {nameErr}"

/// Normalize file path to project root relative path (Unix-style)
let normalizeToProjectPath (filePath: string) (projectRoot: string) : Result<string, string> =
    try
        let fullPath = Path.GetFullPath(filePath)
        let fullProjectRoot = Path.GetFullPath(projectRoot)
        
        // Ensure file is within project root
        if not (fullPath.StartsWith(fullProjectRoot, StringComparison.OrdinalIgnoreCase)) then
            Error $"File '{filePath}' is outside project root '{projectRoot}'"
        else
            let relativePath = Path.GetRelativePath(fullProjectRoot, fullPath)
            let unixPath = relativePath.Replace("\\", "/")
            Ok unixPath
    with ex -> 
        Error $"Path normalization failed: {ex.Message}"

/// Create document claim for a file
let createDocumentClaim (filePath: string) (projectRoot: string) : Result<DocumentClaim, string> =
    try
        if not (File.Exists filePath) then
            Error $"File not found: {filePath}"
        else
            match normalizeToProjectPath filePath projectRoot with
            | Error err -> Error err
            | Ok normalizedPath ->
                let content = File.ReadAllText(filePath).Replace("\r\n", "\n")  // Normalize line endings
                let contentBytes = Encoding.UTF8.GetBytes(content)
                let hash = SHA256.HashData(contentBytes)
                let fileInfo = FileInfo(filePath)
                
                Ok {
                    Path = normalizedPath
                    ContentHash = Convert.ToHexString(hash).ToLowerInvariant()
                    Size = fileInfo.Length
                }
    with ex ->
        Error $"Failed to create document claim for '{filePath}': {ex.Message}"

/// Create signature claims for multiple files
let createSignatureClaims (files: string list) (signerInfo: SignerInfo) (projectRoot: string) : Result<SignatureClaims, string> =
    try
        if files.IsEmpty then
            Error "No files provided for signing"
        else
            // Create document claims for all files
            let documentClaimsResults = 
                files 
                |> List.map (fun file -> createDocumentClaim file projectRoot)
            
            // Check if all document claims were created successfully
            let failedClaims = 
                documentClaimsResults 
                |> List.choose (function | Error err -> Some err | Ok _ -> None)
            
            if not failedClaims.IsEmpty then
                let errorMessage = String.concat "; " failedClaims
                Error $"Failed to create document claims: {errorMessage}"
            else
                let documentClaims = 
                    documentClaimsResults 
                    |> List.choose (function | Ok claim -> Some claim | Error _ -> None)
                
                let now = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                let expirySeconds = now + (90L * 24L * 3600L)  // 90 days from now
                
                Ok {
                    Issuer = "oracle-cli"
                    Subject = "document-signing"
                    IssuedAt = now
                    ExpiresAt = expirySeconds
                    Documents = documentClaims
                    SignerEmail = signerInfo.Email
                    SignerRole = signerInfo.Role
                    SigningReason = signerInfo.SigningReason
                    ProjectRoot = Path.GetFullPath(projectRoot).Replace("\\", "/")
                    Version = "1.0"
                }
    with ex ->
        Error $"Failed to create signature claims: {ex.Message}"

/// Generate claim-based signature in JWT-like format
let generateClaimBasedSignature (claims: SignatureClaims) (secretKey: string) : Result<ClaimBasedSignature, string> =
    try
        if String.IsNullOrWhiteSpace(secretKey) then
            Error "Secret key is required for signature generation"
        else
            // Create header
            let header = """{"alg":"HS256","typ":"ORC"}"""
            let headerBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(header))
            
            // Serialize and encode claims
            let claimsJson = JsonSerializer.Serialize(claims, JsonSerializerOptions(WriteIndented = false))
            let claimsBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(claimsJson))
            
            // Create signing input
            let signingInput = $"{headerBase64}.{claimsBase64}"
            let signingInputBytes = Encoding.UTF8.GetBytes(signingInput)
            let secretKeyBytes = Encoding.UTF8.GetBytes(secretKey)
            
            // Generate HMAC signature
            let signatureBytes = HMACSHA256.HashData(secretKeyBytes, signingInputBytes)
            let signatureBase64 = Convert.ToBase64String(signatureBytes)
            
            // Create full signature
            let fullSignature = $"{headerBase64}.{claimsBase64}.{signatureBase64}"
            
            Ok {
                Header = headerBase64
                Claims = claimsBase64
                Signature = signatureBase64
                Raw = fullSignature
            }
    with ex ->
        Error $"Failed to generate claim-based signature: {ex.Message}"

/// Verify claim-based signature
let verifyClaimBasedSignature (signature: ClaimBasedSignature) (secretKey: string) (projectRoot: string) : Result<bool * SignatureClaims, string> =
    try
        if String.IsNullOrWhiteSpace(secretKey) then
            Error "Secret key is required for signature verification"
        else
            // Verify signature format
            let signingInput = $"{signature.Header}.{signature.Claims}"
            let signingInputBytes = Encoding.UTF8.GetBytes(signingInput)
            let secretKeyBytes = Encoding.UTF8.GetBytes(secretKey)
            
            // Generate expected signature
            let expectedSignatureBytes = HMACSHA256.HashData(secretKeyBytes, signingInputBytes)
            let expectedSignatureBase64 = Convert.ToBase64String(expectedSignatureBytes)
            
            if expectedSignatureBase64 <> signature.Signature then
                Ok (false, Unchecked.defaultof<SignatureClaims>)  // Signature verification failed
            else
                // Decode and parse claims
                let claimsJson = Encoding.UTF8.GetString(Convert.FromBase64String(signature.Claims))
                let claims = JsonSerializer.Deserialize<SignatureClaims>(claimsJson)
                
                // Verify project root matches
                let normalizedProjectRoot = Path.GetFullPath(projectRoot).Replace("\\", "/")
                if claims.ProjectRoot <> normalizedProjectRoot then
                    Error $"Project root mismatch: expected '{normalizedProjectRoot}', got '{claims.ProjectRoot}'"
                else
                    // Verify all document contents
                    let contentVerificationResults = 
                        claims.Documents
                        |> List.map (fun doc ->
                            let fullPath = Path.Combine(projectRoot, doc.Path)
                            if not (File.Exists fullPath) then
                                false, $"File not found: {doc.Path}"
                            else
                                try
                                    let content = File.ReadAllText(fullPath).Replace("\r\n", "\n")
                                    let contentBytes = Encoding.UTF8.GetBytes(content)
                                    let currentHash = SHA256.HashData(contentBytes)
                                    let currentHashHex = Convert.ToHexString(currentHash).ToLowerInvariant()
                                    let fileInfo = FileInfo(fullPath)
                                    
                                    if currentHashHex <> doc.ContentHash then
                                        false, $"Content hash mismatch for {doc.Path}"
                                    elif fileInfo.Length <> doc.Size then
                                        false, $"File size mismatch for {doc.Path}: expected {doc.Size}, got {fileInfo.Length}"
                                    else
                                        true, ""
                                with ex ->
                                    false, $"Error verifying {doc.Path}: {ex.Message}"
                        )
                    
                    let failedVerifications = 
                        contentVerificationResults
                        |> List.choose (fun (success, msg) -> if not success then Some msg else None)
                    
                    if not failedVerifications.IsEmpty then
                        let verificationErrors = String.concat "; " failedVerifications
                        Error $"Content verification failed: {verificationErrors}"
                    else
                        // Check expiration
                        let now = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                        let isExpired = now > claims.ExpiresAt
                        Ok (not isExpired, claims)
    with ex ->
        Error $"Failed to verify claim-based signature: {ex.Message}"

/// Parse claim-based signature from string format
let parseClaimBasedSignature (signatureString: string) : Result<ClaimBasedSignature, string> =
    try
        let parts = signatureString.Split('.')
        if parts.Length <> 3 then
            Error $"Invalid signature format: expected 3 parts separated by '.', got {parts.Length}"
        else
            Ok {
                Header = parts.[0]
                Claims = parts.[1]
                Signature = parts.[2]
                Raw = signatureString
            }
    with ex ->
        Error $"Failed to parse claim-based signature: {ex.Message}"

/// Decode claims from signature for inspection
let decodeSignatureClaims (signature: ClaimBasedSignature) : Result<SignatureClaims, string> =
    try
        let claimsJson = Encoding.UTF8.GetString(Convert.FromBase64String(signature.Claims))
        let claims = JsonSerializer.Deserialize<SignatureClaims>(claimsJson)
        Ok claims
    with ex ->
        Error $"Failed to decode signature claims: {ex.Message}"

/// Format claims for human-readable display
let formatClaimsForDisplay (claims: SignatureClaims) : string =
    let issuedAt = DateTimeOffset.FromUnixTimeSeconds(claims.IssuedAt)
    let expiresAt = DateTimeOffset.FromUnixTimeSeconds(claims.ExpiresAt)
    let issuedAtStr = issuedAt.ToString("yyyy-MM-dd HH:mm:ss UTC")
    let expiresAtStr = expiresAt.ToString("yyyy-MM-dd HH:mm:ss UTC")
    let documentList = 
        claims.Documents 
        |> List.map (fun doc -> $"  - {doc.Path} (hash: {doc.ContentHash.[..7]}..., size: {doc.Size} bytes)")
        |> String.concat "\n"
    
    $"""Signature Claims:
Issuer: {claims.Issuer}
Subject: {claims.Subject}
Version: {claims.Version}
Signer: {claims.SignerEmail} ({claims.SignerRole})
Reason: {claims.SigningReason}
Issued: {issuedAtStr}
Expires: {expiresAtStr}
Project Root: {claims.ProjectRoot}

Documents ({claims.Documents.Length}):
{documentList}"""