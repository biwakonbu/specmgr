import { FileText, AlertCircle } from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { apiClient } from '../services/api'

interface MarkdownPaneProps {
  selectedFile: string | null
}

// Mermaid component for rendering diagrams
function MermaidDiagram({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderDiagram = async () => {
      if (elementRef.current && chart) {
        try {
          const mermaid = (await import('mermaid')).default

          // Initialize mermaid with Nord Dark theme
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              // Nord Color Palette
              primaryColor: '#5e81ac', // Nord10 (Blue)
              primaryTextColor: '#eceff4', // Nord6 (Light)
              primaryBorderColor: '#81a1c1', // Nord9 (Light Blue)
              lineColor: '#4c566a', // Nord3 (Dark Gray)
              secondaryColor: '#88c0d0', // Nord8 (Cyan)
              tertiaryColor: '#8fbcbb', // Nord7 (Teal)

              // Background colors
              background: '#2e3440', // Nord0 (Darkest)
              mainBkg: '#3b4252', // Nord1 (Dark)
              secondBkg: '#434c5e', // Nord2 (Medium Dark)
              tertiaryBkg: '#4c566a', // Nord3 (Gray)

              // Section backgrounds
              sectionBkgColor: '#3b4252', // Nord1
              altSectionBkgColor: '#434c5e', // Nord2

              // Grid and borders
              gridColor: '#4c566a', // Nord3
              edgeLabelBackground: '#3b4252', // Nord1

              // Text colors
              textColor: '#eceff4', // Nord6 (Light)
              taskTextColor: '#eceff4', // Nord6
              activeTaskBkgColor: '#5e81ac', // Nord10
              activeTaskBorderColor: '#81a1c1', // Nord9

              // Node colors
              fillType0: '#5e81ac', // Nord10 (Blue)
              fillType1: '#88c0d0', // Nord8 (Cyan)
              fillType2: '#8fbcbb', // Nord7 (Teal)
              fillType3: '#a3be8c', // Nord14 (Green)
              fillType4: '#ebcb8b', // Nord13 (Yellow)
              fillType5: '#d08770', // Nord12 (Orange)
              fillType6: '#bf616a', // Nord11 (Red)
              fillType7: '#b48ead', // Nord15 (Purple)

              // Additional colors for different diagram types
              errorBkgColor: '#bf616a', // Nord11 (Red)
              errorTextColor: '#eceff4', // Nord6
              taskBkgColor: '#434c5e', // Nord2
              taskTextOutsideColor: '#eceff4', // Nord6
              taskTextLightColor: '#2e3440', // Nord0
              taskTextDarkColor: '#eceff4', // Nord6

              // Gantt chart colors
              todayLineColor: '#bf616a', // Nord11 (Red)

              // Git graph colors
              git0: '#5e81ac', // Nord10
              git1: '#88c0d0', // Nord8
              git2: '#8fbcbb', // Nord7
              git3: '#a3be8c', // Nord14
              git4: '#ebcb8b', // Nord13
              git5: '#d08770', // Nord12
              git6: '#bf616a', // Nord11
              git7: '#b48ead', // Nord15

              // Journey diagram colors
              personBorder: '#5e81ac', // Nord10
              taskBorder: '#4c566a', // Nord3

              // State diagram colors
              stateLabelColor: '#eceff4', // Nord6
              stateBkg: '#3b4252', // Nord1
              labelBackgroundColor: '#3b4252', // Nord1
              compositeBackground: '#434c5e', // Nord2
              compositeTitleBackground: '#2e3440', // Nord0

              // Sequence diagram colors
              actorBorder: '#5e81ac', // Nord10
              actorBkg: '#3b4252', // Nord1
              actorTextColor: '#eceff4', // Nord6
              actorLineColor: '#4c566a', // Nord3
              signalColor: '#eceff4', // Nord6
              signalTextColor: '#eceff4', // Nord6
              labelBoxBkgColor: '#3b4252', // Nord1
              labelBoxBorderColor: '#5e81ac', // Nord10
              labelTextColor: '#eceff4', // Nord6
              loopTextColor: '#eceff4', // Nord6
              noteBorderColor: '#81a1c1', // Nord9
              noteBkgColor: '#434c5e', // Nord2
              noteTextColor: '#eceff4', // Nord6

              // Class diagram colors
              classText: '#eceff4', // Nord6
            },
          })

          // Clear previous content
          elementRef.current.innerHTML = ''

          // Generate unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

          // Render the diagram
          const { svg } = await mermaid.render(id, chart)
          elementRef.current.innerHTML = svg
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          if (elementRef.current) {
            elementRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-300 rounded">
              Error rendering Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}
            </div>`
          }
        }
      }
    }

    renderDiagram()
  }, [chart])

  return <div ref={elementRef} className="mermaid-diagram my-4" />
}

export function MarkdownPane({ selectedFile }: MarkdownPaneProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedFile) {
      const loadFile = async () => {
        try {
          setLoading(true)
          setError(null)

          const fileData = await apiClient.getFileContent(selectedFile)
          setContent(fileData.content)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load file'
          setError(errorMessage)
          console.error('Failed to load file content:', err)
        } finally {
          setLoading(false)
        }
      }

      loadFile()
    } else {
      setContent('')
      setError(null)
    }
  }, [selectedFile])

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a document to view</p>
          <p className="text-[12px]">Choose a markdown file from the document tree</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <AlertCircle className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Error loading document</p>
          <p className="text-[12px]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="w-full p-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold tracking-tight mb-6 text-foreground border-b border-border pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-semibold tracking-tight mb-4 mt-8 text-foreground border-b border-border pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold tracking-tight mb-3 mt-6 text-foreground">
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="leading-7 mb-4 text-foreground">{children}</p>,
            ul: ({ children }) => <ul className="my-4 ml-6 list-disc [&>li]:mt-2">{children}</ul>,
            ol: ({ children }) => (
              <ol className="my-4 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mt-6 border-l-2 border-border pl-6 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className
              if (isInline) {
                return (
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[12px] font-semibold">
                    {children}
                  </code>
                )
              }

              // Check for mermaid code blocks (handles both 'language-mermaid' and 'hljs language-mermaid')
              if (className?.includes('language-mermaid')) {
                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
              }

              return <code className={className}>{children}</code>
            },
            pre: ({ children }) => {
              // Check if this pre contains a mermaid code block
              if (
                React.isValidElement(children) &&
                children.props?.className === 'language-mermaid'
              ) {
                const chartContent = children.props.children
                return <MermaidDiagram chart={String(chartContent).replace(/\n$/, '')} />
              }

              return <pre className="mb-4 mt-6 overflow-x-auto text-[12px] p-3">{children}</pre>
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
