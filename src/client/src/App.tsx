import { useState } from 'react'
import { DocTree } from './components/DocTree'
import { MarkdownPane } from './components/MarkdownPane'
import { ChatPane } from './components/ChatPane'
import { Button } from './components/ui/button'
import { Moon, Sun } from 'lucide-react'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Header */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>

      {/* Three-pane layout */}
      <div className="flex w-full">
        {/* Left Pane - DocTree (20%) */}
        <div className="w-1/5 border-r border-border">
          <DocTree onFileSelect={setSelectedFile} selectedFile={selectedFile} />
        </div>

        {/* Center Pane - MarkdownPane (45%) */}
        <div className="w-[45%] border-r border-border">
          <MarkdownPane selectedFile={selectedFile} />
        </div>

        {/* Right Pane - ChatPane (35%) */}
        <div className="w-[35%]">
          <ChatPane />
        </div>
      </div>
    </div>
  )
}

export default App