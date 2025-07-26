import { ChevronDown, ChevronRight, File, Folder, RefreshCw, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { apiClient } from '../services/api'
import { buildFileTree, type FileNode } from '../utils/fileTree'

interface DocTreeProps {
  onFileSelect: (filePath: string | null) => void
  selectedFile: string | null
}

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
        role="treeitem"
        aria-expanded={node.type === 'folder' ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 py-1 px-2 text-[12px] cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm',
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
        {node.type === 'file' && <File className="h-4 w-4 text-green-600" />}
        <span className="flex-1 truncate">{node.name}</span>
        {node.metadata && node.type === 'file' && (
          <span className="text-[11px] text-muted-foreground">
            {(node.metadata.size / 1024).toFixed(1)}KB
          </span>
        )}
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
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiClient.getFiles({
        recursive: true,
        sortBy: 'name',
        order: 'asc',
      })

      const tree = buildFileTree(data.files, data.directories)
      setFileTree(tree)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
      console.error('Failed to load file tree:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-[12px] font-medium">Documents</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-[12px]">Loading documents...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-[12px] font-medium">Documents</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-[12px] text-center text-muted-foreground mb-3">{error}</p>
          <button
            type="button"
            onClick={loadFiles}
            className="px-3 py-1 text-[11px] bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-[12px] font-medium">Documents</h3>
        <button
          type="button"
          onClick={loadFiles}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="Refresh file tree"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {fileTree.length > 0 ? (
          <div className="p-2">
            {fileTree.map(node => (
              <TreeNode
                key={node.path}
                node={node}
                level={0}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[12px]">No documents found</p>
          </div>
        )}
      </div>
    </div>
  )
}
