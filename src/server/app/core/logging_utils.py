"""Logging utilities for standardized application logging."""

import logging
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from functools import wraps
from pathlib import Path
from typing import Any, ParamSpec, TypeVar

from app.core.config import settings

# Type variables for generic function decoration
P = ParamSpec("P")
T = TypeVar("T")


class StructuredLogger:
    """Enhanced logger with structured logging capabilities."""

    def __init__(self, name: str) -> None:
        self.logger = logging.getLogger(name)
        self._default_context: dict[str, Any] = {
            "service": name.split(".")[-1] if "." in name else name
        }

    def _log_with_context(
        self,
        level: int,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = False,
    ) -> None:
        """Log with structured context."""
        extra = {**self._default_context, **(context or {})}
        self.logger.log(level, message, extra=extra, exc_info=exc_info)

    def debug(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = False,
    ) -> None:
        """Log debug message with context."""
        self._log_with_context(logging.DEBUG, message, context, exc_info)

    def info(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = False,
    ) -> None:
        """Log info message with context."""
        self._log_with_context(logging.INFO, message, context, exc_info)

    def warning(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = False,
    ) -> None:
        """Log warning message with context."""
        self._log_with_context(logging.WARNING, message, context, exc_info)

    def error(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = True,
    ) -> None:
        """Log error message with context."""
        self._log_with_context(logging.ERROR, message, context, exc_info)

    def critical(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = True,
    ) -> None:
        """Log critical message with context."""
        self._log_with_context(logging.CRITICAL, message, context, exc_info)


def get_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance."""
    return StructuredLogger(name)


def log_performance(
    logger: StructuredLogger,
    operation: str,
    context: dict[str, Any] | None = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Decorator to log function performance.

    Args:
        logger: Logger instance
        operation: Operation name for logging
        context: Additional context for logging

    Returns:
        Decorated function
    """

    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time.time()
            log_context = {
                "operation": operation,
                "function": func.__name__,
                **(context or {}),
            }

            try:
                logger.debug(f"Starting {operation}", log_context)
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                logger.info(
                    f"{operation} completed successfully",
                    {**log_context, "execution_time": execution_time},
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"{operation} failed",
                    {
                        **log_context,
                        "execution_time": execution_time,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                raise

        @wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start_time = time.time()
            log_context = {
                "operation": operation,
                "function": func.__name__,
                **(context or {}),
            }

            try:
                logger.debug(f"Starting {operation}", log_context)
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)  # type: ignore
                else:
                    result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                logger.info(
                    f"{operation} completed successfully",
                    {**log_context, "execution_time": execution_time},
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"{operation} failed",
                    {
                        **log_context,
                        "execution_time": execution_time,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                raise

        # Return appropriate wrapper based on function type
        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        else:
            return sync_wrapper

    return decorator


@contextmanager
def log_operation(
    logger: StructuredLogger,
    operation: str,
    context: dict[str, Any] | None = None,
) -> Iterator[dict[str, Any]]:
    """
    Context manager for logging operations with timing.

    Args:
        logger: Logger instance
        operation: Operation name
        context: Additional context

    Yields:
        Mutable context dictionary for adding runtime information
    """
    start_time = time.time()
    operation_context = {
        "operation": operation,
        **(context or {}),
    }

    logger.debug(f"Starting {operation}", operation_context)

    try:
        yield operation_context
        execution_time = time.time() - start_time
        logger.info(
            f"{operation} completed successfully",
            {**operation_context, "execution_time": execution_time},
        )
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"{operation} failed",
            {
                **operation_context,
                "execution_time": execution_time,
                "error": str(e),
                "error_type": type(e).__name__,
            },
        )
        raise


def log_file_operation(
    logger: StructuredLogger,
    operation: str,
    file_path: Path,
    context: dict[str, Any] | None = None,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Decorator specifically for file operations.

    Args:
        logger: Logger instance
        operation: Operation name
        file_path: File path being operated on
        context: Additional context

    Returns:
        Decorated function
    """
    file_context = {
        "file_path": str(file_path),
        "file_name": file_path.name,
        "file_size": file_path.stat().st_size if file_path.exists() else None,
        **(context or {}),
    }

    return log_performance(logger, operation, file_context)


class LoggingMixin:
    """Mixin class to provide structured logging to service classes."""

    def __init__(self) -> None:
        self.logger = get_logger(self.__class__.__module__)

    def log_debug(
        self,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Log debug message."""
        self.logger.debug(message, context)

    def log_info(
        self,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Log info message."""
        self.logger.info(message, context)

    def log_warning(
        self,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Log warning message."""
        self.logger.warning(message, context)

    def log_error(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        exc_info: bool = True,
    ) -> None:
        """Log error message."""
        self.logger.error(message, context, exc_info)

    def log_operation_start(
        self,
        operation: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Log operation start."""
        self.logger.debug(f"Starting {operation}", context)

    def log_operation_success(
        self,
        operation: str,
        context: dict[str, Any] | None = None,
        execution_time: float | None = None,
    ) -> None:
        """Log operation success."""
        log_context = context or {}
        if execution_time is not None:
            log_context["execution_time"] = execution_time
        self.logger.info(f"{operation} completed successfully", log_context)

    def log_operation_failure(
        self,
        operation: str,
        error: Exception,
        context: dict[str, Any] | None = None,
        execution_time: float | None = None,
    ) -> None:
        """Log operation failure."""
        log_context = {
            "error": str(error),
            "error_type": type(error).__name__,
            **(context or {}),
        }
        if execution_time is not None:
            log_context["execution_time"] = execution_time
        self.logger.error(f"{operation} failed", log_context)


def setup_logging() -> None:
    """Setup application logging configuration."""
    log_level = getattr(logging, settings.log_level.upper())

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Set specific loggers to appropriate levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
