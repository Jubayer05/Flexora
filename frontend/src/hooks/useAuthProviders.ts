/**
 * Hook to get available social auth providers
 * This can be used across components for consistent provider availability checking
 */

import { getAllAuthSettings } from '@/services/api/auth-settings'
import { useEffect, useState } from 'react'

type Provider = 'google' | 'facebook' | 'twitter' | 'telegram'

interface UseAuthProvidersReturn {
  availableProviders: Provider[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  settings: Awaited<ReturnType<typeof getAllAuthSettings>>
}

export function useAuthProviders(): UseAuthProvidersReturn {
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([])
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getAllAuthSettings>>>({
    google: null,
    facebook: null,
    twitter: null,
    telegram: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProviders = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const nextSettings = await getAllAuthSettings()
      setSettings(nextSettings)
      const providers: Provider[] = []

      if (
        nextSettings.google?.isActive &&
        nextSettings.google?.appId &&
        nextSettings.google?.appSecret
      ) {
        providers.push('google')
      }
      if (
        nextSettings.facebook?.isActive &&
        nextSettings.facebook?.appId &&
        nextSettings.facebook?.appSecret
      ) {
        providers.push('facebook')
      }
      const tw = nextSettings.twitter as {
        isActive?: boolean
        appId?: string
        appSecret?: string
      } | null
      if (tw?.isActive && tw?.appId && tw?.appSecret) providers.push('twitter')
      const tg = nextSettings.telegram as { isActive?: boolean; appId?: string; appSecret?: string } | null
      if (tg?.isActive && tg?.appId && tg?.appSecret) providers.push('telegram')

      setAvailableProviders(providers)
    } catch (err) {
      console.error('Failed to load auth providers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load providers')
      setAvailableProviders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  return {
    availableProviders,
    isLoading,
    error,
    refresh: loadProviders,
    settings
  }
}
