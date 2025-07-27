"""Tests for configuration system with git repository integration."""

import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import yaml

from app.core.config import (
    AppConfig,
    DocumentsConfig,
    ServerConfig,
    SearchConfig,
    VectorDbConfig,
    QueueConfig,
    LoggingConfig,
    ClaudeConfig,
    Settings,
    find_git_root,
    load_config_file,
)


class TestGitRootDetection:
    """Test git repository root detection."""

    def test_find_git_root_with_git_command(self) -> None:
        """Test git root detection using git command."""
        # This should work in our actual git repository
        git_root = find_git_root()
        assert git_root.exists()
        assert (git_root / ".git").exists()

    @patch("subprocess.run")
    def test_find_git_root_command_failure_fallback(self, mock_run: Mock) -> None:
        """Test fallback when git command fails."""
        # Mock git command failure
        mock_run.side_effect = FileNotFoundError()

        # The fallback logic should still return a Path object
        git_root = find_git_root()
        assert isinstance(git_root, Path)

    @patch("subprocess.run")
    def test_find_git_root_no_git_ultimate_fallback(self, mock_run: Mock) -> None:
        """Test ultimate fallback when no git repo found."""
        mock_run.side_effect = FileNotFoundError()

        # Should return the calculated parent path
        git_root = find_git_root()
        assert isinstance(git_root, Path)


class TestConfigFileLoading:
    """Test YAML configuration file loading."""

    def test_load_config_file_exists(self) -> None:
        """Test loading existing config file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            config_file = temp_path / "specmgr.config.yaml"

            # Create test config
            test_config = {"documents": {"path": "test-docs"}, "server": {"port": 8080}}

            with open(config_file, "w") as f:
                yaml.dump(test_config, f)

            # Load config
            result = load_config_file(temp_path)

            assert result == test_config
            assert result["documents"]["path"] == "test-docs"
            assert result["server"]["port"] == 8080

    def test_load_config_file_not_exists(self) -> None:
        """Test behavior when config file doesn't exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            result = load_config_file(temp_path)

            assert result == {}

    def test_load_config_file_invalid_yaml(self) -> None:
        """Test handling of invalid YAML."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            config_file = temp_path / "specmgr.config.yaml"

            # Create invalid YAML
            with open(config_file, "w") as f:
                f.write("invalid: yaml: content: [")

            # Should return empty dict and not crash
            result = load_config_file(temp_path)

            assert result == {}

    def test_load_config_file_empty_file(self) -> None:
        """Test handling of empty YAML file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            config_file = temp_path / "specmgr.config.yaml"

            # Create empty file
            config_file.touch()

            result = load_config_file(temp_path)

            assert result == {}


class TestAppConfig:
    """Test application configuration models."""

    def test_documents_config_defaults(self) -> None:
        """Test DocumentsConfig default values."""
        config = DocumentsConfig()

        assert config.path == "docs"
        assert config.extensions == [".md", ".markdown"]
        assert "node_modules" in config.exclude
        assert config.watch["enabled"] is True

    def test_app_config_from_dict(self) -> None:
        """Test AppConfig creation from dictionary."""
        config_data = {
            "documents": {"path": "custom-docs", "extensions": [".md"]},
            "server": {"port": 8080, "host": "127.0.0.1"},
        }

        app_config = AppConfig(
            documents=DocumentsConfig(
                path=config_data["documents"]["path"],
                extensions=config_data["documents"]["extensions"]
            ),
            server=ServerConfig(**config_data["server"]),
            search=SearchConfig(),
            vector_db=VectorDbConfig(),
            queue=QueueConfig(),
            logging=LoggingConfig(),
            claude=ClaudeConfig(),
        )

        assert app_config.documents.path == "custom-docs"
        assert app_config.documents.extensions == [".md"]
        assert app_config.server.port == 8080
        assert app_config.server.host == "127.0.0.1"

    def test_app_config_partial_override(self) -> None:
        """Test partial configuration override."""
        config_data = {
            "documents": {
                "path": "my-docs"
                # Other fields should use defaults
            }
        }

        app_config = AppConfig(
            documents=DocumentsConfig(
                path=config_data["documents"]["path"]
            ),
            server=ServerConfig(),
            search=SearchConfig(),
            vector_db=VectorDbConfig(),
            queue=QueueConfig(),
            logging=LoggingConfig(),
            claude=ClaudeConfig(),
        )

        assert app_config.documents.path == "my-docs"
        assert app_config.documents.extensions == [".md", ".markdown"]  # Default
        assert app_config.server.port == 3000  # Default


class TestSettings:
    """Test Settings class with git integration."""

    def test_settings_basic_initialization(self) -> None:
        """Test basic settings initialization."""
        settings = Settings()

        assert isinstance(settings.git_root, Path)
        assert isinstance(settings.app_config, AppConfig)
        assert settings.documents_path
        assert settings.watch_directory

    def test_settings_documents_path_computation(self) -> None:
        """Test documents path computation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create mock git root and config
            config_file = temp_path / "specmgr.config.yaml"
            config_data = {"documents": {"path": "test-docs"}}

            with open(config_file, "w") as f:
                yaml.dump(config_data, f)

            # Mock git root detection
            with patch("app.core.config.find_git_root", return_value=temp_path):
                settings = Settings()

                expected_path = str(temp_path / "test-docs")
                assert settings.documents_path == expected_path
                assert settings.watch_directory == "test-docs"

    def test_settings_environment_variable_override(self) -> None:
        """Test environment variable override."""
        test_api_key = "test-api-key-12345"

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": test_api_key}):
            settings = Settings()
            assert settings.anthropic_api_key == test_api_key

    def test_settings_config_file_override(self) -> None:
        """Test configuration file override of settings."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create config with overrides
            config_file = temp_path / "specmgr.config.yaml"
            config_data = {
                "server": {"host": "192.168.1.100", "port": 9000},
                "vector_db": {"collection": "test-collection"},
                "logging": {"level": "debug"},
            }

            with open(config_file, "w") as f:
                yaml.dump(config_data, f)

            # Mock git root detection
            with patch("app.core.config.find_git_root", return_value=temp_path):
                settings = Settings()

                # Test that app_config contains the expected values
                assert settings.app_config.server.host == "192.168.1.100"
                assert settings.app_config.server.port == 9000
                assert settings.app_config.vector_db.collection == "test-collection"
                assert settings.app_config.logging.level == "debug"

    def test_settings_priority_env_over_config(self) -> None:
        """Test that environment variables take priority over config file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create config file
            config_file = temp_path / "specmgr.config.yaml"
            config_data = {"logging": {"level": "debug"}}

            with open(config_file, "w") as f:
                yaml.dump(config_data, f)

            # Set environment variable
            with patch.dict(os.environ, {"LOG_LEVEL": "error"}):
                with patch("app.core.config.find_git_root", return_value=temp_path):
                    settings = Settings()

                    # Environment variable should take priority
                    assert settings.log_level == "error"

    def test_settings_git_root_absolute_path(self) -> None:
        """Test that git_root is always absolute path."""
        settings = Settings()

        assert settings.git_root.is_absolute()
        assert settings.documents_path  # Should be non-empty
        assert Path(settings.documents_path).is_absolute()


class TestIntegration:
    """Integration tests for the complete configuration system."""

    def test_full_config_integration(self) -> None:
        """Test complete configuration system integration."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create comprehensive config
            config_file = temp_path / "specmgr.config.yaml"
            config_data = {
                "documents": {
                    "path": "project-docs",
                    "extensions": [".md", ".rst"],
                    "exclude": ["build", "__pycache__"],
                },
                "server": {"host": "localhost", "port": 5000},
                "search": {"max_results": 25, "chunk_size": 1500},
                "vector_db": {"collection": "project-vectors", "vector_size": 768},
                "queue": {"concurrency": 3, "max_retries": 3},
            }

            with open(config_file, "w") as f:
                yaml.dump(config_data, f)

            # Set some environment variables
            env_vars = {
                "ANTHROPIC_API_KEY": "env-api-key",
                "REDIS_URL": "redis://env-redis:6379",
            }

            with patch.dict(os.environ, env_vars):
                with patch("app.core.config.find_git_root", return_value=temp_path):
                    settings = Settings()

                    # Test git root and path computation
                    assert settings.git_root == temp_path
                    assert settings.documents_path == str(temp_path / "project-docs")
                    assert settings.watch_directory == "project-docs"

                    # Test environment variables
                    assert settings.anthropic_api_key == "env-api-key"
                    assert settings.redis_url == "redis://env-redis:6379"

                    # Test config overrides through app_config
                    assert settings.app_config.server.host == "localhost"
                    assert settings.app_config.server.port == 5000
                    assert settings.app_config.vector_db.collection == "project-vectors"

                    # Test app config
                    assert settings.app_config.documents.path == "project-docs"
                    assert settings.app_config.documents.extensions == [".md", ".rst"]
                    assert settings.app_config.search.max_results == 25
                    assert settings.app_config.search.chunk_size == 1500
                    assert settings.app_config.vector_db.vector_size == 768
                    assert settings.app_config.queue.concurrency == 3

    def test_config_validation_errors(self) -> None:
        """Test configuration validation and error handling."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create config with invalid data types
            config_file = temp_path / "specmgr.config.yaml"
            config_data = {
                "server": {
                    "port": "invalid-port"  # Should be int
                }
            }

            with open(config_file, "w") as f:
                yaml.dump(config_data, f)

            with patch("app.core.config.find_git_root", return_value=temp_path):
                with pytest.raises(ValueError):  # Should raise validation error
                    Settings()
