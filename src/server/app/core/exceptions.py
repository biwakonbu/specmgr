"""Common exception classes and error handling utilities."""

import logging
from enum import Enum
from typing import Any


class ErrorCode(Enum):
    """Standardized error codes for the application."""

    # Generic errors
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"

    # Service errors
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"

    # Search errors
    SEARCH_FAILED = "SEARCH_FAILED"
    EMBEDDING_GENERATION_FAILED = "EMBEDDING_GENERATION_FAILED"

    # Sync errors
    SYNC_FAILED = "SYNC_FAILED"
    SYNC_IN_PROGRESS = "SYNC_IN_PROGRESS"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"

    # Queue errors
    QUEUE_CONNECTION_FAILED = "QUEUE_CONNECTION_FAILED"
    JOB_PROCESSING_FAILED = "JOB_PROCESSING_FAILED"

    # Manifest errors
    MANIFEST_CORRUPTED = "MANIFEST_CORRUPTED"
    MANIFEST_IO_ERROR = "MANIFEST_IO_ERROR"

    # Vector database errors
    VECTOR_DB_CONNECTION_FAILED = "VECTOR_DB_CONNECTION_FAILED"
    VECTOR_DB_OPERATION_FAILED = "VECTOR_DB_OPERATION_FAILED"


class AppError(Exception):
    """Base exception class for all application exceptions."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.context = context or {}
        self.cause = cause

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for serialization."""
        return {
            "error_code": self.error_code.value,
            "message": self.message,
            "context": self.context,
            "cause": str(self.cause) if self.cause else None,
        }

    def __str__(self) -> str:
        return f"[{self.error_code.value}] {self.message}"


class ServiceError(AppError):
    """Base class for service-level exceptions."""

    pass


class SearchError(ServiceError):
    """Search operation specific exception."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.SEARCH_FAILED,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class SyncError(ServiceError):
    """Synchronization operation specific exception."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.SYNC_FAILED,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class SyncInProgressError(SyncError):
    """Sync is already in progress exception."""

    def __init__(
        self,
        message: str = "Sync is already in progress",
        context: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, ErrorCode.SYNC_IN_PROGRESS, context)


class QueueError(ServiceError):
    """Queue operation specific exception."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.JOB_PROCESSING_FAILED,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class QueueConnectionError(QueueError):
    """Queue connection exception."""

    def __init__(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, ErrorCode.QUEUE_CONNECTION_FAILED, context, cause)


class ManifestError(ServiceError):
    """Manifest operation specific exception."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.MANIFEST_IO_ERROR,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class ManifestCorruptedError(ManifestError):
    """Manifest file is corrupted exception."""

    def __init__(
        self,
        message: str = "Manifest file is corrupted",
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, ErrorCode.MANIFEST_CORRUPTED, context, cause)


class VectorDbError(ServiceError):
    """Vector database operation specific exception."""

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.VECTOR_DB_OPERATION_FAILED,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


def handle_exception(
    logger: logging.Logger,
    operation: str,
    exception: Exception,
    context: dict[str, Any] | None = None,
    reraise: bool = True,
) -> None:
    """
    Centralized exception handling utility.

    Args:
        logger: Logger instance
        operation: Operation name being performed
        exception: The exception that occurred
        context: Additional context information
        reraise: Whether to reraise the exception
    """
    error_context = {
        "operation": operation,
        "error": str(exception),
        "error_type": type(exception).__name__,
        **(context or {}),
    }

    if isinstance(exception, AppError):
        # Use the exception's context
        error_context.update(exception.context)
        logger.error(
            f"Application error during {operation}",
            extra=error_context,
            exc_info=exception.cause is not None,
        )
    else:
        # Unexpected exception
        logger.error(
            f"Unexpected error during {operation}",
            extra=error_context,
            exc_info=True,
        )

    if reraise:
        raise
