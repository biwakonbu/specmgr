import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
}

interface DocTreeProps {
  onFileSelect: (filePath: string | null) => void
  selectedFile: string | null
}

// Mock data for demonstration
const mockFileTree: FileNode[] = [
  {
    name: 'docs',
    type: 'folder',
    path: 'docs',
    children: [
      {
        name: 'architecture',
        type: 'folder',
        path: 'docs/architecture',
        children: [
          { name: 'system-design.md', type: 'file', path: 'docs/architecture/system-design.md' },
          {
            name: 'database-schema.md',
            type: 'file',
            path: 'docs/architecture/database-schema.md',
          },
        ],
      },
      {
        name: 'api',
        type: 'folder',
        path: 'docs/api',
        children: [
          { name: 'endpoints.md', type: 'file', path: 'docs/api/endpoints.md' },
          { name: 'authentication.md', type: 'file', path: 'docs/api/authentication.md' },
        ],
      },
      { name: 'README.md', type: 'file', path: 'docs/README.md' },
      { name: 'getting-started.md', type: 'file', path: 'docs/getting-started.md' },
    ],
  },
  {
    name: 'specs',
    type: 'folder',
    path: 'specs',
    children: [
      { name: 'requirements.md', type: 'file', path: 'specs/requirements.md' },
      { name: 'user-stories.md', type: 'file', path: 'specs/user-stories.md' },
    ],
  },
]

interface TreeNodeProps {
  node: FileNode
  level: number
  onFileSelect: (filePath: string | null) => void
  selectedFile: string | null
}

function TreeNode({ node, level, onFileSelect, selectedFile }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path)
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  const isSelected = selectedFile === node.path

  return (
    <div>
      <div
        role={node.type === 'folder' ? 'treeitem' : 'treeitem'}
        aria-expanded={node.type === 'folder' ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 py-1 px-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm',
          isSelected && 'bg-accent text-accent-foreground',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {node.type === 'folder' && (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 text-blue-500" />
          </>
        )}
        {node.type === 'file' && (
          <>
            <div className="w-4" /> {/* Spacer for alignment */}
            <File className="h-4 w-4 text-gray-500" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function DocTree({ onFileSelect, selectedFile }: DocTreeProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Documents</h2>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {mockFileTree.map(node => (
          <TreeNode
            key={node.path}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        ))}
      </div>
    </div>
  )
}
