"""Chat service."""

import asyncio
from collections.abc import AsyncGenerator

from app.core.config import settings
from app.models.api_models import ChatMessage
from app.services.search_service import SearchService


class ChatService:
    """Claude Code SDK chat service."""

    def __init__(self) -> None:
        self.search_service = SearchService()

    async def chat_stream(
        self,
        message: str,
        conversation_history: list[ChatMessage] | None = None,
        use_rag: bool = True,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat processing.

        Args:
            message: User message
            conversation_history: Conversation history
            use_rag: Whether to use RAG

        Yields:
            Chat response chunks
        """
        try:
            # Get RAG context
            context = ""
            if use_rag:
                context = await self._get_rag_context(message)

            # Mock response (actual implementation would use Claude Code SDK)
            response_text = await self._generate_mock_response(
                message, context, conversation_history
            )

            # Stream character by character
            for char in response_text:
                yield char
                await asyncio.sleep(0.01)  # 10ms interval streaming

        except Exception as e:
            yield f"An error occurred: {str(e)}"

    async def _get_rag_context(self, message: str) -> str:
        """
        Get RAG context.

        Args:
            message: User message

        Returns:
            Related document context
        """
        try:
            # Search for related documents
            search_results = await self.search_service.search(
                query=message, limit=3, score_threshold=0.1
            )

            if not search_results.results:
                return ""

            # Combine as context
            context_parts = []
            for result in search_results.results:
                context_parts.append(f"[{result.metadata.file_name}]\n{result.content}")

            return "\n\n".join(context_parts)

        except Exception:
            return ""

    async def _generate_mock_response(
        self,
        message: str,
        context: str,
        conversation_history: list[ChatMessage] | None = None,
    ) -> str:
        """
        Generate mock response.

        Args:
            message: User message
            context: RAG context
            conversation_history: Conversation history

        Returns:
            Response text
        """
        # Simple mock response
        if not settings.anthropic_api_key:
            return (
                f"Thank you for your question: '{message}'\n\n"
                "Currently, Claude Code SDK API key is not configured, "
                "so showing mock response.\n\n"
                f"Related context: {len(context)} characters\n"
                f"Conversation history: {len(conversation_history or [])} items\n\n"
                "To use actual AI functionality, please set "
                "ANTHROPIC_API_KEY in your .env file."
            )

        # TODO: Actual Claude Code SDK implementation
        if context:
            return (
                f"Regarding '{message}', I'll answer based on relevant documents.\n\n"
                f"Found the following information from related documents:\n\n"
                f"{context[:300]}...\n\n"
                "Based on this information, I'll provide a detailed answer. "
                "In the actual implementation, Claude Code SDK would be used "
                "to generate more sophisticated responses."
            )
        else:
            return (
                f"You're asking about '{message}'.\n\n"
                "Since no related documents were found, "
                "I'll answer based on general knowledge.\n\n"
                "In the actual implementation, Claude Code SDK would be used "
                "to provide more detailed and accurate answers."
            )
