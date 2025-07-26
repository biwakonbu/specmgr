import OpenAI from 'openai'
import { SearchService } from './searchService'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
  useRAG?: boolean
  maxTokens?: number
  temperature?: number
}

export interface RAGContext {
  query: string
  results: Array<{
    content: string
    filePath: string
    score: number
  }>
  totalResults: number
}

export class ChatService {
  private openai: OpenAI | null
  private searchService: SearchService
  private model: string
  private systemPrompt: string

  constructor(
    apiKey: string = process.env.OPENAI_API_KEY || '',
    model: string = 'gpt-4-turbo-preview'
  ) {
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not found - using mock chat responses for development')
      this.openai = null
    } else {
      this.openai = new OpenAI({ apiKey })
    }

    this.searchService = new SearchService()
    this.model = model
    this.systemPrompt = `You are a helpful AI assistant specialized in analyzing and discussing documentation. You have access to a knowledge base of Markdown documents and can provide detailed, accurate responses based on the available content.

When answering questions:
1. Use the provided context from the document search when relevant
2. Be specific and reference the source documents when possible
3. If information isn't available in the provided context, clearly state that
4. Provide helpful, detailed responses while staying focused on the documentation content
5. Use Japanese for responses, but code examples and technical terms can remain in English`
  }

  /**
   * Generate mock streaming response for development
   */
  private async *generateMockStreamResponse(
    message: string
  ): AsyncGenerator<string, void, unknown> {
    const mockResponse = `こんにちは！「${message}」についてお答えします。

現在、開発モードで動作しており、OpenAI APIキーが設定されていないため、モックレスポンスを返しています。

実際のRAG機能を使用するには、.envファイルにOPENAI_API_KEYを設定してください。

設定可能な機能：
- ベクトル検索によるドキュメント検索
- リアルタイムストリーミングチャット
- コンテキストに基づく回答生成

ご質問ありがとうございます！`

    // Simulate streaming by yielding chunks
    const words = mockResponse.split('')
    for (const char of words) {
      yield char
      await new Promise(resolve => setTimeout(resolve, 20)) // Simulate typing delay
    }
  }

  /**
   * Generate streaming chat response with optional RAG context
   */
  async *streamChatResponse(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const {
      message,
      conversationHistory = [],
      useRAG = true,
      maxTokens = 2048,
      temperature = 0.7,
    } = request

    // Use mock response if no OpenAI API key
    if (!this.openai) {
      yield* this.generateMockStreamResponse(message)
      return
    }

    let ragContext: RAGContext | null = null

    // Perform RAG search if enabled
    if (useRAG) {
      try {
        const searchResult = await this.searchService.vectorSearch({
          query: message,
          limit: 5,
          scoreThreshold: 0.6,
        })

        if (searchResult.results.length > 0) {
          ragContext = {
            query: message,
            results: searchResult.results.map(result => ({
              content: result.content,
              filePath: result.metadata.filePath,
              score: result.score,
            })),
            totalResults: searchResult.totalResults,
          }
        }
      } catch (error) {
        console.error('❌ RAG search failed:', error)
        // Continue without RAG context
      }
    }

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
    ]

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    // Add RAG context if available
    if (ragContext && ragContext.results.length > 0) {
      const contextContent = ragContext.results
        .map(
          result =>
            `Source: ${result.filePath}\nContent: ${result.content}\nRelevance Score: ${result.score.toFixed(3)}`
        )
        .join('\n\n---\n\n')

      messages.push({
        role: 'system',
        content: `Based on the user's question "${ragContext.query}", here is relevant context from the documentation:\n\n${contextContent}\n\nPlease use this context to provide an accurate and helpful response. Reference the source files when appropriate.`,
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    try {
      // Create streaming completion
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      })

      // Stream response tokens
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          yield delta.content
        }
      }
    } catch (error) {
      console.error('❌ OpenAI streaming failed:', error)

      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          yield 'エラー: APIレート制限に達しました。しばらく待ってから再試行してください。'
        } else if (error.message.includes('API key')) {
          yield 'エラー: OpenAI APIキーが無効です。設定を確認してください。'
        } else {
          yield `エラー: チャット応答の生成に失敗しました。${error.message}`
        }
      } else {
        yield 'エラー: 不明なエラーが発生しました。'
      }
    }
  }

  /**
   * Generate a single chat response (non-streaming)
   */
  async generateChatResponse(request: ChatRequest): Promise<{
    response: string
    ragContext?: RAGContext
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }> {
    const {
      message,
      conversationHistory = [],
      useRAG = true,
      maxTokens = 2048,
      temperature = 0.7,
    } = request

    // Use mock response if no OpenAI API key
    if (!this.openai) {
      let mockResponse = ''
      for await (const chunk of this.generateMockStreamResponse(message)) {
        mockResponse += chunk
      }
      return {
        response: mockResponse,
      }
    }

    let ragContext: RAGContext | null = null

    // Perform RAG search if enabled
    if (useRAG) {
      try {
        const searchResult = await this.searchService.vectorSearch({
          query: message,
          limit: 5,
          scoreThreshold: 0.6,
        })

        if (searchResult.results.length > 0) {
          ragContext = {
            query: message,
            results: searchResult.results.map(result => ({
              content: result.content,
              filePath: result.metadata.filePath,
              score: result.score,
            })),
            totalResults: searchResult.totalResults,
          }
        }
      } catch (error) {
        console.error('❌ RAG search failed:', error)
      }
    }

    // Build messages array (same logic as streaming)
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
    ]

    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    })

    if (ragContext && ragContext.results.length > 0) {
      const contextContent = ragContext.results
        .map(
          result =>
            `Source: ${result.filePath}\nContent: ${result.content}\nRelevance Score: ${result.score.toFixed(3)}`
        )
        .join('\n\n---\n\n')

      messages.push({
        role: 'system',
        content: `Based on the user's question "${ragContext.query}", here is relevant context from the documentation:\n\n${contextContent}\n\nPlease use this context to provide an accurate and helpful response. Reference the source files when appropriate.`,
      })
    }

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature,
      })

      const response =
        completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。'

      return {
        response,
        ragContext: ragContext || undefined,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      }
    } catch (error) {
      console.error('❌ OpenAI completion failed:', error)

      let errorMessage = 'チャット応答の生成に失敗しました。'
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          errorMessage = 'APIレート制限に達しました。しばらく待ってから再試行してください。'
        } else if (error.message.includes('API key')) {
          errorMessage = 'OpenAI APIキーが無効です。設定を確認してください。'
        }
      }

      return {
        response: errorMessage,
        ragContext: ragContext || undefined,
      }
    }
  }

  /**
   * Health check for chat service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Always return true for mock mode
      if (!this.openai) {
        return true
      }

      // Test with a simple completion
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      })

      return !!response.choices[0]?.message?.content
    } catch (error) {
      console.error('❌ Chat service health check failed:', error)
      return false
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      // Return mock models if no API key
      if (!this.openai) {
        return ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo']
      }

      const models = await this.openai.models.list()
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort()
    } catch (error) {
      console.error('❌ Failed to get available models:', error)
      return []
    }
  }
}
