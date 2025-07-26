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
              curve: 'basis',
              useMaxWidth: true,
              nodeSpacing: 60,
              rankSpacing: 80,
              diagramPadding: 30,
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

          // ALWAYS pre-inject CSS to prevent color flash
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

              /* Pre-styled mermaid elements - Default golden edges */
              .mermaid-diagram svg path.edge-path,
              .mermaid-diagram svg .edgePath path,
              .mermaid-diagram svg .flowchart-link {
                stroke: #b8986d !important;
                stroke-width: 2 !important;
                stroke-dasharray: 4 2 !important;
                filter: drop-shadow(0 0 2px rgba(184, 152, 109, 0.3)) !important;
                animation: flowingLight 3s ease-in-out infinite !important;
                transition: all 0.3s ease-in-out !important;
                /* Ensure clean grid-style connections */
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

              /* === GROUP-AWARE EDGE STYLING === */
              
              /* Frontend to Backend connections - Blue to Cyan gradient */
              .mermaid-diagram svg path.edge-path[data-edge*="UI"],
              .mermaid-diagram svg path.edge-path[data-edge*="Frontend"],
              .mermaid-diagram svg path.edge-path[data-edge*="Client"] {
                stroke: #6b8db5 !important; /* Blue-Cyan blend */
                filter: drop-shadow(0 0 3px rgba(107, 141, 181, 0.4)) !important;
              }

              /* Backend to Service connections - Cyan to Teal gradient */
              .mermaid-diagram svg path.edge-path[data-edge*="API"],
              .mermaid-diagram svg path.edge-path[data-edge*="Server"],
              .mermaid-diagram svg path.edge-path[data-edge*="Backend"] {
                stroke: #8bc0d2 !important; /* Cyan-Teal blend */
                filter: drop-shadow(0 0 3px rgba(139, 192, 210, 0.4)) !important;
              }

              /* Service to Database connections - Teal to Green gradient */
              .mermaid-diagram svg path.edge-path[data-edge*="Service"],
              .mermaid-diagram svg path.edge-path[data-edge*="Business"] {
                stroke: #97bb9e !important; /* Teal-Green blend */
                filter: drop-shadow(0 0 3px rgba(151, 187, 158, 0.4)) !important;
              }

              /* Database internal connections - Green theme */
              .mermaid-diagram svg path.edge-path[data-edge*="DB"],
              .mermaid-diagram svg path.edge-path[data-edge*="Database"],
              .mermaid-diagram svg path.edge-path[data-edge*="Storage"] {
                stroke: #a3be8c !important; /* Nord14 Green */
                filter: drop-shadow(0 0 3px rgba(163, 190, 140, 0.5)) !important;
              }

              /* External API connections - Orange theme with emphasis */
              .mermaid-diagram svg path.edge-path[data-edge*="External"],
              .mermaid-diagram svg path.edge-path[data-edge*="Claude"],
              .mermaid-diagram svg path.edge-path[data-edge*="AI"],
              .mermaid-diagram svg path.edge-path[data-edge*="LLM"] {
                stroke: #d08770 !important; /* Nord12 Orange */
                stroke-width: 2.5 !important;
                filter: drop-shadow(0 0 4px rgba(208, 135, 112, 0.6)) !important;
                animation: flowingLight 2s ease-in-out infinite !important;
              }

              /* Critical/Error connections - Red theme with urgency */
              .mermaid-diagram svg path.edge-path[data-edge*="Error"],
              .mermaid-diagram svg path.edge-path[data-edge*="Critical"],
              .mermaid-diagram svg path.edge-path[data-edge*="Alert"] {
                stroke: #bf616a !important; /* Nord11 Red */
                stroke-width: 3 !important;
                filter: drop-shadow(0 0 5px rgba(191, 97, 106, 0.7)) !important;
                animation: edgeGlow 1s ease-in-out infinite !important;
              }

              /* Special/Queue connections - Purple theme */
              .mermaid-diagram svg path.edge-path[data-edge*="Queue"],
              .mermaid-diagram svg path.edge-path[data-edge*="Worker"],
              .mermaid-diagram svg path.edge-path[data-edge*="Special"] {
                stroke: #b48ead !important; /* Nord15 Purple */
                stroke-dasharray: 6 3 !important;
                filter: drop-shadow(0 0 3px rgba(180, 142, 173, 0.5)) !important;
              }

              /* Cross-layer connections with special styling */
              .mermaid-diagram svg path.edge-path[data-cross-layer="true"] {
                stroke: url(#crossLayerGradient) !important;
                stroke-width: 2.5 !important;
                stroke-dasharray: 8 4 !important;
                filter: drop-shadow(0 0 4px rgba(129, 161, 193, 0.6)) !important;
                animation: flowingLight 2.5s ease-in-out infinite !important;
              }

              /* Gradient definitions for cross-layer connections */
              .mermaid-diagram svg defs {
                /* This will be dynamically injected */
              }

              /* Group/Cluster basic styling - no fill to allow individual colors */
              .mermaid-diagram svg .cluster rect {
                stroke-width: 1.5 !important;
                rx: 8 !important;
                ry: 8 !important;
                filter: drop-shadow(0 2px 8px rgba(46, 52, 64, 0.3)) !important;
              }

              /* Dynamic group coloring - will be applied via JavaScript */

              /* Node type-based styling with semantic colors */
              .mermaid-diagram svg .node rect {
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

              /* Frontend/UI nodes - Blue theme */
              .mermaid-diagram svg .node[id*="UI"] rect,
              .mermaid-diagram svg .node[id*="React"] rect,
              .mermaid-diagram svg .node[id*="Frontend"] rect,
              .mermaid-diagram svg .node[id*="Client"] rect,
              .mermaid-diagram svg .node[id*="DT"] rect,
              .mermaid-diagram svg .node[id*="DocTree"] rect,
              .mermaid-diagram svg .node[id*="MP"] rect,
              .mermaid-diagram svg .node[id*="MarkdownPane"] rect,
              .mermaid-diagram svg .node[id*="CP"] rect,
              .mermaid-diagram svg .node[id*="ChatPane"] rect,
              .mermaid-diagram svg .node[id*="App"] rect,
              .mermaid-diagram svg .node[id*="DevClient"] rect,
              .mermaid-diagram svg .node[id*="Vite"] rect,
              .mermaid-diagram svg .node[id*="Tailwind"] rect,
              .mermaid-diagram svg .node[id*="ShadcnUI"] rect,
              .mermaid-diagram svg .node[id*="ReactMD"] rect,
              .mermaid-diagram svg .node[id*="Mermaid"] rect {
                fill: rgba(94, 129, 172, 0.15) !important; /* Nord10 */
                stroke: #5e81ac !important;
              }

              /* Backend/API nodes - Cyan theme */
              .mermaid-diagram svg .node[id*="API"] rect,
              .mermaid-diagram svg .node[id*="Server"] rect,
              .mermaid-diagram svg .node[id*="Backend"] rect,
              .mermaid-diagram svg .node[id*="FastAPI"] rect,
              .mermaid-diagram svg .node[id*="Routes"] rect,
              .mermaid-diagram svg .node[id*="FileAPI"] rect,
              .mermaid-diagram svg .node[id*="SearchAPI"] rect,
              .mermaid-diagram svg .node[id*="ChatAPI"] rect,
              .mermaid-diagram svg .node[id*="SyncAPI"] rect,
              .mermaid-diagram svg .node[id*="DevServer"] rect,
              .mermaid-diagram svg .node[id*="Uvicorn"] rect,
              .mermaid-diagram svg .node[id*="Pydantic"] rect,
              .mermaid-diagram svg .node[id*="AsyncIO"] rect {
                fill: rgba(136, 192, 208, 0.15) !important; /* Nord8 */
                stroke: #88c0d0 !important;
              }

              /* Service/Business logic nodes - Teal theme */
              .mermaid-diagram svg .node[id*="Service"] rect,
              .mermaid-diagram svg .node[id*="Business"] rect,
              .mermaid-diagram svg .node[id*="Logic"] rect,
              .mermaid-diagram svg .node[id*="FS"] rect,
              .mermaid-diagram svg .node[id*="SS"] rect,
              .mermaid-diagram svg .node[id*="CS"] rect,
              .mermaid-diagram svg .node[id*="SYS"] rect,
              .mermaid-diagram svg .node[id*="FW"] rect,
              .mermaid-diagram svg .node[id*="FileService"] rect,
              .mermaid-diagram svg .node[id*="SearchService"] rect,
              .mermaid-diagram svg .node[id*="ChatService"] rect,
              .mermaid-diagram svg .node[id*="SyncService"] rect,
              .mermaid-diagram svg .node[id*="QueueService"] rect,
              .mermaid-diagram svg .node[id*="FileWatcher"] rect,
              .mermaid-diagram svg .node[id*="TextSearch"] rect,
              .mermaid-diagram svg .node[id*="Watcher"] rect,
              .mermaid-diagram svg .node[id*="Watchdog"] rect {
                fill: rgba(143, 188, 187, 0.15) !important; /* Nord7 */
                stroke: #8fbcbb !important;
              }

              /* Database/Storage nodes - Green theme */
              .mermaid-diagram svg .node[id*="DB"] rect,
              .mermaid-diagram svg .node[id*="Database"] rect,
              .mermaid-diagram svg .node[id*="Storage"] rect,
              .mermaid-diagram svg .node[id*="Qdrant"] rect,
              .mermaid-diagram svg .node[id*="Redis"] rect,
              .mermaid-diagram svg .node[id*="QD"] rect,
              .mermaid-diagram svg .node[id*="RD"] rect,
              .mermaid-diagram svg .node[id*="MD"] rect,
              .mermaid-diagram svg .node[id*="MF"] rect,
              .mermaid-diagram svg .node[id*="Vector"] rect,
              .mermaid-diagram svg .node[id*="Queue"] rect,
              .mermaid-diagram svg .node[id*="RedisQueue"] rect,
              .mermaid-diagram svg .node[id*="QdrantDB"] rect,
              .mermaid-diagram svg .node[id*="DevRedis"] rect,
              .mermaid-diagram svg .node[id*="DevQdrant"] rect,
              .mermaid-diagram svg .node[id*="Files"] rect,
              .mermaid-diagram svg .node[id*="Docs"] rect,
              .mermaid-diagram svg .node[id*="Manifest"] rect,
              .mermaid-diagram svg .node[id*="Env"] rect {
                fill: rgba(163, 190, 140, 0.15) !important; /* Nord14 */
                stroke: #a3be8c !important;
              }

              /* External/Integration nodes - Orange theme */
              .mermaid-diagram svg .node[id*="External"] rect,
              .mermaid-diagram svg .node[id*="Claude"] rect,
              .mermaid-diagram svg .node[id*="AI"] rect,
              .mermaid-diagram svg .node[id*="LLM"] rect,
              .mermaid-diagram svg .node[id*="Voyage"] rect,
              .mermaid-diagram svg .node[id*="CC"] rect,
              .mermaid-diagram svg .node[id*="VA"] rect,
              .mermaid-diagram svg .node[id*="ClaudeSDK"] rect,
              .mermaid-diagram svg .node[id*="VoyageAI"] rect,
              .mermaid-diagram svg .node[id*="SSE"] rect {
                fill: rgba(208, 135, 112, 0.15) !important; /* Nord12 */
                stroke: #d08770 !important;
              }

              /* Development/Tools nodes - Yellow theme */
              .mermaid-diagram svg .node[id*="Docker"] rect,
              .mermaid-diagram svg .node[id*="Compose"] rect,
              .mermaid-diagram svg .node[id*="Python"] rect,
              .mermaid-diagram svg .node[id*="NodeJS"] rect,
              .mermaid-diagram svg .node[id*="pnpm"] rect,
              .mermaid-diagram svg .node[id*="UV"] rect {
                fill: rgba(235, 203, 139, 0.15) !important; /* Nord13 */
                stroke: #ebcb8b !important;
              }

              /* Security nodes - Red theme */
              .mermaid-diagram svg .node[id*="Error"] rect,
              .mermaid-diagram svg .node[id*="Critical"] rect,
              .mermaid-diagram svg .node[id*="Alert"] rect,
              .mermaid-diagram svg .node[id*="TLS"] rect,
              .mermaid-diagram svg .node[id*="ENV"] rect,
              .mermaid-diagram svg .node[id*="CORS"] rect,
              .mermaid-diagram svg .node[id*="Rate"] rect {
                fill: rgba(191, 97, 106, 0.15) !important; /* Nord11 */
                stroke: #bf616a !important;
              }

              /* Special/Advanced nodes - Purple theme */
              .mermaid-diagram svg .node[id*="Special"] rect,
              .mermaid-diagram svg .node[id*="Advanced"] rect,
              .mermaid-diagram svg .node[id*="Worker"] rect {
                fill: rgba(180, 142, 173, 0.15) !important; /* Nord15 */
                stroke: #b48ead !important;
              }

              .mermaid-diagram svg defs marker path,
              .mermaid-diagram svg .arrowhead {
                animation: edgeGlow 2s ease-in-out infinite !important;
              }

              /* === SEQUENCE DIAGRAM STYLING === */
              
              /* Actor styling with elegant appearance */
              .mermaid-diagram svg .actor {
                filter: drop-shadow(0 2px 8px rgba(46, 52, 64, 0.3)) !important;
              }
              
              .mermaid-diagram svg .actor rect {
                fill: #5e81ac !important; /* Nord10 - Solid color to hide lines */
                stroke: #81a1c1 !important; /* Nord9 - Lighter border */
                stroke-width: 2 !important;
                rx: 8 !important;
                ry: 8 !important;
                fill-opacity: 1 !important;
                animation: nodeBreath 5s ease-in-out infinite !important;
              }
              
              /* Ensure lifelines are behind actors */
              .mermaid-diagram svg g[id*="actor"] {
                z-index: 10 !important;
              }
              
              /* Push lifelines down */
              .mermaid-diagram svg .actor-line {
                transform: translateY(2px) !important;
              }

              /* Lifeline styling with pulsing effect */
              .mermaid-diagram svg .actor-line {
                stroke: #81a1c1 !important;
                stroke-width: 2 !important;
                stroke-dasharray: 2 4 !important;
                animation: flowingLight 4s ease-in-out infinite !important;
                opacity: 0.7 !important;
              }

              /* Message lines with directional flow */
              .mermaid-diagram svg .messageLine0,
              .mermaid-diagram svg .messageLine1 {
                stroke: #b8986d !important;
                stroke-width: 2.5 !important;
                animation: flowingLight 2.5s ease-in-out infinite !important;
                filter: drop-shadow(0 0 3px rgba(184, 152, 109, 0.4)) !important;
              }

              /* Activation boxes with subtle glow */
              .mermaid-diagram svg .activation0,
              .mermaid-diagram svg .activation1,
              .mermaid-diagram svg .activation2 {
                fill: rgba(136, 192, 208, 0.15) !important; /* Nord8 */
                stroke: #88c0d0 !important;
                stroke-width: 1.5 !important;
                rx: 4 !important;
                filter: drop-shadow(0 1px 6px rgba(136, 192, 208, 0.3)) !important;
                animation: nodeBreath 3s ease-in-out infinite !important;
              }

              /* Note styling for sequence diagrams */
              .mermaid-diagram svg .note {
                fill: rgba(235, 203, 139, 0.12) !important; /* Nord13 - Yellow */
                stroke: #ebcb8b !important;
                stroke-width: 1.5 !important;
                rx: 6 !important;
                ry: 6 !important;
                filter: drop-shadow(0 2px 6px rgba(235, 203, 139, 0.3)) !important;
              }

              /* === GANTT CHART STYLING === */
              
              /* Task bars with progress indication */
              .mermaid-diagram svg .task {
                rx: 4 !important;
                ry: 4 !important;
                filter: drop-shadow(0 1px 4px rgba(46, 52, 64, 0.2)) !important;
              }

              .mermaid-diagram svg .task.task0 {
                fill: rgba(94, 129, 172, 0.8) !important; /* Nord10 */
                stroke: #5e81ac !important;
              }

              .mermaid-diagram svg .task.task1 {
                fill: rgba(136, 192, 208, 0.8) !important; /* Nord8 */
                stroke: #88c0d0 !important;
              }

              .mermaid-diagram svg .task.task2 {
                fill: rgba(143, 188, 187, 0.8) !important; /* Nord7 */
                stroke: #8fbcbb !important;
              }

              .mermaid-diagram svg .task.task3 {
                fill: rgba(163, 190, 140, 0.8) !important; /* Nord14 */
                stroke: #a3be8c !important;
              }

              /* Grid lines for Gantt charts */
              .mermaid-diagram svg .grid .tick line {
                stroke: rgba(76, 86, 106, 0.3) !important; /* Nord3 */
                stroke-width: 0.5 !important;
              }

              /* Today line in Gantt charts */
              .mermaid-diagram svg .today {
                stroke: #bf616a !important; /* Nord11 - Red */
                stroke-width: 3 !important;
                filter: drop-shadow(0 0 6px rgba(191, 97, 106, 0.6)) !important;
                animation: edgeGlow 2s ease-in-out infinite !important;
              }

              /* === STATE DIAGRAM STYLING === */
              
              /* State nodes with different shapes */
              .mermaid-diagram svg .stateGroup .state-title {
                fill: #eceff4 !important; /* Nord6 */
                font-weight: 600 !important;
              }

              .mermaid-diagram svg .state rect {
                fill: rgba(143, 188, 187, 0.12) !important; /* Nord7 */
                stroke: #8fbcbb !important;
                stroke-width: 2 !important;
                rx: 8 !important;
                ry: 8 !important;
                filter: drop-shadow(0 2px 6px rgba(143, 188, 187, 0.3)) !important;
                animation: nodeBreath 4.5s ease-in-out infinite !important;
              }

              /* Start/End states with special styling */
              .mermaid-diagram svg .start-state circle,
              .mermaid-diagram svg .end-state circle {
                fill: rgba(163, 190, 140, 0.8) !important; /* Nord14 */
                stroke: #a3be8c !important;
                stroke-width: 3 !important;
                filter: drop-shadow(0 0 8px rgba(163, 190, 140, 0.6)) !important;
                animation: edgeGlow 3s ease-in-out infinite !important;
              }

              /* Transition arrows for state diagrams */
              .mermaid-diagram svg .transition {
                stroke: #b8986d !important;
                stroke-width: 2 !important;
                animation: flowingLight 3.5s ease-in-out infinite !important;
                filter: drop-shadow(0 0 3px rgba(184, 152, 109, 0.4)) !important;
              }

              /* === CLASS DIAGRAM STYLING === */
              
              /* Class boxes with professional appearance */
              .mermaid-diagram svg .classGroup rect {
                fill: rgba(94, 129, 172, 0.1) !important; /* Nord10 */
                stroke: #5e81ac !important;
                stroke-width: 2 !important;
                rx: 6 !important;
                ry: 6 !important;
                filter: drop-shadow(0 2px 8px rgba(94, 129, 172, 0.2)) !important;
                animation: nodeBreath 5s ease-in-out infinite !important;
              }

              /* Interface classes with different styling */
              .mermaid-diagram svg .classGroup.interface rect {
                fill: rgba(180, 142, 173, 0.1) !important; /* Nord15 */
                stroke: #b48ead !important;
                stroke-dasharray: 3 2 !important;
              }

              /* Abstract classes */
              .mermaid-diagram svg .classGroup.abstract rect {
                fill: rgba(208, 135, 112, 0.1) !important; /* Nord12 */
                stroke: #d08770 !important;
                stroke-dasharray: 5 3 !important;
              }

              /* Relationship lines in class diagrams */
              .mermaid-diagram svg .relation {
                stroke: #81a1c1 !important;
                stroke-width: 1.5 !important;
                animation: flowingLight 4s ease-in-out infinite !important;
              }
              
              /* === NOTE TEXT STYLING === */
              
              /* Note labels in diagrams */
              .mermaid-diagram svg .noteText {
                fill: #d8dee9 !important; /* Nord4 */
                font-size: 14px !important;
                font-style: italic !important;
                opacity: 0.9 !important;
              }
              
              .mermaid-diagram svg .note {
                fill: rgba(67, 76, 94, 0.3) !important; /* Nord2 */
                stroke: #4c566a !important;
                stroke-width: 1 !important;
                rx: 6 !important;
                ry: 6 !important;
              }
              
              /* Make all text more readable */
              .mermaid-diagram svg text {
                fill: #e5e9f0 !important; /* Nord5 */
                font-weight: 500 !important;
              }
              
              .mermaid-diagram svg .nodeLabel {
                fill: #eceff4 !important; /* Nord6 */
                font-weight: 600 !important;
              }
              
              /* Allow nodes to expand for content */
              .mermaid-diagram svg .node rect {
                min-width: 100px !important;
                min-height: 40px !important;
              }
              
              /* Center text vertically and horizontally in nodes */
              .mermaid-diagram svg .node text {
                dominant-baseline: middle !important;
                text-anchor: middle !important;
              }
              
              .mermaid-diagram svg .node .nodeLabel {
                dominant-baseline: middle !important;
                text-anchor: middle !important;
              }
              
              /* HTML labels for better text wrapping */
              .mermaid-diagram svg .node foreignObject {
                overflow: visible !important;
              }
              
              .mermaid-diagram svg .node foreignObject > div {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                height: 100% !important;
                padding: 4px 8px !important;
                text-align: center !important;
                color: #eceff4 !important;
                font-weight: 600 !important;
              }

              /* === PIE CHART STYLING === */
              
              .mermaid-diagram svg .pie-slice {
                filter: drop-shadow(0 2px 4px rgba(46, 52, 64, 0.2)) !important;
                transition: all 0.3s ease-out !important;
              }

              .mermaid-diagram svg .pie-slice:hover {
                filter: drop-shadow(0 4px 12px rgba(46, 52, 64, 0.4)) brightness(1.1) !important;
                transform: scale(1.02) !important;
                transform-origin: center !important;
              }

              /* === GITGRAPH STYLING === */
              
              .mermaid-diagram svg .commit-dot {
                r: 6 !important;
                stroke-width: 3 !important;
                filter: drop-shadow(0 1px 4px rgba(46, 52, 64, 0.3)) !important;
                animation: nodeBreath 4s ease-in-out infinite !important;
              }

              .mermaid-diagram svg .branch0 {
                stroke: #5e81ac !important; /* Nord10 */
                stroke-width: 4 !important;
              }

              .mermaid-diagram svg .branch1 {
                stroke: #88c0d0 !important; /* Nord8 */
                stroke-width: 4 !important;
              }

              .mermaid-diagram svg .branch2 {
                stroke: #8fbcbb !important; /* Nord7 */
                stroke-width: 4 !important;
              }
            `
          document.head.appendChild(style)

          // Render the diagram with pre-styled CSS
          const { svg } = await mermaid.render(id, chart)

          // Temporarily hide to prevent color flash during styling
          elementRef.current.style.visibility = 'hidden'
          elementRef.current.innerHTML = svg

          // Add dynamic edge coloring based on node relationships
          const addDynamicEdgeColoring = () => {
            const svgElement = elementRef.current?.querySelector('svg')
            if (!svgElement) return

            // Detect diagram type based on SVG content
            const hasFlowchartElements = svgElement.querySelector('.flowchart-link') !== null
            const hasSequenceElements =
              svgElement.querySelector('.actor, .messageLine0, .messageLine1') !== null

            // console.log(`Diagram type detection: flowchart=${hasFlowchartElements}, sequence=${hasSequenceElements}`)

            // Create gradient definitions for cross-layer connections
            const defs =
              svgElement.querySelector('defs') ||
              svgElement.insertBefore(
                document.createElementNS('http://www.w3.org/2000/svg', 'defs'),
                svgElement.firstChild
              )

            // Add cross-layer gradient
            const crossLayerGradient = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'linearGradient'
            )
            crossLayerGradient.id = 'crossLayerGradient'
            crossLayerGradient.innerHTML = `
              <stop offset="0%" style="stop-color:#5e81ac;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#88c0d0;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#8fbcbb;stop-opacity:1" />
            `
            defs.appendChild(crossLayerGradient)

            // Get all nodes and edges for relationship analysis
            const nodes = svgElement.querySelectorAll('.node')
            const edges = svgElement.querySelectorAll(
              'path.edge-path, .edgePath path, path.flowchart-link'
            )

            // Create node type mapping
            const nodeTypes = new Map()
            nodes.forEach(node => {
              const nodeId = node.id || node.getAttribute('data-id') || ''
              let type = 'default'

              if (
                nodeId.includes('UI') ||
                nodeId.includes('React') ||
                nodeId.includes('Frontend') ||
                nodeId.includes('Client')
              ) {
                type = 'frontend'
              } else if (
                nodeId.includes('API') ||
                nodeId.includes('Server') ||
                nodeId.includes('Backend') ||
                nodeId.includes('FastAPI')
              ) {
                type = 'backend'
              } else if (
                nodeId.includes('Service') ||
                nodeId.includes('Business') ||
                nodeId.includes('Logic')
              ) {
                type = 'service'
              } else if (
                nodeId.includes('DB') ||
                nodeId.includes('Database') ||
                nodeId.includes('Storage') ||
                nodeId.includes('Qdrant') ||
                nodeId.includes('Redis')
              ) {
                type = 'database'
              } else if (
                nodeId.includes('External') ||
                nodeId.includes('Claude') ||
                nodeId.includes('AI') ||
                nodeId.includes('LLM') ||
                nodeId.includes('Voyage')
              ) {
                type = 'external'
              } else if (
                nodeId.includes('Error') ||
                nodeId.includes('Critical') ||
                nodeId.includes('Alert')
              ) {
                type = 'critical'
              } else if (
                nodeId.includes('Queue') ||
                nodeId.includes('Worker') ||
                nodeId.includes('Special')
              ) {
                type = 'special'
              }

              nodeTypes.set(nodeId, type)
            })

            // Apply edge coloring based on CSS class names (LS-source LE-target pattern)
            const applyClassBasedEdgeColors = () => {
              // Check if this is a flowchart (has LS-/LE- pattern edges)
              const isFlowchart = Array.from(edges).some(edge => {
                const className = (edge as SVGElement).className.baseVal || ''
                return className.includes('LS-') && className.includes('LE-')
              })

              // Only apply class-based coloring to flowcharts
              if (!isFlowchart) {
                // console.log('🎨 Not a flowchart, skipping class-based edge coloring')
                return
              }

              // console.log('🎨 New Approach: CSS class-based edge coloring...')
              // console.log(`🎨 Total edges found: ${edges.length}`)

              // If no edges found with initial selectors, return early
              if (edges.length === 0) {
                // console.log('🎨 No flowchart edges found')
                return
              }

              // Define node type to color mapping based on semantic analysis
              const nodeTypeColors = {
                // Frontend components - Blue theme
                UI: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' }, // Nord10 Blue
                DT: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' },
                MP: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' },
                CP: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' },
                DocTree: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                MarkdownPane: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                ChatPane: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                App: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' },
                React: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                Vite: { stroke: '#5e81ac', filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))' },
                Tailwind: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                ShadcnUI: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                ReactMD: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                Mermaid: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                MermaidDiagram: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                Client: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },
                DevClient: {
                  stroke: '#5e81ac',
                  filter: 'drop-shadow(0 0 3px rgba(94, 129, 172, 0.5))',
                },

                // Backend API layer - Cyan theme
                API: { stroke: '#88c0d0', filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))' }, // Nord8 Cyan
                FastAPI: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                Routes: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                Middleware: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                FileAPI: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                SearchAPI: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                ChatAPI: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                SyncAPI: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                Server: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                DevServer: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                Uvicorn: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                Pydantic: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },
                AsyncIO: {
                  stroke: '#88c0d0',
                  filter: 'drop-shadow(0 0 3px rgba(136, 192, 208, 0.5))',
                },

                // Services layer - Teal theme
                FS: { stroke: '#8fbcbb', filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))' }, // Nord7 Teal
                SS: { stroke: '#8fbcbb', filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))' },
                CS: { stroke: '#8fbcbb', filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))' },
                SYS: { stroke: '#8fbcbb', filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))' },
                FW: { stroke: '#8fbcbb', filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))' },
                FileService: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                SearchService: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                ChatService: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                SyncService: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                QueueService: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                Search: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                TextSearch: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                Watcher: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },
                Watchdog: {
                  stroke: '#8fbcbb',
                  filter: 'drop-shadow(0 0 3px rgba(143, 188, 187, 0.5))',
                },

                // Database/Storage - Green theme
                QD: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' }, // Nord14 Green
                RD: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' },
                MD: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' },
                MF: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' },
                Qdrant: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Redis: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Queue: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                RedisQueue: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                QdrantDB: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                DevRedis: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                DevQdrant: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Vector: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Files: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Docs: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Manifest: {
                  stroke: '#a3be8c',
                  filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))',
                },
                Env: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' },
                DB: { stroke: '#a3be8c', filter: 'drop-shadow(0 0 3px rgba(163, 190, 140, 0.5))' },

                // External APIs - Orange theme
                CC: { stroke: '#d08770', filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))' }, // Nord12 Orange
                VA: { stroke: '#d08770', filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))' },
                Claude: {
                  stroke: '#d08770',
                  filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))',
                },
                ClaudeSDK: {
                  stroke: '#d08770',
                  filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))',
                },
                Voyage: {
                  stroke: '#d08770',
                  filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))',
                },
                VoyageAI: {
                  stroke: '#d08770',
                  filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))',
                },
                LLM: { stroke: '#d08770', filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))' },
                SSE: { stroke: '#d08770', filter: 'drop-shadow(0 0 3px rgba(208, 135, 112, 0.5))' },

                // Development/Tools - Yellow theme
                Docker: {
                  stroke: '#ebcb8b',
                  filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))',
                }, // Nord13 Yellow
                Compose: {
                  stroke: '#ebcb8b',
                  filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))',
                },
                Python: {
                  stroke: '#ebcb8b',
                  filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))',
                },
                NodeJS: {
                  stroke: '#ebcb8b',
                  filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))',
                },
                pnpm: {
                  stroke: '#ebcb8b',
                  filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))',
                },
                UV: { stroke: '#ebcb8b', filter: 'drop-shadow(0 0 3px rgba(235, 203, 139, 0.5))' },

                // Security - Red theme
                TLS: { stroke: '#bf616a', filter: 'drop-shadow(0 0 3px rgba(191, 97, 106, 0.5))' }, // Nord11 Red
                ENV: { stroke: '#bf616a', filter: 'drop-shadow(0 0 3px rgba(191, 97, 106, 0.5))' },
                CORS: { stroke: '#bf616a', filter: 'drop-shadow(0 0 3px rgba(191, 97, 106, 0.5))' },
                Rate: { stroke: '#bf616a', filter: 'drop-shadow(0 0 3px rgba(191, 97, 106, 0.5))' },

                // Infrastructure/Monitoring - Purple theme
                FileWatcher: {
                  stroke: '#b48ead',
                  filter: 'drop-shadow(0 0 3px rgba(180, 142, 173, 0.5))',
                }, // Nord15 Purple
              }

              let successfulMappings = 0

              edges.forEach(edge => {
                const edgeElement = edge as SVGPathElement
                const edgeClasses = edgeElement.className.baseVal || ''
                // console.log(`🎨 Edge ${edgeIndex}: classes="${edgeClasses}"`)

                // Extract source node from LS-source pattern
                const sourceMatch = edgeClasses.match(/LS-(\w+)/)
                if (sourceMatch) {
                  const sourceNode = sourceMatch[1]
                  // console.log(`🎨 Found source node: ${sourceNode}`)

                  // Apply color based on source node type
                  const color = nodeTypeColors[sourceNode as keyof typeof nodeTypeColors]
                  if (color) {
                    edgeElement.style.setProperty('stroke', color.stroke, 'important')
                    edgeElement.style.setProperty('filter', color.filter, 'important')
                    edgeElement.style.setProperty('stroke-width', '1.8', 'important')
                    // console.log(`✅ Applied ${sourceNode} color (${color.stroke}) to edge`)
                    successfulMappings++
                  } else {
                    // Fallback to golden color for unknown types
                    edgeElement.style.setProperty('stroke', '#b8986d', 'important')
                    edgeElement.style.setProperty(
                      'filter',
                      'drop-shadow(0 0 2px rgba(184, 152, 109, 0.3))',
                      'important'
                    )
                    edgeElement.style.setProperty('stroke-width', '1.8', 'important')
                    // console.log(`⚠️ Applied fallback color for unknown source: ${sourceNode}`)
                  }
                } else {
                  // No source found, use default golden
                  edgeElement.style.setProperty('stroke', '#b8986d', 'important')
                  edgeElement.style.setProperty(
                    'filter',
                    'drop-shadow(0 0 2px rgba(184, 152, 109, 0.3))',
                    'important'
                  )
                  edgeElement.style.setProperty('stroke-width', '1.8', 'important')
                  // console.log(`⚠️ No source pattern found in: ${edgeClasses}`)
                }

                // Add flowing animation and professional styling
                edgeElement.style.setProperty('stroke-linecap', 'round', 'important')
                edgeElement.style.setProperty('stroke-linejoin', 'round', 'important')
                edgeElement.style.setProperty('stroke-dasharray', '4 6', 'important')
                edgeElement.style.setProperty(
                  'animation',
                  'flowingLight 0.8s linear infinite',
                  'important'
                )
              })

              // console.log(`🎯 Class-based Summary: Successfully mapped ${successfulMappings}/${edges.length} edges`)
            }

            // Apply styling based on diagram type
            if (hasSequenceElements && !hasFlowchartElements) {
              // Add subtle background to the entire sequence diagram
              const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
              backgroundRect.setAttribute('x', '0')
              backgroundRect.setAttribute('y', '0')
              backgroundRect.setAttribute('width', '100%')
              backgroundRect.setAttribute('height', '100%')
              backgroundRect.style.fill = 'rgba(46, 52, 64, 0.3)' // Nord0 with low opacity
              backgroundRect.style.pointerEvents = 'none'
              svgElement.insertBefore(backgroundRect, svgElement.firstChild)

              // SEQUENCE DIAGRAM: Apply consistent golden styling for message lines only
              const messageLines = svgElement.querySelectorAll(
                'path.messageLine0, path.messageLine1, line.messageLine0, line.messageLine1'
              )
              messageLines.forEach(line => {
                const lineElement = line as SVGElement
                lineElement.style.setProperty('stroke', '#b8986d', 'important') // Consistent golden
                lineElement.style.setProperty('stroke-width', '1.8', 'important')
                lineElement.style.setProperty(
                  'filter',
                  'drop-shadow(0 0 3px rgba(184, 152, 109, 0.4))',
                  'important'
                )
                lineElement.style.setProperty(
                  'animation',
                  'flowingLight 0.8s linear infinite',
                  'important'
                )
              })

              // Style loop lines separately (the actual loop box borders)
              const loopLines = svgElement.querySelectorAll('line.loopLine')
              loopLines.forEach(line => {
                const lineElement = line as SVGElement
                lineElement.style.setProperty('stroke', '#81a1c1', 'important') // Nord9 - Lighter blue
                lineElement.style.setProperty('stroke-width', '2', 'important')
                lineElement.style.setProperty('stroke-dasharray', '8, 4', 'important') // Dashed line
                lineElement.style.setProperty(
                  'filter',
                  'drop-shadow(0 0 3px rgba(129, 161, 193, 0.4))',
                  'important'
                )
              })

              // Style loop label boxes
              const loopLabelBoxes = svgElement.querySelectorAll('polygon.labelBox')
              loopLabelBoxes.forEach(box => {
                const boxElement = box as SVGElement
                boxElement.style.setProperty('fill', 'rgba(94, 129, 172, 0.15)', 'important') // Nord10 transparent
                boxElement.style.setProperty('stroke', '#5e81ac', 'important') // Nord10
                boxElement.style.setProperty('stroke-width', '1.5', 'important')
              })

              // Style loop text
              const loopTexts = svgElement.querySelectorAll('text.labelText, text.loopText')
              loopTexts.forEach(text => {
                const textElement = text as SVGElement
                textElement.style.setProperty('fill', '#d8dee9', 'important') // Nord4 - Lighter for better contrast
              })

              // Style actor text
              const actorTexts = svgElement.querySelectorAll('.actor + text, text.actor')
              actorTexts.forEach(text => {
                const textElement = text as SVGTextElement
                textElement.style.setProperty('fill', '#eceff4', 'important') // Nord6 - Light text for dark background
                textElement.style.setProperty('font-weight', '600', 'important')
              })

              // Fix lifeline penetration by modifying the lifelines directly
              const actors = svgElement.querySelectorAll('.actor')
              const lifelines = svgElement.querySelectorAll('.actor-line')

              // Create a map of actor positions
              const actorBounds = new Map()
              actors.forEach(actor => {
                const rect = actor as SVGRectElement
                const x = parseFloat(rect.getAttribute('x') || '0')
                const y = parseFloat(rect.getAttribute('y') || '0')
                const width = parseFloat(rect.getAttribute('width') || '0')
                const height = parseFloat(rect.getAttribute('height') || '0')
                const cx = x + width / 2 // center x

                actorBounds.set(actor, {
                  x,
                  y,
                  width,
                  height,
                  cx,
                  bottom: y + height,
                })
              })

              // Adjust lifelines to start below actor boxes
              lifelines.forEach(line => {
                const lineElement = line as SVGLineElement
                const x1 = parseFloat(lineElement.getAttribute('x1') || '0')

                // Find the corresponding actor box
                let matchingActor = null
                let minDistance = Infinity

                actorBounds.forEach((bounds, actor) => {
                  const distance = Math.abs(bounds.cx - x1)
                  if (distance < minDistance && distance < 10) {
                    // 10px tolerance
                    minDistance = distance
                    matchingActor = bounds
                  }
                })

                if (matchingActor) {
                  // Move the line start point to below the actor box
                  lineElement.setAttribute('y1', (matchingActor.bottom + 5).toString())
                }
              })

              // Style activation boxes with subtle transparency
              const activationBoxes = svgElement.querySelectorAll(
                '.activation0, .activation1, .activation2'
              )
              activationBoxes.forEach(box => {
                const boxElement = box as SVGElement
                boxElement.style.setProperty('fill', 'rgba(136, 192, 208, 0.15)', 'important') // Nord8 slightly more visible
                boxElement.style.setProperty('stroke', '#88c0d0', 'important') // Nord8
                boxElement.style.setProperty('stroke-width', '1.5', 'important')
                boxElement.style.setProperty(
                  'filter',
                  'drop-shadow(0 0 2px rgba(136, 192, 208, 0.3))',
                  'important'
                )
              })

              // console.log('Applied sequence diagram styling')
            } else if (hasFlowchartElements) {
              // FLOWCHART: Apply class-based edge coloring
              applyClassBasedEdgeColors()
              // console.log('Applied flowchart styling')
            } else {
              // OTHER DIAGRAMS: Apply default golden styling to edges only
              const otherEdges = svgElement.querySelectorAll(
                'path[d]:not([class*="actor"]):not([class*="note"]):not([class*="activation"])'
              )
              otherEdges.forEach(edge => {
                const edgeElement = edge as SVGPathElement
                // Check if it's likely an edge by looking at the path data
                const pathData = edgeElement.getAttribute('d') || ''
                if (pathData.includes('M') && (pathData.includes('L') || pathData.includes('C'))) {
                  edgeElement.style.setProperty('stroke', '#b8986d', 'important')
                  edgeElement.style.setProperty('stroke-width', '1.8', 'important')
                  edgeElement.style.setProperty(
                    'filter',
                    'drop-shadow(0 0 2px rgba(184, 152, 109, 0.3))',
                    'important'
                  )
                  edgeElement.style.setProperty(
                    'animation',
                    'flowingLight 0.8s linear infinite',
                    'important'
                  )
                }
              })
              // console.log('Applied default styling to other diagram type')
            }

            // Apply dynamic subgraph coloring (only for flowcharts)
            const applySubgraphColors = () => {
              // Only apply subgraph coloring to flowcharts
              if (!hasFlowchartElements || hasSequenceElements) {
                return
              }

              // Try multiple selectors to find subgraph elements
              const possibleSelectors = [
                '.cluster rect',
                'g[id*="cluster"] rect',
                'g[class*="cluster"] rect',
                '.subgraph rect',
                'g[id*="subgraph"] rect',
                'rect[class*="cluster"]',
              ]

              let clusters: NodeList | null = null
              for (const selector of possibleSelectors) {
                clusters = svgElement.querySelectorAll(selector)
                if (clusters.length > 0) {
                  console.log(`Found ${clusters.length} clusters with selector: ${selector}`)
                  break
                }
              }

              if (!clusters || clusters.length === 0) {
                console.log('No cluster elements found, checking all rects...')
                // Debug: log all rect elements to see what's available
                const allRects = svgElement.querySelectorAll('rect')
                allRects.forEach((rect, i) => {
                  const rectElement = rect as SVGRectElement
                  const parentElement = rectElement.parentElement
                  const parentClassName =
                    parentElement &&
                    'className' in parentElement &&
                    parentElement.className &&
                    typeof parentElement.className === 'object' &&
                    'baseVal' in parentElement.className
                      ? (parentElement.className as SVGAnimatedString).baseVal
                      : ''
                  console.log(
                    `Rect ${i}:`,
                    rectElement.className.baseVal,
                    rectElement.id,
                    parentClassName
                  )
                })
                return
              }

              const subgraphColors = [
                { fill: 'rgba(94, 129, 172, 0.06)', stroke: 'rgba(94, 129, 172, 0.25)' }, // Nord10 Blue
                { fill: 'rgba(136, 192, 208, 0.06)', stroke: 'rgba(136, 192, 208, 0.25)' }, // Nord8 Cyan
                { fill: 'rgba(143, 188, 187, 0.06)', stroke: 'rgba(143, 188, 187, 0.25)' }, // Nord7 Teal
                { fill: 'rgba(163, 190, 140, 0.06)', stroke: 'rgba(163, 190, 140, 0.25)' }, // Nord14 Green
                { fill: 'rgba(235, 203, 139, 0.06)', stroke: 'rgba(235, 203, 139, 0.25)' }, // Nord13 Yellow
                { fill: 'rgba(208, 135, 112, 0.06)', stroke: 'rgba(208, 135, 112, 0.25)' }, // Nord12 Orange
                { fill: 'rgba(180, 142, 173, 0.06)', stroke: 'rgba(180, 142, 173, 0.25)' }, // Nord15 Purple
              ]

              clusters.forEach((cluster, index) => {
                const colorIndex = index % subgraphColors.length
                const colors = subgraphColors[colorIndex]
                const clusterElement = cluster as SVGElement

                clusterElement.style.setProperty('fill', colors.fill, 'important')
                clusterElement.style.setProperty('stroke', colors.stroke, 'important')
                clusterElement.style.setProperty('stroke-width', '1.5', 'important')

                console.log(`Applied color ${colorIndex} to cluster ${index}`)
              })
            }

            // Apply subgraph coloring immediately
            applySubgraphColors()

            // Apply padding to subgraph text and labels
            const applySubgraphTextPadding = () => {
              if (!hasFlowchartElements || hasSequenceElements) {
                return
              }

              // Find all subgraph/cluster groups
              const subgraphs = svgElement.querySelectorAll(
                'g[id*="subgraph"], g[id*="cluster"], .cluster, .subgraph'
              )

              subgraphs.forEach(subgraph => {
                // Find the rect element within the subgraph
                const rect = subgraph.querySelector('rect')
                if (rect) {
                  // Get current dimensions
                  const currentX = parseFloat(rect.getAttribute('x') || '0')
                  const currentY = parseFloat(rect.getAttribute('y') || '0')
                  const currentWidth = parseFloat(rect.getAttribute('width') || '0')
                  const currentHeight = parseFloat(rect.getAttribute('height') || '0')

                  // Add padding by adjusting rect position and size
                  const padding = 15
                  rect.setAttribute('x', (currentX - padding).toString())
                  rect.setAttribute('y', (currentY - padding).toString())
                  rect.setAttribute('width', (currentWidth + padding * 2).toString())
                  rect.setAttribute('height', (currentHeight + padding * 2).toString())
                }

                // Style the subgraph title text
                const titleText = subgraph.querySelector(
                  'text.cluster-label, text[id*="label"], text'
                )
                if (titleText) {
                  const textElement = titleText as SVGTextElement
                  textElement.style.setProperty('font-weight', '600', 'important')
                  textElement.style.setProperty('font-size', '14px', 'important')
                  textElement.style.setProperty('fill', '#d8dee9', 'important') // Nord4

                  // Move title text up a bit for better spacing
                  const currentTextY = parseFloat(textElement.getAttribute('y') || '0')
                  textElement.setAttribute('y', (currentTextY - 5).toString())
                }
              })
            }

            applySubgraphTextPadding()

            // Dynamically adjust node sizes for long text
            const adjustNodeSizesForLongText = () => {
              try {
                // Only process flowchart nodes
                if (!hasFlowchartElements || hasSequenceElements) {
                  return
                }

                // Wait for rendering to complete
                requestAnimationFrame(() => {
                  const nodes = svgElement.querySelectorAll('.node')

                  nodes.forEach(node => {
                    const nodeGroup = node as SVGGElement
                    const rect = nodeGroup.querySelector('rect')
                    const textElements = nodeGroup.querySelectorAll('text, .nodeLabel')

                    if (!rect || textElements.length === 0) return

                    const rectElement = rect as SVGRectElement

                    // Get current rect dimensions
                    const currentWidth = parseFloat(rectElement.getAttribute('width') || '100')
                    const currentHeight = parseFloat(rectElement.getAttribute('height') || '40')
                    const currentX = parseFloat(rectElement.getAttribute('x') || '0')
                    const currentY = parseFloat(rectElement.getAttribute('y') || '0')

                    // Find the maximum text width
                    let maxTextWidth = 0
                    let totalTextHeight = 0

                    textElements.forEach(text => {
                      try {
                        const textElement = text as SVGTextElement
                        const bbox = textElement.getBBox()
                        if (bbox.width > maxTextWidth) {
                          maxTextWidth = bbox.width
                        }
                        totalTextHeight += bbox.height
                      } catch (e) {
                        // Ignore getBBox errors
                      }
                    })

                    // Add padding
                    const paddingX = 24
                    const paddingY = 16

                    // Calculate required dimensions
                    const requiredWidth = maxTextWidth + paddingX * 2
                    const requiredHeight = Math.max(totalTextHeight + paddingY * 2, 50)

                    // Only adjust if text is larger than current box
                    if (requiredWidth > currentWidth) {
                      const widthDiff = requiredWidth - currentWidth
                      rectElement.setAttribute('width', requiredWidth.toString())
                      rectElement.setAttribute('x', (currentX - widthDiff / 2).toString())
                    }

                    if (requiredHeight > currentHeight) {
                      const heightDiff = requiredHeight - currentHeight
                      rectElement.setAttribute('height', requiredHeight.toString())
                      rectElement.setAttribute('y', (currentY - heightDiff / 2).toString())
                    }
                  })
                })
              } catch (error) {
                // Silently ignore errors to prevent diagram rendering issues
                console.debug('Node size adjustment skipped:', error)
              }
            }

            // Execute after a delay to ensure Mermaid has finished rendering
            setTimeout(adjustNodeSizesForLongText, 200)
          }

          // Apply dynamic coloring immediately to prevent color flash
          addDynamicEdgeColoring()

          // Show the diagram after styling is complete
          elementRef.current.style.visibility = 'visible'
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          if (elementRef.current) {
            elementRef.current.style.visibility = 'visible'
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
