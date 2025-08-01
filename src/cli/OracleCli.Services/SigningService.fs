module OracleCli.Services.SigningService

open System
open System.IO
open System.Text
open System.Security.Cryptography
open OracleCli.Core

/// Generate HMAC-SHA256 signature for a specification document
let generateSignature (filePath: string) (signerInfo: SignerInfo) (secretKey: string) : Result<DigitalSignature, string> =
    try
        // Validate inputs
        if not (File.Exists(filePath)) then
            Error $"File not found: {filePath}"
        elif String.IsNullOrWhiteSpace(secretKey) then
            Error "Secret key is required for signature generation"
        elif String.IsNullOrWhiteSpace(signerInfo.Email) then
            Error "Signer email is required"
        else
            // 1. Read and normalize file content
            let content = File.ReadAllText(filePath).Replace("\r\n", "\n")
            let contentBytes = Encoding.UTF8.GetBytes(content)
            let contentHash = SHA256.HashData(contentBytes)
            
            // 2. Create signing payload
            let timestamp = DateTimeOffset.UtcNow
            let timestampStr = timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ")
            let payload = $"{filePath}|{Convert.ToHexString(contentHash).ToLowerInvariant()}|{timestampStr}|{signerInfo.Email}|{signerInfo.Role}"
            
            // 3. Generate HMAC signature
            let secretKeyBytes = Encoding.UTF8.GetBytes(secretKey)
            let payloadBytes = Encoding.UTF8.GetBytes(payload)
            let signatureBytes = HMACSHA256.HashData(secretKeyBytes, payloadBytes)
            let signature = Convert.ToHexString(signatureBytes).ToLowerInvariant()
            
            // 4. Create signature record
            let fileName = Path.GetFileNameWithoutExtension(filePath)
            let cleanTimestamp = timestampStr.Replace(":", "").Replace("-", "")
            let signatureId = $"sig_{cleanTimestamp}_{fileName}"
            
            let digitalSignature = {
                SignatureId = signatureId
                SpecificationPath = SpecificationPath filePath
                Algorithm = "HMAC-SHA256"
                SignatureValue = signature
                ContentHash = Convert.ToHexString(contentHash).ToLowerInvariant()
                KeyIdentifier = 
                    Environment.GetEnvironmentVariable("ORACLE_KEY_IDENTIFIER")
                    |> Option.ofObj
                    |> Option.defaultValue "oracle-key-2025-01"
                SignerInfo = signerInfo
                ValidFrom = timestamp
                ExpiresAt = timestamp.AddMonths(3) // Default 3 months expiry
                Status = SignatureStatus.Active
                SpecificationVersion = "1.0"
                SpecificationStatusAtSigning = "approved"
                RelatedApprovals = []
                OracleVersion = "1.0.0"
            }
            
            Ok digitalSignature
            
    with
    | :? UnauthorizedAccessException as ex ->
        Error $"Access denied to file: {ex.Message}"
    | :? IOException as ex ->
        Error $"File I/O error: {ex.Message}"
    | ex ->
        Error $"Signature generation failed: {ex.Message}"

/// Verify HMAC-SHA256 signature for a specification document
let verifySignature (filePath: string) (signature: DigitalSignature) (secretKey: string) : Result<bool, string> =
    try
        if not (File.Exists(filePath)) then
            Error $"File not found: {filePath}"
        elif String.IsNullOrWhiteSpace(secretKey) then
            Error "Secret key is required for signature verification"
        else
            // 1. Read current file content
            let content = File.ReadAllText(filePath).Replace("\r\n", "\n")
            let contentBytes = Encoding.UTF8.GetBytes(content)
            let currentContentHash = SHA256.HashData(contentBytes)
            let currentHashHex = Convert.ToHexString(currentContentHash).ToLowerInvariant()
            
            // 2. Check if content matches signature
            if currentHashHex <> signature.ContentHash then
                Ok false // Content has been modified
            else
                // 3. Recreate signing payload
                let timestampStr = signature.ValidFrom.ToString("yyyy-MM-ddTHH:mm:ssZ")
                let payload = $"{filePath}|{signature.ContentHash}|{timestampStr}|{signature.SignerInfo.Email}|{signature.SignerInfo.Role}"
                
                // 4. Verify HMAC signature
                let secretKeyBytes = Encoding.UTF8.GetBytes(secretKey)
                let payloadBytes = Encoding.UTF8.GetBytes(payload)
                let expectedSignatureBytes = HMACSHA256.HashData(secretKeyBytes, payloadBytes)
                let expectedSignature = Convert.ToHexString(expectedSignatureBytes).ToLowerInvariant()
                
                Ok (expectedSignature = signature.SignatureValue)
                
    with
    | :? UnauthorizedAccessException as ex ->
        Error $"Access denied to file: {ex.Message}"
    | :? IOException as ex ->
        Error $"File I/O error: {ex.Message}"
    | ex ->
        Error $"Signature verification failed: {ex.Message}"

/// Check signature expiration status
let checkSignatureExpiration (signature: DigitalSignature) : SignatureStatus =
    let now = DateTimeOffset.UtcNow
    let daysUntilExpiry = (signature.ExpiresAt - now).TotalDays
    
    match daysUntilExpiry with
    | d when d < 0.0 -> SignatureStatus.Expired
    | d when d < 7.0 -> SignatureStatus.ExpiringWarn  // Warning period
    | d when d < 30.0 -> SignatureStatus.ExpiringInfo // Info period  
    | _ -> SignatureStatus.Active

/// Create signature file content in YAML format
let createSignatureFileContent (signature: DigitalSignature) : string =
    let validFromStr = signature.ValidFrom.ToString("yyyy-MM-ddTHH:mm:ssZ")
    let expiresAtStr = signature.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
    let statusStr = signature.Status.ToString().ToLowerInvariant()
    
    let signerInfoYaml = $"  signer_info:\n    signer_email: \"{signature.SignerInfo.Email}\"\n    signer_role: \"{signature.SignerInfo.Role}\"\n    signing_timestamp: \"{validFromStr}\"\n    signing_reason: \"{signature.SignerInfo.SigningReason}\""
    
    let validityInfoYaml = $"  validity_info:\n    valid_from: \"{validFromStr}\"\n    expires_at: \"{expiresAtStr}\"\n    status: \"{statusStr}\""
    
    let relatedApprovalsYaml = 
        if signature.RelatedApprovals.IsEmpty then "[]"
        else signature.RelatedApprovals |> List.map (fun a -> $"\"{a}\"") |> String.concat ", " |> fun s -> $"[{s}]"
    
    let specPath = Paths.getSpecificationPath signature.SpecificationPath
    
    $"digital_signature:\n  signature_id: \"{signature.SignatureId}\"\n  specification_path: \"{specPath}\"\n  \n  cryptographic_info:\n    algorithm: \"{signature.Algorithm}\"\n    signature_value: \"{signature.SignatureValue}\"\n    content_hash: \"sha256:{signature.ContentHash}\"\n    key_identifier: \"{signature.KeyIdentifier}\"\n    \n{signerInfoYaml}\n    \n{validityInfoYaml}\n    \n  metadata:\n    specification_version: \"{signature.SpecificationVersion}\"\n    specification_status_at_signing: \"{signature.SpecificationStatusAtSigning}\"\n    related_approvals: {relatedApprovalsYaml}\n    oracle_version: \"{signature.OracleVersion}\"\n"

/// Get signature file path for a specification
let getSignatureFilePath (specPath: string) : string =
    let fileName = Path.GetFileNameWithoutExtension(specPath)
    let parentDir = Path.GetDirectoryName(specPath)
    let signatureDir = Path.Combine(parentDir, ".oracle", "signatures")
    Path.Combine(signatureDir, $"{fileName}.yaml.sig")

/// Save signature to file system
let saveSignatureToFile (signature: DigitalSignature) : Result<string, string> =
    try
        let specPath = Paths.getSpecificationPath signature.SpecificationPath
        let signatureFilePath = getSignatureFilePath specPath
        let signatureDir = Path.GetDirectoryName(signatureFilePath)
        
        // Create signature directory if it doesn't exist
        if not (Directory.Exists(signatureDir)) then
            Directory.CreateDirectory(signatureDir) |> ignore
        
        // Write signature file
        let content = createSignatureFileContent signature
        File.WriteAllText(signatureFilePath, content)
        
        Ok signatureFilePath
        
    with
    | :? UnauthorizedAccessException as ex ->
        Error $"Access denied: {ex.Message}"
    | :? IOException as ex ->
        Error $"File I/O error: {ex.Message}"
    | ex ->
        Error $"Failed to save signature file: {ex.Message}"