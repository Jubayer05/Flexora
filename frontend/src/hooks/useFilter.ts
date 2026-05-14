'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export interface PaginationData {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface FilterOptions {
  search?: string
  page?: number
  limit?: number
  [key: string]: string | number | boolean | undefined
}

export interface UseFilterReturn {
  // Current filter values
  filters: FilterOptions
  search: string
  page: number
  limit: number

  // Filter actions
  setSearch: (search: string) => void
  setFilter: (key: string, value: string | number | boolean | undefined) => void
  setFilters: (filters: Partial<FilterOptions>) => void
  clearFilters: () => void

  // Pagination actions
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  nextPage: () => void
  prevPage: () => void
  goToFirstPage: () => void
  goToLastPage: (totalPages?: number) => void

  // URL helpers
  getQueryString: () => string
  updateURL: (newFilters: Partial<FilterOptions>) => void
}

export function useFilter(defaultLimit: number = 10): UseFilterReturn {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse current filters from URL
  const filters: FilterOptions = useMemo(() => {
    const params: FilterOptions = {}

    searchParams.forEach((value, key) => {
      if (key === 'page' || key === 'limit') {
        params[key] = parseInt(value, 10) || (key === 'page' ? 1 : defaultLimit)
      } else if (value === 'true') {
        params[key] = true
      } else if (value === 'false') {
        params[key] = false
      } else if (!isNaN(Number(value))) {
        params[key] = Number(value)
      } else {
        params[key] = value
      }
    })

    return params
  }, [searchParams, defaultLimit])

  // Extract commonly used values
  const search = (filters.search as string) || ''
  const page = (filters.page as number) || 1
  const limit = (filters.limit as number) || defaultLimit

  // Update URL with new filters
  const updateURL = useCallback(
    (newFilters: Partial<FilterOptions>) => {
      const params = new URLSearchParams()

      // Merge current filters with new ones
      const updatedFilters = { ...filters, ...newFilters }

      // Add all filters to URL params
      Object.entries(updatedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Reset to page 1 if any filter other than page/limit changes
          if (key !== 'page' && key !== 'limit' && newFilters[key] !== undefined) {
            params.set('page', '1')
          }
          params.set(key, String(value))
        }
      })

      // Ensure page is always set if not explicitly cleared
      if (!params.has('page') && page > 1) {
        params.set('page', String(page))
      }

      // Ensure limit is set if different from default
      if (!params.has('limit') && limit !== defaultLimit) {
        params.set('limit', String(limit))
      }

      const queryString = params.toString()
      const newUrl = queryString ? `?${queryString}` : window.location.pathname

      router.push(newUrl)
    },
    [filters, page, limit, defaultLimit, router]
  )

  // Get current query string
  const getQueryString = useCallback(() => {
    return searchParams.toString()
  }, [searchParams])

  // Filter actions
  const setSearch = useCallback(
    (search: string) => {
      updateURL({ search, page: 1 })
    },
    [updateURL]
  )

  const setFilter = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      updateURL({ [key]: value, page: 1 })
    },
    [updateURL]
  )

  const setFilters = useCallback(
    (newFilters: Partial<FilterOptions>) => {
      updateURL({ ...newFilters, page: 1 })
    },
    [updateURL]
  )

  const clearFilters = useCallback(() => {
    router.push(window.location.pathname)
  }, [router])

  // Pagination actions
  const setPage = useCallback(
    (page: number) => {
      updateURL({ page })
    },
    [updateURL]
  )

  const setLimit = useCallback(
    (limit: number) => {
      updateURL({ limit, page: 1 })
    },
    [updateURL]
  )

  const nextPage = useCallback(() => {
    updateURL({ page: page + 1 })
  }, [updateURL, page])

  const prevPage = useCallback(() => {
    updateURL({ page: Math.max(1, page - 1) })
  }, [updateURL, page])

  const goToFirstPage = useCallback(() => {
    updateURL({ page: 1 })
  }, [updateURL])

  const goToLastPage = useCallback(
    (totalPages?: number) => {
      const pages = totalPages || 1
      updateURL({ page: pages })
    },
    [updateURL]
  )

  return {
    // Current values
    filters,
    search,
    page,
    limit,

    // Filter actions
    setSearch,
    setFilter,
    setFilters,
    clearFilters,

    // Pagination actions
    setPage,
    setLimit,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,

    // URL helpers
    getQueryString,
    updateURL
  }
}

// Hook specifically for pagination with server-side pagination data
export function usePagination(paginationData?: PaginationData, defaultLimit: number = 10) {
  const { page, limit, setPage, setLimit, nextPage, prevPage, goToFirstPage, goToLastPage } =
    useFilter(defaultLimit)

  // Enhanced pagination actions using server data
  const enhancedNextPage = useCallback(() => {
    if (paginationData?.hasNext) {
      nextPage()
    }
  }, [paginationData?.hasNext, nextPage])

  const enhancedPrevPage = useCallback(() => {
    if (paginationData?.hasPrev) {
      prevPage()
    }
  }, [paginationData?.hasPrev, prevPage])

  const enhancedGoToLastPage = useCallback(() => {
    if (paginationData?.pages) {
      goToLastPage(paginationData.pages)
    }
  }, [paginationData?.pages, goToLastPage])

  return {
    // Current pagination state
    page,
    limit,
    totalPages: paginationData?.pages || 1,
    total: paginationData?.total || 0,
    hasNext: paginationData?.hasNext || false,
    hasPrev: paginationData?.hasPrev || false,

    // Actions
    setPage,
    setLimit,
    nextPage: enhancedNextPage,
    prevPage: enhancedPrevPage,
    goToFirstPage,
    goToLastPage: enhancedGoToLastPage
  }
}
