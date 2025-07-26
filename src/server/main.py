"""FastAPI server for Local DocSearch & Chat Assistant."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.services.file_watcher import FileWatcherService
from app.services.queue_service import QueueService

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management."""
    # Startup

    # Start file watcher service
    file_watcher = FileWatcherService()
    await file_watcher.start()

    # Start queue service
    queue_service = QueueService()
    await queue_service.start()

    yield

    # Shutdown
    await file_watcher.stop()
    await queue_service.stop()


def create_app() -> FastAPI:
    """Create FastAPI application."""
    app = FastAPI(
        title="Local DocSearch & Chat Assistant",
        description=(
            "Git-local Markdown documents with hybrid search and Claude AI chat"
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite default port
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add API router
    app.include_router(api_router, prefix="/api")

    return app


app = create_app()


@app.get("/")
async def root() -> dict[str, str]:
    """Health check endpoint."""
    return {"message": "Local DocSearch & Chat Assistant API", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # noqa: S104
        port=3000,
        reload=True,
        log_level="info",
    )
