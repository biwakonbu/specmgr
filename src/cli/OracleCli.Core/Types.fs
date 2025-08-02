namespace OracleCli.Core

open System

/// Wrapper type for specification file paths
type SpecificationPath = SpecificationPath of string

/// Wrapper type for implementation code file paths  
type CodePath = CodePath of string

/// Wrapper type for natural language queries
type Query = Query of string

/// Result of a specification search operation
type SearchResult = {
    Path: SpecificationPath
    Title: string
    Content: string
    Score: float
    Tags: string list
    Keywords: string list
}

/// Result of implementation compliance checking
type CheckResult = 
    | Success of string
    | Failure of string * float
    | Warning of string * float

/// Metadata about a specification file
type SpecificationMetadata = {
    Path: SpecificationPath
    Title: string
    Tags: string list
    Keywords: string list
    LastModified: DateTime
    Size: int64
}


/// Configuration for external services
type ServiceConfig = {
    SpecMgrUrl: string
    QdrantUrl: string
    AnthropicApiKey: string option
    Timeout: int
    MaxRetries: int
}

/// Helper functions for path operations
module Paths =
    let getSpecificationPath (SpecificationPath path) = path
    let getCodePath (CodePath path) = path
    let getQuery (Query query) = query
    
    let isValidSpecificationPath (SpecificationPath path) =
        path.EndsWith(".yaml") || path.EndsWith(".yml") || path.EndsWith(".md")
    
    let isValidCodePath (CodePath path) =
        System.IO.File.Exists(path)

/// Digital signature status
type SignatureStatus =
    | Active
    | Expired
    | Revoked
    | Suspended
    | ExpiringWarn
    | ExpiringInfo

/// Signer information
type SignerInfo = {
    Email: string
    Role: string
    SigningReason: string
}

/// Document claim for claim-based signatures
type DocumentClaim = {
    Path: string          // Project root relative path (Unix-style)
    ContentHash: string   // SHA-256 hash (hex lowercase)
    Size: int64          // File size for additional validation
}

/// Claim-based signature payload (JWT-inspired)
type SignatureClaims = {
    // Standard JWT-like claims
    Issuer: string        // "oracle-cli"
    Subject: string       // "document-signing"
    IssuedAt: int64       // Unix timestamp
    ExpiresAt: int64      // Unix timestamp
    
    // Oracle-specific claims
    Documents: DocumentClaim list    // Explicit file list (no wildcards)
    SignerEmail: string
    SignerRole: string
    SigningReason: string
    ProjectRoot: string   // Git root path for verification context
    Version: string       // Signature format version "1.0"
}

/// Claim-based signature container
type ClaimBasedSignature = {
    Header: string        // Base64 encoded header {"alg":"HS256","typ":"ORC"}
    Claims: string        // Base64 encoded SignatureClaims JSON
    Signature: string     // Base64 encoded HMAC-SHA256 signature
    Raw: string          // Full signature string: {header}.{claims}.{signature}
}

/// Digital signature data (legacy format - kept for compatibility)
type DigitalSignature = {
    SignatureId: string
    SpecificationPath: SpecificationPath
    Algorithm: string
    SignatureValue: string
    ContentHash: string
    KeyIdentifier: string
    SignerInfo: SignerInfo
    ValidFrom: DateTimeOffset
    ExpiresAt: DateTimeOffset
    Status: SignatureStatus
    SpecificationVersion: string
    SpecificationStatusAtSigning: string
    RelatedApprovals: string list
    OracleVersion: string
}

/// Signature operation result
type SignatureResult = {
    Success: bool
    SignatureId: string option
    ErrorMessage: string option
    SignedFilePath: string option
    CommitHash: string option
}

/// Helper functions for working with results
module Results =
    let mapResult (f: 'T -> 'U) (result: Result<'T, string>) : Result<'U, string> =
        match result with
        | Ok value -> Ok (f value)
        | Error msg -> Error msg
    
    let bindResult (f: 'T -> Result<'U, string>) (result: Result<'T, string>) : Result<'U, string> =
        match result with
        | Ok value -> f value
        | Error msg -> Error msg
    
    let isSuccess = function
        | Ok _ -> true
        | Error _ -> false
    
    let getValue = function
        | Ok value -> Some value
        | Error _ -> None