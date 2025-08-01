"""File management API endpoints."""

from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Query

from app.models.api_models import ApiResponse, FileContent, FilesResponse
from app.services.file_service import FileService

router = APIRouter()


@router.get("", response_model=ApiResponse[FilesResponse])
async def get_files(
    path: str | None = Query(None, description="Target path"),
    recursive: bool = Query(True, description="Recursive search"),
    sort_by: str = Query(
        "name",
        pattern="^(name|modified|size)$",
        description="Sort criteria",
        alias="sortBy",
    ),
    order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
) -> ApiResponse[FilesResponse]:
    """
    Get file list.

    Args:
        path: Target path
        recursive: Recursive search
        sort_by: Sort criteria
        order: Sort order

    Returns:
        File list response
    """
    try:
        file_service = FileService()
        result = await file_service.get_files(
            path=path, recursive=recursive, sort_by=sort_by, order=order
        )

        return ApiResponse(success=True, data=result)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"File list retrieval error: {str(e)}"
        ) from e


@router.get("/{file_path:path}", response_model=ApiResponse[FileContent])
async def get_file_content(file_path: str) -> ApiResponse[FileContent]:
    """
    Get file content.

    Args:
        file_path: File path (URL encoded)

    Returns:
        File content response
    """
    try:
        # URL decode
        decoded_path = unquote(file_path)

        file_service = FileService()
        content = await file_service.get_file_content(decoded_path)

        return ApiResponse(success=True, data=content)

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404, detail=f"File not found: {file_path}"
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"File content retrieval error: {str(e)}"
        ) from e
