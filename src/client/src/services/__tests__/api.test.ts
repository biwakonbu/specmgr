import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../api'
import type { FilesResponse, FileContent, SearchResponse, HealthStatus } from '../api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getFiles', () => {
    it('should fetch files with default parameters', async () => {
      const mockResponse: FilesResponse = {
        files: [
          {
            name: 'test.md',
            relativePath: 'test.md',
            directory: '',
            size: 1024,
            lastModified: '2023-01-01T00:00:00Z',
            type: 'file',
          },
        ],
        directories: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      })

      const result = await apiClient.getFiles()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/files',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle query parameters correctly', async () => {
      const mockResponse: FilesResponse = { files: [], directories: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      })

      await apiClient.getFiles({
        path: 'docs',
        recursive: true,
        sortBy: 'name',
        order: 'asc',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/files?path=docs&recursive=true&sortBy=name&order=asc',
        expect.any(Object)
      )
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(apiClient.getFiles()).rejects.toThrow('HTTP error! status: 500')
    })

    it('should handle unsuccessful API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Something went wrong' },
        }),
      })

      await expect(apiClient.getFiles()).rejects.toThrow('Something went wrong')
    })
  })

  describe('getFileContent', () => {
    it('should fetch file content', async () => {
      const mockContent: FileContent = {
        content: '# Test File\n\nThis is a test.',
        path: 'test.md',
        size: 1024,
        lastModified: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      })

      const result = await apiClient.getFileContent('test.md')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/files/test.md',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockContent)
    })

    it('should encode file paths properly', async () => {
      const mockContent: FileContent = {
        content: 'test',
        path: 'docs/file with spaces.md',
        size: 100,
        lastModified: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      })

      await apiClient.getFileContent('docs/file with spaces.md')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/files/docs%2Ffile%20with%20spaces.md',
        expect.any(Object)
      )
    })
  })

  describe('searchDocuments', () => {
    it('should search documents with query', async () => {
      const mockSearchResponse: SearchResponse = {
        results: [
          {
            id: '1',
            content: 'Test content',
            score: 0.95,
            metadata: {
              filePath: 'test.md',
              fileName: 'test.md',
              chunkIndex: 0,
              totalChunks: 1,
              modified: '2023-01-01T00:00:00Z',
              size: 100,
            },
          },
        ],
        totalResults: 1,
        processingTime: 0.05,
        query: 'test query',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSearchResponse }),
      })

      const result = await apiClient.searchDocuments('test query')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/search',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test query' }),
        })
      )
      expect(result).toEqual(mockSearchResponse)
    })

    it('should include search options', async () => {
      const mockSearchResponse: SearchResponse = {
        results: [],
        totalResults: 0,
        processingTime: 0.01,
        query: 'test',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSearchResponse }),
      })

      await apiClient.searchDocuments('test', {
        limit: 5,
        scoreThreshold: 0.8,
        filePath: 'specific.md',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'test',
            limit: 5,
            scoreThreshold: 0.8,
            filePath: 'specific.md',
          }),
        })
      )
    })
  })

  describe('getHealth', () => {
    it('should fetch health status', async () => {
      const mockHealth: HealthStatus = {
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00Z',
        uptime: 3600,
        version: '1.0.0',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockHealth }),
      })

      const result = await apiClient.getHealth()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/health',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
      expect(result).toEqual(mockHealth)
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.getFiles()).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(apiClient.getFiles()).rejects.toThrow('Invalid JSON')
    })

    it('should provide default error message for unsuccessful responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      })

      await expect(apiClient.getFiles()).rejects.toThrow('API request failed')
    })
  })
})
