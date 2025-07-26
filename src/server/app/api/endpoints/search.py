"""検索API エンドポイント."""

from fastapi import APIRouter, HTTPException

from app.models.api_models import (
    ApiResponse,
    SearchRequest,
    SearchResponse,
    SearchStats,
)
from app.services.search_service import SearchService

router = APIRouter()


@router.post("", response_model=ApiResponse[SearchResponse])
async def search_documents(request: SearchRequest) -> ApiResponse[SearchResponse]:
    """
    ドキュメント検索API.

    Args:
        request: 検索リクエスト

    Returns:
        検索結果
    """
    try:
        search_service = SearchService()
        result = await search_service.search(
            query=request.query,
            limit=request.limit,
            score_threshold=request.score_threshold,
            file_path=request.file_path,
        )

        return ApiResponse(success=True, data=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"検索エラー: {str(e)}") from e


@router.get("/stats", response_model=ApiResponse[SearchStats])
async def get_search_stats() -> ApiResponse[SearchStats]:
    """
    検索統計情報を取得.

    Returns:
        検索統計
    """
    try:
        search_service = SearchService()
        stats = await search_service.get_stats()

        return ApiResponse(success=True, data=stats)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"統計取得エラー: {str(e)}") from e
