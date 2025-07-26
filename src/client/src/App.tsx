import { useCallback, useState } from 'react'
import { ChatPane } from './components/ChatPane'
import { DocTree } from './components/DocTree'
import { MarkdownPane } from './components/MarkdownPane'
import { useUrlNavigation } from './hooks/useUrlNavigation'

function App() {
  const { selectedFile, setSelectedFile } = useUrlNavigation()

  // Pane sizes (as percentages)
  const [leftWidth, setLeftWidth] = useState(20)
  const [rightWidth, setRightWidth] = useState(25) // Reduced from 35% to 25%

  const centerWidth = 100 - leftWidth - rightWidth

  // Handle left pane resize
  const handleLeftResize = useCallback(
    (e: React.MouseEvent) => {
      const startX = e.clientX
      const startWidth = leftWidth

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX
        const containerWidth = window.innerWidth
        const deltaPercent = (deltaX / containerWidth) * 100
        const newWidth = Math.min(Math.max(startWidth + deltaPercent, 10), 40) // Min 10%, Max 40%
        setLeftWidth(newWidth)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'default'
        document.body.style.userSelect = 'auto'
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [leftWidth]
  )

  // Handle right pane resize
  const handleRightResize = useCallback(
    (e: React.MouseEvent) => {
      const startX = e.clientX
      const startWidth = rightWidth

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = startX - e.clientX // Inverted for right pane
        const containerWidth = window.innerWidth
        const deltaPercent = (deltaX / containerWidth) * 100
        const newWidth = Math.min(Math.max(startWidth + deltaPercent, 15), 50) // Min 15%, Max 50%
        setRightWidth(newWidth)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'default'
        document.body.style.userSelect = 'auto'
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [rightWidth]
  )

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Resizable three-pane layout */}
      <div className="flex w-full">
        {/* Left Pane - DocTree */}
        <div
          className="border-r border-border flex-shrink-0 relative group"
          style={{ width: `${leftWidth}%` }}
        >
          <DocTree onFileSelect={setSelectedFile} selectedFile={selectedFile} />
        </div>

        {/* Left Resize Handle */}
        <div
          role="separator"
          aria-label="Resize document tree"
          tabIndex={0}
          className="w-4 cursor-col-resize flex items-center justify-center group relative"
          onMouseDown={handleLeftResize}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              // Could add keyboard resize functionality here
            }
          }}
        >
          {/* Invisible hit area for better UX */}
          <div className="absolute inset-0 w-4" />
        </div>

        {/* Center Pane - MarkdownPane */}
        <div
          className="border-r border-border flex-1 relative group"
          style={{ width: `${centerWidth}%` }}
        >
          <MarkdownPane selectedFile={selectedFile} />
        </div>

        {/* Right Resize Handle */}
        <div
          role="separator"
          aria-label="Resize chat pane"
          tabIndex={0}
          className="w-4 cursor-col-resize flex items-center justify-center group relative"
          onMouseDown={handleRightResize}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              // Could add keyboard resize functionality here
            }
          }}
        >
          {/* Invisible hit area for better UX */}
          <div className="absolute inset-0 w-4" />
        </div>

        {/* Right Pane - ChatPane */}
        <div className="flex-shrink-0 relative group" style={{ width: `${rightWidth}%` }}>
          <ChatPane />
        </div>
      </div>
    </div>
  )
}

export default App
