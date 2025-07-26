import path from 'node:path'
import fs from 'fs-extra'
import { glob } from 'glob'

export interface SearchResult {
  filePath: string
  fileName: string
  content: string
  score: number
  highlights: string[]
}

export interface SearchOptions {
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

export class TextSearchService {
  private watchDirectory: string

  constructor(watchDirectory: string = process.env.WATCH_DIRECTORY || '../../docs') {
    this.watchDirectory = path.resolve(watchDirectory)
  }

  /**
   * Perform text-based search across markdown files
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now()
    const { query, limit = 10, scoreThreshold = 0.1, filePath: filePathFilter } = options

    try {
      console.log(`🔍 Performing text search for: "${query}"`)

      // Get all markdown files
      const pattern = path.join(this.watchDirectory, '**/*.md')
      const files = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/.git/**'],
        absolute: true,
      })

      const searchResults: SearchResult[] = []

      // Search through each file
      for (const filePath of files) {
        try {
          // Skip if file path filter is specified and doesn't match
          if (filePathFilter && !filePath.includes(filePathFilter)) {
            continue
          }

          const content = await fs.readFile(filePath, 'utf8')
          const fileName = path.basename(filePath)
          const _relativePath = path.relative(this.watchDirectory, filePath)

          // Calculate search score
          const searchResult = this.searchInContent(query, content, filePath, fileName)

          if (searchResult && searchResult.score >= scoreThreshold) {
            searchResults.push(searchResult)
          }
        } catch (error) {
          console.error(`❌ Failed to search in ${filePath}:`, error)
        }
      }

      // Sort by score descending
      searchResults.sort((a, b) => b.score - a.score)

      // Limit results
      const limitedResults = searchResults.slice(0, limit)

      const processingTime = (Date.now() - startTime) / 1000

      console.log(
        `✅ Text search completed: ${limitedResults.length} results in ${processingTime.toFixed(3)}s`
      )

      return {
        query,
        results: limitedResults,
        totalResults: limitedResults.length,
        processingTime,
        usedVector: false,
      }
    } catch (error) {
      console.error('❌ Text search failed:', error)

      const processingTime = (Date.now() - startTime) / 1000
      return {
        query,
        results: [],
        totalResults: 0,
        processingTime,
        usedVector: false,
      }
    }
  }

  /**
   * Search within file content and calculate relevance score
   */
  private searchInContent(
    query: string,
    content: string,
    filePath: string,
    fileName: string
  ): SearchResult | null {
    const lowerQuery = query.toLowerCase()
    const lowerContent = content.toLowerCase()
    const lowerFileName = fileName.toLowerCase()

    // Calculate different types of matches
    let score = 0
    const highlights: string[] = []

    // Title/filename match (highest weight)
    if (lowerFileName.includes(lowerQuery)) {
      score += 10
      highlights.push(`Filename: ${fileName}`)
    }

    // Exact phrase matches
    const exactMatches = this.countMatches(lowerContent, lowerQuery)
    score += exactMatches * 5

    // Word matches
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2)
    let _wordMatches = 0

    for (const word of queryWords) {
      const matches = this.countMatches(lowerContent, word)
      _wordMatches += matches
      score += matches * 2
    }

    // Extract relevant content snippets
    if (score > 0) {
      const snippets = this.extractSnippets(content, query, 3)
      highlights.push(...snippets)
    }

    // Header matches (medium weight)
    const headerMatches = this.findHeaderMatches(content, lowerQuery)
    score += headerMatches.length * 3
    highlights.push(...headerMatches)

    // Return null if no meaningful matches
    if (score === 0) {
      return null
    }

    // Normalize score (0-1 range)
    const normalizedScore = Math.min(score / 20, 1)

    return {
      filePath,
      fileName,
      content: this.truncateContent(content, 500),
      score: normalizedScore,
      highlights: highlights.slice(0, 5), // Limit highlights
    }
  }

  /**
   * Count occurrences of a substring in text
   */
  private countMatches(text: string, substring: string): number {
    let count = 0
    let position = 0

    while ((position = text.indexOf(substring, position)) !== -1) {
      count++
      position += substring.length
    }

    return count
  }

  /**
   * Extract relevant content snippets around query matches
   */
  private extractSnippets(content: string, query: string, maxSnippets: number = 3): string[] {
    const snippets: string[] = []
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const snippetLength = 150

    let position = 0
    let found = 0

    while (found < maxSnippets && (position = lowerContent.indexOf(lowerQuery, position)) !== -1) {
      const start = Math.max(0, position - snippetLength / 2)
      const end = Math.min(content.length, position + lowerQuery.length + snippetLength / 2)

      let snippet = content.substring(start, end).trim()

      // Add ellipsis if truncated
      if (start > 0) snippet = `...${snippet}`
      if (end < content.length) snippet = `${snippet}...`

      snippets.push(snippet)
      position += lowerQuery.length
      found++
    }

    return snippets
  }

  /**
   * Find matches in markdown headers
   */
  private findHeaderMatches(content: string, query: string): string[] {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm
    const matches: string[] = []
    let match: RegExpExecArray | null

    while ((match = headerRegex.exec(content)) !== null) {
      const headerText = match[2].toLowerCase()
      if (headerText.includes(query)) {
        matches.push(`Header: ${match[2]}`)
      }
    }

    return matches
  }

  /**
   * Truncate content to specified length
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content
    }

    return `${content.substring(0, maxLength - 3)}...`
  }

  /**
   * Get search suggestions based on file content
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (partialQuery.length < 2) {
      return []
    }

    try {
      const pattern = path.join(this.watchDirectory, '**/*.md')
      const files = await glob(pattern, { absolute: true })

      const suggestions = new Set<string>()

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf8')

          // Extract potential suggestions from headers
          const headerRegex = /^(#{1,6})\s+(.+)$/gm
          let match: RegExpExecArray | null

          while ((match = headerRegex.exec(content)) !== null) {
            const headerText = match[2]
            if (headerText.toLowerCase().includes(partialQuery.toLowerCase())) {
              suggestions.add(headerText)
              if (suggestions.size >= limit) break
            }
          }

          if (suggestions.size >= limit) break
        } catch (_error) {
          // Skip files that can't be read
        }
      }

      return Array.from(suggestions).slice(0, limit)
    } catch (error) {
      console.error('❌ Failed to get search suggestions:', error)
      return []
    }
  }

  /**
   * Health check for search service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple search
      const _result = await this.search({ query: 'test', limit: 1 })
      return true
    } catch (error) {
      console.error('❌ Text search service health check failed:', error)
      return false
    }
  }

  /**
   * Get search statistics
   */
  async getStats(): Promise<{
    totalFiles: number
    isHealthy: boolean
  }> {
    try {
      const pattern = path.join(this.watchDirectory, '**/*.md')
      const files = await glob(pattern, { absolute: true })
      const isHealthy = await this.healthCheck()

      return {
        totalFiles: files.length,
        isHealthy,
      }
    } catch (error) {
      console.error('❌ Failed to get search stats:', error)
      return {
        totalFiles: 0,
        isHealthy: false,
      }
    }
  }
}
