module OracleCli.Tests.GitCommitHashTests

open System
open System.IO
open System.Diagnostics
open Xunit
open OracleCli.Services.GitService

/// Helper function to initialize a Git repository with test configuration
let private initializeTestGitRepo (tempDir: string) : unit =
    // Initialize git repo
    let initStartInfo = ProcessStartInfo(
        FileName = "git",
        Arguments = "init",
        WorkingDirectory = tempDir,
        RedirectStandardOutput = true,
        UseShellExecute = false
    )
    let initResult = Process.Start(initStartInfo)
    initResult.WaitForExit()
    
    // Set git config for testing
    let configEmailStartInfo = ProcessStartInfo(
        FileName = "git",
        Arguments = "config user.email \"test@example.com\"",
        WorkingDirectory = tempDir,
        RedirectStandardOutput = true,
        UseShellExecute = false
    )
    let configEmailResult = Process.Start(configEmailStartInfo)
    configEmailResult.WaitForExit()
    
    let configNameStartInfo = ProcessStartInfo(
        FileName = "git",
        Arguments = "config user.name \"Test User\"",
        WorkingDirectory = tempDir,
        RedirectStandardOutput = true,
        UseShellExecute = false
    )
    let configNameResult = Process.Start(configNameStartInfo)
    configNameResult.WaitForExit()

[<Fact>]
let ``commitSignatureFiles should return valid commit hash`` () =
    // Arrange - Create a temporary git repository
    let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
    Directory.CreateDirectory(tempDir) |> ignore
    
    try
        // Initialize git repository with test configuration
        initializeTestGitRepo tempDir
        
        // Create a test signature file
        let signatureFile = Path.Combine(tempDir, "test-signature.json")
        File.WriteAllText(signatureFile, """{"test": "signature"}""")
        
        // Act - Commit the signature file
        let result = commitSignatureFiles tempDir [signatureFile] "test: add signature file"
        
        // Assert
        match result with
        | Ok commitHash ->
            // Verify the commit hash is a valid SHA-1 (40 characters, hexadecimal)
            Assert.True(commitHash.Length = 40, $"Expected 40-character commit hash, got {commitHash.Length}: {commitHash}")
            Assert.True(System.Text.RegularExpressions.Regex.IsMatch(commitHash, "^[a-f0-9]+$"), $"Expected hexadecimal commit hash, got: {commitHash}")
            
            // Verify we can get the same hash using git rev-parse HEAD
            let verifyResult = getCurrentCommitHash tempDir
            match verifyResult with
            | Ok verifyHash -> Assert.Equal(commitHash, verifyHash)
            | Error err -> Assert.True(false, $"Failed to verify commit hash: {err}")
        | Error err ->
            Assert.True(false, $"commitSignatureFiles failed: {err}")
    finally
        // Cleanup
        if Directory.Exists(tempDir) then
            Directory.Delete(tempDir, true)

[<Fact>]
let ``commitSignatureFiles should handle multiple files`` () =
    // Arrange - Create a temporary git repository
    let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
    Directory.CreateDirectory(tempDir) |> ignore
    
    try
        // Initialize git repository with test configuration
        initializeTestGitRepo tempDir
        
        // Create multiple test signature files
        let signatureFile1 = Path.Combine(tempDir, "signature1.json")
        let signatureFile2 = Path.Combine(tempDir, "signature2.json")
        File.WriteAllText(signatureFile1, """{"test": "signature1"}""")
        File.WriteAllText(signatureFile2, """{"test": "signature2"}""")
        
        // Act - Commit multiple signature files
        let result = commitSignatureFiles tempDir [signatureFile1; signatureFile2] "test: add multiple signature files"
        
        // Assert
        match result with
        | Ok commitHash ->
            // Verify the commit hash is a valid SHA-1 (40 characters, hexadecimal)
            Assert.True(commitHash.Length = 40, $"Expected 40-character commit hash, got {commitHash.Length}: {commitHash}")
            Assert.True(System.Text.RegularExpressions.Regex.IsMatch(commitHash, "^[a-f0-9]+$"), $"Expected hexadecimal commit hash, got: {commitHash}")
            
            // Verify we can get the same hash using git rev-parse HEAD
            let verifyResult = getCurrentCommitHash tempDir
            match verifyResult with
            | Ok verifyHash -> Assert.Equal(commitHash, verifyHash)
            | Error err -> Assert.True(false, $"Failed to verify commit hash: {err}")
        | Error err ->
            Assert.True(false, $"commitSignatureFiles failed: {err}")
    finally
        // Cleanup
        if Directory.Exists(tempDir) then
            Directory.Delete(tempDir, true)