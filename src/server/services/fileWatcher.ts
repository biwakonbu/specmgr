import { EventEmitter } from 'node:events'
import type { Stats } from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'
import { FileService } from './fileService'

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink'
  path: string
  relativePath: string
  stats?: Stats
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null
  private watchDirectory: string
  private fileService: FileService
  private isWatching = false

  constructor(watchDirectory: string = './docs') {
    super()
    this.watchDirectory = path.resolve(watchDirectory)
    this.fileService = new FileService(watchDirectory)
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      console.warn('File watcher is already running')
      return
    }

    try {
      // Ensure watch directory exists
      const fs = await import('fs-extra')
      await fs.ensureDir(this.watchDirectory)

      console.log(`Starting file watcher for: ${this.watchDirectory}`)

      this.watcher = chokidar.watch('**/*.md', {
        cwd: this.watchDirectory,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.specmgr-manifest.json',
          '**/.*', // Ignore hidden files
        ],
        persistent: true,
        ignoreInitial: false, // Emit add events for existing files
        followSymlinks: false,
        atomic: true, // Ensure atomic file operations
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s for file to stabilize
          pollInterval: 100,
        },
      })

      // Set up event handlers
      this.watcher
        .on('add', (filePath, stats) => {
          this.handleFileChange('add', filePath, stats)
        })
        .on('change', (filePath, stats) => {
          this.handleFileChange('change', filePath, stats)
        })
        .on('unlink', filePath => {
          this.handleFileChange('unlink', filePath)
        })
        .on('error', error => {
          console.error('File watcher error:', error)
          this.emit('error', error)
        })
        .on('ready', () => {
          console.log('File watcher ready - monitoring for changes')
          this.isWatching = true
          this.emit('ready')
        })

      // Initial scan and manifest update
      setTimeout(async () => {
        await this.performInitialSync()
      }, 1000)
    } catch (error) {
      console.error('Failed to start file watcher:', error)
      throw error
    }
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
      this.isWatching = false
      console.log('File watcher stopped')
      this.emit('stopped')
    }
  }

  /**
   * Check if watcher is currently running
   */
  isRunning(): boolean {
    return this.isWatching
  }

  /**
   * Get current watch directory
   */
  getWatchDirectory(): string {
    return this.watchDirectory
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(
    type: 'add' | 'change' | 'unlink',
    filePath: string,
    stats?: Stats
  ): Promise<void> {
    try {
      const absolutePath = path.join(this.watchDirectory, filePath)
      const relativePath = filePath

      console.log(`File ${type}: ${relativePath}`)

      const event: FileChangeEvent = {
        type,
        path: absolutePath,
        relativePath,
        stats,
      }

      // Emit the change event
      this.emit('fileChange', event)

      // Update manifest if needed
      await this.updateManifestForChange(event)

      // Emit specific event types
      switch (type) {
        case 'add':
          this.emit('fileAdded', event)
          break
        case 'change':
          this.emit('fileModified', event)
          break
        case 'unlink':
          this.emit('fileDeleted', event)
          break
      }
    } catch (error) {
      console.error(`Error handling file change for ${filePath}:`, error)
      this.emit('error', error)
    }
  }

  /**
   * Update manifest when files change
   */
  private async updateManifestForChange(event: FileChangeEvent): Promise<void> {
    try {
      const manifest = await this.fileService.getManifest()

      switch (event.type) {
        case 'add':
        case 'change': {
          // Read file and update hash
          const fileContent = await this.fileService.getFileContent(event.relativePath)
          manifest[event.relativePath] = fileContent.metadata.hash
          break
        }

        case 'unlink':
          // Remove from manifest
          delete manifest[event.relativePath]
          break
      }

      await this.fileService.updateManifest(manifest)
      console.log(`Manifest updated for ${event.type}: ${event.relativePath}`)
    } catch (error) {
      console.error('Error updating manifest:', error)
    }
  }

  /**
   * Perform initial synchronization of all files
   */
  private async performInitialSync(): Promise<void> {
    try {
      console.log('Performing initial file synchronization...')

      const { added, modified, deleted } = await this.fileService.getChangedFiles()

      console.log(`Initial sync results:
        - Added: ${added.length} files
        - Modified: ${modified.length} files  
        - Deleted: ${deleted.length} files`)

      // Update manifest with current state
      const { files } = await this.fileService.getFiles()
      const newManifest: Record<string, string> = {}

      for (const file of files) {
        newManifest[file.relativePath] = file.hash
      }

      await this.fileService.updateManifest(newManifest)

      // Emit sync completed event
      this.emit('syncCompleted', { added, modified, deleted })
    } catch (error) {
      console.error('Error during initial sync:', error)
      this.emit('error', error)
    }
  }

  /**
   * Manually trigger a full resync
   */
  async resync(): Promise<void> {
    console.log('Manual resync triggered')
    await this.performInitialSync()
  }

  /**
   * Get statistics about watched files
   */
  async getStats(): Promise<{
    totalFiles: number
    watchDirectory: string
    isWatching: boolean
    lastSync?: Date
  }> {
    const { files } = await this.fileService.getFiles()

    return {
      totalFiles: files.length,
      watchDirectory: this.watchDirectory,
      isWatching: this.isWatching,
      lastSync: new Date(), // In a real implementation, track actual last sync time
    }
  }
}
