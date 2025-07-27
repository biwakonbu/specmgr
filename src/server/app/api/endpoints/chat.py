"""Chat API endpoints."""

from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.api_models import ChatRequest, ChatStreamChunk
from app.services.chat_service import ChatService

router = APIRouter()


@router.post("/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Streaming chat API (SSE).

    Args:
        request: Chat request

    Returns:
        Streaming response
    """
    try:
        chat_service = ChatService()

        async def generate_stream() -> AsyncGenerator[str, None]:
            try:
                async for chunk in chat_service.chat_stream(
                    message=request.message,
                    conversation_history=request.conversation_history,
                    use_rag=request.use_rag,
                ):
                    # JSON形式でチャンクを送信
                    chunk_data = ChatStreamChunk(type="chunk", content=chunk)
                    yield f"data: {chunk_data.model_dump_json()}\n\n"

                # 完了シグナル
                complete_data = ChatStreamChunk(type="complete")
                yield f"data: {complete_data.model_dump_json()}\n\n"

                # 終了シグナル
                done_data = ChatStreamChunk(type="done")
                yield f"data: {done_data.model_dump_json()}\n\n"

            except Exception as e:
                # エラーシグナル
                from app.models.api_models import ErrorDetail
                error_data = ChatStreamChunk(
                    type="error", error=ErrorDetail(code="CHAT_ERROR", message=str(e))
                )
                yield f"data: {error_data.model_dump_json()}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Streaming chat error: {str(e)}"
        ) from e
