"""Application configuration with git repository root detection and YAML config support."""  # noqa: E501

import subprocess
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class DocumentsConfig(BaseModel):
    """Document processing configuration."""

    path: str = "docs"
    extensions: list[str] = [".md", ".markdown"]
    exclude: list[str] = ["node_modules", ".git", ".specmgr-*"]
    watch: dict[str, Any] = Field(  # noqa: E501
        default_factory=lambda: {"enabled": True, "debounce_ms": 500}
    )


class ServerConfig(BaseModel):
    """Server configuration."""

    host: str = "0.0.0.0"  # noqa: S104
    port: int = 3000
    cors: dict[str, Any] = Field(
        default_factory=lambda: {"enabled": True, "origins": ["http://localhost:5173"]}
    )


class SearchConfig(BaseModel):
    """Search and embedding configuration."""

    max_results: int = 50
    score_threshold: float = 0.1
    chunk_size: int = 2000
    overlap_size: int = 100


class VectorDbConfig(BaseModel):
    """Vector database configuration."""

    collection: str = "documents"
    vector_size: int = 1536
    distance: str = "Cosine"


class QueueConfig(BaseModel):
    """Queue processing configuration."""

    concurrency: int = 5
    max_retries: int = 5
    backoff_strategy: str = "exponential"
    initial_delay_ms: int = 2000


class LoggingConfig(BaseModel):
    """Logging configuration."""

    level: str = "info"
    format: str = "json"
    file: str | None = None


class ClaudeConfig(BaseModel):
    """Claude Code SDK configuration."""

    model: str = "claude-3-5-sonnet-20241022"
    max_tokens: int = 4096
    timeout_seconds: int = 30


class AppConfig(BaseModel):
    """Application configuration loaded from YAML."""

    documents: DocumentsConfig = Field(default_factory=DocumentsConfig)
    server: ServerConfig = Field(default_factory=ServerConfig)
    search: SearchConfig = Field(default_factory=SearchConfig)
    vector_db: VectorDbConfig = Field(default_factory=VectorDbConfig)
    queue: QueueConfig = Field(default_factory=QueueConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    claude: ClaudeConfig = Field(default_factory=ClaudeConfig)


def find_git_root() -> Path:
    """Find the git repository root directory."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],  # noqa: S607
            capture_output=True,
            text=True,
            check=True,
            cwd=Path(__file__).parent,
        )
        return Path(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback to searching for .git directory
        current = Path(__file__).parent
        while current != current.parent:
            if (current / ".git").exists():
                return current
            current = current.parent

        # Ultimate fallback - assume we're in a subdirectory of the project
        return Path(__file__).parent.parent.parent.parent.parent


def load_config_file(git_root: Path) -> dict[str, Any]:
    """Load configuration from YAML file in git root."""
    config_path = git_root / "specmgr.config.yaml"

    if not config_path.exists():
        return {}

    try:
        with open(config_path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Failed to load config file {config_path}: {e}")  # noqa: T201
        return {}


class Settings(BaseSettings):
    """Application settings with git repository integration."""

    # Environment configuration
    node_env: str = "development"

    # Claude Code SDK configuration
    anthropic_api_key: str = ""

    # Qdrant configuration
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "documents"
    qdrant_url: str = "http://localhost:6333"

    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_url: str = "redis://localhost:6379"

    # Logging configuration
    log_level: str = "info"

    # Server configuration
    host: str = "0.0.0.0"  # noqa: S104
    port: int = 3000

    # Computed fields - will be set during initialization
    git_root: Path = Field(default_factory=lambda: Path.cwd())
    app_config: AppConfig = Field(default_factory=AppConfig)
    documents_path: str = ""
    watch_directory: str = "docs"

    def __init__(self, **kwargs: Any) -> None:
        # Store original environment values before processing
        import os

        env_overrides = {
            "host": os.environ.get("HOST"),
            "port": int(port_str) if (port_str := os.environ.get("PORT")) else None,
            "qdrant_collection": os.environ.get("QDRANT_COLLECTION"),
            "log_level": os.environ.get("LOG_LEVEL"),
        }

        # Find git repository root first
        git_root = find_git_root()

        # Load application configuration from YAML
        config_data = load_config_file(git_root)
        app_config = AppConfig(**config_data)

        # Set computed paths based on git root and config
        documents_path = str(git_root / app_config.documents.path)
        watch_directory = app_config.documents.path

        # Initialize with computed values
        super().__init__(
            git_root=git_root,
            app_config=app_config,
            documents_path=documents_path,
            watch_directory=watch_directory,
            **kwargs,
        )

        # Apply configuration file overrides (environment variables take priority)
        self._apply_config_overrides(env_overrides)

    def _apply_config_overrides(self, env_overrides: dict[str, Any]) -> None:
        """Apply configuration file overrides to settings.

        Environment variables take priority over config file values.
        """
        # Apply server configuration from YAML (if not overridden by env)
        if env_overrides["host"] is None:
            object.__setattr__(self, "host", self.app_config.server.host)
        if env_overrides["port"] is None:
            object.__setattr__(self, "port", self.app_config.server.port)

        # Apply vector DB configuration from YAML (if not overridden by env)
        if env_overrides["qdrant_collection"] is None:
            object.__setattr__(
                self, "qdrant_collection", self.app_config.vector_db.collection
            )

        # Apply logging configuration from YAML (if not overridden by env)
        if env_overrides["log_level"] is None:
            object.__setattr__(self, "log_level", self.app_config.logging.level)

    model_config = {"env_file": ".env", "extra": "ignore"}


# Global settings instance
settings = Settings()
