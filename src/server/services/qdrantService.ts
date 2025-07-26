import { QdrantClient } from '@qdrant/js-client-rest'

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    filePath: string
    fileName: string
    chunkIndex: number
    totalChunks: number
    modified: string
    size: number
  }
}

export interface SearchResult {
  id: string
  content: string
  metadata: DocumentChunk['metadata']
  score: number
}

export class QdrantService {
  private client: QdrantClient
  private collectionName: string

  constructor(
    url: string = process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: string = 'documents'
  ) {
    this.client = new QdrantClient({ url })
    this.collectionName = collectionName
  }

  /**
   * Initialize the collection if it doesn't exist
   */
  async initializeCollection(vectorSize: number = 1536): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections()
      const collectionExists = collections.collections.some(
        collection => collection.name === this.collectionName
      )

      if (!collectionExists) {
        // Create collection with cosine similarity
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        })
        console.log(`✅ Created Qdrant collection: ${this.collectionName}`)
      } else {
        console.log(`📊 Qdrant collection already exists: ${this.collectionName}`)
      }
    } catch (error) {
      console.error('❌ Failed to initialize Qdrant collection:', error)
      throw error
    }
  }

  /**
   * Upsert document chunks into the vector database
   */
  async upsertDocuments(chunks: DocumentChunk[], vectors: number[][]): Promise<void> {
    if (chunks.length !== vectors.length) {
      throw new Error('Number of chunks and vectors must match')
    }

    try {
      const points = chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: vectors[index],
        payload: {
          content: chunk.content,
          ...chunk.metadata,
        },
      }))

      await this.client.upsert(this.collectionName, {
        wait: true,
        points,
      })

      console.log(`✅ Upserted ${chunks.length} document chunks to Qdrant`)
    } catch (error) {
      console.error('❌ Failed to upsert documents to Qdrant:', error)
      throw error
    }
  }

  /**
   * Delete documents by file path
   */
  async deleteDocumentsByPath(filePath: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'filePath',
              match: { value: filePath },
            },
          ],
        },
      })

      console.log(`🗑️ Deleted documents for file: ${filePath}`)
    } catch (error) {
      console.error(`❌ Failed to delete documents for ${filePath}:`, error)
      throw error
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async searchSimilar(
    queryVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7
  ): Promise<SearchResult[]> {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      })

      return searchResult.map(result => ({
        id: result.id as string,
        content: result.payload?.content as string,
        metadata: {
          filePath: result.payload?.filePath as string,
          fileName: result.payload?.fileName as string,
          chunkIndex: result.payload?.chunkIndex as number,
          totalChunks: result.payload?.totalChunks as number,
          modified: result.payload?.modified as string,
          size: result.payload?.size as number,
        },
        score: result.score || 0,
      }))
    } catch (error) {
      console.error('❌ Failed to search documents:', error)
      throw error
    }
  }

  /**
   * Get collection info and statistics
   */
  async getCollectionInfo(): Promise<unknown> {
    try {
      return await this.client.getCollection(this.collectionName)
    } catch (error) {
      console.error('❌ Failed to get collection info:', error)
      throw error
    }
  }

  /**
   * Health check for Qdrant connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections()
      return true
    } catch (error) {
      console.error('❌ Qdrant health check failed:', error)
      return false
    }
  }

  /**
   * Count total documents in collection
   */
  async countDocuments(): Promise<number> {
    try {
      const info = await this.getCollectionInfo()
      return info.points_count || 0
    } catch (error) {
      console.error('❌ Failed to count documents:', error)
      return 0
    }
  }
}
