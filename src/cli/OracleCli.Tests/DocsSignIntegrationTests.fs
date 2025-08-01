module OracleCli.Tests.DocsSignIntegrationTests

open System
open System.IO
open Xunit
open OracleCli.Core
open OracleCli.Commands
open OracleCli.Commands.CommandParser
open OracleCli.Commands.CommandHandler
open OracleCli.Services.SigningService
open OracleCli.Services.GitService

[<Fact>]
let ``parseCommand should parse docs-sign command with default signer`` () =
    // Arrange
    System.Environment.SetEnvironmentVariable("ORACLE_SIGNER_EMAIL", "test@example.com")
    System.Environment.SetEnvironmentVariable("ORACLE_SIGNER_ROLE", "developer")
    let args = [| "docs-sign"; "test.yaml" |]
    
    // Act
    let result = parseCommand args
    
    // Assert
    match result with
    | Ok (DocsSign (SpecificationPath path, signerInfo, customMessage)) ->
        Assert.Equal("test.yaml", path)
        Assert.NotEmpty(signerInfo.Email)
        Assert.NotEmpty(signerInfo.Role)
    | _ -> Assert.True(false, "Expected DocsSign command")

[<Fact>]
let ``parseCommand should parse docs-sign command with custom signer info`` () =
    // Arrange
    let args = [| "docs-sign"; "test.yaml"; "--email"; "user@test.com"; "--role"; "lead"; "--reason"; "approval" |]
    
    // Act
    let result = parseCommand args
    
    // Assert
    match result with
    | Ok (DocsSign (SpecificationPath path, signerInfo, customMessage)) ->
        Assert.Equal("test.yaml", path)
        Assert.Equal("user@test.com", signerInfo.Email)
        Assert.Equal("lead", signerInfo.Role)
        Assert.Equal("approval", signerInfo.SigningReason)
    | _ -> Assert.True(false, "Expected DocsSign command")

[<Fact>]
let ``generateSignature should create valid signature`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let content = """# Test Specification
This is a test specification file."""
    File.WriteAllText(tempFile, content)
    
    let signerInfo = {
        Email = "test@example.com"
        Role = "developer"
        SigningReason = "Testing"
    }
    let secretKey = "test-secret-key-for-hmac-signing"
    
    try
        // Act
        let result = generateSignature tempFile signerInfo secretKey
        
        // Assert
        match result with
        | Ok signature ->
            Assert.NotEmpty(signature.SignatureId)
            Assert.Equal("HMAC-SHA256", signature.Algorithm)
            Assert.NotEmpty(signature.SignatureValue)
            Assert.NotEmpty(signature.ContentHash)
            Assert.Equal(signerInfo.Email, signature.SignerInfo.Email)
            Assert.Equal(SignatureStatus.Active, signature.Status)
        | Error err -> Assert.True(false, $"Expected success but got error: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``verifySignature should verify valid signature`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let content = """# Test Specification
This is a test specification file."""
    File.WriteAllText(tempFile, content)
    
    let signerInfo = {
        Email = "test@example.com"
        Role = "developer"
        SigningReason = "Testing"
    }
    let secretKey = "test-secret-key-for-hmac-signing"
    
    try
        // Generate signature first
        let signResult = generateSignature tempFile signerInfo secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
        | Ok signature ->
            // Act - verify the signature
            let verifyResult = verifySignature tempFile signature secretKey
            
            // Assert
            match verifyResult with
            | Ok isValid -> Assert.True(isValid, "Signature should be valid")
            | Error err -> Assert.True(false, $"Verification failed: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``verifySignature should detect modified content`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let originalContent = """# Test Specification
This is a test specification file."""
    File.WriteAllText(tempFile, originalContent)
    
    let signerInfo = {
        Email = "test@example.com"
        Role = "developer"
        SigningReason = "Testing"
    }
    let secretKey = "test-secret-key-for-hmac-signing"
    
    try
        // Generate signature first
        let signResult = generateSignature tempFile signerInfo secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
        | Ok signature ->
            // Modify the file content
            let modifiedContent = originalContent + "\nModified content"
            File.WriteAllText(tempFile, modifiedContent)
            
            // Act - verify the signature on modified content
            let verifyResult = verifySignature tempFile signature secretKey
            
            // Assert
            match verifyResult with
            | Ok isValid -> Assert.False(isValid, "Signature should be invalid for modified content")
            | Error err -> Assert.True(false, $"Verification failed: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``checkSignatureExpiration should return correct status`` () =
    // Arrange
    let now = DateTimeOffset.UtcNow
    let signerInfo = {
        Email = "test@example.com"
        Role = "developer"
        SigningReason = "Testing"
    }
    
    // Test active signature (expires in 60 days)
    let activeSignature = {
        SignatureId = "test-sig-1"
        SpecificationPath = SpecificationPath "test.yaml"
        Algorithm = "HMAC-SHA256"
        SignatureValue = "dummy-signature"
        ContentHash = "dummy-hash"
        KeyIdentifier = "oracle-key-2025-01"
        SignerInfo = signerInfo
        ValidFrom = now
        ExpiresAt = now.AddDays(60.0)
        Status = SignatureStatus.Active
        SpecificationVersion = "1.0"
        SpecificationStatusAtSigning = "approved"
        RelatedApprovals = []
        OracleVersion = "1.0.0"
    }
    
    // Test expiring signature (expires in 5 days)
    let expiringSignature = { activeSignature with ExpiresAt = now.AddDays(5.0) }
    
    // Test expired signature (expired 1 day ago)
    let expiredSignature = { activeSignature with ExpiresAt = now.AddDays(-1.0) }
    
    // Act & Assert
    Assert.Equal(SignatureStatus.Active, checkSignatureExpiration activeSignature)
    Assert.Equal(SignatureStatus.ExpiringWarn, checkSignatureExpiration expiringSignature)
    Assert.Equal(SignatureStatus.Expired, checkSignatureExpiration expiredSignature)

[<Fact>]
let ``createSignatureFileContent should generate valid YAML`` () =
    // Arrange
    let signerInfo = {
        Email = "test@example.com"
        Role = "developer"
        SigningReason = "Testing signature generation"
    }
    
    let signature = {
        SignatureId = "sig_20250101_120000_test"
        SpecificationPath = SpecificationPath "test.yaml"
        Algorithm = "HMAC-SHA256"
        SignatureValue = "abcdef123456789"
        ContentHash = "fedcba987654321"
        KeyIdentifier = "oracle-key-2025-01"
        SignerInfo = signerInfo
        ValidFrom = DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero)
        ExpiresAt = DateTimeOffset(2025, 4, 1, 12, 0, 0, TimeSpan.Zero)
        Status = SignatureStatus.Active
        SpecificationVersion = "1.0"
        SpecificationStatusAtSigning = "approved"
        RelatedApprovals = ["approval-001"]
        OracleVersion = "1.0.0"
    }
    
    // Act
    let yamlContent = createSignatureFileContent signature
    
    // Assert
    Assert.Contains("digital_signature:", yamlContent)
    Assert.Contains("signature_id: \"sig_20250101_120000_test\"", yamlContent)
    Assert.Contains("algorithm: \"HMAC-SHA256\"", yamlContent)
    Assert.Contains("signer_email: \"test@example.com\"", yamlContent)
    Assert.Contains("signer_role: \"developer\"", yamlContent)
    Assert.Contains("status: \"active\"", yamlContent)
    Assert.Contains("\"approval-001\"", yamlContent)