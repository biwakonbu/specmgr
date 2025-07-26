import { EmbeddingService } from './embeddingService'
import { QdrantService, type SearchResult } from './qdrantService'

export interface SearchQuery {
  query: string
  limit?: number
  scoreThreshold?: number
  filePath?: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  totalResults: number
  processingTime: number
  usedVector: boolean
}

export class SearchService {
  private qdrantService: QdrantService
  private embeddingService: EmbeddingService

  constructor() {
    this.qdrantService = new QdrantService()
    this.embeddingService = new EmbeddingService()
  }

  /**
   * Perform vector-based semantic search
   */
  async vectorSearch(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now()
    const { query, limit = 10, scoreThreshold = 0.7 } = searchQuery

    try {
      // Generate embedding for the search query
      const queryVector = await this.embeddingService.generateQueryEmbedding(query)

      // Perform vector search
      const results = await this.qdrantService.searchSimilar(queryVector, limit, scoreThreshold)

      // Filter by file path if specified
      const filteredResults = searchQuery.filePath
        ? results.filter(result => result.metadata.filePath.includes(searchQuery.filePath!))
        : results

      const processingTime = (Date.now() - startTime) / 1000

      return {
        query,
        results: filteredResults,
        totalResults: filteredResults.length,
        processingTime,
        usedVector: true,
      }
    } catch (error) {
      console.error('❌ Vector search failed:', error)

      // Fallback to basic text matching if vector search fails
      return this.fallbackTextSearch(searchQuery, startTime)
    }
  }

  /**
   * Fallback text search when vector search is unavailable
   */
  private async fallbackTextSearch(
    searchQuery: SearchQuery,
    startTime: number
  ): Promise<SearchResponse> {
    console.log('⚠️ Falling back to basic text search')

    const { query } = searchQuery
    const processingTime = (Date.now() - startTime) / 1000

    // Return mock results for now
    // In a real implementation, this could search file contents directly
    return {
      query,
      results: [],
      totalResults: 0,
      processingTime,
      usedVector: false,
    }
  }

  /**
   * Get search suggestions based on existing documents
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    try {
      if (partialQuery.length < 2) {
        return []
      }

      // Generate embedding for partial query
      const queryVector = await this.embeddingService.generateQueryEmbedding(partialQuery)

      // Search for similar content
      const results = await this.qdrantService.searchSimilar(queryVector, limit, 0.5)

      // Extract keywords and phrases from results
      const suggestions = results
        .flatMap(result => {
          // Extract meaningful phrases from content
          const sentences = result.content.split(/[.!?]+/)
          return sentences
            .filter(sentence => sentence.toLowerCase().includes(partialQuery.toLowerCase()))
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0 && sentence.length < 100)
        })
        .slice(0, limit)

      return [...new Set(suggestions)] // Remove duplicates
    } catch (error) {
      console.error('❌ Failed to get search suggestions:', error)
      return []
    }
  }

  /**
   * Get related documents based on a specific document
   */
  async getRelatedDocuments(_filePath: string, _limit: number = 5): Promise<SearchResult[]> {
    try {
      // Get the document content to generate a query
      const _collection = await this.qdrantService.getCollectionInfo()

      // Search for documents with similar content but different file path
      // This is a simplified implementation - in practice, you'd want to
      // use the document's own embedding to find similar documents

      // For now, return empty results
      return []
    } catch (error) {
      console.error('❌ Failed to get related documents:', error)
      return []
    }
  }

  /**
   * Get document statistics
   */
  async getSearchStats(): Promise<{
    totalDocuments: number
    collectionInfo: unknown
    isHealthy: boolean
  }> {
    try {
      const totalDocuments = await this.qdrantService.countDocuments()
      const collectionInfo = await this.qdrantService.getCollectionInfo()
      const isHealthy = await this.qdrantService.healthCheck()

      return {
        totalDocuments,
        collectionInfo,
        isHealthy,
      }
    } catch (error) {
      console.error('❌ Failed to get search stats:', error)
      return {
        totalDocuments: 0,
        collectionInfo: null,
        isHealthy: false,
      }
    }
  }

  /**
   * Health check for search service
   */
  async healthCheck(): Promise<{
    qdrant: boolean
    embedding: boolean
    overall: boolean
  }> {
    try {
      const qdrantHealthy = await this.qdrantService.healthCheck()
      const embeddingHealthy = await this.embeddingService.healthCheck()

      return {
        qdrant: qdrantHealthy,
        embedding: embeddingHealthy,
        overall: qdrantHealthy && embeddingHealthy,
      }
    } catch (error) {
      console.error('❌ Search service health check failed:', error)
      return {
        qdrant: false,
        embedding: false,
        overall: false,
      }
    }
  }

  /**
   * Re-index all documents (useful for maintenance)
   */
  async reindexAllDocuments(): Promise<{
    success: boolean
    documentsProcessed: number
    error?: string
  }> {
    try {
      // This would trigger a full re-sync of all documents
      // Implementation depends on how you want to handle this
      console.log('🔄 Starting full reindex...')

      // For now, return a placeholder
      return {
        success: true,
        documentsProcessed: 0,
      }
    } catch (error) {
      console.error('❌ Failed to reindex documents:', error)
      return {
        success: false,
        documentsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
