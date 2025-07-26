import { Router } from 'express'
import { FileService } from '../services/fileService'

const router = Router()
const fileService = new FileService(process.env.WATCH_DIRECTORY || '../../docs')

/**
 * GET /api/files
 * Retrieve all markdown files with metadata
 */
router.get('/', async (req, res) => {
  try {
    const { path: pathFilter, recursive = 'true', sortBy = 'name', order = 'asc' } = req.query

    const options = {
      pathFilter: pathFilter as string,
      recursive: recursive === 'true',
      sortBy: sortBy as 'name' | 'modified' | 'size',
      order: order as 'asc' | 'desc',
    }

    const result = await fileService.getFiles(options)

    res.json({
      success: true,
      data: {
        files: result.files,
        directories: result.directories,
        totalCount: result.files.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in GET /api/files:', error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'FILE_SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Failed to retrieve files',
      },
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * GET /api/files/:path
 * Retrieve specific file content and metadata
 */
router.get('/*', async (req, res) => {
  try {
    // Get the file path from the URL (everything after /api/files/)
    const filePath = (req.params as string[])[0] as string

    if (!filePath) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_PATH',
          message: 'File path is required',
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(filePath)

    const fileContent = await fileService.getFileContent(decodedPath)

    res.json({
      success: true,
      data: fileContent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in GET /api/files/:path:', error)

    let statusCode = 500
    let errorCode = 'FILE_SYSTEM_ERROR'
    let message = 'Failed to retrieve file'

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        statusCode = 404
        errorCode = 'FILE_NOT_FOUND'
        message = 'File does not exist'
      } else if (error.message.includes('Access denied')) {
        statusCode = 403
        errorCode = 'ACCESS_DENIED'
        message = 'Access to file is not allowed'
      } else {
        message = error.message
      }
    }

    res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code: errorCode,
        message,
      },
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
