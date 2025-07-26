"""Health service tests."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.services.health_service import HealthService


class TestHealthService:
    """Health service test class."""

    @pytest.fixture
    def health_service(self) -> HealthService:
        """Create health service instance."""
        return HealthService()

    def test_init(self, health_service: HealthService) -> None:
        """Test health service initialization."""
        assert health_service is not None

    @patch("app.services.health_service.HealthService._check_text_search")
    @patch("app.services.health_service.HealthService._check_claude_code")
    async def test_get_detailed_health_all_healthy(
        self,
        mock_check_claude: Mock,
        mock_check_text: Mock,
        health_service: HealthService,
    ) -> None:
        """Test detailed health when all services are healthy."""
        # Setup mocks
        mock_check_text.return_value = True
        mock_check_claude.return_value = True

        # Execute test
        result = await health_service.get_detailed_health()

        # Verify results
        assert result.text_search is True
        assert result.claude_code is True
        assert result.overall is True

    @patch("app.services.health_service.HealthService._check_text_search")
    @patch("app.services.health_service.HealthService._check_claude_code")
    async def test_get_detailed_health_text_search_failed(
        self,
        mock_check_claude: Mock,
        mock_check_text: Mock,
        health_service: HealthService,
    ) -> None:
        """Test detailed health when text search fails."""
        # Setup mocks
        mock_check_text.return_value = False
        mock_check_claude.return_value = True

        # Execute test
        result = await health_service.get_detailed_health()

        # Verify results
        assert result.text_search is False
        assert result.claude_code is True
        assert result.overall is False

    @patch("app.services.health_service.HealthService._check_text_search")
    @patch("app.services.health_service.HealthService._check_claude_code")
    async def test_get_detailed_health_claude_failed(
        self,
        mock_check_claude: Mock,
        mock_check_text: Mock,
        health_service: HealthService,
    ) -> None:
        """Test detailed health when Claude Code fails."""
        # Setup mocks
        mock_check_text.return_value = True
        mock_check_claude.return_value = False

        # Execute test
        result = await health_service.get_detailed_health()

        # Verify results
        assert result.text_search is True
        assert result.claude_code is False
        assert result.overall is False

    @patch("app.services.health_service.HealthService._check_text_search")
    @patch("app.services.health_service.HealthService._check_claude_code")
    async def test_get_detailed_health_all_failed(
        self,
        mock_check_claude: Mock,
        mock_check_text: Mock,
        health_service: HealthService,
    ) -> None:
        """Test detailed health when all services fail."""
        # Setup mocks
        mock_check_text.return_value = False
        mock_check_claude.return_value = False

        # Execute test
        result = await health_service.get_detailed_health()

        # Verify results
        assert result.text_search is False
        assert result.claude_code is False
        assert result.overall is False

    async def test_check_text_search_success(
        self, health_service: HealthService
    ) -> None:
        """Test successful text search health check."""
        with patch("app.services.search_service.SearchService") as mock_search_service:
            mock_instance = Mock()
            mock_search_service.return_value = mock_instance
            mock_instance.get_stats = AsyncMock()

            # Execute test
            result = await health_service._check_text_search()

            # Verify results
            assert result is True
            mock_instance.get_stats.assert_called_once()

    async def test_check_text_search_failure(
        self, health_service: HealthService
    ) -> None:
        """Test text search health check failure."""
        with patch("app.services.search_service.SearchService") as mock_search_service:
            mock_instance = Mock()
            mock_search_service.return_value = mock_instance
            mock_instance.get_stats = AsyncMock(side_effect=Exception("Search error"))

            # Execute test
            result = await health_service._check_text_search()

            # Verify results
            assert result is False

    async def test_check_claude_code_success(
        self, health_service: HealthService
    ) -> None:
        """Test successful Claude Code health check."""
        with patch("anthropic.Anthropic") as mock_anthropic:
            mock_client = Mock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = Mock(content=[Mock(text="OK")])

            with patch("app.core.config.settings.anthropic_api_key", "test-key"):
                # Execute test
                result = await health_service._check_claude_code()

                # Verify results
                assert result is True
                mock_client.messages.create.assert_called_once()

    async def test_check_claude_code_no_api_key(
        self, health_service: HealthService
    ) -> None:
        """Test Claude Code health check without API key."""
        with patch("app.core.config.settings.anthropic_api_key", ""):
            # Execute test
            result = await health_service._check_claude_code()

            # Verify results
            assert result is False

    async def test_check_claude_code_api_failure(
        self, health_service: HealthService
    ) -> None:
        """Test Claude Code health check API failure."""
        with patch("anthropic.Anthropic") as mock_anthropic:
            mock_client = Mock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.side_effect = Exception("API error")

            with patch("app.core.config.settings.anthropic_api_key", "test-key"):
                # Execute test
                result = await health_service._check_claude_code()

                # Verify results
                assert result is False
