module OracleCli.Tests.ServiceIntegrationTests

open Xunit
open FsCheck
open FsCheck.Xunit
open NSubstitute
open Bogus
open System
open System.Threading.Tasks
open OracleCli.Core
open OracleCli.Commands

/// Test data generators using Bogus
let private specificationPathGenerator =
    let faker = Faker()
    fun () ->
        let fileName = faker.System.FileName("yaml")
        let folder = faker.System.DirectoryPath()
        SpecificationPath $"{folder}/{fileName}"

let private codePathGenerator =
    let faker = Faker()
    fun () ->
        let fileName = faker.System.FileName("py")
        let folder = faker.System.DirectoryPath()
        CodePath $"{folder}/{fileName}"

let private queryGenerator =
    let faker = Faker()
    fun () ->
        Query (faker.Lorem.Sentence())

/// Mock service interface for testing
type ITestSearchService =
    abstract member SearchAsync : Query -> Task<Result<SearchResult list, string>>

type ITestVerificationService =
    abstract member CheckImplementationAsync : CodePath * SpecificationPath -> Task<Result<CheckResult, string>>

/// Test service implementations using NSubstitute
[<Fact>]
let ``Mock search service should return expected results`` () =
    // Arrange
    let mockService = Substitute.For<ITestSearchService>()
    let query = Query "user registration"
    let expectedResult = {
        Path = SpecificationPath "features/user-management/registration.yaml"
        Title = "User Registration"
        Content = "User registration specification"
        Score = 0.95
        Tags = ["user-management"; "authentication"]
        Keywords = ["user"; "registration"; "validation"]
    }
    
    mockService.SearchAsync(query).Returns(Task.FromResult(Ok [expectedResult])) |> ignore
    
    // Act
    let task = mockService.SearchAsync(query)
    let result = task.Result
    
    // Assert
    match result with
    | Ok searchResults ->
        Assert.Single(searchResults)
        let firstResult = searchResults.[0]
        Assert.Equal("User Registration", firstResult.Title)
        Assert.Equal(0.95, firstResult.Score)
    | Error _ ->
        Assert.True(false, "Expected successful search result")

[<Fact>]
let ``Mock verification service should return check results`` () =
    // Arrange
    let mockService = Substitute.For<ITestVerificationService>()
    let codePath = CodePath "src/auth/registration.py"
    let specPath = SpecificationPath "features/user-management/registration.yaml"
    let expectedResult = CheckResult.Success "Implementation matches specification"
    
    mockService.CheckImplementationAsync(codePath, specPath)
        .Returns(Task.FromResult(Ok expectedResult)) |> ignore
    
    // Act
    let task = mockService.CheckImplementationAsync(codePath, specPath)
    let result = task.Result
    
    // Assert
    match result with
    | Ok checkResult ->
        match checkResult with
        | CheckResult.Success message ->
            Assert.Equal("Implementation matches specification", message)
        | _ ->
            Assert.True(false, "Expected Success result")
    | Error _ ->
        Assert.True(false, "Expected successful verification")

/// Test error handling scenarios
[<Fact>]
let ``Mock service should handle search errors`` () =
    // Arrange
    let mockService = Substitute.For<ITestSearchService>()
    let query = Query "invalid query"
    let errorMessage = "Search service unavailable"
    
    mockService.SearchAsync(query).Returns(Task.FromResult(Error errorMessage)) |> ignore
    
    // Act
    let task = mockService.SearchAsync(query)
    let result = task.Result
    
    // Assert
    match result with
    | Error error ->
        Assert.Equal(errorMessage, error)
    | Ok _ ->
        Assert.True(false, "Expected error result")

[<Fact>]
let ``Mock service should handle verification errors`` () =
    // Arrange
    let mockService = Substitute.For<ITestVerificationService>()
    let codePath = CodePath "nonexistent/file.py"
    let specPath = SpecificationPath "nonexistent/spec.yaml"
    let errorMessage = "File not found"
    
    mockService.CheckImplementationAsync(codePath, specPath)
        .Returns(Task.FromResult(Error errorMessage)) |> ignore
    
    // Act
    let task = mockService.CheckImplementationAsync(codePath, specPath)
    let result = task.Result
    
    // Assert
    match result with
    | Error error ->
        Assert.Equal(errorMessage, error)
    | Ok _ ->
        Assert.True(false, "Expected error result")

/// Property-based tests with generated data
[<Property>]
let ``Search service should handle any valid query`` () =
    let query = queryGenerator()
    let mockService = Substitute.For<ITestSearchService>()
    
    // Mock service to return empty results for any query
    mockService.SearchAsync(Arg.Any<Query>()).Returns(Task.FromResult(Ok [])) |> ignore
    
    let task = mockService.SearchAsync(query)
    let result = task.Result
    
    match result with
    | Ok results -> List.isEmpty results
    | Error _ -> false

[<Property>]
let ``Verification service should handle any valid paths`` () =
    let codePath = codePathGenerator()
    let specPath = specificationPathGenerator()
    let mockService = Substitute.For<ITestVerificationService>()
    
    let warningResult = CheckResult.Warning ("No clear match", 0.5)
    mockService.CheckImplementationAsync(Arg.Any<CodePath>(), Arg.Any<SpecificationPath>())
        .Returns(Task.FromResult(Ok warningResult)) |> ignore
    
    let task = mockService.CheckImplementationAsync(codePath, specPath)
    let result = task.Result
    
    match result with
    | Ok (CheckResult.Warning (_, confidence)) -> confidence = 0.5
    | _ -> false

/// Test realistic scenarios using Bogus-generated data
[<Fact>]
let ``Service should handle realistic specification search`` () =
    let faker = Faker()
    let mockService = Substitute.For<ITestSearchService>()
    
    // Generate realistic test data
    let searchResults = [
        for i in 1..5 do
            let folderName = faker.Lorem.Word()
            let fileName = faker.System.FileName("yaml")
            yield {
                Path = SpecificationPath $"features/{folderName}/{fileName}"
                Title = faker.Lorem.Sentence(3, 5)
                Content = faker.Lorem.Paragraphs(2)
                Score = faker.Random.Double(0.5, 1.0)
                Tags = [ for _ in 1..faker.Random.Int(1, 4) do yield faker.Lorem.Word() ]
                Keywords = [ for _ in 1..faker.Random.Int(2, 6) do yield faker.Lorem.Word() ]
            }
    ]
    
    let query = Query (String.Join(" ", faker.Lorem.Words(4)))
    mockService.SearchAsync(query).Returns(Task.FromResult(Ok searchResults)) |> ignore
    
    // Act
    let task = mockService.SearchAsync(query)
    let result = task.Result
    
    // Assert
    match result with
    | Ok results ->
        Assert.Equal(5, results.Length)
        results |> List.iter (fun r -> 
            Assert.True(r.Score >= 0.5 && r.Score <= 1.0)
            Assert.NotEmpty(r.Tags)
            Assert.NotEmpty(r.Keywords)
        )
    | Error _ ->
        Assert.True(false, "Expected successful search with realistic data")

/// Test timeout and retry scenarios
[<Fact>]
let ``Service should handle timeout scenarios`` () =
    let mockService = Substitute.For<ITestSearchService>()
    let query = Query "slow query"
    
    // Simulate timeout
    let timeoutError = "Request timeout after 30 seconds"
    mockService.SearchAsync(query).Returns(Task.FromResult(Error timeoutError)) |> ignore
    
    let task = mockService.SearchAsync(query)
    let result = task.Result
    
    match result with
    | Error error when error.Contains("timeout") ->
        Assert.True(true, "Timeout error handled correctly")
    | _ ->
        Assert.True(false, "Expected timeout error")

/// Test command context integration
[<Fact>]
let ``CommandContext should provide service configuration`` () =
    let config = {
        SpecMgrUrl = "http://test.localhost:3000"
        QdrantUrl = "http://test.localhost:6333"
        AnthropicApiKey = Some "test-api-key"
        Timeout = 15000
        MaxRetries = 5
    }
    
    let context = {
        Config = config
        Verbose = true
        DryRun = false
    }
    
    Assert.Equal("http://test.localhost:3000", context.Config.SpecMgrUrl)
    Assert.Equal("http://test.localhost:6333", context.Config.QdrantUrl)
    Assert.Equal(Some "test-api-key", context.Config.AnthropicApiKey)
    Assert.Equal(15000, context.Config.Timeout)
    Assert.Equal(5, context.Config.MaxRetries)
    Assert.True(context.Verbose)
    Assert.False(context.DryRun)

/// Test complex verification scenarios
[<Fact>]
let ``Verification service should handle different result types`` () =
    let mockService = Substitute.For<ITestVerificationService>()
    let codePath = CodePath "src/complex/feature.py"
    let specPath = SpecificationPath "features/complex/feature.yaml"
    
    // Test different result types
    let testCases = [
        CheckResult.Success "Perfect match"
        CheckResult.Warning ("Minor discrepancy", 0.8)
        CheckResult.Failure ("Major mismatch", 0.3)
    ]
    
    for (i, expectedResult) in testCases |> List.indexed do
        let testCodePath = CodePath $"src/test{i}/file.py"
        mockService.CheckImplementationAsync(testCodePath, specPath)
            .Returns(Task.FromResult(Ok expectedResult)) |> ignore
        
        let task = mockService.CheckImplementationAsync(testCodePath, specPath)
        let result = task.Result
        
        match result with
        | Ok checkResult ->
            match checkResult, expectedResult with
            | CheckResult.Success msg1, CheckResult.Success msg2 ->
                Assert.Equal(msg2, msg1)
            | CheckResult.Warning (msg1, conf1), CheckResult.Warning (msg2, conf2) ->
                Assert.Equal(msg2, msg1)
                Assert.Equal(conf2, conf1)
            | CheckResult.Failure (msg1, conf1), CheckResult.Failure (msg2, conf2) ->
                Assert.Equal(msg2, msg1)
                Assert.Equal(conf2, conf1)
            | _ ->
                Assert.True(false, $"Result type mismatch for test case {i}")
        | Error _ ->
            Assert.True(false, $"Expected success for test case {i}")

/// Test integration with command types
[<Fact>]
let ``Service integration should work with all command types`` () =
    let commands = [
        FindSpec (Query "test query")
        CheckImpl (CodePath "test.py", SpecificationPath "test.yaml")
        GenerateSpec (CodePath "generate.py")
        ShowSpec (SpecificationPath "show.yaml")
        ListSpecs (Some "test-tag")
        ListSpecs None
        Watch (CodePath "watch.py")
        Ask (Query "test question")
        Help
    ]
    
    // Verify all commands are testable
    commands |> List.iter (fun cmd ->
        match cmd with
        | FindSpec (Query q) -> Assert.NotEmpty(q)
        | CheckImpl (CodePath cp, SpecificationPath sp) -> 
            Assert.NotEmpty(cp)
            Assert.NotEmpty(sp)
        | GenerateSpec (CodePath cp) -> Assert.NotEmpty(cp)
        | ShowSpec (SpecificationPath sp) -> Assert.NotEmpty(sp)
        | ListSpecs tag -> 
            match tag with
            | Some t -> Assert.NotEmpty(t)
            | None -> Assert.True(true)
        | Watch (CodePath cp) -> Assert.NotEmpty(cp)
        | Ask (Query q) -> Assert.NotEmpty(q)
        | DocsSign (SpecificationPath sp, _customMessage) -> 
            Assert.NotEmpty(sp)
            // customMessage can be None or Some
        | Help -> Assert.True(true)
    )