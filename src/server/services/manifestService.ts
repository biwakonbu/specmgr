import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'fs-extra'

export interface FileManifestEntry {
  filePath: string
  relativePath: string
  hash: string
  modified: string
  size: number
  lastProcessed: string
}

export interface ManifestData {
  version: string
  lastUpdated: string
  files: Record<string, FileManifestEntry>
  totalFiles: number
}

export interface ManifestDiff {
  added: FileManifestEntry[]
  modified: FileManifestEntry[]
  deleted: string[] // file paths
  unchanged: FileManifestEntry[]
}

export class ManifestService {
  private manifestPath: string
  private watchDirectory: string

  constructor(
    watchDirectory: string = process.env.WATCH_DIRECTORY || '../../docs',
    manifestFileName: string = '.specmgr-manifest.json'
  ) {
    this.watchDirectory = path.resolve(watchDirectory)
    this.manifestPath = path.join(this.watchDirectory, manifestFileName)
  }

  /**
   * Generate SHA-1 hash for file content
   */
  private async generateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return crypto.createHash('sha1').update(content, 'utf8').digest('hex')
    } catch (error) {
      console.error(`❌ Failed to generate hash for ${filePath}:`, error)
      throw error
    }
  }

  /**
   * Create manifest entry for a file
   */
  private async createManifestEntry(filePath: string): Promise<FileManifestEntry> {
    const stats = await fs.stat(filePath)
    const hash = await this.generateFileHash(filePath)
    const relativePath = path.relative(this.watchDirectory, filePath)

    return {
      filePath,
      relativePath,
      hash,
      modified: stats.mtime.toISOString(),
      size: stats.size,
      lastProcessed: new Date().toISOString(),
    }
  }

  /**
   * Load existing manifest from disk
   */
  async loadManifest(): Promise<ManifestData> {
    try {
      if (await fs.pathExists(this.manifestPath)) {
        const content = await fs.readFile(this.manifestPath, 'utf8')
        const manifest = JSON.parse(content) as ManifestData

        // Validate manifest structure
        if (!manifest.version || !manifest.files) {
          throw new Error('Invalid manifest format')
        }

        console.log(`📋 Loaded manifest with ${manifest.totalFiles} files`)
        return manifest
      }
    } catch (error) {
      console.warn('⚠️ Failed to load existing manifest:', error)
    }

    // Return empty manifest if none exists or loading failed
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      files: {},
      totalFiles: 0,
    }
  }

  /**
   * Save manifest to disk
   */
  async saveManifest(manifest: ManifestData): Promise<void> {
    try {
      manifest.lastUpdated = new Date().toISOString()
      manifest.totalFiles = Object.keys(manifest.files).length

      // Ensure the directory exists
      await fs.ensureDir(path.dirname(this.manifestPath))

      // Write manifest with proper formatting
      await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

      console.log(`💾 Saved manifest with ${manifest.totalFiles} files`)
    } catch (error) {
      console.error('❌ Failed to save manifest:', error)
      throw error
    }
  }

  /**
   * Scan directory and create current state manifest
   */
  async scanCurrentState(): Promise<ManifestData> {
    const glob = await import('glob')
    const markdownPattern = path.join(this.watchDirectory, '**/*.md')

    try {
      const files = await glob.glob(markdownPattern, {
        ignore: ['**/node_modules/**', '**/.git/**'],
        absolute: true,
      })

      const manifest: ManifestData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files: {},
        totalFiles: 0,
      }

      // Process files in parallel with concurrency limit
      const concurrency = 5
      const chunks = []
      for (let i = 0; i < files.length; i += concurrency) {
        chunks.push(files.slice(i, i + concurrency))
      }

      for (const chunk of chunks) {
        const entries = await Promise.all(
          chunk.map(async filePath => {
            try {
              return await this.createManifestEntry(filePath)
            } catch (error) {
              console.error(`❌ Failed to process ${filePath}:`, error)
              return null
            }
          })
        )

        // Add valid entries to manifest
        entries.forEach(entry => {
          if (entry) {
            manifest.files[entry.filePath] = entry
          }
        })
      }

      manifest.totalFiles = Object.keys(manifest.files).length
      console.log(`🔍 Scanned ${manifest.totalFiles} markdown files`)

      return manifest
    } catch (error) {
      console.error('❌ Failed to scan current state:', error)
      throw error
    }
  }

  /**
   * Compare current state with saved manifest to find differences
   */
  async computeDiff(): Promise<ManifestDiff> {
    const [currentManifest, savedManifest] = await Promise.all([
      this.scanCurrentState(),
      this.loadManifest(),
    ])

    const diff: ManifestDiff = {
      added: [],
      modified: [],
      deleted: [],
      unchanged: [],
    }

    const currentFiles = new Set(Object.keys(currentManifest.files))
    const savedFiles = new Set(Object.keys(savedManifest.files))

    // Find added and modified files
    for (const filePath of currentFiles) {
      const currentEntry = currentManifest.files[filePath]
      const savedEntry = savedManifest.files[filePath]

      if (!savedEntry) {
        // New file
        diff.added.push(currentEntry)
      } else if (savedEntry.hash !== currentEntry.hash) {
        // Modified file (content changed)
        diff.modified.push(currentEntry)
      } else {
        // Unchanged file
        diff.unchanged.push(currentEntry)
      }
    }

    // Find deleted files
    for (const filePath of savedFiles) {
      if (!currentFiles.has(filePath)) {
        diff.deleted.push(filePath)
      }
    }

    console.log(
      `📊 Manifest diff: ${diff.added.length} added, ${diff.modified.length} modified, ${diff.deleted.length} deleted`
    )

    return diff
  }

  /**
   * Update manifest after successful processing
   */
  async updateManifestAfterProcessing(
    entries: FileManifestEntry[],
    deleteFilePaths: string[] = []
  ): Promise<void> {
    try {
      const manifest = await this.loadManifest()

      // Add or update processed entries
      entries.forEach(entry => {
        manifest.files[entry.filePath] = {
          ...entry,
          lastProcessed: new Date().toISOString(),
        }
      })

      // Remove deleted files
      deleteFilePaths.forEach(filePath => {
        delete manifest.files[filePath]
      })

      await this.saveManifest(manifest)
    } catch (error) {
      console.error('❌ Failed to update manifest after processing:', error)
      throw error
    }
  }

  /**
   * Get manifest statistics
   */
  async getManifestStats(): Promise<{
    totalFiles: number
    lastUpdated: string
    oldestProcessed: string | null
    newestProcessed: string | null
    manifestExists: boolean
  }> {
    try {
      const manifest = await this.loadManifest()
      const manifestExists = await fs.pathExists(this.manifestPath)

      const processedTimes = Object.values(manifest.files)
        .map(entry => entry.lastProcessed)
        .filter(Boolean)
        .sort()

      return {
        totalFiles: manifest.totalFiles,
        lastUpdated: manifest.lastUpdated,
        oldestProcessed: processedTimes[0] || null,
        newestProcessed: processedTimes[processedTimes.length - 1] || null,
        manifestExists,
      }
    } catch (error) {
      console.error('❌ Failed to get manifest stats:', error)
      return {
        totalFiles: 0,
        lastUpdated: new Date().toISOString(),
        oldestProcessed: null,
        newestProcessed: null,
        manifestExists: false,
      }
    }
  }

  /**
   * Reset manifest (delete it)
   */
  async resetManifest(): Promise<void> {
    try {
      if (await fs.pathExists(this.manifestPath)) {
        await fs.remove(this.manifestPath)
        console.log('🗑️ Manifest reset successfully')
      }
    } catch (error) {
      console.error('❌ Failed to reset manifest:', error)
      throw error
    }
  }

  /**
   * Check if a specific file needs processing based on manifest
   */
  async needsProcessing(filePath: string): Promise<boolean> {
    try {
      const manifest = await this.loadManifest()
      const entry = manifest.files[filePath]

      if (!entry) {
        // File not in manifest, needs processing
        return true
      }

      // Check if file has been modified since last processing
      const _stats = await fs.stat(filePath)
      const currentHash = await this.generateFileHash(filePath)

      return currentHash !== entry.hash
    } catch (error) {
      console.error(`❌ Failed to check processing status for ${filePath}:`, error)
      // If we can't determine, assume it needs processing
      return true
    }
  }
}
