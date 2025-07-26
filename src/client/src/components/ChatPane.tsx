import { Bot, Search, Send, User, Database, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { apiClient, type SearchResponse, type SearchStats, type HealthStatus, type BulkSyncResult, type SyncStatus } from '../services/api'

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
        'こんにちは！私はあなたのドキュメンテーションのアシスタントです。プロジェクトのアーキテクチャ、API、技術仕様について何でもお尋ねください。\n\n🔄 **同期ボタン**: 右上の「同期」ボタンでドキュメントをベクトルDBに同期\n🔍 **検索モード**: 「/search」で始めるとドキュメント検索を実行\n💬 **チャットモード**: 通常のメッセージでAI対話\n📊 **ステータス**: ファイル数・チャンク数・サービス状況を表示',
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load status information on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [stats, health, sync] = await Promise.all([
          apiClient.getSearchStats(),
          apiClient.getHealthStatus(),
          apiClient.getSyncStatus(),
        ])
        setSearchStats(stats)
        setHealthStatus(health)
        setSyncStatus(sync)
      } catch (error) {
        console.error('Failed to load status:', error)
      }
    }
    
    loadStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

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
      console.log('🎉 Chat streaming completed')
    } else if (data.type === 'error') {
      throw new Error(data.error.message)
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
            console.error('❌ Failed to parse SSE data:', parseError)
          }
        }
      }
    }
  }

  const handleBulkSync = async () => {
    try {
      setIsLoading(true)
      
      // Add system message about sync starting
      const syncStartMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔄 ドキュメント同期を開始しています...',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, syncStartMessage])

      // Execute bulk sync
      const result = await apiClient.executeBulkSync(false)
      
      // Update sync status
      const newSyncStatus = await apiClient.getSyncStatus()
      setSyncStatus(newSyncStatus)
      
      // Update search stats
      const newStats = await apiClient.getSearchStats()
      setSearchStats(newStats)

      // Add result message
      const syncResultMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✅ **同期完了!**\n\n📊 **処理結果**:\n- ファイル数: ${result.processedFiles}/${result.totalFiles}\n- チャンク数: ${result.totalChunks}\n- 処理時間: ${(result.processingTime / 1000).toFixed(2)}秒\n- エラー: ${result.errors.length}件\n\n${result.errors.length > 0 ? `⚠️ **エラー詳細**:\n${result.errors.join('\n')}` : '🎉 全てのドキュメントが正常に同期されました！'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, syncResultMessage])

    } catch (error) {
      console.error('❌ Bulk sync failed:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **同期エラー**: ${error instanceof Error ? error.message : '同期に失敗しました。'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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
        content: `🔍 **検索結果**: "${query}"\n\n見つかった結果: ${searchResponse.totalResults}件 (処理時間: ${searchResponse.processingTime.toFixed(3)}秒)\n\n${
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
      console.error('❌ Search failed:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 検索エラー: ${error instanceof Error ? error.message : '検索に失敗しました。'}`,
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
          errorMessage.content = '❌ 検索クエリを入力してください。例: /search API仕様'
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
      console.error('❌ Request failed:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === (prev[prev.length - 1]?.id)
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Ask questions about your documentation</p>
          </div>
          
          {/* Status indicators and sync button */}
          <div className="flex items-center gap-2">
            {/* Sync button */}
            <Button
              onClick={handleBulkSync}
              disabled={isLoading || (syncStatus?.isRunning ?? false)}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <RefreshCw className={cn(
                "h-3 w-3",
                (isLoading || syncStatus?.isRunning) && "animate-spin"
              )} />
              {syncStatus?.isRunning ? (
                <span className="text-xs">
                  同期中 ({syncStatus.current}/{syncStatus.total})
                </span>
              ) : (
                <span className="text-xs">同期</span>
              )}
            </Button>

            {searchStats && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Search Statistics">
                <Database className="h-3 w-3" />
                <span>{searchStats.totalFiles}ファイル</span>
                <span>•</span>
                <span>{searchStats.totalChunks}チャンク</span>
              </div>
            )}
            
            {healthStatus && (
              <div className="flex items-center gap-1" title="Service Health">
                {healthStatus.overall ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div
                  className={cn(
                    'text-xs mt-1 opacity-70',
                    message.role === 'user' ? 'text-right' : 'text-left'
                  )}
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
