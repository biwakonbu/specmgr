// Chat utility functions extracted for testing
import type { SearchResponse } from '../services/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  searchResults?: SearchResponse
}

// Stream processing utilities
export const processChunkData = (
  content: string,
  assistantMessageId: string,
  updateMessages: (updater: (prev: Message[]) => Message[]) => void
): void => {
  updateMessages(prev =>
    prev.map(msg =>
      msg.id === assistantMessageId ? { ...msg, content: msg.content + content } : msg
    )
  )
}

export const processCompleteData = (): void => {
  console.log('Chat streaming completed')
}

export const processErrorData = (error?: { message: string }): never => {
  throw new Error(error?.message || 'Unknown error')
}

export const processStreamData = (
  data: { type: string; content?: string; error?: { message: string } },
  assistantMessageId: string,
  updateMessages: (updater: (prev: Message[]) => Message[]) => void
): boolean => {
  switch (data.type) {
    case 'chunk':
      if (data.content) {
        processChunkData(data.content, assistantMessageId, updateMessages)
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

// SSE processing utilities
export const processSSELine = (
  line: string,
  assistantMessageId: string,
  updateMessages: (updater: (prev: Message[]) => Message[]) => void
): boolean => {
  if (!line.startsWith('data: ')) {
    return false
  }

  try {
    const data = JSON.parse(line.slice(6))
    return processStreamData(data, assistantMessageId, updateMessages)
  } catch (parseError) {
    console.error('Failed to parse SSE data:', parseError)
    return false
  }
}

export const processStreamBuffer = (
  buffer: string,
  assistantMessageId: string,
  updateMessages: (updater: (prev: Message[]) => Message[]) => void
): { remainingBuffer: string; shouldStop: boolean } => {
  const lines = buffer.split('\n')
  const remainingBuffer = lines.pop() || ''

  for (const line of lines) {
    const shouldStop = processSSELine(line, assistantMessageId, updateMessages)
    if (shouldStop) {
      return { remainingBuffer, shouldStop: true }
    }
  }

  return { remainingBuffer, shouldStop: false }
}

// Search result formatting utilities
export const formatSearchResults = (searchResponse: SearchResponse, _query: string): string => {
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

export const createSearchSuccessMessage = (
  searchResponse: SearchResponse,
  query: string
): Message => {
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

export const createSearchErrorMessage = (error: unknown): Message => {
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: `検索エラー: ${error instanceof Error ? error.message : '検索に失敗しました。'}`,
    timestamp: new Date(),
  }
}

// Command processing utilities
export const isSearchCommand = (input: string): boolean => {
  return input.trim().startsWith('/search ')
}

export const extractSearchQuery = (input: string): string => {
  return input.trim().substring(8).trim()
}

export const createUserMessage = (content: string): Message => ({
  id: Date.now().toString(),
  role: 'user',
  content,
  timestamp: new Date(),
})

export const createAssistantMessage = (): Message => ({
  id: (Date.now() + 1).toString(),
  role: 'assistant',
  content: '',
  timestamp: new Date(),
})
