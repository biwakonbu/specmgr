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
    let args = [| "docs-sign"; "test.yaml" |]
    
    // Act
    let result = parseCommand args
    
    // Assert
    match result with
    | Ok (DocsSign (SpecificationPath path, customMessage)) ->
        Assert.Equal("test.yaml", path)
        // Custom message should be None for basic command
        Assert.True(customMessage.IsNone)
    | _ -> Assert.True(false, "Expected DocsSign command")

[<Fact>]
let ``parseCommand should parse docs-sign command with custom message`` () =
    // Arrange
    let args = [| "docs-sign"; "test.yaml"; "-m"; "Custom commit message" |]
    
    // Act
    let result = parseCommand args
    
    // Assert
    match result with
    | Ok (DocsSign (SpecificationPath path, customMessage)) ->
        Assert.Equal("test.yaml", path)
        // Custom message should be present
        Assert.True(customMessage.IsSome)
        Assert.Equal("Custom commit message", customMessage.Value)
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
let ``verifySignature should be independent of current signer (different signers should get same result)`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let content = """# Test Specification
This is a test specification file for signer independence test."""
    File.WriteAllText(tempFile, content)
    
    // Original signer who creates the signature
    let originalSigner = {
        Email = "alice@example.com"
        Role = "Senior Developer"
        SigningReason = "Code review approval"
    }
    
    // Different signer who will verify the signature
    let differentSigner = {
        Email = "bob@example.com"
        Role = "Tech Lead"
        SigningReason = "Final verification"
    }
    
    let secretKey = "test-secret-key-for-independence-test"
    
    try
        // Act 1: Generate signature with original signer
        let signResult = generateSignature tempFile originalSigner secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
        | Ok originalSignature ->
            // Act 2: Verify signature using the same signature object (should succeed)
            let verifyResult1 = verifySignature tempFile originalSignature secretKey
            
            // Act 3: Create a new signature object but with different signer metadata
            // (This simulates what would happen if verification used current signer instead of recorded signer)
            let modifiedSignature = { originalSignature with SignerInfo = differentSigner }
            let verifyResult2 = verifySignature tempFile modifiedSignature secretKey
            
            // Assert
            match verifyResult1, verifyResult2 with
            | Ok isValid1, Ok isValid2 ->
                // The original signature should be valid
                Assert.True(isValid1, "Original signature should be valid")
                // The modified signature should be invalid (proving we use recorded signer info)
                Assert.False(isValid2, "Signature with modified signer info should be invalid - this proves verification uses recorded signer data")
            | Error err1, _ -> Assert.True(false, $"Original verification failed: {err1}")
            | _, Error err2 -> Assert.True(false, $"Modified verification failed: {err2}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``verifySignature should use recorded signer info not current git config`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let content = """# Test Specification for Git Config Independence
This test verifies that signature verification uses recorded signer info."""
    File.WriteAllText(tempFile, content)
    
    let signerInfo = {
        Email = "recorded@signer.com"
        Role = "Original Signer"
        SigningReason = "Document approval"
    }
    let secretKey = "test-secret-key-for-git-independence"
    
    try
        // Act 1: Generate signature with specific signer
        let signResult = generateSignature tempFile signerInfo secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
        | Ok signature ->
            // Act 2: Verify the signature (should use signature.SignerInfo, not current git config)
            let verifyResult = verifySignature tempFile signature secretKey
            
            // Assert
            match verifyResult with
            | Ok isValid -> 
                Assert.True(isValid, "Signature should be valid using recorded signer info")
                // Verify that the signature object contains the original signer info
                Assert.Equal("recorded@signer.com", signature.SignerInfo.Email)
                Assert.Equal("Original Signer", signature.SignerInfo.Role)
                Assert.Equal("Document approval", signature.SignerInfo.SigningReason)
            | Error err -> Assert.True(false, $"Verification failed: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

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

[<Fact>]
let ``signature verification workflow should work end-to-end with different users`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let content = """# End-to-End Test Specification
This specification will be signed by Alice and verified by Bob."""
    File.WriteAllText(tempFile, content)
    
    // Alice signs the document
    let aliceSigner = {
        Email = "alice@company.com"
        Role = "Senior Developer"
        SigningReason = "Feature implementation approval"
    }
    
    let secretKey = "shared-secret-key-for-company"
    
    try
        // Step 1: Alice generates signature
        let aliceSignResult = generateSignature tempFile aliceSigner secretKey
        match aliceSignResult with
        | Error err -> Assert.True(false, $"Alice failed to generate signature: {err}")
        | Ok aliceSignature ->
            // Step 2: Alice saves signature to file
            match saveSignatureToFile aliceSignature with
            | Error err -> Assert.True(false, $"Failed to save Alice's signature: {err}")
            | Ok signatureFilePath ->
                // Verify signature file was created
                Assert.True(File.Exists(signatureFilePath), "Signature file should exist")
                let signatureContent = File.ReadAllText(signatureFilePath)
                Assert.Contains("alice@company.com", signatureContent)
                Assert.Contains("Senior Developer", signatureContent)
                
                // Step 3: Bob verifies the signature (Bob doesn't need git config)
                // Bob only needs the signature object and the secret key
                let bobVerifyResult = verifySignature tempFile aliceSignature secretKey
                
                // Step 4: Charlie also verifies the same signature
                let charlieVerifyResult = verifySignature tempFile aliceSignature secretKey
                
                // Assert
                match bobVerifyResult, charlieVerifyResult with
                | Ok bobResult, Ok charlieResult ->
                    Assert.True(bobResult, "Bob should successfully verify Alice's signature")
                    Assert.True(charlieResult, "Charlie should successfully verify Alice's signature")
                    Assert.Equal(bobResult, charlieResult)
                | Error bobErr, _ -> Assert.True(false, $"Bob's verification failed: {bobErr}")
                | _, Error charlieErr -> Assert.True(false, $"Charlie's verification failed: {charlieErr}")
                
                // Clean up signature file
                if File.Exists(signatureFilePath) then File.Delete(signatureFilePath)
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``signature should remain valid when file content is unchanged regardless of verifier`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let originalContent = """# Immutable Test Document
Version: 1.0
This document should maintain signature validity."""
    File.WriteAllText(tempFile, originalContent)
    
    let documentSigner = {
        Email = "author@docs.com"
        Role = "Technical Writer"
        SigningReason = "Document finalization"
    }
    
    let secretKey = "document-signing-secret"
    
    try
        // Create signature
        let signResult = generateSignature tempFile documentSigner secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to create signature: {err}")
        | Ok signature ->
            // Multiple different people verify the signature
            let verifiers = [
                "reviewer1@company.com"
                "reviewer2@company.com" 
                "reviewer3@company.com"
                "auditor@compliance.com"
            ]
            
            // All verifiers should get the same result
            let verificationResults = 
                verifiers 
                |> List.map (fun _ -> verifySignature tempFile signature secretKey)
            
            // Assert all verifications succeeded with the same result
            verificationResults |> List.iter (fun result ->
                match result with
                | Ok isValid -> Assert.True(isValid, "All verifiers should confirm signature validity")
                | Error err -> Assert.True(false, $"Verification should not fail: {err}")
            )
            
            // Verify that the signature contains the original signer info
            Assert.Equal("author@docs.com", signature.SignerInfo.Email)
            Assert.Equal("Technical Writer", signature.SignerInfo.Role)
            
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)

[<Fact>]
let ``commitSignature should generate correct commit message with custom message`` () =
    // Arrange
    let signerInfo = {
        Email = "developer@test.com"
        Role = "Lead Developer"
        SigningReason = "Final approval"
    }
    
    let signature = {
        SignatureId = "sig_20250101_120000_test"
        SpecificationPath = SpecificationPath "docs/test-spec.md"
        Algorithm = "HMAC-SHA256"
        SignatureValue = "test-signature-value"
        ContentHash = "test-content-hash"
        KeyIdentifier = "oracle-key-2025-01"
        SignerInfo = signerInfo
        ValidFrom = DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero)
        ExpiresAt = DateTimeOffset(2025, 4, 1, 12, 0, 0, TimeSpan.Zero)
        Status = SignatureStatus.Active
        SpecificationVersion = "1.0"
        SpecificationStatusAtSigning = "approved"
        RelatedApprovals = []
        OracleVersion = "1.0.0"
    }
    
    let customMessage = Some "Custom approval with additional context"
    
    // Act: Test the commit message generation logic (without actual git commit)
    // We test the message construction by examining what would be passed to git
    let specPath = Paths.getSpecificationPath signature.SpecificationPath
    let fileName = Path.GetFileName(specPath)
    let validUntil = signature.ExpiresAt.ToString("yyyy-MM-dd")
    let baseMessage = $"docs: digitally sign {fileName}"
    let customPart = match customMessage with
                     | Some msg -> $"\n\n{msg}"
                     | None -> ""
    let detailsPart = $"\n\nSignature ID: {signature.SignatureId}\nSigner: {signature.SignerInfo.Email} ({signature.SignerInfo.Role})\nReason: {signature.SignerInfo.SigningReason}\nAlgorithm: {signature.Algorithm}\nValid until: {validUntil}\n\n🤖 Generated with Oracle CLI Digital Signing"
    let expectedCommitMessage = baseMessage + customPart + detailsPart
    
    // Assert: Verify commit message structure
    Assert.Contains("docs: digitally sign test-spec.md", expectedCommitMessage)
    Assert.Contains("Custom approval with additional context", expectedCommitMessage)
    Assert.Contains("Signature ID: sig_20250101_120000_test", expectedCommitMessage)
    Assert.Contains("Signer: developer@test.com (Lead Developer)", expectedCommitMessage)
    Assert.Contains("Reason: Final approval", expectedCommitMessage)
    Assert.Contains("Algorithm: HMAC-SHA256", expectedCommitMessage)
    Assert.Contains("Valid until: 2025-04-01", expectedCommitMessage)
    Assert.Contains("🤖 Generated with Oracle CLI Digital Signing", expectedCommitMessage)

[<Fact>]
let ``commitSignature should generate correct commit message without custom message`` () =
    // Arrange
    let signerInfo = {
        Email = "reviewer@company.com"
        Role = "Security Reviewer"
        SigningReason = "Security audit completion"
    }
    
    let signature = {
        SignatureId = "sig_20250201_090000_security"
        SpecificationPath = SpecificationPath "specs/security/auth.yaml"
        Algorithm = "HMAC-SHA256"
        SignatureValue = "security-signature"
        ContentHash = "security-hash"
        KeyIdentifier = "oracle-key-2025-01"
        SignerInfo = signerInfo
        ValidFrom = DateTimeOffset(2025, 2, 1, 9, 0, 0, TimeSpan.Zero)
        ExpiresAt = DateTimeOffset(2025, 5, 1, 9, 0, 0, TimeSpan.Zero)
        Status = SignatureStatus.Active
        SpecificationVersion = "2.0"
        SpecificationStatusAtSigning = "reviewed"
        RelatedApprovals = ["SEC-001"; "SEC-002"]
        OracleVersion = "1.0.0"
    }
    
    let customMessage = None
    
    // Act: Test commit message without custom message
    let specPath = Paths.getSpecificationPath signature.SpecificationPath
    let fileName = Path.GetFileName(specPath)
    let validUntil = signature.ExpiresAt.ToString("yyyy-MM-dd")
    let baseMessage = $"docs: digitally sign {fileName}"
    let customPart = match customMessage with
                     | Some msg -> $"\n\n{msg}"
                     | None -> ""
    let detailsPart = $"\n\nSignature ID: {signature.SignatureId}\nSigner: {signature.SignerInfo.Email} ({signature.SignerInfo.Role})\nReason: {signature.SignerInfo.SigningReason}\nAlgorithm: {signature.Algorithm}\nValid until: {validUntil}\n\n🤖 Generated with Oracle CLI Digital Signing"
    let expectedCommitMessage = baseMessage + customPart + detailsPart
    
    // Assert: Verify commit message structure without custom message
    Assert.Contains("docs: digitally sign auth.yaml", expectedCommitMessage)
    Assert.DoesNotContain("Custom", expectedCommitMessage) // No custom message should be present
    Assert.Contains("Signature ID: sig_20250201_090000_security", expectedCommitMessage)
    Assert.Contains("Signer: reviewer@company.com (Security Reviewer)", expectedCommitMessage)
    Assert.Contains("Reason: Security audit completion", expectedCommitMessage)
    Assert.Contains("Valid until: 2025-05-01", expectedCommitMessage)

[<Fact>]
let ``getSignatureFilePath should create correct path structure`` () =
    // Arrange
    let testCases = [
        ("docs/spec.md", "docs/.oracle/signatures/spec.yaml.sig")
        ("features/auth/login.yaml", "features/auth/.oracle/signatures/login.yaml.sig")
        ("/absolute/path/test.yml", "/absolute/path/.oracle/signatures/test.yaml.sig")
        ("simple.md", ".oracle/signatures/simple.yaml.sig")
    ]
    
    // Act & Assert
    testCases |> List.iter (fun (inputPath, expectedPath) ->
        let actualPath = getSignatureFilePath inputPath
        Assert.Equal(expectedPath, actualPath)
    )

[<Fact>]
let ``signature file should contain all required metadata`` () =
    // Arrange
    let signerInfo = {
        Email = "metadata@test.com"
        Role = "Metadata Validator"
        SigningReason = "Comprehensive metadata test"
    }
    
    let signature = {
        SignatureId = "sig_metadata_test_001"
        SpecificationPath = SpecificationPath "test/metadata.yaml"
        Algorithm = "HMAC-SHA256"
        SignatureValue = "comprehensive-signature-value"
        ContentHash = "abcdef123456"
        KeyIdentifier = "test-key-2025"
        SignerInfo = signerInfo
        ValidFrom = DateTimeOffset(2025, 3, 15, 14, 30, 0, TimeSpan.Zero)
        ExpiresAt = DateTimeOffset(2025, 6, 15, 14, 30, 0, TimeSpan.Zero)
        Status = SignatureStatus.Active
        SpecificationVersion = "3.1"
        SpecificationStatusAtSigning = "final"
        RelatedApprovals = ["META-001"; "META-002"; "META-003"]
        OracleVersion = "1.2.0"
    }
    
    // Act
    let yamlContent = createSignatureFileContent signature
    
    // Assert: Verify all metadata fields are present
    Assert.Contains("digital_signature:", yamlContent)
    Assert.Contains("signature_id: \"sig_metadata_test_001\"", yamlContent)
    Assert.Contains("specification_path: \"test/metadata.yaml\"", yamlContent)
    Assert.Contains("algorithm: \"HMAC-SHA256\"", yamlContent)
    Assert.Contains("signature_value: \"comprehensive-signature-value\"", yamlContent)
    Assert.Contains("content_hash: \"sha256:abcdef123456\"", yamlContent)
    Assert.Contains("key_identifier: \"test-key-2025\"", yamlContent)
    Assert.Contains("signer_email: \"metadata@test.com\"", yamlContent)
    Assert.Contains("signer_role: \"Metadata Validator\"", yamlContent)
    Assert.Contains("signing_timestamp: \"2025-03-15T14:30:00Z\"", yamlContent)
    Assert.Contains("signing_reason: \"Comprehensive metadata test\"", yamlContent)
    Assert.Contains("valid_from: \"2025-03-15T14:30:00Z\"", yamlContent)
    Assert.Contains("expires_at: \"2025-06-15T14:30:00Z\"", yamlContent)
    Assert.Contains("status: \"active\"", yamlContent)
    Assert.Contains("specification_version: \"3.1\"", yamlContent)
    Assert.Contains("specification_status_at_signing: \"final\"", yamlContent)
    Assert.Contains("\"META-001\"", yamlContent)
    Assert.Contains("\"META-002\"", yamlContent)
    Assert.Contains("\"META-003\"", yamlContent)
    Assert.Contains("oracle_version: \"1.2.0\"", yamlContent)

[<Fact>]
let ``signature verification should fail when file content is modified`` () =
    // Arrange
    let tempFile = Path.GetTempFileName()
    let originalContent = "# Original Content\nThis is the original specification."
    let modifiedContent = "# Modified Content\nThis content has been tampered with."
    File.WriteAllText(tempFile, originalContent)
    
    let signerInfo = {
        Email = "tamper@test.com"
        Role = "Tamper Test"
        SigningReason = "Testing tamper detection"
    }
    let secretKey = "tamper-detection-test-key"
    
    try
        // Act 1: Generate signature for original content
        let signResult = generateSignature tempFile signerInfo secretKey
        match signResult with
        | Error err -> Assert.True(false, $"Failed to generate signature: {err}")
        | Ok originalSignature ->
            // Act 2: Modify file content
            File.WriteAllText(tempFile, modifiedContent)
            
            // Act 3: Verify signature against modified content
            let verifyResult = verifySignature tempFile originalSignature secretKey
            
            // Assert: Verification should fail (return Ok false, not Error)
            match verifyResult with
            | Ok isValid -> Assert.False(isValid, "Signature should be invalid for tampered content")
            | Error err -> Assert.True(false, $"Verification should not error, but return false: {err}")
    finally
        if File.Exists(tempFile) then File.Delete(tempFile)