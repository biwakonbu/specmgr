# Oracle F# CLI Design

## Overview

Oracle is implemented as an F# CLI tool providing specification management and verification capabilities. The functional programming paradigm of F# is well-suited for RAG pipelines, AI integration, and type-safe command processing.

## Project Structure

```
src/cli/
├── oracle-cli.sln                # Solution file
├── OracleCli.Core/               # Core types and domain models
│   ├── OracleCli.Core.fsproj
│   ├── Types.fs                  # Domain types and records
│   └── Domain.fs                 # Business logic types
├── OracleCli.Services/           # External service integrations
│   ├── OracleCli.Services.fsproj
│   ├── SearchService.fs          # RAG search integration
│   ├── VerificationService.fs    # AI-based verification
│   ├── EmbeddingService.fs       # Claude Code SDK embeddings
│   └── SpecMgrBridge.fs          # Integration with existing system
├── OracleCli.Commands/           # Command handling and parsing
│   ├── OracleCli.Commands.fsproj
│   ├── CommandTypes.fs           # Command definitions
│   ├── CommandHandler.fs         # Command execution logic
│   └── CommandParser.fs          # CLI argument parsing
├── OracleCli/                    # CLI entry point
│   ├── OracleCli.fsproj
│   ├── Program.fs                # Main entry point
│   └── Configuration.fs          # Configuration management
└── OracleCli.Tests/              # Unit and integration tests
    ├── OracleCli.Tests.fsproj
    ├── SearchServiceTests.fs
    └── VerificationServiceTests.fs
```

## Core Types

### Domain Types

```fsharp
// OracleCli.Core/Types.fs
namespace OracleCli.Core

type SpecificationPath = SpecificationPath of string
type CodePath = CodePath of string
type Query = Query of string

type SearchResult = {
    Path: SpecificationPath
    Title: string
    Content: string
    Score: float
    Tags: string list
}

type CheckResult = {
    IsCompliant: bool
    Reason: string
    MissingFeatures: string list
    Recommendations: string list
    Confidence: float
}

type SpecificationMetadata = {
    Path: SpecificationPath
    Title: string
    Tags: string list
    Keywords: string list
    LastModified: System.DateTime
}
```

### Command Types

```fsharp
// OracleCli.Commands/CommandTypes.fs
namespace OracleCli.Commands

open OracleCli.Core

type OracleCommand =
    | FindSpec of Query
    | CheckImpl of CodePath * SpecificationPath
    | GenerateSpec of CodePath
    | ShowSpec of SpecificationPath
    | ListSpecs of tag: string option
    | Watch of CodePath
    | Ask of Query

type CommandResult<'T> = 
    | Success of 'T
    | Error of string
    | Warning of string * 'T
```

## Service Architecture

### 1. Search Service (RAG Integration)

```fsharp
// OracleCli.Services/SearchService.fs
module OracleCli.Services.SearchService

open OracleCli.Core
open System.Threading.Tasks

type ISearchService =
    abstract member FindSpecifications: Query -> Async<SearchResult list>
    abstract member GetSpecificationContent: SpecificationPath -> Async<string option>
    abstract member ListAllSpecifications: unit -> Async<SpecificationMetadata list>

type SearchService(qdrantClient: QdrantClient, embeddingService: IEmbeddingService) =
    
    let searchByEmbedding (Query query) = async {
        let! embedding = embeddingService.GenerateEmbedding(query)
        let! results = qdrantClient.SearchAsync("specifications", embedding, 10)
        
        return results
        |> List.map (fun r -> {
            Path = SpecificationPath r.Payload.["path"]
            Title = r.Payload.["title"]
            Content = r.Payload.["content"] 
            Score = r.Score
            Tags = r.Payload.["tags"] |> List.ofArray
        })
    }
    
    interface ISearchService with
        member _.FindSpecifications query = searchByEmbedding query
        member _.GetSpecificationContent path = async {
            let (SpecificationPath pathStr) = path
            return Some (System.IO.File.ReadAllText(pathStr))
        }
        member _.ListAllSpecifications() = async {
            // Implementation for listing all specs
            return []
        }
```

### 2. Verification Service (AI Integration)

```fsharp
// OracleCli.Services/VerificationService.fs
module OracleCli.Services.VerificationService

open OracleCli.Core
open System.Text.Json

type IVerificationService =
    abstract member CheckImplementation: CodePath -> SpecificationPath -> Async<Result<CheckResult, string>>
    abstract member GenerateSpecification: CodePath -> Async<Result<string, string>>

type VerificationService(claudeClient: IClaudeClient) =
    
    let createVerificationPrompt specContent codeContent =
        $"""
以下の仕様書と実装コードを比較して、実装が仕様を満たしているか判定してください。

仕様書:
```yaml
{specContent}
```

実装コード:
```
{codeContent}
```

判定結果をJSON形式で返してください：
{{
  "isCompliant": true/false,
  "reason": "詳細な理由",
  "missingFeatures": ["不足機能1", "不足機能2"],
  "recommendations": ["推奨改善点1", "推奨改善点2"],
  "confidence": 0.85
}}
"""

    let parseAIResponse (response: string) =
        try
            let options = JsonSerializerOptions()
            options.PropertyNamingPolicy <- JsonNamingPolicy.CamelCase
            let result = JsonSerializer.Deserialize<CheckResult>(response, options)
            Ok result
        with
        | ex -> Error $"Failed to parse AI response: {ex.Message}"

    interface IVerificationService with
        member _.CheckImplementation (CodePath codePath) (SpecificationPath specPath) = async {
            try
                let codeContent = System.IO.File.ReadAllText(codePath)
                let specContent = System.IO.File.ReadAllText(specPath)
                let prompt = createVerificationPrompt specContent codeContent
                
                let! response = claudeClient.SendMessageAsync(prompt)
                return parseAIResponse response
            with
            | ex -> return Error $"Error during verification: {ex.Message}"
        }
        
        member _.GenerateSpecification (CodePath codePath) = async {
            // Implementation for spec generation
            return Error "Not implemented yet"
        }
```

### 3. Integration Bridge

```fsharp
// OracleCli.Services/SpecMgrBridge.fs  
module OracleCli.Services.SpecMgrBridge

open OracleCli.Core
open System.Net.Http
open System.Text.Json

type SpecMgrClient(baseUrl: string) =
    let httpClient = new HttpClient()
    
    member _.SearchHybrid(query: string) = async {
        let url = $"{baseUrl}/api/search?q={System.Web.HttpUtility.UrlEncode(query)}"
        let! response = httpClient.GetStringAsync(url) |> Async.AwaitTask
        
        // Parse existing API response and convert to Oracle types
        let results = JsonSerializer.Deserialize<{| results: {| path: string; title: string; content: string; score: float |} array |}>(response)
        
        return results.results
        |> Array.map (fun r -> {
            Path = SpecificationPath r.path
            Title = r.title
            Content = r.content
            Score = r.score
            Tags = []
        })
        |> Array.toList
    }
    
    member _.GetEmbedding(text: string) = async {
        let url = $"{baseUrl}/api/embeddings"
        let content = new StringContent(
            JsonSerializer.Serialize({| text = text |}),
            System.Text.Encoding.UTF8,
            "application/json"
        )
        let! response = httpClient.PostAsync(url, content) |> Async.AwaitTask
        let! responseText = response.Content.ReadAsStringAsync() |> Async.AwaitTask
        let result = JsonSerializer.Deserialize<{| embedding: float[] |}>(responseText)
        return result.embedding
    }
```

## Command Handling

### Command Parser

```fsharp
// OracleCli.Commands/CommandParser.fs
module OracleCli.Commands.CommandParser

open OracleCli.Core
open OracleCli.Commands.CommandTypes

let parseCommand (args: string array) : Result<OracleCommand, string> =
    match args with
    | [| "find-spec"; query |] -> 
        Ok (FindSpec (Query query))
    | [| "check"; codePath; "--spec"; specPath |] ->
        Ok (CheckImpl (CodePath codePath, SpecificationPath specPath))
    | [| "generate-spec"; codePath |] ->
        Ok (GenerateSpec (CodePath codePath))
    | [| "show"; specPath |] ->
        Ok (ShowSpec (SpecificationPath specPath))
    | [| "list" |] ->
        Ok (ListSpecs None)
    | [| "list"; "--tag"; tag |] ->
        Ok (ListSpecs (Some tag))
    | [| "ask"; query |] ->
        Ok (Ask (Query query))
    | _ ->
        Error """
Usage:
  oracle find-spec <query>              # Search specifications
  oracle check <code> --spec <spec>     # Check implementation
  oracle generate-spec <code>           # Generate spec from code
  oracle show <spec-path>               # Show specification
  oracle list [--tag <tag>]             # List specifications
  oracle ask <question>                 # Ask about specifications
"""
```

### Command Handler

```fsharp
// OracleCli.Commands/CommandHandler.fs
module OracleCli.Commands.CommandHandler

open OracleCli.Core
open OracleCli.Commands.CommandTypes
open OracleCli.Services.SearchService
open OracleCli.Services.VerificationService

type CommandHandler(searchService: ISearchService, verificationService: IVerificationService) =
    
    let handleFindSpec (Query query) = async {
        printfn "🔍 Searching for: %s" query
        let! results = searchService.FindSpecifications(Query query)
        
        if List.isEmpty results then
            printfn "❌ No specifications found for query: %s" query
            return CommandResult.Error("No results found")
        else
            results
            |> List.iteri (fun i result ->
                printfn "%d. 📋 %s (Score: %.2f)" (i+1) result.Title result.Score
                let (SpecificationPath path) = result.Path
                printfn "   Path: %s" path
                printfn "   Preview: %s" (result.Content.Substring(0, min 100 result.Content.Length) + "...")
                printfn ""
            )
            return CommandResult.Success(results)
    }
    
    let handleCheckImpl codePath specPath = async {
        let (CodePath codePathStr) = codePath
        let (SpecificationPath specPathStr) = specPath
        printfn "🔍 Checking implementation..."
        printfn "   Code: %s" codePathStr
        printfn "   Spec: %s" specPathStr
        
        let! result = verificationService.CheckImplementation codePath specPath
        
        match result with
        | Ok checkResult ->
            let status = if checkResult.IsCompliant then "✅" else "❌"
            printfn "%s Compliance: %b (Confidence: %.0f%%)" status checkResult.IsCompliant (checkResult.Confidence * 100.0)
            printfn "   Reason: %s" checkResult.Reason
            
            if not (List.isEmpty checkResult.MissingFeatures) then
                printfn "   Missing Features:"
                checkResult.MissingFeatures |> List.iter (printfn "   - %s")
            
            if not (List.isEmpty checkResult.Recommendations) then
                printfn "   Recommendations:"
                checkResult.Recommendations |> List.iter (printfn "   - %s")
                
            return CommandResult.Success(checkResult)
        | Error errorMsg ->
            printfn "❌ Error: %s" errorMsg
            return CommandResult.Error(errorMsg)
    }
    
    member _.HandleCommand command = async {
        match command with
        | FindSpec query -> return! handleFindSpec query
        | CheckImpl (codePath, specPath) -> return! handleCheckImpl codePath specPath
        | GenerateSpec codePath ->
            printfn "🚧 Generate spec not implemented yet"
            return CommandResult.Error("Not implemented")
        | ShowSpec specPath ->
            let (SpecificationPath path) = specPath
            let content = System.IO.File.ReadAllText(path)
            printfn "📋 %s" path
            printfn "%s" content
            return CommandResult.Success(content)
        | ListSpecs tagFilter ->
            let! specs = searchService.ListAllSpecifications()
            let filteredSpecs = 
                match tagFilter with
                | Some tag -> specs |> List.filter (fun s -> s.Tags |> List.contains tag)
                | None -> specs
            
            filteredSpecs |> List.iter (fun spec ->
                let (SpecificationPath path) = spec.Path
                printfn "📋 %s" spec.Title
                printfn "   Path: %s" path
                printfn "   Tags: %s" (String.concat ", " spec.Tags)
            )
            return CommandResult.Success(filteredSpecs)
        | Ask query ->
            // TODO: Implement natural language Q&A
            printfn "🤖 Q&A not implemented yet"
            return CommandResult.Error("Not implemented")
    }
```

## Main Entry Point

```fsharp
// OracleCli/Program.fs
open System
open OracleCli.Core
open OracleCli.Commands.CommandParser
open OracleCli.Commands.CommandHandler
open OracleCli.Services.SearchService
open OracleCli.Services.VerificationService

[<EntryPoint>]
let main args =
    // Configuration
    let anthropicApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")
    let qdrantUrl = Environment.GetEnvironmentVariable("QDRANT_URL") ?? "http://localhost:6333"
    let specmgrUrl = Environment.GetEnvironmentVariable("SPECMGR_URL") ?? "http://localhost:3000"
    
    if String.IsNullOrEmpty(anthropicApiKey) then
        printfn "❌ ANTHROPIC_API_KEY environment variable is required"
        1
    else
        // Initialize services
        let qdrantClient = QdrantClient(qdrantUrl)
        let embeddingService = EmbeddingService(anthropicApiKey)
        let claudeClient = ClaudeClient(anthropicApiKey)
        
        let searchService = SearchService(qdrantClient, embeddingService) :> ISearchService
        let verificationService = VerificationService(claudeClient) :> IVerificationService
        
        let commandHandler = CommandHandler(searchService, verificationService)
        
        // Parse and execute command
        match parseCommand args with
        | Ok command ->
            try
                let result = commandHandler.HandleCommand command |> Async.RunSynchronously
                match result with
                | CommandResult.Success _ -> 0
                | CommandResult.Warning (msg, _) -> 
                    printfn "⚠️ Warning: %s" msg
                    0
                | CommandResult.Error msg -> 
                    printfn "❌ Error: %s" msg
                    1
            with
            | ex ->
                printfn "❌ Unexpected error: %s" ex.Message
                1
        | Error usage ->
            printfn "%s" usage
            1
```

## Development Phases

### Phase 1: MVP Implementation (Week 1-2)
- Basic project structure
- Simple find-spec command
- Integration with existing RAG system
- Manual specification checking

### Phase 2: AI Integration (Week 3-4)  
- Claude Code SDK integration
- Automated implementation checking
- Confidence scoring
- Error handling and retries

### Phase 3: Advanced Features (Month 2)
- Specification generation from code
- Real-time watching
- Natural language Q&A
- Performance optimization

## Integration Strategy

### With Existing System
- Oracle CLI calls existing Python API endpoints
- Reuses Qdrant vector database
- Leverages existing embedding pipeline
- Maintains compatibility with current workflow

### Deployment
- Compiled as single executable
- Environment variable configuration
- Docker containerization option
- CI/CD integration for automated testing

## Benefits of F# Approach

1. **Type Safety**: Compile-time guarantees prevent runtime errors
2. **Functional Composition**: Natural pipeline composition for RAG workflows  
3. **Async/Await**: Built-in async support for AI API calls
4. **Pattern Matching**: Clean command parsing and error handling
5. **Immutability**: Prevents unexpected state mutations
6. **Interop**: Easy integration with existing .NET and HTTP APIs

## Testing Strategy

- Unit tests for core domain logic
- Integration tests with mock AI services
- End-to-end tests with real specifications
- Property-based testing for command parsing
- Performance benchmarks for search operations