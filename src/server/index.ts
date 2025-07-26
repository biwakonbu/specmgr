import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes placeholder
app.get('/api/files', (req, res) => {
  // Mock file list for now
  res.json({
    files: [
      {
        path: 'docs/README.md',
        name: 'README.md',
        lastModified: new Date().toISOString()
      },
      {
        path: 'docs/getting-started.md',
        name: 'getting-started.md',
        lastModified: new Date().toISOString()
      }
    ]
  })
})

app.post('/api/search', (req, res) => {
  const { query, limit = 10 } = req.body
  
  // Mock search results
  res.json({
    query,
    results: [
      {
        path: 'docs/README.md',
        content: `# Documentation\n\nWelcome to the project documentation that matches "${query}"...`,
        score: 0.95
      }
    ]
  })
})

app.post('/api/chat', (req, res) => {
  const { message } = req.body
  
  // Mock chat response (in production this would be SSE)
  res.json({
    response: `I understand you're asking about "${message}". This is a mock response from the backend server.`
  })
})

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
})