import { FileText, AlertCircle } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
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

          // Initialize mermaid with simple Nord Deep theme
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              background: '#2e3440',
              mainBkg: '#2e3440',
              secondBkg: '#3b4252',
              primaryColor: '#5e81ac',
              primaryTextColor: '#eceff4',
              primaryBorderColor: '#81a1c1',
              textColor: '#eceff4',
              lineColor: '#81a1c1',
              edgeLabelBackground: '#2e3440',
            },
            flowchart: {
              htmlLabels: true,
              curve: 'basis',
              useMaxWidth: true,
            },
            sequence: {
              width: 180,
              height: 65,
            },
          })

          // Clear previous content
          if (elementRef.current) {
            elementRef.current.innerHTML = ''
          }

          // Generate unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`

          // Pre-inject enhanced CSS animations
          const existingStyles = document.getElementById('mermaid-animations')
          if (existingStyles) {
            existingStyles.remove()
          }

          const style = document.createElement('style')
          style.id = 'mermaid-animations'
          style.textContent = `
            /* Flowing light animation along edges */
            @keyframes flowingLight {
              from { 
                stroke-dashoffset: 10;
              }
              to { 
                stroke-dashoffset: 0;
              }
            }
            
            /* Pulsing glow effect for edges */
            @keyframes edgeGlow {
              0%, 100% { 
                filter: drop-shadow(0 0 3px rgba(129, 161, 193, 0.4));
              }
              50% { 
                filter: drop-shadow(0 0 8px rgba(129, 161, 193, 0.8));
              }
            }
            
            /* Node subtle breathing animation */
            @keyframes nodeBreath {
              0%, 100% { 
                filter: drop-shadow(0 0 2px rgba(94, 129, 172, 0.3));
              }
              50% { 
                filter: drop-shadow(0 0 6px rgba(94, 129, 172, 0.6));
              }
            }

            /* Enhanced edge styling with golden theme */
            .mermaid-diagram svg path.edge-path,
            .mermaid-diagram svg .edgePath path,
            .mermaid-diagram svg .flowchart-link {
              stroke: #b8986d !important;
              stroke-width: 2 !important;
              stroke-dasharray: 4 2 !important;
              filter: drop-shadow(0 0 2px rgba(184, 152, 109, 0.3)) !important;
              animation: flowingLight 3s ease-in-out infinite !important;
              transition: all 0.3s ease-in-out !important;
              stroke-linecap: round !important;
              stroke-linejoin: round !important;
            }

            .mermaid-diagram svg path.edge-path:hover,
            .mermaid-diagram svg .edgePath path:hover,
            .mermaid-diagram svg .flowchart-link:hover {
              stroke: #d4af37 !important;
              stroke-width: 3 !important;
              filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6)) !important;
              animation: edgeGlow 1.5s ease-in-out infinite, flowingLight 1.5s ease-in-out infinite !important;
            }

            /* Node styling with proper width and breathing animation */
            .mermaid-diagram svg .node rect {
              min-width: 120px !important;
              animation: nodeBreath 4s ease-in-out infinite !important;
              stroke-width: 2 !important;
              rx: 6 !important;
              ry: 6 !important;
              filter: drop-shadow(0 1px 4px rgba(46, 52, 64, 0.2)) !important;
            }

            .mermaid-diagram svg .node circle,
            .mermaid-diagram svg .node ellipse {
              animation: nodeBreath 4s ease-in-out infinite !important;
              stroke-width: 2 !important;
              filter: drop-shadow(0 1px 4px rgba(46, 52, 64, 0.2)) !important;
            }

            /* Group/Cluster styling */
            .mermaid-diagram svg .cluster rect {
              stroke-width: 1.5 !important;
              rx: 8 !important;
              ry: 8 !important;
              filter: drop-shadow(0 2px 8px rgba(46, 52, 64, 0.3)) !important;
            }

            /* Sequence diagram styling */
            .mermaid-diagram svg .actor rect {
              fill: #5e81ac !important;
              stroke: #81a1c1 !important;
              stroke-width: 2 !important;
              rx: 8 !important;
              ry: 8 !important;
              animation: nodeBreath 5s ease-in-out infinite !important;
            }

            .mermaid-diagram svg .actor-line {
              stroke: #81a1c1 !important;
              stroke-width: 2 !important;
              stroke-dasharray: 2 4 !important;
              animation: flowingLight 4s ease-in-out infinite !important;
              opacity: 0.7 !important;
            }

            .mermaid-diagram svg .messageLine0,
            .mermaid-diagram svg .messageLine1 {
              stroke: #b8986d !important;
              stroke-width: 2.5 !important;
              animation: flowingLight 2.5s ease-in-out infinite !important;
              filter: drop-shadow(0 0 3px rgba(184, 152, 109, 0.4)) !important;
            }

            .mermaid-diagram svg .activation0,
            .mermaid-diagram svg .activation1,
            .mermaid-diagram svg .activation2 {
              fill: rgba(136, 192, 208, 0.15) !important;
              stroke: #88c0d0 !important;
              stroke-width: 1.5 !important;
              rx: 4 !important;
              filter: drop-shadow(0 1px 6px rgba(136, 192, 208, 0.3)) !important;
              animation: nodeBreath 3s ease-in-out infinite !important;
            }

            /* Enhanced text styling */
            .mermaid-diagram svg text {
              fill: #eceff4 !important;
              font-weight: 600 !important;
              pointer-events: none !important;
            }
            
            .mermaid-diagram svg .nodeLabel {
              fill: #eceff4 !important;
              font-weight: 600 !important;
              pointer-events: none !important;
            }
            
            .mermaid-diagram svg .node text {
              dominant-baseline: middle !important;
              text-anchor: middle !important;
              fill: #eceff4 !important;
              font-weight: 600 !important;
            }

            /* Arrow and marker styling */
            .mermaid-diagram svg defs marker path,
            .mermaid-diagram svg .arrowhead {
              animation: edgeGlow 2s ease-in-out infinite !important;
            }
          `
          document.head.appendChild(style)

          // Render the diagram
          const { svg } = await mermaid.render(id, chart)

          if (!elementRef.current) {
            return
          }

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

  return (
    <div
      ref={elementRef}
      className="mermaid-diagram my-4 bg-[#2e3440] rounded-lg p-4 transition-all duration-500 hover:bg-[#3b4252] group relative overflow-hidden"
      style={{
        boxShadow: '0 4px 20px rgba(94, 129, 172, 0.1), inset 0 1px 0 rgba(236, 239, 244, 0.1)',
        background: 'linear-gradient(135deg, #2e3440 0%, #343a47 100%)',
      }}
    />
  )
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
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive opacity-50" />
          <p className="text-lg font-medium text-destructive">Error loading document</p>
          <p className="text-[12px] text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 bg-background">
      <div className="max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const language = match?.[1]

              if (language === 'mermaid') {
                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
