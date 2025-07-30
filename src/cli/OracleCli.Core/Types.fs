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
        path.EndsWith(".yaml") || path.EndsWith(".yml")
    
    let isValidCodePath (CodePath path) =
        System.IO.File.Exists(path)

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