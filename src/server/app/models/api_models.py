"""API model definitions."""

from datetime import datetime
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiResponse[T](BaseModel):
    """Common API response model."""

    success: bool
    data: T
    error: dict[str, str] | None = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorDetail(BaseModel):
    """Error detail model."""

    code: str
    message: str


class FileMetadata(BaseModel):
    """File metadata model."""

    name: str
    path: str
    relative_path: str = Field(alias="relativePath")
    directory: str
    size: int
    last_modified: datetime = Field(alias="lastModified")
    created: datetime
    hash: str
    line_count: int | None = Field(None, alias="lineCount")
    word_count: int | None = Field(None, alias="wordCount")

    model_config = ConfigDict(populate_by_name=True)


class DirectoryInfo(BaseModel):
    """ディレクトリ情報モデル."""

    name: str
    path: str
    relative_path: str = Field(alias="relativePath")
    file_count: int = Field(alias="fileCount")

    model_config = ConfigDict(populate_by_name=True)


class FilesResponse(BaseModel):
    """ファイル一覧レスポンスモデル."""

    files: list[FileMetadata]
    directories: list[DirectoryInfo]
    total_count: int = Field(alias="totalCount")

    model_config = ConfigDict(populate_by_name=True)


class FileContent(BaseModel):
    """ファイル内容モデル."""

    path: str
    name: str
    content: str
    metadata: FileMetadata
    frontmatter: dict[str, Any] | None = None


class SearchResultMetadata(BaseModel):
    """検索結果メタデータモデル."""

    file_path: str = Field(alias="filePath")
    file_name: str = Field(alias="fileName")
    chunk_index: int = Field(alias="chunkIndex")
    total_chunks: int = Field(alias="totalChunks")
    modified: str
    size: int

    model_config = ConfigDict(populate_by_name=True)


class SearchResult(BaseModel):
    """検索結果モデル."""

    id: str
    content: str
    score: float
    metadata: SearchResultMetadata


class SearchResponse(BaseModel):
    """検索レスポンスモデル."""

    results: list[SearchResult]
    total_results: int = Field(alias="totalResults")
    query: str
    processing_time: float = Field(alias="processingTime")

    model_config = ConfigDict(populate_by_name=True)


class SearchRequest(BaseModel):
    """検索リクエストモデル."""

    query: str
    limit: int | None = 10
    score_threshold: float | None = Field(None, alias="scoreThreshold")
    file_path: str | None = Field(None, alias="filePath")

    model_config = ConfigDict(populate_by_name=True)


class SearchStats(BaseModel):
    """検索統計モデル."""

    total_files: int = Field(alias="totalFiles")
    total_chunks: int = Field(alias="totalChunks")
    last_indexed: str = Field(alias="lastIndexed")
    index_size: int = Field(alias="indexSize")

    model_config = ConfigDict(populate_by_name=True)


class HealthStatus(BaseModel):
    """ヘルス状態モデル."""

    text_search: bool = Field(alias="textSearch")
    claude_code: bool = Field(alias="claudeCode")
    overall: bool

    model_config = ConfigDict(populate_by_name=True)


class BulkSyncResult(BaseModel):
    """一括同期結果モデル."""

    success: bool
    total_files: int = Field(alias="totalFiles")
    processed_files: int = Field(alias="processedFiles")
    total_chunks: int = Field(alias="totalChunks")
    processing_time: float = Field(alias="processingTime")
    errors: list[str]

    model_config = ConfigDict(populate_by_name=True)


class BulkSyncRequest(BaseModel):
    """一括同期リクエストモデル."""

    force: bool = False


class SyncStatus(BaseModel):
    """同期状態モデル."""

    is_running: bool = Field(alias="isRunning")
    current: int
    total: int
    current_file: str = Field(alias="currentFile")

    model_config = ConfigDict(populate_by_name=True)


class ChatMessage(BaseModel):
    """チャットメッセージモデル."""

    role: str  # "user" | "assistant"
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    """チャットリクエストモデル."""

    message: str
    conversation_history: list[ChatMessage] = Field(
        default=[], alias="conversationHistory"
    )
    use_rag: bool = Field(True, alias="useRAG")

    model_config = ConfigDict(populate_by_name=True)


class ChatStreamChunk(BaseModel):
    """チャットストリームチャンクモデル."""

    type: str  # "chunk" | "complete" | "error" | "done"
    content: str | None = None
    error: ErrorDetail | None = None
