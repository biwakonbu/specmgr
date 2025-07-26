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
              // Main background and container colors - Nord Dark theme
              background: '#2e3440', // Nord0 (Primary background)
              mainBkg: '#2e3440', // Nord0 (Main diagram background)
              secondBkg: '#3b4252', // Nord1 (Secondary elements)
              tertiaryBkg: '#434c5e', // Nord2 (Tertiary elements)

              // Primary colors for nodes and elements
              primaryColor: '#5e81ac', // Nord10 (Blue) - Main accent
              primaryTextColor: '#eceff4', // Nord6 (Light text)
              primaryBorderColor: '#81a1c1', // Nord9 (Light blue borders)

              // Secondary and tertiary colors
              secondaryColor: '#88c0d0', // Nord8 (Cyan)
              tertiaryColor: '#8fbcbb', // Nord7 (Teal)

              // Line and edge colors
              lineColor: '#81a1c1', // Nord9 (Lighter for better visibility)
              edgeLabelBackground: '#2e3440', // Nord0 (Match main background)

              // Text colors throughout
              textColor: '#eceff4', // Nord6 (Primary text)
              taskTextColor: '#eceff4', // Nord6 (Task text)
              taskTextOutsideColor: '#eceff4', // Nord6 (Outside task text)
              taskTextLightColor: '#eceff4', // Nord6 (Light task text)
              taskTextDarkColor: '#2e3440', // Nord0 (Dark text on light backgrounds)

              // Section and grid styling
              sectionBkgColor: '#3b4252', // Nord1 (Section backgrounds)
              altSectionBkgColor: '#434c5e', // Nord2 (Alt section backgrounds)
              gridColor: '#4c566a', // Nord3 (Grid lines)

              // Extended node fill colors - Rich Nord palette variations
              fillType0: '#5e81ac', // Nord10 (Blue) - Leadership, Technology
              fillType1: '#88c0d0', // Nord8 (Cyan) - Communication, APIs
              fillType2: '#8fbcbb', // Nord7 (Teal) - Services, Components
              fillType3: '#a3be8c', // Nord14 (Green) - Success, Growth
              fillType4: '#ebcb8b', // Nord13 (Yellow) - Warnings, Highlights
              fillType5: '#d08770', // Nord12 (Orange) - Processing, Active
              fillType6: '#bf616a', // Nord11 (Red) - Critical, Errors
              fillType7: '#b48ead', // Nord15 (Purple) - Special, Advanced
              fillType8: '#5e81accc', // Nord10 with transparency - Subtle variants
              fillType9: '#88c0d0cc', // Nord8 with transparency
              fillType10: '#8fbcbbcc', // Nord7 with transparency
              fillType11: '#a3be8ccc', // Nord14 with transparency

              // Active and highlighted elements
              activeTaskBkgColor: '#5e81ac', // Nord10 (Active task background)
              activeTaskBorderColor: '#81a1c1', // Nord9 (Active task border)

              // Error and special states
              errorBkgColor: '#bf616a', // Nord11 (Red for errors)
              errorTextColor: '#eceff4', // Nord6 (Error text)

              // Task and workflow colors
              taskBkgColor: '#3b4252', // Nord1 (Task background)
              taskBorder: '#4c566a', // Nord3 (Task borders)

              // Timeline and progress indicators
              todayLineColor: '#bf616a', // Nord11 (Today line in Gantt)

              // Git graph branch colors
              git0: '#5e81ac', // Nord10 (Branch 0)
              git1: '#88c0d0', // Nord8 (Branch 1)
              git2: '#8fbcbb', // Nord7 (Branch 2)
              git3: '#a3be8c', // Nord14 (Branch 3)
              git4: '#ebcb8b', // Nord13 (Branch 4)
              git5: '#d08770', // Nord12 (Branch 5)
              git6: '#bf616a', // Nord11 (Branch 6)
              git7: '#b48ead', // Nord15 (Branch 7)

              // Journey diagram elements
              personBorder: '#5e81ac', // Nord10 (Person borders)

              // State diagram styling
              stateLabelColor: '#eceff4', // Nord6 (State labels)
              stateBkg: '#3b4252', // Nord1 (State backgrounds)
              labelBackgroundColor: '#2e3440', // Nord0 (Label backgrounds)
              compositeBackground: '#434c5e', // Nord2 (Composite state background)
              compositeTitleBackground: '#2e3440', // Nord0 (Composite title background)

              // Sequence diagram elements
              actorBorder: '#5e81ac', // Nord10 (Actor borders)
              actorBkg: '#3b4252', // Nord1 (Actor backgrounds)
              actorTextColor: '#eceff4', // Nord6 (Actor text)
              actorLineColor: '#81a1c1', // Nord9 (Actor lifelines - brighter for visibility)
              signalColor: '#eceff4', // Nord6 (Signal lines)
              signalTextColor: '#eceff4', // Nord6 (Signal text)
              labelBoxBkgColor: '#2e3440', // Nord0 (Label box background)
              labelBoxBorderColor: '#5e81ac', // Nord10 (Label box border)
              labelTextColor: '#eceff4', // Nord6 (Label text)
              loopTextColor: '#eceff4', // Nord6 (Loop text)
              noteBorderColor: '#81a1c1', // Nord9 (Note borders)
              noteBkgColor: '#3b4252', // Nord1 (Note backgrounds)
              noteTextColor: '#eceff4', // Nord6 (Note text)

              // Class diagram styling
              classText: '#eceff4', // Nord6 (Class text)

              // Additional flowchart and general styling
              nodeBorder: '#81a1c1', // Nord9 (Node borders)
              clusterBkg: '#3b4252', // Nord1 (Cluster backgrounds)
              defaultLinkColor: '#81a1c1', // Nord9 (Default link color)
              titleColor: '#eceff4', // Nord6 (Title text)
              relationColor: '#81a1c1', // Nord9 (Relationship lines)

              // C4 diagram colors - Architecture clarity
              c4PersonBorder: '#5e81ac', // Nord10 (Users)
              c4SystemBorder: '#88c0d0', // Nord8 (Systems)
              c4ContainerBorder: '#8fbcbb', // Nord7 (Containers)
              c4ComponentBorder: '#a3be8c', // Nord14 (Components)

              // Additional enhancements for visual appeal
              quaternaryColor: '#a3be8c', // Nord14 (Green) - Additional color tier
            },
            // Enhanced configuration for better visual experience
            flowchart: {
              htmlLabels: true,
              curve: 'basis', // Smooth curves for elegant flow
            },
            sequence: {
              diagramMarginX: 50,
              diagramMarginY: 10,
              actorMargin: 50,
              width: 150,
              height: 65,
              boxMargin: 10,
              boxTextMargin: 5,
              noteMargin: 10,
              messageMargin: 35,
            },
            gantt: {
              gridLineStartPadding: 350,
              fontSize: 11,
              sectionFontSize: 24,
              numberSectionStyles: 4,
            },
          })

          // Clear previous content
          elementRef.current.innerHTML = ''

          // Generate unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

          // Render the diagram
          const { svg } = await mermaid.render(id, chart)
          elementRef.current.innerHTML = svg

          // Add meaningful edge animations and interactions
          const addEnhancedStyling = () => {
            const svgElement = elementRef.current?.querySelector('svg')
            if (svgElement) {
              // Add CSS for edge glow animations
              const style = document.createElement('style')
              style.textContent = `
                /* Flowing light animation along edges */
                @keyframes flowingLight {
                  0% { stroke-dashoffset: 20; opacity: 0.6; }
                  50% { opacity: 1; }
                  100% { stroke-dashoffset: 0; opacity: 0.6; }
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
              `
              document.head.appendChild(style)

              // Apply edge flowing animations
              const edges = svgElement.querySelectorAll(
                'path.edge-path, .edgePath path, .flowchart-link'
              )
              edges.forEach(edge => {
                const pathElement = edge as SVGPathElement

                // Set up flowing light effect
                pathElement.style.strokeDasharray = '4 2'
                pathElement.style.animation = 'flowingLight 3s ease-in-out infinite'
                pathElement.style.stroke = '#81a1c1'
                pathElement.style.strokeWidth = '2'

                // Add hover glow effect
                pathElement.addEventListener('mouseenter', () => {
                  pathElement.style.animation =
                    'edgeGlow 1.5s ease-in-out infinite, flowingLight 1.5s ease-in-out infinite'
                  pathElement.style.strokeWidth = '3'
                  pathElement.style.stroke = '#88c0d0'
                })

                pathElement.addEventListener('mouseleave', () => {
                  pathElement.style.animation = 'flowingLight 3s ease-in-out infinite'
                  pathElement.style.strokeWidth = '2'
                  pathElement.style.stroke = '#81a1c1'
                })
              })

              // Apply subtle breathing to nodes
              const nodes = svgElement.querySelectorAll(
                '.node rect, .node circle, .node ellipse, .flowchart-node'
              )
              nodes.forEach(node => {
                const nodeElement = node as SVGElement
                nodeElement.style.animation = 'nodeBreath 4s ease-in-out infinite'

                // Enhanced hover interaction
                nodeElement.addEventListener('mouseenter', () => {
                  nodeElement.style.animation = 'none'
                  nodeElement.style.filter =
                    'drop-shadow(0 0 12px rgba(94, 129, 172, 0.8)) brightness(1.1)'
                  nodeElement.style.transform = 'scale(1.02)'
                  nodeElement.style.transformOrigin = 'center'
                  nodeElement.style.transition = 'all 0.2s ease-out'
                })

                nodeElement.addEventListener('mouseleave', () => {
                  nodeElement.style.animation = 'nodeBreath 4s ease-in-out infinite'
                  nodeElement.style.filter = ''
                  nodeElement.style.transform = 'scale(1)'
                })
              })

              // Add arrow head glow animation
              const arrowHeads = svgElement.querySelectorAll('defs marker path, .arrowhead')
              arrowHeads.forEach(arrow => {
                const arrowElement = arrow as SVGElement
                arrowElement.style.animation = 'edgeGlow 2s ease-in-out infinite'
              })

              // Smooth entrance with meaningful transition
              svgElement.style.opacity = '0'
              svgElement.style.transition = 'opacity 0.8s ease-out'
              setTimeout(() => {
                svgElement.style.opacity = '1'
              }, 100)
            }
          }

          // Apply styling after a brief delay to ensure SVG is fully rendered
          setTimeout(addEnhancedStyling, 200)
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
