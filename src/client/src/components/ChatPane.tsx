import { Bot, Send, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import remarkMermaid from 'remark-mermaidjs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { apiClient, type SearchResponse } from '../services/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchResults?: SearchResponse
}

type ChatPaneProps = {}

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
  }, [messages])

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

  const processStreamData = (
    data: { type: string; content?: string; error?: { message: string } },
    assistantMessageId: string
  ) => {
    if (data.type === 'chunk') {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: msg.content + data.content } : msg
        )
      )
    } else if (data.type === 'complete') {
      console.log('Chat streaming completed')
    } else if (data.type === 'error') {
      throw new Error(data.error?.message || 'Unknown error')
    }
    return data.type === 'done'
  }

  const handleStreamResponse = async (response: Response, assistantMessageId: string) => {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            const isDone = processStreamData(data, assistantMessageId)
            if (isDone) return
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError)
          }
        }
      }
    }
  }

  const handleSearchRequest = async (query: string) => {
    try {
      const searchResponse = await apiClient.searchDocuments(query, {
        limit: 10,
        scoreThreshold: 0.3,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**検索結果**: "${query}"\n\n見つかった結果: ${searchResponse.totalResults}件 (処理時間: ${searchResponse.processingTime.toFixed(3)}秒)\n\n${
          searchResponse.results.length === 0
            ? '関連するドキュメントが見つかりませんでした。別のキーワードで検索してみてください。'
            : searchResponse.results
                .map(
                  (result, index) =>
                    `**${index + 1}. ${result.metadata.fileName}** (スコア: ${result.score.toFixed(3)})\n${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`
                )
                .join('\n\n')
        }`,
        timestamp: new Date(),
        searchResults: searchResponse,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Search failed:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `検索エラー: ${error instanceof Error ? error.message : '検索に失敗しました。'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = createUserMessage(inputValue)
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Check if it's a search command
      if (inputValue.trim().startsWith('/search ')) {
        const query = inputValue.trim().substring(8).trim()
        if (query) {
          await handleSearchRequest(query)
        } else {
          const errorMessage = createAssistantMessage()
          errorMessage.content = '検索クエリを入力してください。例: /search API仕様'
          setMessages(prev => [...prev, errorMessage])
        }
        return
      }

      // Regular chat
      const assistantMessage = createAssistantMessage()
      setMessages(prev => [...prev, assistantMessage])

      const response = await sendChatRequest(userMessage)
      await handleStreamResponse(response, assistantMessage.id)
    } catch (error) {
      console.error('Request failed:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === prev[prev.length - 1]?.id
            ? {
                ...msg,
                content: `エラー: ${error instanceof Error ? error.message : 'リクエストに失敗しました。'}`,
              }
            : msg
        )
      )
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
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Ask questions about your documentation</p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMermaid]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-sm font-bold tracking-tight mb-1.5 mt-0 text-foreground border-b border-border pb-0.5">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xs font-semibold tracking-tight mb-1.5 mt-2 text-foreground">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-medium tracking-tight mb-1 mt-1.5 text-foreground">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-xs leading-relaxed mb-1.5 text-foreground">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-1.5 ml-3 list-disc text-xs [&>li]:mt-0.5 [&>li]:leading-relaxed">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-1.5 ml-3 list-decimal text-xs [&>li]:mt-0.5 [&>li]:leading-relaxed">
                          {children}
                        </ol>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="mt-1.5 mb-1.5 border-l-2 border-border pl-2 italic text-muted-foreground text-xs">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code className="relative rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-medium">
                              {children}
                            </code>
                          )
                        }
                        return <code className={className}>{children}</code>
                      },
                      pre: ({ children }) => (
                        <pre className="mb-1.5 mt-1.5 overflow-x-auto rounded bg-muted p-2 text-[10px] leading-tight">
                          {children}
                        </pre>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div
                  className={`text-xs mt-1 opacity-70 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="bg-muted text-foreground rounded-lg px-3 py-2">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                  </div>
                  <span className="text-xs opacity-70 ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="/search で検索、または質問を入力..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
