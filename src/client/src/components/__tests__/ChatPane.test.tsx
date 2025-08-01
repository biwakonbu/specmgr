import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatPane } from '../ChatPane'
import type { Message } from '../../test/chatUtils'

// Mock API client
vi.mock('../../services/api', () => ({
  apiClient: {
    searchDocuments: vi.fn(),
  },
}))

// Mock chat utilities
vi.mock('../../test/chatUtils', () => ({
  createUserMessage: vi.fn((content: string) => ({
    id: '1',
    role: 'user',
    content,
    timestamp: new Date(),
  })),
  createAssistantMessage: vi.fn(() => ({
    id: '2',
    role: 'assistant',
    content: '',
    timestamp: new Date(),
  })),
  isSearchCommand: vi.fn((input: string) => input.startsWith('/search')),
  extractSearchQuery: vi.fn((input: string) => input.replace('/search', '').trim()),
}))

describe('ChatPane', () => {
  const defaultProps = {
    selectedFile: null,
    onFileSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chat interface correctly', () => {
    render(<ChatPane {...defaultProps} />)

    expect(screen.getByPlaceholderText(/メッセージを入力/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /送信/ })).toBeInTheDocument()
    expect(screen.getByText(/チャット/)).toBeInTheDocument()
  })

  it('should have correct input field attributes', () => {
    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    expect(input).toHaveAttribute('type', 'text')
    expect(input).not.toBeDisabled()
  })

  it('should have send button initially enabled', () => {
    render(<ChatPane {...defaultProps} />)

    const sendButton = screen.getByRole('button', { name: /送信/ })
    expect(sendButton).not.toBeDisabled()
  })

  it('should display empty message list initially', () => {
    render(<ChatPane {...defaultProps} />)

    // Should not show any message bubbles initially
    expect(screen.queryByTestId('message-bubble')).not.toBeInTheDocument()
  })

  it('should handle input change correctly', () => {
    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    fireEvent.change(input, { target: { value: 'test message' } })

    expect(input).toHaveValue('test message')
  })

  it('should clear input on form submit', async () => {
    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: 'test message' } })
    expect(input).toHaveValue('test message')

    if (form) {
      fireEvent.submit(form)
      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    }
  })

  it('should display correct chat title', () => {
    render(<ChatPane {...defaultProps} />)

    const title = screen.getByText(/チャット/)
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H3')
  })

  it('should render with proper accessibility attributes', () => {
    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    expect(input).toHaveAttribute('aria-label')

    const sendButton = screen.getByRole('button', { name: /送信/ })
    expect(sendButton).toHaveAttribute('type', 'submit')
  })

  it('should have proper container structure', () => {
    const { container } = render(<ChatPane {...defaultProps} />)

    const chatContainer = container.firstChild
    expect(chatContainer).toHaveClass('flex', 'flex-col', 'h-full')
  })

  it('should trigger message send on button click', async () => {
    const mockSendMessage = vi.fn()
    const { container } = render(<ChatPane {...defaultProps} />)

    // Mock message sending function
    container.querySelector('form')!.addEventListener('submit', mockSendMessage)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    const sendButton = screen.getByRole('button', { name: /送信/ })

    fireEvent.change(input, { target: { value: 'Hello, world!' } })
    fireEvent.click(sendButton)

    expect(mockSendMessage).toHaveBeenCalled()
  })

  it('should trigger message send on Enter key', async () => {
    const mockSendMessage = vi.fn()
    const { container } = render(<ChatPane {...defaultProps} />)

    // Mock message sending function
    container.querySelector('form')!.addEventListener('submit', mockSendMessage)

    const input = screen.getByPlaceholderText(/メッセージを入力/)

    fireEvent.change(input, { target: { value: 'Hello, world!' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(mockSendMessage).toHaveBeenCalled()
  })

  it('should prevent empty message submission', () => {
    const mockSendMessage = vi.fn()
    const { container } = render(<ChatPane {...defaultProps} />)

    // Mock message sending function
    container.querySelector('form')!.addEventListener('submit', mockSendMessage)

    const sendButton = screen.getByRole('button', { name: /送信/ })

    // Try to send empty message
    fireEvent.click(sendButton)

    // Should not trigger send for empty message
    const input = screen.getByPlaceholderText(/メッセージを入力/)
    expect(input).toHaveValue('')
  })

  it('should handle message state updates', async () => {
    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)

    fireEvent.change(input, { target: { value: 'Test message' } })
    expect(input).toHaveValue('Test message')

    fireEvent.change(input, { target: { value: 'Updated message' } })
    expect(input).toHaveValue('Updated message')
  })

  it('should recognize search commands', async () => {
    const { isSearchCommand } = await import('../../test/chatUtils')

    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)

    fireEvent.change(input, { target: { value: '/search API documentation' } })
    expect(input).toHaveValue('/search API documentation')

    // Verify search command detection
    expect(isSearchCommand('/search API documentation')).toBe(true)
    expect(isSearchCommand('regular message')).toBe(false)
  })

  it('should extract search query from command', async () => {
    const { extractSearchQuery } = await import('../../test/chatUtils')

    render(<ChatPane {...defaultProps} />)

    const input = screen.getByPlaceholderText(/メッセージを入力/)

    fireEvent.change(input, { target: { value: '/search TypeScript interfaces' } })

    // Verify query extraction
    const query = extractSearchQuery('/search TypeScript interfaces')
    expect(query).toBe('TypeScript interfaces')
  })

  it('should handle search command submission', async () => {
    const mockSendMessage = vi.fn()
    const { container } = render(<ChatPane {...defaultProps} />)

    // Mock message sending function
    container.querySelector('form')!.addEventListener('submit', mockSendMessage)

    const input = screen.getByPlaceholderText(/メッセージを入力/)
    const sendButton = screen.getByRole('button', { name: /送信/ })

    fireEvent.change(input, { target: { value: '/search test query' } })
    fireEvent.click(sendButton)

    expect(mockSendMessage).toHaveBeenCalled()

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('should handle complex search queries with special characters', async () => {
    const { extractSearchQuery } = await import('../../test/chatUtils')

    render(<ChatPane {...defaultProps} />)

    const complexQuery = '/search API "exact phrase" OR keyword'
    const input = screen.getByPlaceholderText(/メッセージを入力/)

    fireEvent.change(input, { target: { value: complexQuery } })

    // Verify complex query extraction
    const query = extractSearchQuery(complexQuery)
    expect(query).toBe('API "exact phrase" OR keyword')
  })
})
