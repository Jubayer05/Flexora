'use client'

import requests from '@/services/network/http'
import useSWR, { KeyedMutator } from 'swr'

export const shouldFreshOptmizeData = false

type ReturnType<T> = {
  data: T | undefined
  error: any
  loading: boolean
  mutate: KeyedMutator<T>
  validating: boolean
}

export default function useAsync<T = any>(
  url: string | (() => string | null) | null,
  revalidateIfStale = false,
  revalidateOnFocus = false,
  revalidateOnReconnect = true,
  refreshInterval?: number,
  shouldRetryOnError = false
): ReturnType<T> {
  const key = typeof url === 'function' ? url() : url

  const fetcher = async (url: string): Promise<T> => {
    return await requests.get(url)
  }

  const { data, error, isLoading, mutate, isValidating } = useSWR(key, fetcher, {
    revalidateIfStale,
    revalidateOnFocus,
    revalidateOnReconnect,
    refreshInterval,
    shouldRetryOnError,
    dedupingInterval: refreshInterval ? Math.min(refreshInterval, 5000) : 60000,
    focusThrottleInterval: refreshInterval ? Math.min(refreshInterval, 5000) : 300000,
    // Never retry on 401/403 - session expired or no permission
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      const status = (err as any)?.response?.status
      if (status === 401 || status === 403) return
      if (retryCount >= 3) return
      setTimeout(() => revalidate({ retryCount }), 5000)
    }
  })

  return {
    data: data as T,
    error,
    loading: isLoading,
    mutate,
    validating: isValidating
  }
}
