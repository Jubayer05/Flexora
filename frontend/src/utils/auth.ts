import { socialAuthenticate } from '@/action/auth'
import { getAllAuthSettings } from '@/services/api/auth-settings'
import { NextAuthOptions } from 'next-auth'
import FacebookProvider from 'next-auth/providers/facebook'
import GoogleProvider from 'next-auth/providers/google'
import TwitterProvider from 'next-auth/providers/twitter'

const isDevelopment = process.env.NODE_ENV !== 'production'

const logInfo = (...args: unknown[]) => {
  if (isDevelopment) {
    console.info(...args)
  }
}

const logWarn = (...args: unknown[]) => {
  if (isDevelopment) {
    console.warn(...args)
  }
}

const logError = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error(...args)
  }
}

/**
 * Create auth options with dynamic provider configuration
 */
async function createAuthOptions(requestBaseUrl?: string): Promise<NextAuthOptions> {
  try {
    const authSettings = await getAllAuthSettings()
    const providers = []

    // Determine the base URL for callbacks
    const resolvedBaseUrl =
      requestBaseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://accounts.curlware.net'
        : 'http://localhost:3000')

    logInfo('OAuth base URL:', resolvedBaseUrl)

    // Prefer database (Social Login Management) over env vars
    const googleFromDb =
      authSettings.google?.isActive && authSettings.google?.appId && authSettings.google?.appSecret
    const googleClientId = googleFromDb ? authSettings.google!.appId : process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = googleFromDb
      ? authSettings.google!.appSecret
      : process.env.GOOGLE_CLIENT_SECRET

    if (googleClientId && googleClientSecret) {
      const fallbackGoogleRedirect = `${resolvedBaseUrl}/api/auth/callback/google`
      let googleRedirectUri = fallbackGoogleRedirect

      if (authSettings.google?.redirectUrl) {
        try {
          const configuredRedirect = new URL(authSettings.google.redirectUrl)
          const runtimeOrigin = new URL(resolvedBaseUrl).origin

          if (configuredRedirect.origin === runtimeOrigin) {
            googleRedirectUri = authSettings.google.redirectUrl
          } else {
            logWarn(
              'Google redirect mismatch. Using runtime host instead of configured value:',
              configuredRedirect.origin,
              '=>',
              runtimeOrigin
            )
          }
        } catch (error) {
          logWarn('Invalid Google redirect URL in settings, falling back:', error)
        }
      }

      const googleConfig: any = {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
            redirect_uri: googleRedirectUri
          }
        },
        profile(profile: any) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture
          }
        }
      }

      logInfo('Google OAuth configured with redirect:', googleRedirectUri)
      providers.push(GoogleProvider(googleConfig))
    } else {
      logWarn('Google OAuth not configured - missing credentials or disabled')
    }

    // Facebook: prefer database (Social Login Management) over env vars
    const facebookFromDb =
      authSettings.facebook?.isActive &&
      authSettings.facebook?.appId &&
      authSettings.facebook?.appSecret
    const facebookAppId = facebookFromDb
      ? authSettings.facebook!.appId
      : process.env.FACEBOOK_APP_ID
    const facebookAppSecret = facebookFromDb
      ? authSettings.facebook!.appSecret
      : process.env.FACEBOOK_APP_SECRET

    if (facebookAppId && facebookAppSecret) {
      const facebookRedirect =
        authSettings.facebook?.redirectUrl || `${resolvedBaseUrl}/api/auth/callback/facebook`
      const facebookConfig: any = {
        clientId: facebookAppId,
        clientSecret: facebookAppSecret,
        authorization: {
          params: {
            scope: 'public_profile email'
          }
        },
        profile(profile: any) {
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email || `facebook_${profile.id}@temp.local`,
            image: profile.picture?.data?.url || null
          }
        }
      }
      facebookConfig.authorization.params.redirect_uri = facebookRedirect

      logInfo('Facebook OAuth configured')
      providers.push(FacebookProvider(facebookConfig))
    }

    // Twitter (X): prefer database over env
    const twitterFromDb =
      authSettings.twitter &&
      (authSettings.twitter as any).isActive &&
      (authSettings.twitter as any).appId &&
      (authSettings.twitter as any).appSecret
    const twitterClientId = twitterFromDb
      ? (authSettings.twitter as any).appId
      : process.env.TWITTER_CLIENT_ID
    const twitterClientSecret = twitterFromDb
      ? (authSettings.twitter as any).appSecret
      : process.env.TWITTER_CLIENT_SECRET
    if (twitterClientId && twitterClientSecret) {
      providers.push(
        TwitterProvider({
          clientId: twitterClientId,
          clientSecret: twitterClientSecret,
          version: '2.0'
        })
      )
      logInfo('Twitter OAuth configured')
    }

    logInfo('Total OAuth providers configured:', providers.length)

    return {
      secret: process.env.AUTH_SECRET,
      session: {
        strategy: 'jwt'
      },
      pages: {
        signIn: '/login',
        error: '/login?error=OAuthSignin'
      },
      providers,
      debug: process.env.NODE_ENV === 'development',
      callbacks: {
        async signIn({ account, user }) {
          try {
            if (!account?.provider) {
              return true
            }

            if (
              account.provider !== 'google' &&
              account.provider !== 'facebook' &&
              account.provider !== 'twitter'
            ) {
              return true
            }

            const providerToken = account.id_token || account.access_token

            if (!providerToken) {
              logError('No token available from provider:', account.provider)
              return false
            }

            const result = await socialAuthenticate(
              account.provider as 'google' | 'facebook' | 'twitter',
              providerToken,
              undefined,
              {
                email: user.email || undefined,
                name: user.name || undefined
              }
            )

            if (result?.errors || !result?.data) {
              logError('Backend authentication failed:', result?.errors)
              return false
            }

            const enrichedAccount = account as Record<string, unknown>
            enrichedAccount.uhqUser = result.data.user
            enrichedAccount.uhqToken = result.data.token

            if (user) {
              const enrichedUser = user as unknown as Record<string, unknown>
              enrichedUser.uhqUser = result.data.user
            }

            logInfo('Social authentication successful for provider:', account.provider)
            return true
          } catch (error) {
            logError('Sign-in error:', error)
            return false
          }
        },
        async jwt({ token, account, user }) {
          if (account?.provider === 'google') {
            token.googleAccessToken = account.access_token
            token.googleIdToken = account.id_token
          }
          if (account?.provider === 'twitter') {
            token.twitterAccessToken = account.access_token
          }

          const accountUser = account as Record<string, unknown> | undefined
          if (accountUser?.uhqUser) {
            token.uhqUser = accountUser.uhqUser
            token.uhqToken = accountUser.uhqToken as string | undefined
          } else if (user) {
            const enrichedUser = user as unknown as Record<string, unknown>
            if (enrichedUser.uhqUser) {
              token.uhqUser = enrichedUser.uhqUser
            }
          }

          return token
        },
        async session({ session, token }) {
          const baseUser = {
            ...(session.user || {}),
            name: token.name,
            email: token.email,
            image: token.picture
          }

          if (token.uhqUser) {
            session.user = {
              ...baseUser,
              ...(token.uhqUser as Record<string, unknown>)
            }
          } else {
            session.user = baseUser
          }

          if (token.uhqToken) {
            ;(session as any).uhqToken = token.uhqToken
          }

          if (token.googleAccessToken) {
            ;(session as any).googleAccessToken = token.googleAccessToken
          }

          if (token.googleIdToken) {
            ;(session as any).googleIdToken = token.googleIdToken
          }

          return session
        },
        async redirect({ url, baseUrl }) {
          // Redirect to home page after successful sign-in
          if (url.startsWith(baseUrl)) return url
          if (url.startsWith('/')) return `${baseUrl}${url}`
          return baseUrl
        }
      }
    }
  } catch (error) {
    logError('Failed to create auth options:', error)
    return {
      secret: process.env.AUTH_SECRET,
      session: {
        strategy: 'jwt'
      },
      pages: {
        signIn: '/login',
        error: '/login?error=Configuration'
      },
      providers: []
    }
  }
}

// Cache the auth options per base URL to avoid repeated API calls
type AuthOptionsCacheEntry = {
  options: NextAuthOptions
  timestamp: number
}

const authOptionsCache = new Map<string, AuthOptionsCacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getAuthOptions(baseUrl?: string): Promise<NextAuthOptions> {
  const now = Date.now()
  const cacheKey = baseUrl || 'default'
  const cached = authOptionsCache.get(cacheKey)

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.options
  }

  const options = await createAuthOptions(baseUrl)
  authOptionsCache.set(cacheKey, { options, timestamp: now })
  return options
}

// Clear cache function for manual refresh
export function clearAuthOptionsCache(baseUrl?: string) {
  if (baseUrl) {
    authOptionsCache.delete(baseUrl)
  } else {
    authOptionsCache.clear()
  }
}
