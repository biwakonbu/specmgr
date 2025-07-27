import { Bot, Send, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { apiClient, type SearchResponse } from '../services/api'

// React Markdown component props type - using any to avoid complex type definitions
// biome-ignore lint/suspicious/noExplicitAny: React Markdown component types are complex
type MarkdownComponentProps = any

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchResults?: SearchResponse
}

type ChatPaneProps = Record<string, never>

export function ChatPane(_props: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'こんにちは！私はあなたのドキュメンテーションのアシスタントです。プロジェクトのアーキテクチャ、API、技術仕様について何でもお尋ねください。\n\n## 使用方法\n\n**検索モード**: `/search`で始めるとドキュメント検索を実行\n**チャットモード**: 通常のメッセージでAI対話\n\n### 例\n\n```bash\n/search API仕様\n```\n\n`TypeScript`のコードスニペットやドキュメントの**マークダウン装飾**が正しく表示されます。',
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement =
        scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') ||
        scrollAreaRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [])

  const createUserMessage = (content: string): Message => ({
    id: Date.now().toString(),
    role: 'user',
    content: content.trim(),
    timestamp: new Date(),
  })

  const createAssistantMessage = (): Message => ({
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    timestamp: new Date(),
  })

  const sendChatRequest = async (userMessage: Message) => {
    const response = await fetch('http://localhost:3000/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        conversationHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        })),
        useRAG: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  }

  // ストリームデータの種別に応じた処理を実行
  const processChunkData = (content: string, assistantMessageId: string): void => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg
      )
    )
  }

  // ストリーム完了時の処理
  const processCompleteData = (): void => {
    console.log('Chat streaming completed')
  }

  // エラーデータの処理
  const processErrorData = (error?: { message: string }): never => {
    throw new Error(error?.message || 'Unknown error')
  }

  // ストリームデータの処理を種別ごとに振り分け
  const processStreamData = (
    data: { type: string; content?: string; error?: { message: string } },
    assistantMessageId: string
  ): boolean => {
    switch (data.type) {
      case 'chunk':
        if (data.content) {
          processChunkData(data.content, assistantMessageId)
        }
        return false
      case 'complete':
        processCompleteData()
        return false
      case 'error':
        processErrorData(data.error)
        return false
      case 'done':
        return true
      default:
        console.warn(`Unknown stream data type: ${data.type}`)
        return false
    }
  }

  // SSE行の解析と処理
  const processSSELine = (line: string, assistantMessageId: string): boolean => {
    if (!line.startsWith('data: ')) {
      return false
    }

    try {
      const data = JSON.parse(line.slice(6))
      return processStreamData(data, assistantMessageId)
    } catch (parseError) {
      console.error('Failed to parse SSE data:', parseError)
      return false
    }
  }

  // ストリームバッファの処理
  const processStreamBuffer = (
    buffer: string,
    assistantMessageId: string
  ): { remainingBuffer: string; shouldStop: boolean } => {
    const lines = buffer.split('\n')
    const remainingBuffer = lines.pop() || ''

    for (const line of lines) {
      const shouldStop = processSSELine(line, assistantMessageId)
      if (shouldStop) {
        return { remainingBuffer, shouldStop: true }
      }
    }

    return { remainingBuffer, shouldStop: false }
  }

  // ストリームリーダーの初期化
  const initializeStreamReader = (response: Response): ReadableStreamDefaultReader<Uint8Array> => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }
    return reader
  }

  // ストリームデータの読み取りとバッファ処理
  const processStreamChunk = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    buffer: string,
    assistantMessageId: string
  ): Promise<{ buffer: string; shouldStop: boolean }> => {
    const { done, value } = await reader.read()
    if (done) {
      return { buffer, shouldStop: true }
    }

    const newBuffer = buffer + decoder.decode(value, { stream: true })
    const { remainingBuffer, shouldStop } = processStreamBuffer(newBuffer, assistantMessageId)

    return { buffer: remainingBuffer, shouldStop }
  }

  // ストリームレスポンスの読み取りとメッセージ更新を処理
  const handleStreamResponse = async (
    response: Response,
    assistantMessageId: string
  ): Promise<void> => {
    const reader = initializeStreamReader(response)
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { buffer: newBuffer, shouldStop } = await processStreamChunk(
          reader,
          decoder,
          buffer,
          assistantMessageId
        )
        buffer = newBuffer

        if (shouldStop) {
          break
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // 検索結果を表示用の文字列に変換
  const formatSearchResults = (searchResponse: SearchResponse, _query: string): string => {
    if (searchResponse.results.length === 0) {
      return '関連するドキュメントが見つかりませんでした。別のキーワードで検索してみてください。'
    }

    return searchResponse.results
      .map((result, index) => {
        const snippet =
          result.content.length > 200 ? `${result.content.substring(0, 200)}...` : result.content
        return `**${index + 1}. ${result.metadata.fileName}** (スコア: ${result.score.toFixed(3)})\n${snippet}`
      })
      .join('\n\n')
  }

  // 検索成功時のメッセージを作成
  const createSearchSuccessMessage = (searchResponse: SearchResponse, query: string): Message => {
    const resultsText = formatSearchResults(searchResponse, query)
    const headerText = `**検索結果**: "${query}"\n\n見つかった結果: ${searchResponse.totalResults}件 (処理時間: ${searchResponse.processingTime.toFixed(3)}秒)\n\n`

    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: headerText + resultsText,
      timestamp: new Date(),
      searchResults: searchResponse,
    }
  }

  // 検索エラー時のメッセージを作成
  const createSearchErrorMessage = (error: unknown): Message => {
    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `検索エラー: ${error instanceof Error ? error.message : '検索に失敗しました。'}`,
      timestamp: new Date(),
    }
  }

  const handleSearchRequest = async (query: string) => {
    try {
      const searchResponse = await apiClient.searchDocuments(query, {
        limit: 10,
        scoreThreshold: 0.3,
      })

      const assistantMessage = createSearchSuccessMessage(searchResponse, query)
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Search failed:', error)
      const errorMessage = createSearchErrorMessage(error)
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // 検索コマンドかどうかを判定
  const isSearchCommand = (input: string): boolean => {
    return input.trim().startsWith('/search ')
  }

  // 検索クエリを抽出
  const extractSearchQuery = (input: string): string => {
    return input.trim().substring(8).trim()
  }

  // 検索コマンドの実行
  const executeSearchCommand = async (query: string): Promise<void> => {
    if (query) {
      await handleSearchRequest(query)
    } else {
      const errorMessage = createAssistantMessage()
      errorMessage.content = '検索クエリを入力してください。例: /search API仕様'
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // 通常のチャット処理
  const executeChatRequest = async (userMessage: Message): Promise<void> => {
    const assistantMessage = createAssistantMessage()
    setMessages(prev => [...prev, assistantMessage])

    const response = await sendChatRequest(userMessage)
    await handleStreamResponse(response, assistantMessage.id)
  }

  // エラー処理でメッセージを更新
  const handleMessageError = (error: unknown): void => {
    console.error('Request failed:', error)
    const errorContent = `エラー: ${error instanceof Error ? error.message : 'リクエストに失敗しました。'}`

    setMessages(prev =>
      prev.map(msg =>
        msg.id === prev[prev.length - 1]?.id ? { ...msg, content: errorContent } : msg
      )
    )
  }

  // UIの状態を更新してメッセージを追加
  const updateUIForNewMessage = (userMessage: Message): void => {
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
  }

  // メッセージの種類に応じた処理を実行
  const processMessageByType = async (
    currentInput: string,
    userMessage: Message
  ): Promise<void> => {
    if (isSearchCommand(currentInput)) {
      const query = extractSearchQuery(currentInput)
      await executeSearchCommand(query)
    } else {
      await executeChatRequest(userMessage)
    }
  }

  // メッセージ送信のメイン処理
  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = createUserMessage(inputValue)
    const currentInput = inputValue

    // UIの即座更新
    updateUIForNewMessage(userMessage)

    try {
      await processMessageByType(currentInput, userMessage)
    } catch (error) {
      handleMessageError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Assistant
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Ask questions about your documentation
        </p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header with Avatar and Role */}
              <div
                className={`flex items-center gap-2 mb-1 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <span className="text-[11px] font-medium text-foreground/80">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div
                className={`w-full max-w-[98%] rounded-xl px-3 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-foreground border border-border/50'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert text-[12px]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({ children, ...props }: MarkdownComponentProps) => (
                        <h1
                          className="text-[14px] font-bold tracking-tight mb-1.5 mt-0 text-foreground border-b border-border/30 pb-0.5"
                          {...props}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }: MarkdownComponentProps) => (
                        <h2
                          className="text-[13px] font-semibold tracking-tight mb-1.5 mt-2 text-foreground"
                          {...props}
                        >
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }: MarkdownComponentProps) => (
                        <h3
                          className="text-[12px] font-medium tracking-tight mb-1 mt-1.5 text-foreground"
                          {...props}
                        >
                          {children}
                        </h3>
                      ),
                      p: ({ children, ...props }: MarkdownComponentProps) => (
                        <p
                          className="text-[12px] leading-relaxed mb-1.5 text-foreground"
                          {...props}
                        >
                          {children}
                        </p>
                      ),
                      ul: ({ children, ...props }: MarkdownComponentProps) => (
                        <ul
                          className="my-1.5 ml-3 list-disc text-[12px] [&>li]:mt-0.5 [&>li]:leading-relaxed"
                          {...props}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }: MarkdownComponentProps) => (
                        <ol
                          className="my-1.5 ml-3 list-decimal text-[12px] [&>li]:mt-0.5 [&>li]:leading-relaxed"
                          {...props}
                        >
                          {children}
                        </ol>
                      ),
                      blockquote: ({ children, ...props }: MarkdownComponentProps) => (
                        <blockquote
                          className="mt-1.5 mb-1.5 border-l-2 border-border/50 pl-2 italic text-muted-foreground text-[12px]"
                          {...props}
                        >
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className, ...props }: MarkdownComponentProps) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code
                              className="relative rounded bg-muted/70 px-1 py-0.5 font-mono text-[12px] font-medium"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children, ...props }: MarkdownComponentProps) => (
                        <pre
                          className="mb-1.5 mt-1.5 overflow-x-auto rounded bg-muted/70 p-1.5 text-[12px] leading-tight"
                          {...props}
                        >
                          {children}
                        </pre>
                      ),
                      strong: ({ children, ...props }: MarkdownComponentProps) => (
                        <strong className="font-semibold text-foreground" {...props}>
                          {children}
                        </strong>
                      ),
                      em: ({ children, ...props }: MarkdownComponentProps) => (
                        <em className="italic text-foreground" {...props}>
                          {children}
                        </em>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              {/* Loading Header */}
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-foreground/80">AI Assistant</span>
              </div>

              {/* Loading Content */}
              <div className="w-full max-w-[98%] rounded-xl px-3 py-3 bg-muted/50 text-foreground border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                  </div>
                  <span className="text-[11px] opacity-70">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="/search で検索、または質問を入力..."
            disabled={isLoading}
            className="flex-1 h-8 text-[12px] px-2 py-1 placeholder:text-[11px]"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="h-8 w-8 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
