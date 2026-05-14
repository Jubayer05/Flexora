/**
 * Minimal user-agent parsing for URL click tracking (no external deps).
 * Client can send deviceInfo; this is used as fallback from request headers.
 */
export interface ParsedDeviceInfo {
  platform: string
  deviceType: string
  browser: string
  os: string
  userAgent: string
}

export function parseUserAgent(userAgent: string): ParsedDeviceInfo {
  const ua = userAgent || ''
  let platform = 'Desktop'
  let deviceType = 'Desktop'
  let browser = 'Unknown'
  let os = 'Unknown'

  // Mobile / Tablet
  if (/\b(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)\b/i.test(ua)) {
    if (/\b(iPad|Tablet|PlayBook|Silk)\b/i.test(ua)) {
      platform = 'Tablet'
      deviceType = 'Tablet'
    } else {
      platform = 'Mobile'
      deviceType = 'Mobile'
    }
  }

  // OS
  if (/\bWindows NT\b/i.test(ua)) os = 'Windows'
  else if (/\bMac OS X\b/i.test(ua)) os = 'Mac OS'
  else if (/\bAndroid\b/i.test(ua)) os = 'Android'
  else if (/\biPhone OS\b|\biOS\b/i.test(ua)) os = 'iOS'
  else if (/\bLinux\b/i.test(ua)) os = 'Linux'
  else if (/\bCrOS\b/i.test(ua)) os = 'Chrome OS'

  // Browser
  if (/\bEdg\b/i.test(ua)) browser = 'Edge'
  else if (/\bOPR\b|\bOpera\b/i.test(ua)) browser = 'Opera'
  else if (/\bChrome\b/i.test(ua)) browser = 'Chrome'
  else if (/\bSafari\b/i.test(ua) && !/\bChrome\b/i.test(ua)) browser = 'Safari'
  else if (/\bFirefox\b/i.test(ua)) browser = 'Firefox'
  else if (/\bMSIE\b|\bTrident\b/i.test(ua)) browser = 'IE'

  return { platform, deviceType, browser, os, userAgent: ua }
}
