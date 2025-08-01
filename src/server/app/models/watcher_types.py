"""Type definitions for file watcher service operations."""

from enum import Enum
from typing import TypedDict

from pydantic import BaseModel, Field


class FileEventType(str, Enum):
    """Types of file system events."""

    CREATED = "created"
    MODIFIED = "modified"
    DELETED = "deleted"
    MOVED = "moved"


class FileChangeAction(str, Enum):
    """Actions to take when file changes are detected."""

    SYNC = "sync"
    DELETE = "delete"
    IGNORE = "ignore"


class FileEvent(BaseModel):
    """File system event data."""

    event_type: FileEventType = Field(..., description="Type of file event")
    file_path: str = Field(..., description="Path to the changed file")
    relative_path: str = Field(..., description="Relative path from docs root")
    timestamp: float = Field(..., description="Event timestamp")
    is_directory: bool = Field(
        default=False, description="Whether the path is a directory"
    )
    file_size: int | None = Field(default=None, description="File size in bytes")


class WatcherConfig(BaseModel):
    """Configuration for file watcher service."""

    watch_directory: str = Field(..., description="Directory to watch for changes")
    file_patterns: list[str] = Field(
        default=["*.md", "*.markdown"], description="File patterns to watch"
    )
    ignore_patterns: list[str] = Field(
        default=[".git/*", "node_modules/*", ".venv/*"],
        description="Patterns to ignore",
    )
    debounce_seconds: float = Field(
        default=1.0, ge=0.1, le=10.0, description="Debounce delay for file events"
    )
    recursive: bool = Field(
        default=True, description="Watch subdirectories recursively"
    )


class FileChangeInfo(TypedDict):
    """Information about a file change."""

    action: FileChangeAction
    file_path: str
    relative_path: str
    old_hash: str | None
    new_hash: str | None
    change_type: FileEventType


class WatcherStats(TypedDict):
    """File watcher statistics."""

    events_processed: int
    files_synced: int
    files_deleted: int
    errors_encountered: int
    uptime_seconds: float
    last_event_time: float | None
