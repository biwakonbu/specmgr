import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatPaneProps {}

export function ChatPane({}: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m here to help you with your documentation. Ask me anything about your project, architecture, or API endpoints.',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate API call with typing delay
    setTimeout(() => {
      // Mock AI responses based on user input
      let aiResponse = ''
      const query = userMessage.content.toLowerCase()
      
      if (query.includes('install') || query.includes('setup')) {
        aiResponse = 'To set up the development environment:\n\n1. **Install dependencies**: `npm install`\n2. **Start Docker services**: `npm run docker:up`\n3. **Run development server**: `npm run dev`\n\nMake sure you have Node.js 18+ and Docker installed first. Check the getting-started.md file for detailed instructions.'
      } else if (query.includes('architecture') || query.includes('design')) {
        aiResponse = 'The system follows a three-tier architecture:\n\n**Frontend**: React + shadcn/ui for the user interface\n**Backend**: Node.js + Express for the API server\n**Data Layer**: Qdrant for vector storage and Redis for queuing\n\nThe sync agent monitors file changes using chokidar and processes them through BullMQ. See system-design.md for more details.'
      } else if (query.includes('api') || query.includes('endpoint')) {
        aiResponse = 'Key API endpoints include:\n\n- `GET /api/files` - List all markdown files\n- `GET /api/files/:path` - Get specific file content\n- `POST /api/search` - Vector search across documents\n- `POST /api/chat` - Send chat messages (SSE stream)\n\nAll endpoints return JSON responses. Check the endpoints.md file for complete documentation.'
      } else if (query.includes('search') || query.includes('vector')) {
        aiResponse = 'The search functionality uses:\n\n**Vector Database**: Qdrant for storing embeddings\n**Embeddings**: OpenAI\'s text-embedding-ada-002 model\n**Search Method**: Semantic similarity search with cosine distance\n\nFiles are automatically indexed when changed. The system supports both exact text matching and semantic search.'
      } else {
        aiResponse = `I understand you're asking about "${userMessage.content}". I can help you with:\n\n- Project setup and installation\n- System architecture and design\n- API endpoints and usage\n- Search and vector database functionality\n\nCould you be more specific about what you'd like to know?`
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
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
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your documentation
        </p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
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
                  "max-w-[80%] rounded-lg px-3 py-2",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                <div
                  className={cn(
                    "text-xs mt-1 opacity-70",
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
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your documentation..."
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