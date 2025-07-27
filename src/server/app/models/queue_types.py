"""Type definitions for queue service operations."""

from enum import Enum
from typing import Any, TypedDict

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Status of a queue job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class JobPriority(str, Enum):
    """Priority levels for queue jobs."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class JobData(BaseModel):
    """Data structure for queue job payload."""

    job_id: str = Field(..., description="Unique job identifier")
    job_type: str = Field(..., description="Type of job to execute")
    file_path: str = Field(..., description="Path to file being processed")
    priority: JobPriority = Field(
        default=JobPriority.NORMAL, description="Job priority"
    )
    retry_count: int = Field(
        default=0, ge=0, le=5, description="Number of retry attempts"
    )
    created_at: float = Field(..., description="Job creation timestamp")
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional job metadata"
    )


class QueueStats(TypedDict):
    """Queue statistics information."""

    total_jobs: int
    pending_jobs: int
    processing_jobs: int
    completed_jobs: int
    failed_jobs: int
    queue_size: int
    workers_active: int
    average_processing_time: float


class JobResult(BaseModel):
    """Result of a completed job."""

    job_id: str
    status: JobStatus
    result_data: dict[str, Any] | None = None
    error_message: str | None = None
    processing_time: float
    completed_at: float
