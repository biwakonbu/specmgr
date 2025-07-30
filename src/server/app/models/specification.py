"""Specification models for SDD system."""

from typing import Any

from pydantic import BaseModel, Field, field_validator


class TestCase(BaseModel):
    """Test case definition."""

    name: str = Field(..., description="Test case description")
    input: dict[str, Any] = Field(..., description="Input parameters")
    expect: str = Field(
        ..., description="Expected result: 'success' or 'error:ERROR_CODE'"
    )
    setup: str | None = Field(None, description="Optional setup code")

    @field_validator("expect")
    @classmethod
    def validate_expect(cls, v: str) -> str:
        """Validate expect format."""
        if v == "success":
            return v
        if v.startswith("error:") and len(v) > 6:
            return v
        raise ValueError("expect must be 'success' or 'error:ERROR_CODE'")


class Condition(BaseModel):
    """Then condition definition."""

    condition: str = Field(..., description="Validation expression")
    error: str = Field(..., description="Error code if condition fails")
    message: str = Field(..., description="Human-readable error message")


class Implementation(BaseModel):
    """Implementation hints."""

    files: list[str] = Field(
        default_factory=list, description="Implementation file paths"
    )
    functions: list[str] = Field(default_factory=list, description="Function names")


class SpecificationType(str):
    """Valid specification categories."""

    FEATURE = "feature"
    API = "api"
    VALIDATION = "validation"
    BUSINESS_LOGIC = "business-logic"


class SpecificationPriority(str):
    """Specification priority levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Specification(BaseModel):
    """Complete specification definition."""

    id: str = Field(
        ..., pattern=r"^SPEC-\d{3,}$", description="Unique specification ID"
    )
    title: str = Field(..., description="Brief description")
    description: str = Field(..., description="Detailed explanation")
    category: SpecificationType = Field(..., description="Specification category")
    priority: SpecificationPriority = Field(..., description="Priority level")

    # Given-When-Then
    given: dict[str, str] = Field(..., description="Input parameters with types")
    when: str = Field(..., description="Action or function name")
    then: list[Condition] = Field(..., description="Expected conditions")

    # Test cases
    test_cases: list[TestCase] = Field(..., min_items=1, description="Test cases")

    # Optional implementation hints
    implementation: Implementation | None = Field(
        None, description="Implementation hints"
    )

    @field_validator("test_cases")
    @classmethod
    def validate_test_coverage(
        cls, v: list[TestCase], values: dict[str, Any]
    ) -> list[TestCase]:
        """Ensure all error conditions have test cases."""
        if "then" not in values:
            return v

        error_codes = {condition.error for condition in values["then"]}
        tested_errors = set()

        for test_case in v:
            if test_case.expect.startswith("error:"):
                tested_errors.add(test_case.expect.split(":", 1)[1])

        untested_errors = error_codes - tested_errors
        if untested_errors:
            raise ValueError(f"Missing test cases for errors: {untested_errors}")

        return v


class SpecificationFile(BaseModel):
    """Root specification file structure."""

    specification: Specification = Field(..., description="Specification definition")


class SpecificationIndex(BaseModel):
    """Index of all specifications."""

    specifications: list[dict[str, str]] = Field(
        default_factory=list,
        description="List of specifications with id, title, and file path",
    )
    total: int = Field(0, description="Total number of specifications")
    last_updated: str = Field(..., description="Last update timestamp")


class ValidationResult(BaseModel):
    """Result of specification validation."""

    specification_id: str = Field(..., description="Specification ID")
    valid: bool = Field(..., description="Whether validation passed")
    errors: list[str] = Field(default_factory=list, description="Validation errors")
    warnings: list[str] = Field(default_factory=list, description="Validation warnings")


class ComplianceReport(BaseModel):
    """Compliance report for a specification."""

    specification_id: str = Field(..., description="Specification ID")
    implementation_file: str = Field(..., description="Implementation file path")
    compliant: bool = Field(..., description="Whether implementation is compliant")
    violations: list[dict[str, Any]] = Field(
        default_factory=list, description="List of compliance violations"
    )
    coverage: float = Field(
        ..., ge=0, le=100, description="Specification coverage percentage"
    )
    last_checked: str = Field(..., description="Last check timestamp")
