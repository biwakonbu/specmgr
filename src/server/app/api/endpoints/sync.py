"""同期API エンドポイント."""

from fastapi import APIRouter, HTTPException

from app.models.api_models import (
    ApiResponse,
    BulkSyncRequest,
    BulkSyncResult,
    SyncStatus,
)
from app.services.sync_service import SyncService

router = APIRouter()


@router.post("/bulk", response_model=ApiResponse[BulkSyncResult])
async def execute_bulk_sync(request: BulkSyncRequest) -> ApiResponse[BulkSyncResult]:
    """
    一括同期実行API.

    Args:
        request: 同期リクエスト

    Returns:
        同期結果
    """
    try:
        sync_service = SyncService()
        result = await sync_service.execute_bulk_sync(force=request.force)

        return ApiResponse(success=True, data=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"一括同期エラー: {str(e)}") from e


@router.get("/status", response_model=ApiResponse[SyncStatus])
async def get_sync_status() -> ApiResponse[SyncStatus]:
    """
    同期状態取得API.

    Returns:
        同期状態
    """
    try:
        sync_service = SyncService()
        status = await sync_service.get_sync_status()

        return ApiResponse(success=True, data=status)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"同期状態取得エラー: {str(e)}"
        ) from e
