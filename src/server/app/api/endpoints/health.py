"""Health check API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.api_models import ApiResponse, HealthStatus
from app.services.health_service import HealthService

router = APIRouter()


@router.get("/detailed", response_model=ApiResponse[HealthStatus])
async def get_detailed_health() -> ApiResponse[HealthStatus]:
    """
    Get detailed health status API.

    Returns:
        Health status
    """
    try:
        health_service = HealthService()
        status = await health_service.get_detailed_health()

        return ApiResponse(success=True, data=status)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Health status retrieval error: {str(e)}"
        ) from e
