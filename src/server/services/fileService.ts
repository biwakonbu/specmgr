import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'fs-extra'
import { glob } from 'glob'

export interface FileMetadata {
  path: string
  name: string
  relativePath: string
  directory: string
  size: number
  lastModified: Date
  created: Date
  hash: string
  lineCount?: number
  wordCount?: number
}

export interface DirectoryInfo {
  path: string
  name: string
  fileCount: number
}

export interface FileContent {
  path: string
  name: string
  content: string
  metadata: FileMetadata
  frontmatter?: Record<string, unknown>
}

export class FileService {
  private watchDirectory: string
  private manifestPath: string

  constructor(watchDirectory: string = './docs') {
    this.watchDirectory = path.resolve(watchDirectory)
    this.manifestPath = path.join(this.watchDirectory, '.specmgr-manifest.json')
  }

  /**
   * Get all Markdown files in the watched directory
   */
  async getFiles(
    options: {
      pathFilter?: string
      recursive?: boolean
      sortBy?: 'name' | 'modified' | 'size'
      order?: 'asc' | 'desc'
    } = {}
  ): Promise<{ files: FileMetadata[]; directories: DirectoryInfo[] }> {
    const { pathFilter = '', recursive = true, sortBy = 'name', order = 'asc' } = options

    try {
      // Ensure watch directory exists
      await fs.ensureDir(this.watchDirectory)

      // Build glob pattern
      const pattern = recursive
        ? path.join(this.watchDirectory, pathFilter, '**/*.md')
        : path.join(this.watchDirectory, pathFilter, '*.md')

      // Find all markdown files
      const filePaths = await glob(pattern, { ignore: ['**/node_modules/**', '**/.git/**'] })

      // Get file metadata
      const files: FileMetadata[] = []
      const directories = new Set<string>()

      for (const filePath of filePaths) {
        try {
          const stats = await fs.stat(filePath)
          const relativePath = path.relative(this.watchDirectory, filePath)
          const directory = path.dirname(relativePath)

          directories.add(directory)

          const content = await fs.readFile(filePath, 'utf-8')
          const hash = crypto.createHash('sha1').update(content).digest('hex')

          const metadata: FileMetadata = {
            path: filePath,
            name: path.basename(filePath),
            relativePath,
            directory: directory === '.' ? '' : directory,
            size: stats.size,
            lastModified: stats.mtime,
            created: stats.birthtime,
            hash,
            lineCount: content.split('\n').length,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
          }

          files.push(metadata)
        } catch (error) {
          console.warn(`Failed to process file ${filePath}:`, error)
        }
      }

      // Sort files
      files.sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'modified':
            comparison = a.lastModified.getTime() - b.lastModified.getTime()
            break
          case 'size':
            comparison = a.size - b.size
            break
        }
        return order === 'desc' ? -comparison : comparison
      })

      // Get directory info
      const directoryInfos: DirectoryInfo[] = []
      for (const dir of directories) {
        if (dir) {
          const dirPath = path.join(this.watchDirectory, dir)
          const dirFiles = files.filter(f => f.directory === dir)
          directoryInfos.push({
            path: dirPath,
            name: path.basename(dir),
            fileCount: dirFiles.length,
          })
        }
      }

      return { files, directories: directoryInfos }
    } catch (error) {
      console.error('Error getting files:', error)
      throw new Error('Failed to retrieve files')
    }
  }

  /**
   * Get content and metadata for a specific file
   */
  async getFileContent(relativePath: string): Promise<FileContent> {
    try {
      const filePath = path.join(this.watchDirectory, relativePath)

      // Security check - ensure file is within watch directory
      const resolvedPath = path.resolve(filePath)
      const resolvedWatchDir = path.resolve(this.watchDirectory)
      if (!resolvedPath.startsWith(resolvedWatchDir)) {
        throw new Error('Access denied: File is outside watch directory')
      }

      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        throw new Error('File not found')
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)

      // Generate hash
      const hash = crypto.createHash('sha1').update(content).digest('hex')

      // Parse frontmatter (basic implementation)
      const frontmatter = this.parseFrontmatter(content)
      const contentWithoutFrontmatter = this.removeFrontmatter(content)

      const metadata: FileMetadata = {
        path: filePath,
        name: path.basename(filePath),
        relativePath,
        directory: path.dirname(relativePath),
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime,
        hash,
        lineCount: content.split('\n').length,
        wordCount: contentWithoutFrontmatter.split(/\s+/).filter(word => word.length > 0).length,
      }

      return {
        path: filePath,
        name: path.basename(filePath),
        content: contentWithoutFrontmatter,
        metadata,
        frontmatter,
      }
    } catch (error) {
      console.error(`Error reading file ${relativePath}:`, error)
      throw error
    }
  }

  /**
   * Get the current manifest (file hash tracking)
   */
  async getManifest(): Promise<Record<string, string>> {
    try {
      if (await fs.pathExists(this.manifestPath)) {
        return await fs.readJson(this.manifestPath)
      }
      return {}
    } catch (error) {
      console.warn('Error reading manifest:', error)
      return {}
    }
  }

  /**
   * Update the manifest with current file hashes
   */
  async updateManifest(fileHashes: Record<string, string>): Promise<void> {
    try {
      await fs.writeJson(this.manifestPath, fileHashes, { spaces: 2 })
    } catch (error) {
      console.error('Error updating manifest:', error)
      throw error
    }
  }

  /**
   * Get files that have changed since last manifest update
   */
  async getChangedFiles(): Promise<{
    added: string[]
    modified: string[]
    deleted: string[]
  }> {
    try {
      const currentManifest = await this.getManifest()
      const { files } = await this.getFiles()

      const currentFiles = new Map<string, string>()
      files.forEach(file => {
        currentFiles.set(file.relativePath, file.hash)
      })

      const added: string[] = []
      const modified: string[] = []
      const deleted: string[] = []

      // Check for added and modified files
      for (const [filePath, hash] of currentFiles) {
        if (!currentManifest[filePath]) {
          added.push(filePath)
        } else if (currentManifest[filePath] !== hash) {
          modified.push(filePath)
        }
      }

      // Check for deleted files
      for (const filePath of Object.keys(currentManifest)) {
        if (!currentFiles.has(filePath)) {
          deleted.push(filePath)
        }
      }

      return { added, modified, deleted }
    } catch (error) {
      console.error('Error getting changed files:', error)
      throw error
    }
  }

  /**
   * Parse frontmatter from markdown content
   */
  private parseFrontmatter(content: string): Record<string, unknown> | undefined {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
    const match = content.match(frontmatterRegex)

    if (!match) return undefined

    try {
      const yamlContent = match[1]
      const frontmatter: Record<string, unknown> = {}

      // Basic YAML parsing (for simple key-value pairs)
      const lines = yamlContent.split('\n')
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim()

          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '')

          // Try to parse as array if it looks like one
          if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
            try {
              frontmatter[key] = JSON.parse(cleanValue)
            } catch {
              frontmatter[key] = cleanValue
            }
          } else {
            frontmatter[key] = cleanValue
          }
        }
      }

      return Object.keys(frontmatter).length > 0 ? frontmatter : undefined
    } catch (error) {
      console.warn('Error parsing frontmatter:', error)
      return undefined
    }
  }

  /**
   * Remove frontmatter from markdown content
   */
  private removeFrontmatter(content: string): string {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
    return content.replace(frontmatterRegex, '')
  }
}
