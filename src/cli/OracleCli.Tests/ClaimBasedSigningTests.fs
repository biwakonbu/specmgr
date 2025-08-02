module OracleCli.Tests.ClaimBasedSigningTests

open System
open System.IO
open Xunit
open OracleCli.Core
open OracleCli.Services.ClaimBasedSigningService

let createTempFile (content: string) =
    let tempFile = Path.GetTempFileName()
    File.WriteAllText(tempFile, content)
    tempFile

let createTempProjectDir () =
    let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
    Directory.CreateDirectory(tempDir) |> ignore
    tempDir

[<Fact>]
let ``createDocumentClaim should create valid claim for file`` () =
    // Arrange
    let content = "# Test Document\n\nThis is a test markdown file."
    let tempFile = createTempFile content
    let projectRoot = Path.GetDirectoryName(tempFile)
    
    try
        // Act
        let result = createDocumentClaim tempFile projectRoot
        
        // Assert
        match result with
        | Ok claim ->
            Assert.Equal(Path.GetFileName(tempFile), claim.Path)
            Assert.NotEmpty(claim.ContentHash)
            Assert.True(claim.Size > 0L)
            Assert.Equal(32, claim.ContentHash.Length / 2) // SHA-256 = 32 bytes = 64 hex chars
        | Error err ->
            Assert.True(false, $"Expected success but got error: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``normalizeToProjectPath should create Unix-style relative paths`` () =
    // Arrange
    let projectRoot = createTempProjectDir()
    let subDir = Path.Combine(projectRoot, "docs", "specs")
    Directory.CreateDirectory(subDir) |> ignore
    let testFile = Path.Combine(subDir, "test.md")
    File.WriteAllText(testFile, "# Test")
    
    try
        // Act
        let result = normalizeToProjectPath testFile projectRoot
        
        // Assert
        match result with
        | Ok normalizedPath ->
            Assert.Equal("docs/specs/test.md", normalizedPath)
            Assert.DoesNotContain("\\", normalizedPath) // Unix-style only
        | Error err ->
            Assert.True(false, $"Expected success but got error: {err}")
    finally
        if Directory.Exists(projectRoot) then Directory.Delete(projectRoot, true)

[<Fact>]
let ``createSignatureClaims should create valid claims for multiple files`` () =
    // Arrange
    let projectRoot = createTempProjectDir()
    let file1 = Path.Combine(projectRoot, "doc1.md")
    let file2 = Path.Combine(projectRoot, "doc2.md")
    File.WriteAllText(file1, "# Document 1")
    File.WriteAllText(file2, "# Document 2")
    
    let signerInfo = {
        Email = "test@example.com"
        Role = "Developer"
        SigningReason = "Testing"
    }
    
    try
        // Act
        let result = createSignatureClaims [file1; file2] signerInfo projectRoot
        
        // Assert
        match result with
        | Ok claims ->
            Assert.Equal("oracle-cli", claims.Issuer)
            Assert.Equal("document-signing", claims.Subject)
            Assert.Equal("1.0", claims.Version)
            Assert.Equal("test@example.com", claims.SignerEmail)
            Assert.Equal("Developer", claims.SignerRole)
            Assert.Equal("Testing", claims.SigningReason)
            Assert.Equal(2, claims.Documents.Length)
            Assert.True(claims.IssuedAt > 0L)
            Assert.True(claims.ExpiresAt > claims.IssuedAt)
        | Error err ->
            Assert.True(false, $"Expected success but got error: {err}")
    finally
        if Directory.Exists(projectRoot) then Directory.Delete(projectRoot, true)

[<Fact>]
let ``generateClaimBasedSignature should create JWT-like signature`` () =
    // Arrange
    let projectRoot = createTempProjectDir()
    let testFile = Path.Combine(projectRoot, "test.md")
    File.WriteAllText(testFile, "# Test Document")
    
    let signerInfo = {
        Email = "signer@example.com"
        Role = "Senior Engineer"
        SigningReason = "Document approval"
    }
    
    try
        match createSignatureClaims [testFile] signerInfo projectRoot with
        | Error err -> Assert.True(false, $"Failed to create claims: {err}")
        | Ok claims ->
            let secretKey = "test-secret-key-for-hmac-signing"
            
            // Act
            let result = generateClaimBasedSignature claims secretKey
            
            // Assert
            match result with
            | Ok signature ->
                // Check JWT-like format: header.claims.signature
                let parts = signature.Raw.Split('.')
                Assert.Equal(3, parts.Length)
                Assert.Equal(parts.[0], signature.Header)
                Assert.Equal(parts.[1], signature.Claims)
                Assert.Equal(parts.[2], signature.Signature)
                
                // Verify header content
                let headerJson = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(signature.Header))
                Assert.Contains("\"alg\":\"HS256\"", headerJson)
                Assert.Contains("\"typ\":\"ORC\"", headerJson)
                
            | Error err ->
                Assert.True(false, $"Expected success but got error: {err}")
    finally
        if Directory.Exists(projectRoot) then Directory.Delete(projectRoot, true)

[<Fact>]
let ``verifyClaimBasedSignature should verify valid signature`` () =
    // Arrange
    let projectRoot = createTempProjectDir()
    let testFile = Path.Combine(projectRoot, "verify-test.md")
    let originalContent = "# Verification Test\n\nThis content should verify correctly."
    File.WriteAllText(testFile, originalContent)
    
    let signerInfo = {
        Email = "verifier@example.com"
        Role = "QA Engineer"
        SigningReason = "Quality assurance"
    }
    
    let secretKey = "verification-test-secret-key"
    
    try
        match createSignatureClaims [testFile] signerInfo projectRoot with
        | Error err -> Assert.True(false, $"Failed to create claims: {err}")
        | Ok claims ->
            match generateClaimBasedSignature claims secretKey with
            | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
            | Ok signature ->
                // Act
                let result = verifyClaimBasedSignature signature secretKey projectRoot
                
                // Assert
                match result with
                | Ok (isValid, verifiedClaims) ->
                    Assert.True(isValid, "Signature should be valid for unmodified content")
                    Assert.Equal(claims.SignerEmail, verifiedClaims.SignerEmail)
                    Assert.Equal(claims.Documents.Length, verifiedClaims.Documents.Length)
                | Error err ->
                    Assert.True(false, $"Expected success but got error: {err}")
    finally
        if Directory.Exists(projectRoot) then Directory.Delete(projectRoot, true)

[<Fact>]
let ``verifyClaimBasedSignature should detect content modification`` () =
    // Arrange
    let projectRoot = createTempProjectDir()
    let testFile = Path.Combine(projectRoot, "modification-test.md")
    let originalContent = "# Original Content"
    File.WriteAllText(testFile, originalContent)
    
    let signerInfo = {
        Email = "tamper@example.com"
        Role = "Security Tester"
        SigningReason = "Tamper detection test"
    }
    
    let secretKey = "tamper-detection-secret-key"
    
    try
        match createSignatureClaims [testFile] signerInfo projectRoot with
        | Error err -> Assert.True(false, $"Failed to create claims: {err}")
        | Ok claims ->
            match generateClaimBasedSignature claims secretKey with
            | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
            | Ok signature ->
                // Modify file content after signing
                File.WriteAllText(testFile, "# Modified Content - This should fail verification")
                
                // Act
                let result = verifyClaimBasedSignature signature secretKey projectRoot
                
                // Assert
                match result with
                | Ok (isValid, _) ->
                    Assert.True(false, "Signature verification should have failed for modified content")
                | Error err ->
                    Assert.Contains("Content verification failed", err)
    finally
        if Directory.Exists(projectRoot) then Directory.Delete(projectRoot, true)

[<Fact>]
let ``formatClaimsForDisplay should create readable output`` () =
    // Arrange
    let claims = {
        Issuer = "oracle-cli"
        Subject = "document-signing"
        IssuedAt = DateTimeOffset.Parse("2025-08-02T10:30:00Z").ToUnixTimeSeconds()
        ExpiresAt = DateTimeOffset.Parse("2025-11-02T10:30:00Z").ToUnixTimeSeconds()
        Documents = [
            { Path = "docs/spec1.md"; ContentHash = "abcdef1234567890"; Size = 1024L }
            { Path = "docs/spec2.md"; ContentHash = "1234567890abcdef"; Size = 2048L }
        ]
        SignerEmail = "display@example.com"
        SignerRole = "Documentation Lead"
        SigningReason = "Documentation review"
        ProjectRoot = "/home/user/project"
        Version = "1.0"
    }
    
    // Act
    let output = formatClaimsForDisplay claims
    
    // Assert
    Assert.Contains("Issuer: oracle-cli", output)
    Assert.Contains("Signer: display@example.com (Documentation Lead)", output)
    Assert.Contains("Reason: Documentation review", output)
    Assert.Contains("Documents (2):", output)
    Assert.Contains("docs/spec1.md", output)
    Assert.Contains("docs/spec2.md", output)
    Assert.Contains("2025-08-02", output)
    Assert.Contains("2025-11-02", output)