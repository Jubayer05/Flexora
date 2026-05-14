import { MetadataRoute } from 'next'
import { getSeoRootApiUrl, getSeoSiteUrl } from '@/lib/seo/url'

// Helper function to parse robots.txt content into Next.js format
function parseRobotsContent(content: string, siteUrl: string): MetadataRoute.Robots {
  const lines = content.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
  
  const rules: MetadataRoute.Robots['rules'] = []
  let currentUserAgent = '*'
  let currentRules: { userAgent: string; allow?: string | string[]; disallow?: string | string[] } = {
    userAgent: '*'
  }

  for (const line of lines) {
    if (line.toLowerCase().startsWith('user-agent:')) {
      // Save previous rules if any
      if (currentRules.allow || currentRules.disallow) {
        rules.push(currentRules)
      }
      
      currentUserAgent = line.substring(11).trim() || '*'
      currentRules = { userAgent: currentUserAgent }
    } else if (line.toLowerCase().startsWith('allow:')) {
      const path = line.substring(6).trim()
      if (path) {
        currentRules.allow = currentRules.allow
          ? Array.isArray(currentRules.allow)
            ? [...currentRules.allow, path]
            : [currentRules.allow, path]
          : path
      }
    } else if (line.toLowerCase().startsWith('disallow:')) {
      const path = line.substring(9).trim()
      if (path) {
        currentRules.disallow = currentRules.disallow
          ? Array.isArray(currentRules.disallow)
            ? [...currentRules.disallow, path]
            : [currentRules.disallow, path]
          : path
      }
    }
  }

  // Add last rule
  if (currentRules.allow || currentRules.disallow) {
    rules.push(currentRules)
  }

  // Extract sitemap URL
  const sitemapLine = lines.find((line) => line.toLowerCase().startsWith('sitemap:'))
  const sitemap = sitemapLine
    ? sitemapLine.substring(8).trim()
    : `${siteUrl}/sitemap.xml`

  return {
    rules: rules.length > 0 ? rules : [{ userAgent: '*', allow: '/' }],
    sitemap
  }
}

// Force dynamic rendering to prevent build-time fetching
export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = getSeoSiteUrl()
  const apiURL = getSeoRootApiUrl()

  // Default robots.txt configuration
  const defaultConfig: MetadataRoute.Robots = {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: `${siteUrl}/sitemap.xml`
  }

  try {
    // Create an AbortController for timeout (2 seconds max to fail fast)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    // Fetch robots.txt configuration from database via public endpoint
    const response = await fetch(`${apiURL}/settings/key/robots_txt_config`, {
      cache: 'no-store', // Don't cache during build
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      
      // Check if setting exists and has content
      if (data?.success && data?.data?.value) {
        const content = typeof data.data.value === 'string' 
          ? data.data.value 
          : data.data.value?.content
        
        if (content) {
          // Parse the robots.txt content
          return parseRobotsContent(content, siteUrl)
        }
      }
    }
  } catch (error) {
    // Silently fail and return defaults
    // This is expected during build time when API is not available
  }

  // Return default configuration if fetch fails
  return defaultConfig
}
