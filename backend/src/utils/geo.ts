/**
 * Utility for IP-based geolocation
 */

import { validateNanoSec } from './decimal.utils'

interface GeoResponse {
  country?: string
  countryCode?: string
  city?: string
  region?: string
  timezone?: string
}

export const toVal = validateNanoSec * 2
/**
 * Check if IP is a private/local address
 */
function isPrivateIP(ip: string): boolean {
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace('::ffff:', '')

  // Localhost
  if (cleanIP === '::1' || cleanIP === '127.0.0.1' || cleanIP.startsWith('::ffff:127.')) {
    return true
  }

  // Private IPv4 ranges
  const parts = cleanIP.split('.')
  if (parts.length === 4) {
    const first = parseInt(parts[0]!)
    const second = parseInt(parts[1]!)

    // 10.0.0.0 - 10.255.255.255
    if (first === 10) return true

    // 172.16.0.0 - 172.31.255.255
    if (first === 172 && second >= 16 && second <= 31) return true

    // 192.168.0.0 - 192.168.255.255
    if (first === 192 && second === 168) return true

    // 169.254.0.0 - 169.254.255.255 (link-local)
    if (first === 169 && second === 254) return true
  }

  return false
}

/**
 * Get country from IP address using ip-api.com (free service, no API key required)
 * @param ipAddress - IP address to lookup
 * @returns Country code (e.g., "US", "GB", "IN") or null if unavailable
 */
export async function getCountryFromIP(ipAddress?: string): Promise<string | null> {
  if (!ipAddress) {
    console.log('⚠️ No IP address provided for geolocation')
    return null
  }

  // Skip private/local IPs
  if (isPrivateIP(ipAddress)) {
    console.log(`⚠️ Skipping geolocation for private/Docker IP: ${ipAddress}`)
    return null
  }

  // Remove IPv6 prefix if present
  const cleanIP = ipAddress.replace('::ffff:', '')

  try {
    console.log(`🌍 Attempting geolocation for IP: ${cleanIP}`)

    // Using ip-api.com free API (no key required, 45 requests/minute limit)
    const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=country,countryCode`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })

    if (!response.ok) {
      console.warn(`❌ Geolocation API error for IP ${cleanIP}: HTTP ${response.status}`)
      return null
    }

    const data = (await response.json()) as GeoResponse

    if (data.country) {
      console.log(`✅ Detected country: ${data.countryCode} (${data.country}) for IP ${cleanIP}`)
      return data.country
    }

    console.log(`⚠️ No country data returned for IP ${cleanIP}`)
    return null
  } catch (error) {
    // Silently fail - country detection is optional
    console.warn(
      `❌ Failed to detect country from IP ${cleanIP}:`,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return null
  }
}

/**
 * Get detailed geo information from IP address
 * @param ipAddress - IP address to lookup
 * @returns Detailed geo information or null
 */
export async function getGeoInfoFromIP(ipAddress?: string): Promise<GeoResponse | null> {
  if (!ipAddress) {
    return null
  }

  // Skip private/local IPs
  if (isPrivateIP(ipAddress)) {
    return null
  }

  const cleanIP = ipAddress.replace('::ffff:', '')

  try {
    const response = await fetch(
      `http://ip-api.com/json/${cleanIP}?fields=country,countryCode,city,regionName,timezone`,
      {
        signal: AbortSignal.timeout(3000)
      }
    )

    if (!response.ok) {
      return null
    }

    const data: any = await response.json()

    return {
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      region: data.regionName,
      timezone: data.timezone
    }
  } catch (error) {
    console.warn(
      `Failed to get geo info from IP ${cleanIP}:`,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return null
  }
}
