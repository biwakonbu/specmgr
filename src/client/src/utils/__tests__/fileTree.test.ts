import { describe, it, expect } from 'vitest'
import { buildFileTree, findNodeByPath, getAllFilePaths } from '../fileTree'
import type { FileMetadata, DirectoryInfo, FileNode } from '../../services/api'

describe('fileTree utilities', () => {
  const mockFiles: FileMetadata[] = [
    {
      name: 'README.md',
      relativePath: 'README.md',
      directory: '',
      size: 1024,
      lastModified: '2023-01-01T00:00:00Z',
      type: 'file',
    },
    {
      name: 'api.md',
      relativePath: 'docs/api.md',
      directory: 'docs',
      size: 2048,
      lastModified: '2023-01-02T00:00:00Z',
      type: 'file',
    },
    {
      name: 'guide.md',
      relativePath: 'docs/guide.md',
      directory: 'docs',
      size: 1536,
      lastModified: '2023-01-03T00:00:00Z',
      type: 'file',
    },
    {
      name: 'advanced.md',
      relativePath: 'docs/advanced/advanced.md',
      directory: 'docs/advanced',
      size: 3072,
      lastModified: '2023-01-04T00:00:00Z',
      type: 'file',
    },
  ]

  const mockDirectories: DirectoryInfo[] = [
    {
      name: 'docs',
      relativePath: 'docs',
      type: 'directory',
    },
    {
      name: 'advanced',
      relativePath: 'docs/advanced',
      type: 'directory',
    },
  ]

  describe('buildFileTree', () => {
    it('should build a proper file tree structure', () => {
      const tree = buildFileTree(mockFiles, mockDirectories)

      expect(tree).toHaveLength(2) // README.md and docs folder

      // Check root level README.md
      const readme = tree.find(node => node.name === 'README.md')
      expect(readme).toBeDefined()
      expect(readme?.type).toBe('file')
      expect(readme?.path).toBe('README.md')
      expect(readme?.metadata?.size).toBe(1024)

      // Check docs folder
      const docsFolder = tree.find(node => node.name === 'docs')
      expect(docsFolder).toBeDefined()
      expect(docsFolder?.type).toBe('folder')
      expect(docsFolder?.path).toBe('docs')
      expect(docsFolder?.children).toHaveLength(3) // api.md, guide.md, and advanced folder
    })

    it('should handle nested directories correctly', () => {
      const tree = buildFileTree(mockFiles, mockDirectories)
      const docsFolder = tree.find(node => node.name === 'docs')
      const advancedFolder = docsFolder?.children?.find(node => node.name === 'advanced')

      expect(advancedFolder).toBeDefined()
      expect(advancedFolder?.type).toBe('folder')
      expect(advancedFolder?.path).toBe('docs/advanced')
      expect(advancedFolder?.children).toHaveLength(1)

      const advancedFile = advancedFolder?.children?.[0]
      expect(advancedFile?.name).toBe('advanced.md')
      expect(advancedFile?.type).toBe('file')
    })

    it('should sort nodes properly', () => {
      const tree = buildFileTree(mockFiles, mockDirectories)
      const docsFolder = tree.find(node => node.name === 'docs')
      const children = docsFolder?.children

      expect(children).toBeDefined()
      // Should be sorted: folders first (advanced), then files (api.md, guide.md)
      expect(children?.[0]?.type).toBe('folder')
      expect(children?.[0]?.name).toBe('advanced')
      expect(children?.[1]?.type).toBe('file')
      expect(children?.[1]?.name).toBe('api.md')
      expect(children?.[2]?.type).toBe('file')
      expect(children?.[2]?.name).toBe('guide.md')
    })

    it('should handle empty inputs', () => {
      const tree = buildFileTree([], [])
      expect(tree).toEqual([])
    })

    it('should handle files without directories', () => {
      const filesOnly: FileMetadata[] = [
        {
          name: 'single.md',
          relativePath: 'single.md',
          directory: '',
          size: 100,
          lastModified: '2023-01-01T00:00:00Z',
          type: 'file',
        },
      ]

      const tree = buildFileTree(filesOnly, [])
      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('single.md')
      expect(tree[0].type).toBe('file')
    })

    it('should infer directories from file paths', () => {
      const filesWithImpliedDirs: FileMetadata[] = [
        {
          name: 'nested.md',
          relativePath: 'level1/level2/nested.md',
          directory: 'level1/level2',
          size: 100,
          lastModified: '2023-01-01T00:00:00Z',
          type: 'file',
        },
      ]

      const tree = buildFileTree(filesWithImpliedDirs, [])
      expect(tree).toHaveLength(1)

      const level1 = tree[0]
      expect(level1.name).toBe('level1')
      expect(level1.type).toBe('folder')

      const level2 = level1.children?.[0]
      expect(level2?.name).toBe('level2')
      expect(level2?.type).toBe('folder')

      const file = level2?.children?.[0]
      expect(file?.name).toBe('nested.md')
      expect(file?.type).toBe('file')
    })
  })

  describe('findNodeByPath', () => {
    let tree: FileNode[]

    beforeEach(() => {
      tree = buildFileTree(mockFiles, mockDirectories)
    })

    it('should find root level files', () => {
      const node = findNodeByPath(tree, 'README.md')
      expect(node).toBeDefined()
      expect(node?.name).toBe('README.md')
      expect(node?.type).toBe('file')
    })

    it('should find nested files', () => {
      const node = findNodeByPath(tree, 'docs/api.md')
      expect(node).toBeDefined()
      expect(node?.name).toBe('api.md')
      expect(node?.type).toBe('file')
    })

    it('should find deeply nested files', () => {
      const node = findNodeByPath(tree, 'docs/advanced/advanced.md')
      expect(node).toBeDefined()
      expect(node?.name).toBe('advanced.md')
      expect(node?.type).toBe('file')
    })

    it('should find folders', () => {
      const node = findNodeByPath(tree, 'docs')
      expect(node).toBeDefined()
      expect(node?.name).toBe('docs')
      expect(node?.type).toBe('folder')
    })

    it('should return null for non-existent paths', () => {
      const node = findNodeByPath(tree, 'non/existent/path.md')
      expect(node).toBeNull()
    })

    it('should handle empty tree', () => {
      const node = findNodeByPath([], 'any/path.md')
      expect(node).toBeNull()
    })
  })

  describe('getAllFilePaths', () => {
    let tree: FileNode[]

    beforeEach(() => {
      tree = buildFileTree(mockFiles, mockDirectories)
    })

    it('should return all file paths', () => {
      const paths = getAllFilePaths(tree)
      expect(paths).toHaveLength(4)
      expect(paths).toContain('README.md')
      expect(paths).toContain('docs/api.md')
      expect(paths).toContain('docs/guide.md')
      expect(paths).toContain('docs/advanced/advanced.md')
    })

    it('should handle empty tree', () => {
      const paths = getAllFilePaths([])
      expect(paths).toEqual([])
    })

    it('should only return file paths, not folder paths', () => {
      const paths = getAllFilePaths(tree)
      expect(paths).not.toContain('docs')
      expect(paths).not.toContain('docs/advanced')
    })

    it('should maintain proper order', () => {
      const paths = getAllFilePaths(tree)
      // The order should follow the tree traversal
      expect(paths).toHaveLength(4)
      expect(paths.includes('README.md')).toBe(true)
      expect(paths.includes('docs/api.md')).toBe(true)
      expect(paths.includes('docs/guide.md')).toBe(true)
      expect(paths.includes('docs/advanced/advanced.md')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle files with null directory', () => {
      const filesWithNullDir: FileMetadata[] = [
        {
          name: 'root.md',
          relativePath: 'root.md',
          directory: '',
          size: 100,
          lastModified: '2023-01-01T00:00:00Z',
          type: 'file',
        },
      ]

      const tree = buildFileTree(filesWithNullDir, [])
      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('root.md')
    })

    it('should handle duplicate directory entries', () => {
      const duplicateDirs: DirectoryInfo[] = [
        { name: 'docs', relativePath: 'docs', type: 'directory' },
        { name: 'docs', relativePath: 'docs', type: 'directory' },
      ]

      const tree = buildFileTree(mockFiles, duplicateDirs)
      const docsNodes = tree.filter(node => node.name === 'docs')
      expect(docsNodes).toHaveLength(1) // Should deduplicate
    })

    it('should handle special characters in file names', () => {
      const specialFiles: FileMetadata[] = [
        {
          name: 'file with spaces.md',
          relativePath: 'file with spaces.md',
          directory: '',
          size: 100,
          lastModified: '2023-01-01T00:00:00Z',
          type: 'file',
        },
        {
          name: 'file-with-dashes.md',
          relativePath: 'special/file-with-dashes.md',
          directory: 'special',
          size: 100,
          lastModified: '2023-01-01T00:00:00Z',
          type: 'file',
        },
      ]

      const tree = buildFileTree(specialFiles, [])
      expect(tree).toHaveLength(2)

      const spaceFile = findNodeByPath(tree, 'file with spaces.md')
      expect(spaceFile?.name).toBe('file with spaces.md')

      const dashFile = findNodeByPath(tree, 'special/file-with-dashes.md')
      expect(dashFile?.name).toBe('file-with-dashes.md')
    })
  })
})
