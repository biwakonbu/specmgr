"""APIルート定義."""

from fastapi import APIRouter

from app.api.endpoints import chat, files, health, search, sync

api_router = APIRouter()

# 各エンドポイントを追加
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
