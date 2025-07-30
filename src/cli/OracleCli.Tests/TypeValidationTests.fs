module OracleCli.Tests.TypeValidationTests

open Xunit
open FsCheck
open FsCheck.Xunit
open OracleCli.Core

/// Test core domain types validation and behavior
[<Fact>]
let ``SpecificationPath should wrap string correctly`` () =
    let path = "features/user-management/registration.yaml"
    let specPath = SpecificationPath path
    
    match specPath with
    | SpecificationPath wrappedPath ->
        Assert.Equal(path, wrappedPath)

[<Fact>]
let ``CodePath should wrap string correctly`` () =
    let path = "src/auth/registration.py"
    let codePath = CodePath path
    
    match codePath with
    | CodePath wrappedPath ->
        Assert.Equal(path, wrappedPath)

[<Fact>]
let ``Query should wrap string correctly`` () =
    let queryText = "user registration process"
    let query = Query queryText
    
    match query with
    | Query wrappedQuery ->
        Assert.Equal(queryText, wrappedQuery)

/// Test SearchResult record validation
[<Fact>]
let ``SearchResult should contain all required fields`` () =
    let searchResult = {
        Path = SpecificationPath "test/path.yaml"
        Title = "Test Specification"
        Content = "This is test content"
        Score = 0.85
        Tags = ["authentication"; "user-management"]
        Keywords = ["user"; "registration"; "validation"]
    }
    
    match searchResult.Path with
    | SpecificationPath path -> Assert.Equal("test/path.yaml", path)
    
    Assert.Equal("Test Specification", searchResult.Title)
    Assert.Equal("This is test content", searchResult.Content)
    Assert.Equal(0.85, searchResult.Score)
    Assert.Equal(2, searchResult.Tags.Length)
    Assert.Equal(3, searchResult.Keywords.Length)

/// Test CheckResult union type
[<Fact>]
let ``CheckResult Success should contain message`` () =
    let result = CheckResult.Success "Implementation matches specification"
    
    match result with
    | CheckResult.Success message ->
        Assert.Equal("Implementation matches specification", message)
    | _ ->
        Assert.True(false, "Expected Success result")

[<Fact>]
let ``CheckResult Failure should contain message and confidence`` () =
    let result = CheckResult.Failure ("Mismatch detected", 0.75)
    
    match result with
    | CheckResult.Failure (message, confidence) ->
        Assert.Equal("Mismatch detected", message)
        Assert.Equal(0.75, confidence)
    | _ ->
        Assert.True(false, "Expected Failure result")

[<Fact>]
let ``CheckResult Warning should contain message and confidence`` () =
    let result = CheckResult.Warning ("Potential issue", 0.60)
    
    match result with
    | CheckResult.Warning (message, confidence) ->
        Assert.Equal("Potential issue", message)
        Assert.Equal(0.60, confidence)
    | _ ->
        Assert.True(false, "Expected Warning result")

/// Property-based tests for domain types
[<Property>]
let ``SpecificationPath preserves input string`` (input: NonEmptyString) =
    let specPath = SpecificationPath input.Get
    match specPath with
    | SpecificationPath path -> path = input.Get

[<Property>]
let ``CodePath preserves input string`` (input: NonEmptyString) =
    let codePath = CodePath input.Get
    match codePath with
    | CodePath path -> path = input.Get

[<Property>]
let ``Query preserves input string`` (input: NonEmptyString) =
    let query = Query input.Get
    match query with
    | Query queryText -> queryText = input.Get

[<Property>]
let ``SearchResult Score should be between 0 and 1`` () =
    let validScore = Gen.choose(0, 100) |> Gen.map (fun x -> float x / 100.0)
    
    Prop.forAll (Arb.fromGen validScore) (fun score ->
        let searchResult = {
            Path = SpecificationPath "test.yaml"
            Title = "Test"
            Content = "Content"
            Score = score
            Tags = []
            Keywords = []
        }
        
        searchResult.Score >= 0.0 && searchResult.Score <= 1.0)

/// Test ServiceConfig validation
[<Fact>]
let ``ServiceConfig should have reasonable defaults`` () =
    let config = {
        SpecMgrUrl = "http://localhost:3000"
        QdrantUrl = "http://localhost:6333"
        AnthropicApiKey = None
        Timeout = 30000
        MaxRetries = 3
    }
    
    Assert.Equal("http://localhost:3000", config.SpecMgrUrl)
    Assert.Equal("http://localhost:6333", config.QdrantUrl)
    Assert.Equal(None, config.AnthropicApiKey)
    Assert.Equal(30000, config.Timeout)
    Assert.Equal(3, config.MaxRetries)

[<Property>]
let ``ServiceConfig Timeout should be positive`` (timeout: PositiveInt) =
    let config = {
        SpecMgrUrl = "http://localhost:3000"
        QdrantUrl = "http://localhost:6333"
        AnthropicApiKey = None
        Timeout = timeout.Get
        MaxRetries = 3
    }
    
    config.Timeout > 0

[<Property>]
let ``ServiceConfig MaxRetries should be non-negative`` (retries: NonNegativeInt) =
    let config = {
        SpecMgrUrl = "http://localhost:3000"
        QdrantUrl = "http://localhost:6333"
        AnthropicApiKey = None
        Timeout = 30000
        MaxRetries = retries.Get
    }
    
    config.MaxRetries >= 0

/// Test edge cases for wrapped types
[<Theory>]
[<InlineData("")>]
[<InlineData(" ")>]
[<InlineData("   ")>]
let ``SpecificationPath should handle empty and whitespace strings`` (input: string) =
    // While we allow empty strings, they might not be semantically valid
    let specPath = SpecificationPath input
    match specPath with
    | SpecificationPath path -> Assert.Equal(input, path)

[<Fact>]
let ``SearchResult Tags should handle empty list`` () =
    let searchResult = {
        Path = SpecificationPath "test.yaml"
        Title = "Test"
        Content = "Content"
        Score = 0.5
        Tags = []
        Keywords = ["test"]
    }
    
    Assert.Empty(searchResult.Tags)
    Assert.Single(searchResult.Keywords)

[<Fact>]
let ``SearchResult Keywords should handle empty list`` () =
    let searchResult = {
        Path = SpecificationPath "test.yaml"
        Title = "Test"
        Content = "Content"
        Score = 0.5
        Tags = ["test"]
        Keywords = []
    }
    
    Assert.Single(searchResult.Tags)
    Assert.Empty(searchResult.Keywords)

/// Test that types prevent common errors
[<Fact>]
let ``Type system prevents mixing up paths`` () =
    let specPath = SpecificationPath "spec.yaml"
    let codePath = CodePath "code.py"
    
    // This should compile - we're testing that the types are distinct
    let processSpec (SpecificationPath path) = path
    let processCode (CodePath path) = path
    
    let specResult = processSpec specPath
    let codeResult = processCode codePath
    
    Assert.NotEqual<string>(specResult, codeResult)

/// Test complex scenarios
[<Fact>]
let ``SearchResult can handle unicode content`` () =
    let searchResult = {
        Path = SpecificationPath "features/国際化/ユーザー登録.yaml"
        Title = "ユーザー登録仕様"
        Content = "このドキュメントはユーザー登録プロセスを説明します。"
        Score = 0.9
        Tags = ["国際化"; "ユーザー管理"]
        Keywords = ["ユーザー"; "登録"; "検証"]
    }
    
    Assert.Contains("ユーザー", searchResult.Title)
    Assert.Contains("国際化", searchResult.Tags)
    Assert.Contains("検証", searchResult.Keywords)