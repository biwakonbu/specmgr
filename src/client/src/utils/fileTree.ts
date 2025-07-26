import type { FileMetadata, DirectoryInfo } from '../services/api'

export interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  metadata?: {
    size: number
    lastModified: Date
  }
}

export function buildFileTree(files: FileMetadata[], directories: DirectoryInfo[]): FileNode[] {
  const tree: FileNode[] = []
  const nodeMap = new Map<string, FileNode>()

  // Create directory nodes from explicit directories and inferred from file paths
  const directoryPaths = new Set<string>()
  
  // Add directories from file paths
  files.forEach(file => {
    const dirPath = file.directory
    if (dirPath && dirPath !== '.' && dirPath !== '') {
      // Add all parent directories
      const parts = dirPath.split('/')
      let currentPath = ''
      
      for (const part of parts) {
        if (currentPath) {
          currentPath += '/' + part
        } else {
          currentPath = part
        }
        directoryPaths.add(currentPath)
      }
    }
  })
  
  // Add explicit directories
  directories.forEach(dir => {
    if (dir.relativePath && dir.relativePath !== '.' && dir.relativePath !== '') {
      directoryPaths.add(dir.relativePath)
    }
  })
  
  // Create directory nodes
  directoryPaths.forEach(dirPath => {
    const dirName = dirPath.includes('/') ? dirPath.split('/').pop() || dirPath : dirPath
    
    const node: FileNode = {
      name: dirName,
      type: 'folder',
      path: dirPath,
      children: [],
    }
    
    nodeMap.set(dirPath, node)
  })

  // Create file nodes
  files.forEach(file => {
    const node: FileNode = {
      name: file.name,
      type: 'file',
      path: file.relativePath,
      metadata: {
        size: file.size,
        lastModified: file.lastModified,
      },
    }
    
    nodeMap.set(file.relativePath, node)
  })

  // Build tree structure
  nodeMap.forEach((node, nodePath) => {
    if (nodePath.includes('/')) {
      // Find parent directory
      const parentPath = nodePath.substring(0, nodePath.lastIndexOf('/'))
      const parent = nodeMap.get(parentPath)
      
      if (parent && parent.children) {
        parent.children.push(node)
      } else {
        // Parent not found, this is likely a root level item
        tree.push(node)
      }
    } else {
      // Root level node
      tree.push(node)
    }
  })

  // Sort children in each directory
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      // Folders first, then files
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      // Then alphabetically
      return a.name.localeCompare(b.name)
    })
  }

  // Recursively sort all children
  const sortTree = (nodes: FileNode[]): FileNode[] => {
    const sorted = sortNodes(nodes)
    sorted.forEach(node => {
      if (node.children) {
        node.children = sortTree(node.children)
      }
    })
    return sorted
  }

  return sortTree(tree)
}

export function findNodeByPath(tree: FileNode[], targetPath: string): FileNode | null {
  for (const node of tree) {
    if (node.path === targetPath) {
      return node
    }
    
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
  }
  
  return null
}

export function getAllFilePaths(tree: FileNode[]): string[] {
  const paths: string[] = []
  
  const traverse = (nodes: FileNode[]) => {
    nodes.forEach(node => {
      if (node.type === 'file') {
        paths.push(node.path)
      }
      if (node.children) {
        traverse(node.children)
      }
    })
  }
  
  traverse(tree)
  return paths
}