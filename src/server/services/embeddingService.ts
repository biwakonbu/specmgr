import crypto from 'node:crypto'
import OpenAI from 'openai'

export interface TextChunk {
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

export interface EmbeddingResult {
  id: string
  content: string
  metadata: TextChunk['metadata']
  vector: number[]
}

export class EmbeddingService {
  private openai: OpenAI | null
  private model: string
  private maxTokens: number

  constructor(
    apiKey: string = process.env.OPENAI_API_KEY || '',
    model: string = 'text-embedding-ada-002',
    maxTokens: number = 8191
  ) {
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not found - using mock embeddings for development')
      // Create a mock OpenAI instance for development
      this.openai = null
    } else {
      this.openai = new OpenAI({ apiKey })
    }

    this.model = model
    this.maxTokens = maxTokens
  }

  /**
   * Split text content into chunks that fit within token limits
   */
  splitIntoChunks(content: string, maxChunkSize: number = 2000): string[] {
    const chunks: string[] = []
    const lines = content.split('\n')
    let currentChunk = ''

    for (const line of lines) {
      // If adding this line would exceed the limit, start a new chunk
      if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = line
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    // If no chunks were created (empty content), return an empty array
    return chunks.length > 0 ? chunks : []
  }

  /**
   * Generate a unique ID for a document chunk
   */
  generateChunkId(filePath: string, chunkIndex: number, content: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(`${filePath}:${chunkIndex}:${content.substring(0, 100)}`)
    return hash.digest('hex').substring(0, 16)
  }

  /**
   * Process a markdown file into chunks with metadata
   */
  async processMarkdownFile(
    filePath: string,
    content: string,
    stats: { modified: string; size: number }
  ): Promise<TextChunk[]> {
    const fileName = filePath.split('/').pop() || filePath
    const chunks = this.splitIntoChunks(content)

    if (chunks.length === 0) {
      console.log(`⚠️ No content chunks for file: ${filePath}`)
      return []
    }

    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        filePath,
        fileName,
        chunkIndex: index,
        totalChunks: chunks.length,
        modified: stats.modified,
        size: stats.size,
      },
    }))
  }

  /**
   * Generate mock embedding vector for development
   */
  private generateMockEmbedding(text: string): number[] {
    // Create a deterministic mock embedding based on text content
    const hash = crypto.createHash('md5').update(text).digest('hex')
    const vector = []

    // Generate 1536 dimensions (same as ada-002)
    for (let i = 0; i < 1536; i++) {
      const charCode = hash.charCodeAt(i % hash.length)
      vector.push((charCode / 255 - 0.5) * 2) // Normalize to [-1, 1]
    }

    return vector
  }

  /**
   * Generate embeddings for text chunks in batch
   */
  async generateEmbeddings(textChunks: TextChunk[]): Promise<EmbeddingResult[]> {
    if (textChunks.length === 0) {
      return []
    }

    try {
      // Check if using mock mode
      if (!this.openai) {
        console.log(`🔄 Generating mock embeddings for ${textChunks.length} chunks...`)

        const results: EmbeddingResult[] = textChunks.map((chunk, _index) => {
          const id = this.generateChunkId(
            chunk.metadata.filePath,
            chunk.metadata.chunkIndex,
            chunk.content
          )

          return {
            id,
            content: chunk.content,
            metadata: chunk.metadata,
            vector: this.generateMockEmbedding(chunk.content),
          }
        })

        console.log(`✅ Generated ${results.length} mock embeddings`)
        return results
      }

      // Extract just the content for embedding
      const contents = textChunks.map(chunk => chunk.content)

      console.log(`🔄 Generating embeddings for ${contents.length} chunks...`)

      // Call OpenAI API for batch embedding generation
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: contents,
      })

      // Combine embeddings with original chunk data
      const results: EmbeddingResult[] = textChunks.map((chunk, index) => {
        const embedding = response.data[index]
        const id = this.generateChunkId(
          chunk.metadata.filePath,
          chunk.metadata.chunkIndex,
          chunk.content
        )

        return {
          id,
          content: chunk.content,
          metadata: chunk.metadata,
          vector: embedding.embedding,
        }
      })

      console.log(`✅ Generated ${results.length} embeddings successfully`)
      return results
    } catch (error) {
      console.error('❌ Failed to generate embeddings:', error)
      if (error instanceof Error) {
        // Handle rate limiting
        if (error.message.includes('rate limit')) {
          console.log('⏳ Rate limited, waiting before retry...')
          throw new Error('RATE_LIMITED')
        }
        // Handle other API errors
        if (error.message.includes('API key')) {
          throw new Error('INVALID_API_KEY')
        }
      }
      throw error
    }
  }

  /**
   * Generate embedding for a single query text
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      // Use mock embedding if no API key
      if (!this.openai) {
        return this.generateMockEmbedding(query)
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: query,
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('❌ Failed to generate query embedding:', error)
      throw error
    }
  }

  /**
   * Calculate approximate token count for content
   */
  estimateTokenCount(text: string): number {
    // Rough approximation: 4 characters ≈ 1 token for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Validate if content is within token limits
   */
  isWithinTokenLimit(text: string): boolean {
    return this.estimateTokenCount(text) <= this.maxTokens
  }

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple query
      await this.generateQueryEmbedding('test')
      return true
    } catch (error) {
      console.error('❌ Embedding service health check failed:', error)
      return false
    }
  }
}
