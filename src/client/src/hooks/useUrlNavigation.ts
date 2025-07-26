import { useCallback, useEffect, useState } from 'react'

/**
 * URL-based navigation hook for managing file selection state
 */
export function useUrlNavigation() {
  const [selectedFile, setSelectedFileState] = useState<string | null>(null)

  // Extract file path from URL
  const getFileFromUrl = useCallback((): string | null => {
    const searchParams = new URLSearchParams(window.location.search)
    const filePath = searchParams.get('file')
    return filePath ? decodeURIComponent(filePath) : null
  }, [])

  // Update URL when file selection changes
  const setSelectedFile = useCallback((filePath: string | null) => {
    const url = new URL(window.location.href)

    if (filePath) {
      url.searchParams.set('file', encodeURIComponent(filePath))
    } else {
      url.searchParams.delete('file')
    }

    // Update URL without page reload
    window.history.pushState({ filePath }, '', url.toString())
    setSelectedFileState(filePath)
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const filePath = event.state?.filePath || getFileFromUrl()
      setSelectedFileState(filePath)
    }

    window.addEventListener('popstate', handlePopState)

    // Initialize from URL on mount
    const initialFile = getFileFromUrl()
    if (initialFile) {
      setSelectedFileState(initialFile)
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [getFileFromUrl])

  // Update history state when component mounts to ensure consistency
  useEffect(() => {
    const currentFile = getFileFromUrl()
    if (currentFile && !window.history.state?.filePath) {
      window.history.replaceState({ filePath: currentFile }, '', window.location.href)
    }
  }, [getFileFromUrl])

  return {
    selectedFile,
    setSelectedFile,
  }
}
