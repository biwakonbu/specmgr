module OracleCli.Tests.CommandParserTests

open Xunit
open FsCheck
open FsCheck.Xunit
open OracleCli.Core
open OracleCli.Commands
open OracleCli.Commands.CommandParser

/// Test basic command parsing functionality
[<Fact>]
let ``parseCommand should parse find-spec command correctly`` () =
    let args = [| "find-spec"; "user registration" |]
    let result = parseCommand args
    
    match result with
    | Ok (FindSpec (Query query)) -> 
        Assert.Equal("user registration", query)
    | _ -> 
        Assert.True(false, "Expected FindSpec command")

[<Fact>]
let ``parseCommand should parse check command correctly`` () =
    let args = [| "check"; "src/auth/login.py"; "--spec"; "features/auth/login.yaml" |]
    let result = parseCommand args
    
    match result with
    | Ok (CheckImpl (CodePath codePath, SpecificationPath specPath)) ->
        Assert.Equal("src/auth/login.py", codePath)
        Assert.Equal("features/auth/login.yaml", specPath)
    | _ ->
        Assert.True(false, "Expected CheckImpl command")

[<Fact>]
let ``parseCommand should parse show command correctly`` () =
    let args = [| "show"; "features/user-management/registration.yaml" |]
    let result = parseCommand args
    
    match result with
    | Ok (ShowSpec (SpecificationPath specPath)) ->
        Assert.Equal("features/user-management/registration.yaml", specPath)
    | _ ->
        Assert.True(false, "Expected ShowSpec command")

[<Fact>]
let ``parseCommand should parse list command without tag`` () =
    let args = [| "list" |]
    let result = parseCommand args
    
    match result with
    | Ok (ListSpecs None) -> Assert.True(true)
    | _ -> Assert.True(false, "Expected ListSpecs with None tag")

[<Fact>]
let ``parseCommand should parse list command with tag`` () =
    let args = [| "list"; "--tag"; "authentication" |]
    let result = parseCommand args
    
    match result with
    | Ok (ListSpecs (Some tag)) ->
        Assert.Equal("authentication", tag)
    | _ ->
        Assert.True(false, "Expected ListSpecs with Some tag")

[<Fact>]
let ``parseCommand should parse generate-spec command correctly`` () =
    let args = [| "generate-spec"; "src/auth/registration.py" |]
    let result = parseCommand args
    
    match result with
    | Ok (GenerateSpec (CodePath codePath)) ->
        Assert.Equal("src/auth/registration.py", codePath)
    | _ ->
        Assert.True(false, "Expected GenerateSpec command")

[<Fact>]
let ``parseCommand should parse watch command correctly`` () =
    let args = [| "watch"; "src/auth/login.py" |]
    let result = parseCommand args
    
    match result with
    | Ok (Watch (CodePath codePath)) ->
        Assert.Equal("src/auth/login.py", codePath)
    | _ ->
        Assert.True(false, "Expected Watch command")

[<Fact>]
let ``parseCommand should parse ask command correctly`` () =
    let args = [| "ask"; "How does password validation work?" |]
    let result = parseCommand args
    
    match result with
    | Ok (Ask (Query query)) ->
        Assert.Equal("How does password validation work?", query)
    | _ ->
        Assert.True(false, "Expected Ask command")

[<Theory>]
[<InlineData("help")>]
[<InlineData("--help")>]
[<InlineData("-h")>]
let ``parseCommand should parse help commands correctly`` (helpArg: string) =
    let args = [| helpArg |]
    let result = parseCommand args
    
    match result with
    | Ok Help -> Assert.True(true)
    | _ -> Assert.True(false, "Expected Help command")

[<Fact>]
let ``parseCommand should return error for invalid command`` () =
    let args = [| "invalid-command" |]
    let result = parseCommand args
    
    match result with
    | Error errorMessage ->
        Assert.Contains("USAGE:", errorMessage)
        Assert.Contains("Oracle CLI", errorMessage)
    | _ ->
        Assert.True(false, "Expected error for invalid command")

[<Fact>]
let ``parseCommand should return error for empty args`` () =
    let args = [||]
    let result = parseCommand args
    
    match result with
    | Error _ -> Assert.True(true)
    | _ -> Assert.True(false, "Expected error for empty args")

/// Property-based tests using FsCheck
[<Property>]
let ``parseCommand with valid find-spec always produces FindSpec`` (query: NonEmptyString) =
    let args = [| "find-spec"; query.Get |]
    let result = parseCommand args
    
    match result with
    | Ok (FindSpec (Query parsedQuery)) -> parsedQuery = query.Get
    | _ -> false

[<Property>]
let ``parseCommand with valid paths produces correct commands`` 
    (codePath: NonEmptyString) (specPath: NonEmptyString) =
    let args = [| "check"; codePath.Get; "--spec"; specPath.Get |]
    let result = parseCommand args
    
    match result with
    | Ok (CheckImpl (CodePath cp, SpecificationPath sp)) -> 
        cp = codePath.Get && sp = specPath.Get
    | _ -> false

/// Edge case tests
[<Fact>]
let ``parseCommand should handle paths with spaces`` () =
    let args = [| "show"; "features/user management/registration.yaml" |]
    let result = parseCommand args
    
    match result with
    | Ok (ShowSpec (SpecificationPath specPath)) ->
        Assert.Equal("features/user management/registration.yaml", specPath)
    | _ ->
        Assert.True(false, "Expected ShowSpec command with spaced path")

[<Fact>]
let ``parseCommand should handle queries with special characters`` () =
    let query = "What is the user's @email validation?"
    let args = [| "ask"; query |]
    let result = parseCommand args
    
    match result with
    | Ok (Ask (Query parsedQuery)) ->
        Assert.Equal(query, parsedQuery)
    | _ ->
        Assert.True(false, "Expected Ask command with special characters")

[<Fact>]
let ``parseCommand should be case sensitive for commands`` () =
    let args = [| "FIND-SPEC"; "test" |]
    let result = parseCommand args
    
    match result with
    | Error _ -> Assert.True(true, "Commands should be case sensitive")
    | _ -> Assert.True(false, "Expected error for uppercase command")

/// Test parseAndValidateCommand wrapper
[<Fact>]
let ``parseAndValidateCommand should delegate to parseCommand`` () =
    let args = [| "help" |]
    let result = parseAndValidateCommand args
    
    match result with
    | Ok Help -> Assert.True(true)
    | _ -> Assert.True(false, "parseAndValidateCommand should work like parseCommand")