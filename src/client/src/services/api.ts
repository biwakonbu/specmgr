interface FileMetadata {
  name: string
  path: string
  relativePath: string
  directory: string
  size: number
  lastModified: Date
  created: Date
  hash: string
  lineCount?: number
  wordCount?: number
}

interface DirectoryInfo {
  name: string
  path: string
  relativePath: string
  fileCount: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
  }
  timestamp: string
}

interface FilesResponse {
  files: FileMetadata[]
  directories: DirectoryInfo[]
  totalCount: number
}

interface FileContent {
  path: string
  name: string
  content: string
  metadata: FileMetadata
  frontmatter?: Record<string, unknown>
}

interface SearchResult {
  id: string
  content: string
  score: number
  metadata: {
    filePath: string
    fileName: string
    chunkIndex: number
    totalChunks: number
    modified: string
    size: number
  }
}

interface SearchResponse {
  results: SearchResult[]
  totalResults: number
  query: string
  processingTime: number
}

interface SearchStats {
  totalFiles: number
  totalChunks: number
  lastIndexed: string
  indexSize: number
}

interface HealthStatus {
  textSearch: boolean
  claudeCode: boolean
  overall: boolean
}

interface BulkSyncResult {
  success: boolean
  totalFiles: number
  processedFiles: number
  totalChunks: number
  processingTime: number
  errors: string[]
}

interface SyncStatus {
  isRunning: boolean
  current: number
  total: number
  currentFile: string
}

const API_BASE_URL = 'http://localhost:3000/api'

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse<T> = await response.json()
      
      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed')
      }

      return data.data
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  async getFiles(options: {
    path?: string
    recursive?: boolean
    sortBy?: 'name' | 'modified' | 'size'
    order?: 'asc' | 'desc'
  } = {}): Promise<FilesResponse> {
    const params = new URLSearchParams()
    
    if (options.path) params.append('path', options.path)
    if (options.recursive !== undefined) params.append('recursive', options.recursive.toString())
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.order) params.append('order', options.order)

    const queryString = params.toString()
    const endpoint = `/files${queryString ? `?${queryString}` : ''}`
    
    return this.request<FilesResponse>(endpoint)
  }

  async getFileContent(filePath: string): Promise<FileContent> {
    const encodedPath = encodeURIComponent(filePath)
    return this.request<FileContent>(`/files/${encodedPath}`)
  }

  async searchDocuments(query: string, options: {
    limit?: number
    scoreThreshold?: number
    filePath?: string
  } = {}): Promise<SearchResponse> {
    return this.request<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...options,
      }),
    })
  }

  async getSearchStats(): Promise<SearchStats> {
    return this.request<SearchStats>('/search/stats')
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health/detailed')
  }

  async executeBulkSync(force = false): Promise<BulkSyncResult> {
    return this.request<BulkSyncResult>('/sync/bulk', {
      method: 'POST',
      body: JSON.stringify({ force }),
    })
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return this.request<SyncStatus>('/sync/status')
  }
}

export const apiClient = new ApiClient()
export type { 
  FileMetadata, 
  DirectoryInfo, 
  FileContent, 
  FilesResponse,
  SearchResult,
  SearchResponse,
  SearchStats,
  HealthStatus,
  BulkSyncResult,
  SyncStatus
}