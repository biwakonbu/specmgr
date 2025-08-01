# Sample signature file – do not use in production
# This is a demonstration file showing the structure of Oracle CLI digital signatures

digital_signature:
  signature_id: "sig_20250801T073409Z_document-digital-signing"
  specification_path: "../document-digital-signing.md"
  
  cryptographic_info:
    algorithm: "HMAC-SHA256"
    signature_value: "<dummy_signature_value_replace_with_actual>"
    content_hash: "sha256:<dummy_content_hash_replace_with_actual>"
    key_identifier: "oracle-key-2025-01"
    
  signer_info:
    signer_email: "developer@example.com"
    signer_role: "developer"
    signing_timestamp: "2025-08-01T07:34:09Z"
    signing_reason: "Document approval"
    
  validity_info:
    valid_from: "2025-08-01T07:34:09Z"
    expires_at: "2025-11-01T07:34:09Z"
    status: "active"
    
  metadata:
    specification_version: "1.0"
    specification_status_at_signing: "approved"
    related_approvals: []
    oracle_version: "1.0.0"
