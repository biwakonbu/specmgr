import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import { ClaudeCodeService } from './services/claudeCodeService'
import { FileWatcher } from './services/fileWatcher'
import { TextSearchService } from './services/textSearchService'

// Load environment variables
dotenv.config()

// Initialize services
const fileWatcher = new FileWatcher(process.env.WATCH_DIRECTORY || '../../docs')
const textSearchService = new TextSearchService(process.env.WATCH_DIRECTORY || '../../docs')
const claudeCodeService = new ClaudeCodeService(process.env.WATCH_DIRECTORY || '../../docs')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development
  })
)
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// Import routes
import filesRouter from './routes/files'

// API routes
app.use('/api/files', filesRouter)

app.post('/api/search', async (req, res) => {
  try {
    const { query, limit = 10, scoreThreshold = 0.1, filePath } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query is required and must be a string',
        },
        timestamp: new Date().toISOString(),
      })
    }

    const searchResult = await textSearchService.search({
      query,
      limit,
      scoreThreshold,
      filePath,
    })

    res.json({
      success: true,
      data: searchResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/search:', error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Search failed',
      },
      timestamp: new Date().toISOString(),
    })
  }
})

// Streaming chat endpoint with SSE
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, conversationHistory, useSearch = true } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message is required and must be a string',
        },
      })
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    // Send initial connection event
    res.write('data: {"type":"connection","status":"connected"}\n\n')

    try {
      // Stream the chat response
      const chatRequest = {
        message,
        conversationHistory,
        useSearch,
      }

      let fullResponse = ''

      for await (const chunk of claudeCodeService.streamChatResponse(chatRequest)) {
        fullResponse += chunk

        // Send each chunk as an SSE event
        const eventData = {
          type: 'chunk',
          content: chunk,
          timestamp: new Date().toISOString(),
        }

        res.write(`data: ${JSON.stringify(eventData)}\n\n`)
      }

      // Send completion event
      const completionEvent = {
        type: 'complete',
        fullResponse,
        timestamp: new Date().toISOString(),
      }

      res.write(`data: ${JSON.stringify(completionEvent)}\n\n`)
      res.write('data: {"type":"done"}\n\n')
    } catch (error) {
      console.error('❌ Chat streaming error:', error)

      const errorEvent = {
        type: 'error',
        error: {
          code: 'CHAT_ERROR',
          message: error instanceof Error ? error.message : 'Chat failed',
        },
        timestamp: new Date().toISOString(),
      }

      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`)
    }

    res.end()
  } catch (error) {
    console.error('❌ Chat endpoint error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
      },
    })
  }
})

// Non-streaming chat endpoint (fallback)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory, useSearch = true } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message is required and must be a string',
        },
        timestamp: new Date().toISOString(),
      })
    }

    const result = await claudeCodeService.generateChatResponse({
      message,
      conversationHistory,
      useSearch,
    })

    res.json({
      success: true,
      data: {
        response: result.response,
        searchContext: result.searchContext,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Chat endpoint error:', error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'CHAT_ERROR',
        message: error instanceof Error ? error.message : 'Chat failed',
      },
      timestamp: new Date().toISOString(),
    })
  }
})

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Set up file watcher event handlers
fileWatcher.on('ready', () => {
  console.log('📁 File watcher initialized and ready')
})

fileWatcher.on('fileChange', async event => {
  console.log(`📄 File ${event.type}: ${event.relativePath}`)
  // In this simplified version, we just log the changes
  // Real-time search index updating could be added here
})

fileWatcher.on('error', error => {
  console.error('❌ File watcher error:', error)
})

// Additional API endpoints
app.get('/api/search/stats', async (_req, res) => {
  try {
    const stats = await textSearchService.getStats()
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    })
  }
})

app.get('/api/health/detailed', async (_req, res) => {
  try {
    const textSearchHealth = await textSearchService.healthCheck()
    const claudeCodeHealth = await claudeCodeService.healthCheck()

    res.json({
      success: true,
      data: {
        textSearch: textSearchHealth,
        claudeCode: claudeCodeHealth,
        overall: textSearchHealth && claudeCodeHealth,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    })
  }
})

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)

  // Initialize services
  try {
    console.log('🔄 Initializing services...')

    // Test text search service
    const searchStats = await textSearchService.getStats()
    console.log(`📊 Text search service ready - ${searchStats.totalFiles} files available`)

    // Test Claude Code service
    const claudeCodeHealthy = await claudeCodeService.healthCheck()
    console.log(`🤖 Claude Code service ${claudeCodeHealthy ? 'ready' : 'unavailable'}`)

    console.log('✅ Services initialized')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
  }

  // Start file watcher
  try {
    await fileWatcher.start()
  } catch (error) {
    console.error('❌ Failed to start file watcher:', error)
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await fileWatcher.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await fileWatcher.stop()
  process.exit(0)
})
