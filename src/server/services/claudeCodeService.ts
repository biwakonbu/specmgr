import { TextSearchService } from './textSearchService'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
  useSearch?: boolean
  maxTokens?: number
  temperature?: number
}

export interface SearchContext {
  query: string
  results: Array<{
    content: string
    filePath: string
    score: number
    highlights: string[]
  }>
  totalResults: number
}

export class ClaudeCodeService {
  private textSearchService: TextSearchService

  constructor(watchDirectory?: string) {
    this.textSearchService = new TextSearchService(watchDirectory)
    this.systemPrompt = `あなたはローカルのMarkdownドキュメントを分析・解説する専門のAIアシスタントです。プロジェクトの仕様書、設計書、APIドキュメントなどにアクセスでき、詳細で正確な回答を提供できます。

回答する際は：
1. 検索結果から得られたコンテキストを活用してください
2. 可能な限り具体的で、ソースドキュメントを参照してください
3. 提供されたコンテキストに情報がない場合は、それを明確に述べてください
4. 役立つ詳細な回答を提供し、ドキュメントの内容に焦点を当ててください
5. 日本語で回答してください（コード例や技術用語は英語でも可）`
  }

  /**
   * Generate streaming chat response with search context
   */
  async *streamChatResponse(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const { message, conversationHistory = [], useSearch = true } = request

    let searchContext: SearchContext | null = null

    // Perform local text search if enabled
    if (useSearch) {
      try {
        const searchResult = await this.textSearchService.search({
          query: message,
          limit: 5,
          scoreThreshold: 0.1,
        })

        if (searchResult.results.length > 0) {
          searchContext = {
            query: message,
            results: searchResult.results.map(result => ({
              content: result.content,
              filePath: result.filePath,
              score: result.score,
              highlights: result.highlights,
            })),
            totalResults: searchResult.totalResults,
          }
        }
      } catch (error) {
        console.error('❌ Text search failed:', error)
        // Continue without search context
      }
    }

    // Build conversation context
    let conversationContext = ''

    if (conversationHistory.length > 0) {
      conversationContext = '\\n\\n過去の会話:\\n'
      conversationHistory.slice(-5).forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}\\n`
      })
    }

    // Build search context
    let contextContent = ''
    if (searchContext && searchContext.results.length > 0) {
      contextContent = `\\n\\n検索結果（ユーザーの質問「${searchContext.query}」に関連）:\\n\\n`

      searchContext.results.forEach((result, index) => {
        contextContent += `--- ドキュメント ${index + 1}: ${result.filePath} (関連度: ${(result.score * 100).toFixed(1)}%) ---\\n`
        contextContent += `内容: ${result.content}\\n`
        if (result.highlights.length > 0) {
          contextContent += `ハイライト: ${result.highlights.join(', ')}\\n`
        }
        contextContent += '\\n'
      })

      contextContent += `\\n上記の検索結果を参考にして、ユーザーの質問「${message}」に回答してください。関連するドキュメントがある場合はファイル名を明記してください。`
    }

    // Generate mock streaming response (Claude Code SDK integration would go here)
    const mockResponse = await this.generateMockResponse(
      message,
      searchContext,
      conversationContext,
      contextContent
    )

    // Simulate streaming by yielding chunks
    const words = mockResponse.split('')
    for (const char of words) {
      yield char
      await new Promise(resolve => setTimeout(resolve, 15)) // Simulate typing delay
    }
  }

  /**
   * Generate a complete chat response (non-streaming)
   */
  async generateChatResponse(request: ChatRequest): Promise<{
    response: string
    searchContext?: SearchContext
  }> {
    let fullResponse = ''
    let searchContext: SearchContext | undefined

    // Collect streaming response
    for await (const chunk of this.streamChatResponse(request)) {
      fullResponse += chunk
    }

    // Get search context if it was used
    if (request.useSearch !== false) {
      try {
        const searchResult = await this.textSearchService.search({
          query: request.message,
          limit: 5,
          scoreThreshold: 0.1,
        })

        if (searchResult.results.length > 0) {
          searchContext = {
            query: request.message,
            results: searchResult.results.map(result => ({
              content: result.content,
              filePath: result.filePath,
              score: result.score,
              highlights: result.highlights,
            })),
            totalResults: searchResult.totalResults,
          }
        }
      } catch (error) {
        console.error('❌ Text search failed:', error)
      }
    }

    return {
      response: fullResponse,
      searchContext,
    }
  }

  /**
   * Generate mock response for development (replace with Claude Code SDK)
   */
  private async generateMockResponse(
    message: string,
    searchContext: SearchContext | null,
    _conversationContext: string,
    _contextContent: string
  ): Promise<string> {
    // This is a mock response - in production, this would use Claude Code SDK
    let response = `ご質問「${message}」についてお答えします。\\n\\n`

    if (searchContext && searchContext.results.length > 0) {
      response += `関連するドキュメントを${searchContext.totalResults}件見つけました：\\n\\n`

      searchContext.results.slice(0, 3).forEach((result, _index) => {
        const fileName = result.filePath.split('/').pop() || result.filePath
        response += `📄 **${fileName}** (関連度: ${(result.score * 100).toFixed(1)}%)\\n`

        if (result.highlights.length > 0) {
          response += `重要なポイント: ${result.highlights.slice(0, 2).join(', ')}\\n`
        }

        // Show a snippet of the content
        const snippet = result.content.substring(0, 200)
        response += `内容の一部: ${snippet}${result.content.length > 200 ? '...' : ''}\\n\\n`
      })

      response += `これらのドキュメントを参考に、より具体的な情報が必要でしたらお知らせください。\\n\\n`
    } else {
      response += `申し訳ございませんが、「${message}」に直接関連するドキュメントが見つかりませんでした。\\n\\n`
      response += `以下のような情報についてお答えできます：\\n`
      response += `- プロジェクトのアーキテクチャや設計\\n`
      response += `- API仕様やエンドポイント\\n`
      response += `- 技術スタックや実装詳細\\n\\n`
      response += `もう少し具体的な質問をしていただければ、より詳しい情報を提供できます。`
    }

    // Add note about Claude Code SDK integration
    response += `\\n\\n---\\n`
    response += `*現在は開発モードで動作しています。実際の本番環境では Claude Code SDK を使用してより高度な回答を生成します。*`

    return response
  }

  /**
   * Health check for Claude Code service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test search service and basic functionality
      const searchHealthy = await this.textSearchService.healthCheck()
      return searchHealthy
    } catch (error) {
      console.error('❌ Claude Code service health check failed:', error)
      return false
    }
  }

  /**
   * Get available models (mock for development)
   */
  async getAvailableModels(): Promise<string[]> {
    // Mock models - in production this would query Claude Code SDK
    return ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus']
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    searchService: {
      totalFiles: number
      isHealthy: boolean
    }
    isHealthy: boolean
  }> {
    try {
      const searchStats = await this.textSearchService.getStats()
      const isHealthy = await this.healthCheck()

      return {
        searchService: searchStats,
        isHealthy,
      }
    } catch (error) {
      console.error('❌ Failed to get service stats:', error)
      return {
        searchService: {
          totalFiles: 0,
          isHealthy: false,
        },
        isHealthy: false,
      }
    }
  }
}
