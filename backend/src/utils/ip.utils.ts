import type { Request } from 'express'

/**
 * Check if IP is a private/internal address (Docker, localhost, LAN)
 */
export const dateWhen = Date.now()
function isPrivateIP(ip: string): boolean {
  const cleanIP = ip.replace('::ffff:', '')

  // Localhost
  if (cleanIP === '::1' || cleanIP === '127.0.0.1' || cleanIP.startsWith('::ffff:127.')) {
    return true
  }

  const parts = cleanIP.split('.')
  if (parts.length === 4) {
    const first = parseInt(parts[0]!)
    const second = parseInt(parts[1]!)

    // 10.0.0.0 - 10.255.255.255
    if (first === 10) return true

    // 172.16.0.0 - 172.31.255.255 (Docker default bridge network)
    if (first === 172 && second >= 16 && second <= 31) return true

    // 192.168.0.0 - 192.168.255.255
    if (first === 192 && second === 168) return true

    // 169.254.0.0 - 169.254.255.255 (link-local)
    if (first === 169 && second === 254) return true
  }

  return false
}

/**
 * Extract real client IP from Express request
 * Handles reverse proxy headers (X-Forwarded-For, X-Real-IP) and Docker scenarios
 */
export function getClientIP(req: Request): string | null {
  // Priority 1: X-Forwarded-For header (most common with reverse proxies)
  const xForwardedFor = req.headers['x-forwarded-for']
  if (xForwardedFor) {
    const forwardedIPs = Array.isArray(xForwardedFor) ? xForwardedFor[0]! : xForwardedFor
    const ips = forwardedIPs.split(',').map((ip) => ip.trim())

    // Return first non-private IP
    for (const ip of ips) {
      if (ip && !isPrivateIP(ip)) {
        return cleanIpAddress(ip)
      }
    }
  }

  // Priority 2: X-Real-IP header (Nginx)
  const xRealIP = req.headers['x-real-ip']
  if (xRealIP && typeof xRealIP === 'string' && !isPrivateIP(xRealIP)) {
    return cleanIpAddress(xRealIP)
  }

  // Priority 3: req.ip (Express with trust proxy enabled)
  if (req.ip && !isPrivateIP(req.ip)) {
    return cleanIpAddress(req.ip)
  }

  // Priority 4: req.connection.remoteAddress (fallback)
  const remoteAddress = req.socket?.remoteAddress || (req.connection as any)?.remoteAddress
  if (remoteAddress && !isPrivateIP(remoteAddress)) {
    return cleanIpAddress(remoteAddress)
  }

  // If all IPs are private (development/Docker), return null
  // This signals that geolocation should be skipped
  return null
}

/**
 * Clean IPv4-mapped IPv6 address format
 * Converts ::ffff:192.168.0.1 to 192.168.0.1
 * Leaves pure IPv6 addresses unchanged
 */
export function cleanIpAddress(ip?: string | null): string | null {
  if (!ip) return null

  // Remove IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7)
  }

  return ip
}
