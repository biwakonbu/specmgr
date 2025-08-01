import type { SearchResponse } from '../services/api'
import type { Message } from './chatUtils'

/**
 * Test utilities for ChatPane component testing
 */

export const createMockMessage = (
  id: string,
  role: 'user' | 'assistant',
  content: string,
  searchResults?: SearchResponse
): Message => ({
  id,
  role,
  content,
  timestamp: new Date(),
  searchResults,
})

export const createMockSearchResponse = (
  query: string,
  resultCount: number = 2
): SearchResponse => ({
  results: Array.from({ length: resultCount }, (_, i) => ({
    id: `result_${i + 1}`,
    content: `Mock search result ${i + 1} for query: ${query}`,
    score: 0.9 - i * 0.1,
    metadata: {
      filePath: `/docs/mock_${i + 1}.md`,
      fileName: `mock_${i + 1}.md`,
      chunkIndex: 0,
      totalChunks: 1,
      modified: '2024-01-01T00:00:00Z',
      size: 1024,
    },
  })),
  totalResults: resultCount,
  processingTime: 0.05,
  query,
})

export const createMockConversation = (): Message[] => [
  createMockMessage('1', 'user', 'Hello, how can I search for documents?'),
  createMockMessage('2', 'assistant', 'You can use the /search command followed by your query.'),
  createMockMessage('3', 'user', '/search API documentation'),
  createMockMessage(
    '4',
    'assistant',
    'Here are the search results for API documentation:',
    createMockSearchResponse('API documentation')
  ),
]

export const createLongMessage = (length: number = 500): string => {
  const words = ['test', 'message', 'content', 'example', 'data']
  let result = ''
  while (result.length < length) {
    result += words[Math.floor(Math.random() * words.length)] + ' '
  }
  return result.trim().substring(0, length)
}

export const mockStreamingResponse = async function* (): AsyncGenerator<string, void, unknown> {
  const chunks = ['Hello', ' from', ' streaming', ' response', '!']
  for (const chunk of chunks) {
    yield chunk
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

export const mockSSEData = {
  chunk: { type: 'chunk', content: 'test content' },
  complete: { type: 'complete' },
  error: { type: 'error', error: { message: 'Test error' } },
  done: { type: 'done' },
}

export const createMockEventSource = () => {
  const listeners: Record<string, ((event: Event) => void)[]> = {}

  return {
    addEventListener: vi.fn((event: string, callback: (event: Event) => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(callback)
    }),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    readyState: 1, // OPEN
    url: 'mock://stream',
    withCredentials: false,

    // Helper method to trigger events in tests
    triggerEvent: (eventType: string, data: string) => {
      if (listeners[eventType]) {
        const event = new MessageEvent(eventType, { data })
        listeners[eventType].forEach(callback => callback(event))
      }
    },
  }
}
