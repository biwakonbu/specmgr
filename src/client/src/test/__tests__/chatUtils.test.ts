import { describe, it, expect, vi } from 'vitest'
import {
  processChunkData,
  processCompleteData,
  processErrorData,
  processStreamData,
  processSSELine,
  processStreamBuffer,
  formatSearchResults,
  createSearchSuccessMessage,
  createSearchErrorMessage,
  isSearchCommand,
  extractSearchQuery,
  createUserMessage,
  createAssistantMessage,
  type Message,
} from '../chatUtils'
import type { SearchResponse } from '../../services/api'

describe('Chat Utilities', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there',
      timestamp: new Date(),
    },
  ]

  describe('processChunkData', () => {
    it('should append content to the correct message', () => {
      const updateMessages = vi.fn()
      processChunkData(' world!', '2', updateMessages)

      expect(updateMessages).toHaveBeenCalledWith(expect.any(Function))

      // Test the updater function
      const updater = updateMessages.mock.calls[0][0]
      const result = updater(mockMessages)

      expect(result[1].content).toBe('Hi there world!')
      expect(result[0].content).toBe('Hello') // Other messages unchanged
    })

    it('should not modify messages with different IDs', () => {
      const updateMessages = vi.fn()
      processChunkData(' content', 'different-id', updateMessages)

      const updater = updateMessages.mock.calls[0][0]
      const result = updater(mockMessages)

      expect(result[0].content).toBe('Hello')
      expect(result[1].content).toBe('Hi there')
    })
  })

  describe('processCompleteData', () => {
    it('should log completion message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      processCompleteData()

      expect(consoleSpy).toHaveBeenCalledWith('Chat streaming completed')
      consoleSpy.mockRestore()
    })
  })

  describe('processErrorData', () => {
    it('should throw error with provided message', () => {
      expect(() => {
        processErrorData({ message: 'Custom error' })
      }).toThrow('Custom error')
    })

    it('should throw error with default message', () => {
      expect(() => {
        processErrorData()
      }).toThrow('Unknown error')
    })
  })

  describe('processStreamData', () => {
    const updateMessages = vi.fn()

    beforeEach(() => {
      updateMessages.mockClear()
    })

    it('should process chunk data', () => {
      const result = processStreamData(
        { type: 'chunk', content: 'test content' },
        'msg-id',
        updateMessages
      )

      expect(result).toBe(false)
      expect(updateMessages).toHaveBeenCalled()
    })

    it('should process complete data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = processStreamData({ type: 'complete' }, 'msg-id', updateMessages)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Chat streaming completed')
      consoleSpy.mockRestore()
    })

    it('should process error data', () => {
      expect(() => {
        processStreamData(
          { type: 'error', error: { message: 'Test error' } },
          'msg-id',
          updateMessages
        )
      }).toThrow('Test error')
    })

    it('should return true for done type', () => {
      const result = processStreamData({ type: 'done' }, 'msg-id', updateMessages)

      expect(result).toBe(true)
    })

    it('should warn for unknown types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = processStreamData({ type: 'unknown' }, 'msg-id', updateMessages)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Unknown stream data type: unknown')
      consoleSpy.mockRestore()
    })
  })

  describe('processSSELine', () => {
    const updateMessages = vi.fn()

    it('should process valid SSE data line', () => {
      const line = 'data: {"type": "chunk", "content": "test"}'
      const result = processSSELine(line, 'msg-id', updateMessages)

      expect(result).toBe(false)
      expect(updateMessages).toHaveBeenCalled()
    })

    it('should ignore non-data lines', () => {
      updateMessages.mockClear()
      const line = 'event: message'
      const result = processSSELine(line, 'msg-id', updateMessages)

      expect(result).toBe(false)
      expect(updateMessages).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const line = 'data: invalid json'

      const result = processSSELine(line, 'msg-id', updateMessages)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('processStreamBuffer', () => {
    const updateMessages = vi.fn()

    it('should process buffer with multiple lines', () => {
      const buffer =
        'data: {"type": "chunk", "content": "hello"}\ndata: {"type": "chunk", "content": " world"}\npartial'

      const result = processStreamBuffer(buffer, 'msg-id', updateMessages)

      expect(result.remainingBuffer).toBe('partial')
      expect(result.shouldStop).toBe(false)
      expect(updateMessages).toHaveBeenCalledTimes(2)
    })

    it('should stop processing when done is received', () => {
      const buffer =
        'data: {"type": "chunk", "content": "test"}\ndata: {"type": "done"}\ndata: {"type": "chunk", "content": "ignored"}'

      const result = processStreamBuffer(buffer, 'msg-id', updateMessages)

      expect(result.shouldStop).toBe(true)
    })
  })

  describe('formatSearchResults', () => {
    const mockSearchResponse: SearchResponse = {
      results: [
        {
          id: '1',
          content: 'This is a short content',
          score: 0.95,
          metadata: {
            filePath: 'docs/test.md',
            fileName: 'test.md',
            chunkIndex: 0,
            totalChunks: 1,
            modified: '2023-01-01T00:00:00Z',
            size: 100,
          },
        },
        {
          id: '2',
          content:
            'This is a very long content that should be truncated because it exceeds the 200 character limit that we have set for the snippet display in the search results to ensure proper formatting and readability',
          score: 0.85,
          metadata: {
            filePath: 'docs/long.md',
            fileName: 'long.md',
            chunkIndex: 0,
            totalChunks: 1,
            modified: '2023-01-02T00:00:00Z',
            size: 250,
          },
        },
      ],
      totalResults: 2,
      processingTime: 0.05,
      query: 'test query',
    }

    it('should format search results correctly', () => {
      const result = formatSearchResults(mockSearchResponse, 'test')

      expect(result).toContain('**1. test.md** (スコア: 0.950)')
      expect(result).toContain('This is a short content')
      expect(result).toContain('**2. long.md** (スコア: 0.850)')
      expect(result).toContain(
        'This is a very long content that should be truncated because it exceeds the 200 character limit that we have set for the snippet display in the search results to ensure proper'
      )
    })

    it('should handle empty results', () => {
      const emptyResponse: SearchResponse = {
        results: [],
        totalResults: 0,
        processingTime: 0.01,
        query: 'no results',
      }

      const result = formatSearchResults(emptyResponse, 'test')
      expect(result).toBe(
        '関連するドキュメントが見つかりませんでした。別のキーワードで検索してみてください。'
      )
    })
  })

  describe('createSearchSuccessMessage', () => {
    it('should create proper search success message', () => {
      const mockResponse: SearchResponse = {
        results: [],
        totalResults: 5,
        processingTime: 0.123,
        query: 'test search',
      }

      const message = createSearchSuccessMessage(mockResponse, 'test search')

      expect(message.role).toBe('assistant')
      expect(message.content).toContain('**検索結果**: "test search"')
      expect(message.content).toContain('見つかった結果: 5件')
      expect(message.content).toContain('処理時間: 0.123秒')
      expect(message.searchResults).toBe(mockResponse)
    })
  })

  describe('createSearchErrorMessage', () => {
    it('should create error message from Error object', () => {
      const error = new Error('Network error')
      const message = createSearchErrorMessage(error)

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('検索エラー: Network error')
    })

    it('should create error message from unknown error', () => {
      const message = createSearchErrorMessage('string error')

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('検索エラー: 検索に失敗しました。')
    })
  })

  describe('command processing', () => {
    describe('isSearchCommand', () => {
      it('should identify search commands', () => {
        expect(isSearchCommand('/search test query')).toBe(true)
        expect(isSearchCommand('  /search test  ')).toBe(true)
      })

      it('should reject non-search commands', () => {
        expect(isSearchCommand('regular message')).toBe(false)
        expect(isSearchCommand('/help')).toBe(false)
        expect(isSearchCommand('search without slash')).toBe(false)
      })
    })

    describe('extractSearchQuery', () => {
      it('should extract search query correctly', () => {
        expect(extractSearchQuery('/search test query')).toBe('test query')
        expect(extractSearchQuery('  /search   multiple   spaces   ')).toBe('multiple   spaces')
      })

      it('should handle empty query', () => {
        expect(extractSearchQuery('/search')).toBe('')
        expect(extractSearchQuery('/search   ')).toBe('')
      })
    })
  })

  describe('message creation', () => {
    describe('createUserMessage', () => {
      it('should create user message with correct properties', () => {
        const message = createUserMessage('Hello world')

        expect(message.role).toBe('user')
        expect(message.content).toBe('Hello world')
        expect(message.id).toBeDefined()
        expect(message.timestamp).toBeInstanceOf(Date)
      })
    })

    describe('createAssistantMessage', () => {
      it('should create assistant message with empty content', () => {
        const message = createAssistantMessage()

        expect(message.role).toBe('assistant')
        expect(message.content).toBe('')
        expect(message.id).toBeDefined()
        expect(message.timestamp).toBeInstanceOf(Date)
      })
    })
  })
})
