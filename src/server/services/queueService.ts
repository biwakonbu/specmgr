import crypto from 'node:crypto'
import { type Job, Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import { EmbeddingService } from './embeddingService'
import { FileService } from './fileService'
import { ManifestService } from './manifestService'
import { QdrantService } from './qdrantService'

export interface SyncJobData {
  type: 'upsert' | 'delete'
  filePath: string
  relativePath: string
  action: 'add' | 'change' | 'unlink'
}

export interface SyncJobResult {
  success: boolean
  filePath: string
  action: string
  chunksProcessed?: number
  error?: string
}

export class QueueService {
  private syncQueue: Queue<SyncJobData, SyncJobResult>
  private syncWorker: Worker<SyncJobData, SyncJobResult>
  private redis: Redis
  private embeddingService: EmbeddingService
  private qdrantService: QdrantService
  private fileService: FileService
  private manifestService: ManifestService

  constructor(
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
    watchDirectory: string = process.env.WATCH_DIRECTORY || '../../docs'
  ) {
    // Initialize Redis connection
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    // Initialize services
    this.embeddingService = new EmbeddingService()
    this.qdrantService = new QdrantService()
    this.fileService = new FileService(watchDirectory)
    this.manifestService = new ManifestService(watchDirectory)

    // Initialize queue with retry configuration
    this.syncQueue = new Queue<SyncJobData, SyncJobResult>('document-sync', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })

    // Initialize worker
    this.syncWorker = new Worker<SyncJobData, SyncJobResult>(
      'document-sync',
      this.processJob.bind(this),
      {
        connection: this.redis,
        concurrency: 5,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )

    this.setupEventHandlers()
  }

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    try {
      // Test Redis connection
      await this.redis.ping()
      console.log('✅ Redis connection established')

      // Initialize Qdrant collection
      await this.qdrantService.initializeCollection()

      // Test embedding service
      const embeddingHealthy = await this.embeddingService.healthCheck()
      if (!embeddingHealthy) {
        console.warn('⚠️ Embedding service health check failed')
      }

      console.log('🚀 Queue service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize queue service:', error)
      throw error
    }
  }

  /**
   * Add a sync job to the queue
   */
  async addSyncJob(jobData: SyncJobData): Promise<void> {
    try {
      await this.syncQueue.add('sync-document', jobData, {
        jobId: `${jobData.action}-${jobData.filePath}-${Date.now()}`,
      })

      console.log(`📋 Added sync job: ${jobData.action} ${jobData.relativePath}`)
    } catch (error) {
      console.error('❌ Failed to add sync job:', error)
      throw error
    }
  }

  /**
   * Process a sync job
   */
  private async processJob(job: Job<SyncJobData, SyncJobResult>): Promise<SyncJobResult> {
    const { type, filePath, relativePath, action } = job.data

    console.log(`🔄 Processing ${action} job for: ${relativePath}`)

    try {
      if (type === 'delete') {
        // Delete documents from vector database
        await this.qdrantService.deleteDocumentsByPath(filePath)

        // Update manifest to remove deleted file
        await this.manifestService.updateManifestAfterProcessing([], [filePath])

        return {
          success: true,
          filePath,
          action,
          chunksProcessed: 0,
        }
      }

      if (type === 'upsert') {
        // Read file content and stats
        const fileContent = await this.fileService.getFileContent(relativePath)

        // Process file into chunks
        const textChunks = await this.embeddingService.processMarkdownFile(
          filePath,
          fileContent.content,
          {
            modified: fileContent.metadata.lastModified.toISOString(),
            size: fileContent.metadata.size,
          }
        )

        if (textChunks.length === 0) {
          console.log(`⚠️ No content to process for: ${relativePath}`)
          return {
            success: true,
            filePath,
            action,
            chunksProcessed: 0,
          }
        }

        // Generate embeddings
        const embeddingResults = await this.embeddingService.generateEmbeddings(textChunks)

        // Prepare data for Qdrant
        const documentChunks = embeddingResults.map(result => ({
          id: result.id,
          content: result.content,
          metadata: result.metadata,
        }))

        const vectors = embeddingResults.map(result => result.vector)

        // Delete existing documents for this file first
        await this.qdrantService.deleteDocumentsByPath(filePath)

        // Upsert new documents
        await this.qdrantService.upsertDocuments(documentChunks, vectors)

        // Update manifest with processed file
        const manifestEntry = {
          filePath,
          relativePath,
          hash: crypto.createHash('sha1').update(fileContent.content, 'utf8').digest('hex'),
          modified: fileContent.metadata.lastModified.toISOString(),
          size: fileContent.metadata.size,
          lastProcessed: new Date().toISOString(),
        }

        await this.manifestService.updateManifestAfterProcessing([manifestEntry])

        return {
          success: true,
          filePath,
          action,
          chunksProcessed: embeddingResults.length,
        }
      }

      throw new Error(`Unknown job type: ${type}`)
    } catch (error) {
      console.error(`❌ Job failed for ${relativePath}:`, error)

      // Handle rate limiting with exponential backoff
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        throw new Error('Rate limited - will retry with backoff')
      }

      return {
        success: false,
        filePath,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Setup event handlers for queue monitoring
   */
  private setupEventHandlers(): void {
    this.syncWorker.on(
      'completed',
      (job: Job<SyncJobData, SyncJobResult>, result: SyncJobResult) => {
        if (result.success) {
          console.log(
            `✅ Job completed: ${result.action} ${job.data.relativePath} (${result.chunksProcessed || 0} chunks)`
          )
        } else {
          console.log(`❌ Job completed with errors: ${result.action} ${job.data.relativePath}`)
        }
      }
    )

    this.syncWorker.on(
      'failed',
      (job: Job<SyncJobData, SyncJobResult> | undefined, error: Error) => {
        if (job) {
          console.error(`❌ Job failed: ${job.data.relativePath} - ${error.message}`)

          // Log attempt information
          const attemptsMade = job.attemptsMade || 0
          const maxAttempts = job.opts.attempts || 5

          if (attemptsMade >= maxAttempts) {
            console.error(
              `💥 Job permanently failed after ${maxAttempts} attempts: ${job.data.relativePath}`
            )
          } else {
            console.log(
              `🔄 Job will retry (attempt ${attemptsMade + 1}/${maxAttempts}): ${job.data.relativePath}`
            )
          }
        }
      }
    )

    this.syncWorker.on('error', (error: Error) => {
      console.error('❌ Worker error:', error)
    })

    this.syncQueue.on('error', (error: Error) => {
      console.error('❌ Queue error:', error)
    })
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    total: number
  } | null> {
    try {
      const waiting = await this.syncQueue.getWaiting()
      const active = await this.syncQueue.getActive()
      const completed = await this.syncQueue.getCompleted()
      const failed = await this.syncQueue.getFailed()

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      }
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error)
      return null
    }
  }

  /**
   * Health check for queue service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping()
      await this.qdrantService.healthCheck()
      return true
    } catch (error) {
      console.error('❌ Queue service health check failed:', error)
      return false
    }
  }

  /**
   * Perform full synchronization based on manifest diff
   */
  async performFullSync(): Promise<{
    success: boolean
    added: number
    modified: number
    deleted: number
    errors: number
  }> {
    try {
      console.log('🔄 Starting full synchronization...')

      const diff = await this.manifestService.computeDiff()
      let errors = 0

      // Queue jobs for added files
      for (const entry of diff.added) {
        try {
          await this.addSyncJob({
            type: 'upsert',
            filePath: entry.filePath,
            relativePath: entry.relativePath,
            action: 'add',
          })
        } catch (error) {
          console.error(`❌ Failed to queue add job for ${entry.relativePath}:`, error)
          errors++
        }
      }

      // Queue jobs for modified files
      for (const entry of diff.modified) {
        try {
          await this.addSyncJob({
            type: 'upsert',
            filePath: entry.filePath,
            relativePath: entry.relativePath,
            action: 'change',
          })
        } catch (error) {
          console.error(`❌ Failed to queue modify job for ${entry.relativePath}:`, error)
          errors++
        }
      }

      // Queue jobs for deleted files
      for (const filePath of diff.deleted) {
        try {
          await this.addSyncJob({
            type: 'delete',
            filePath,
            relativePath: filePath, // Already relative path
            action: 'unlink',
          })
        } catch (error) {
          console.error(`❌ Failed to queue delete job for ${filePath}:`, error)
          errors++
        }
      }

      console.log(
        `✅ Full sync queued: ${diff.added.length} added, ${diff.modified.length} modified, ${diff.deleted.length} deleted`
      )

      return {
        success: errors === 0,
        added: diff.added.length,
        modified: diff.modified.length,
        deleted: diff.deleted.length,
        errors,
      }
    } catch (error) {
      console.error('❌ Full sync failed:', error)
      return {
        success: false,
        added: 0,
        modified: 0,
        deleted: 0,
        errors: 1,
      }
    }
  }

  /**
   * Get manifest statistics
   */
  async getManifestStats(): Promise<unknown | null> {
    try {
      return await this.manifestService.getManifestStats()
    } catch (error) {
      console.error('❌ Failed to get manifest stats:', error)
      return null
    }
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    try {
      await this.syncWorker.close()
      await this.syncQueue.close()
      await this.redis.disconnect()
      console.log('🛑 Queue service closed successfully')
    } catch (error) {
      console.error('❌ Error closing queue service:', error)
    }
  }
}
