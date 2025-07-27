"""Custom error types for service layers."""

from typing import Any


class ServiceError(Exception):
    """Base class for all service-level errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


class QueueError(ServiceError):
    """Base class for queue service errors."""

    pass


class QueueConnectionError(QueueError):
    """Error when unable to connect to queue backend."""

    pass


class QueueOperationError(QueueError):
    """Error during queue operation execution."""

    pass


class FileWatcherError(ServiceError):
    """Base class for file watcher service errors."""

    pass


class FileWatcherStartupError(FileWatcherError):
    """Error during file watcher startup."""

    pass


class FileWatcherEventError(FileWatcherError):
    """Error during file event processing."""

    pass


class ChatError(ServiceError):
    """Base class for chat service errors."""

    pass


class ChatStreamError(ChatError):
    """Error during chat streaming operation."""

    pass


class ChatContextError(ChatError):
    """Error during context retrieval or processing."""

    pass
