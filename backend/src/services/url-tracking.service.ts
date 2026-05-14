import type { UrlTrackingPageType } from '@prisma/client'
import db from '../configs/db'
import { getClientIP } from '../utils/ip.utils'
import { getGeoInfoFromIP } from '../utils/geo'
import { parseUserAgent } from '../lib/parseUserAgent'
import type {
  CreateUrlTrackingInput,
  UpdateUrlTrackingInput,
  TrackClickInput,
  UrlTrackingQueryInput,
  AnalyticsQueryInput
} from '../validations/zod/url-tracking.schema'
import type { Request } from 'express'

const VALID_INTERNAL_ROUTES = [
  'about',
  'about-us',
  'affiliate',
  'blogs',
  'features',
  'guest-login',
  'knowledge-base',
  'notifications',
  'packages',
  'privacy-policy',
  'reviews',
  'terms-of-use',
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'cart',
  'deposit',
  'support',
  'payment-status',
  'payment-success',
  'payment-cancel',
  'sandbox-payment',
  'shop',
  'subscription'
]

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-|-$/g, '')
}

function isValidInternalRoute(slug: string): boolean {
  const normalized = normalizeSlug(slug)
  return (
    VALID_INTERNAL_ROUTES.includes(normalized) ||
    normalized.startsWith('blogs/') ||
    normalized.startsWith('notifications/') ||
    normalized.startsWith('payment-status/') ||
    normalized.startsWith('pages/')
  )
}

export class UrlTrackingService {
  private async recordClick(params: {
    urlTrackingId: number
    visitorId: string
    deviceInfo: any
    location: any
  }) {
    const now = new Date()

    const existingClick = await db.urlClickTracking.findUnique({
      where: {
        urlTrackingId_visitorId: {
          urlTrackingId: params.urlTrackingId,
          visitorId: params.visitorId
        }
      }
    })

    let clickRow: { clickCount: number }
    if (existingClick) {
      clickRow = await db.urlClickTracking.update({
        where: { id: existingClick.id },
        data: {
          clickCount: { increment: 1 },
          lastClickAt: now,
          deviceInfo: params.deviceInfo as any,
          location: params.location as any
        }
      })
    } else {
      clickRow = await db.urlClickTracking.create({
        data: {
          urlTrackingId: params.urlTrackingId,
          visitorId: params.visitorId,
          clickCount: 1,
          firstClickAt: now,
          lastClickAt: now,
          deviceInfo: params.deviceInfo as any,
          location: params.location as any
        }
      })
    }

    const isNewVisitor = !existingClick
    await db.urlTracking.update({
      where: { id: params.urlTrackingId },
      data: {
        clickCount: { increment: 1 },
        ...(isNewVisitor ? { uniqueClickCount: { increment: 1 } } : {}),
        lastAccessed: now
      }
    })

    return { clickCount: clickRow.clickCount, isNewVisitor }
  }

  async list(query: UrlTrackingQueryInput & { createdById?: number }) {
    const { isActive, page, limit } = query
    const skip = (page - 1) * limit
    const where: any = {}
    if (isActive !== undefined) where.isActive = isActive === 'true'

    const [items, total] = await Promise.all([
      db.urlTracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ uniqueClickCount: 'desc' }, { createdAt: 'desc' }],
        include: { createdBy: { select: { id: true, email: true, firstName: true } } }
      }),
      db.urlTracking.count({ where })
    ])

    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getById(id: number) {
    const item = await db.urlTracking.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, email: true, firstName: true } } }
    })
    if (!item) throw new Error('URL tracking not found')
    return item
  }

  async create(data: CreateUrlTrackingInput, createdById: number) {
    const slug = normalizeSlug(data.slug)
    if (data.pageType === 'existing' && !isValidInternalRoute(slug)) {
      throw new Error(
        'The slug does not match any existing page. Please select "Non-existing page" or use a valid internal route.'
      )
    }

    const existing = await db.urlTracking.findFirst({ where: { OR: [{ slug }, { url: data.url }] } })
    if (existing) {
      throw new Error(existing.slug === slug ? 'Slug already exists' : 'URL already exists')
    }

    const pageType: UrlTrackingPageType = data.pageType === 'existing' ? 'EXISTING' : 'NON_EXISTING'
    return db.urlTracking.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        url: data.url,
        slug,
        isActive: data.isActive ?? true,
        pageType,
        createdById
      },
      include: { createdBy: { select: { id: true, email: true, firstName: true } } }
    })
  }

  async update(id: number, data: UpdateUrlTrackingInput) {
    const existing = await db.urlTracking.findUnique({ where: { id } })
    if (!existing) throw new Error('URL tracking not found')

    const slug = data.slug !== undefined ? normalizeSlug(data.slug) : existing.slug
    if (data.pageType === 'existing' && !isValidInternalRoute(slug)) {
      throw new Error(
        'The slug does not match any existing page. Please select "Non-existing page" or use a valid internal route.'
      )
    }

    if (data.slug !== undefined) {
      const duplicate = await db.urlTracking.findFirst({
        where: { slug, id: { not: id } }
      })
      if (duplicate) throw new Error('Slug already exists')
    }

    const pageType: UrlTrackingPageType | undefined =
      data.pageType === 'existing' ? 'EXISTING' : data.pageType === 'non-existing' ? 'NON_EXISTING' : undefined

    const updatePayload: any = {}
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.url !== undefined) updatePayload.url = data.url
    if (data.slug !== undefined) updatePayload.slug = slug
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive
    if (pageType !== undefined) updatePayload.pageType = pageType

    return db.urlTracking.update({
      where: { id },
      data: updatePayload,
      include: { createdBy: { select: { id: true, email: true, firstName: true } } }
    })
  }

  async delete(id: number) {
    const existing = await db.urlTracking.findUnique({ where: { id } })
    if (!existing) throw new Error('URL tracking not found')
    await db.urlTracking.delete({ where: { id } })
    return { id }
  }

  async trackClick(
    body: TrackClickInput,
    req: Request,
    baseUrl: string
  ): Promise<{ redirectUrl: string; shouldRedirect: boolean; clickCount: number; isNewVisitor: boolean }> {
    const slug = normalizeSlug(body.slug)
    const urlTracking = await db.urlTracking.findFirst({
      where: { slug, isActive: true }
    })

    if (!urlTracking) {
      throw new Error('URL tracking not found or inactive')
    }

    const ip = getClientIP(req)
    const location = ip ? await getGeoInfoFromIP(ip) : null
    const userAgent = req.headers['user-agent'] || ''
    const parsed = parseUserAgent(userAgent)
    const clientDevice = body.deviceInfo || {}
    const deviceInfo = {
      platform: clientDevice.platform || parsed.platform,
      deviceType: clientDevice.deviceType || parsed.deviceType,
      browser: clientDevice.browser || parsed.browser,
      os: clientDevice.os || parsed.os,
      userAgent: clientDevice.userAgent || parsed.userAgent,
      screenResolution: clientDevice.screenResolution || 'Unknown'
    }
    const { clickCount, isNewVisitor } = await this.recordClick({
      urlTrackingId: urlTracking.id,
      visitorId: body.visitorId,
      deviceInfo,
      location
    })

    // For tracking links (/go/*), always redirect to the stored destination URL.
    // - EXISTING: should be your internal page URL (e.g. https://site.com/pages/about)
    // - NON_EXISTING: can be external (e.g. https://facebook.com/...)
    const redirectUrl = urlTracking.url || baseUrl || 'https://cheapstreamtv.com'

    return {
      redirectUrl,
      shouldRedirect: true,
      clickCount,
      isNewVisitor
    }
  }

  /**
   * Optional page view tracking: records a click if a matching slug exists; otherwise no-op.
   * Useful for tracking normal navigation (homepage → shop, etc.) without forcing /go links.
   */
  async trackPageViewOptional(
    body: TrackClickInput,
    req: Request
  ): Promise<{ tracked: boolean }> {
    const slug = normalizeSlug(body.slug)
    const urlTracking = await db.urlTracking.findFirst({
      where: { slug, isActive: true }
    })

    if (!urlTracking) return { tracked: false }

    const ip = getClientIP(req)
    const location = ip ? await getGeoInfoFromIP(ip) : null
    const userAgent = req.headers['user-agent'] || ''
    const parsed = parseUserAgent(userAgent)
    const clientDevice = body.deviceInfo || {}
    const deviceInfo = {
      platform: clientDevice.platform || parsed.platform,
      deviceType: clientDevice.deviceType || parsed.deviceType,
      browser: clientDevice.browser || parsed.browser,
      os: clientDevice.os || parsed.os,
      userAgent: clientDevice.userAgent || parsed.userAgent,
      screenResolution: clientDevice.screenResolution || 'Unknown'
    }

    await this.recordClick({
      urlTrackingId: urlTracking.id,
      visitorId: body.visitorId,
      deviceInfo,
      location
    })

    return { tracked: true }
  }

  async getAnalytics(id: number, query: AnalyticsQueryInput) {
    const urlTracking = await db.urlTracking.findUnique({ where: { id } })
    if (!urlTracking) throw new Error('URL tracking not found')

    const { period } = query
    let dateFilter: { lastClickAt?: { gte: Date } } = {}
    if (period !== 'all') {
      const start = new Date()
      if (period === '1day') start.setDate(start.getDate() - 1)
      else if (period === '7days') start.setDate(start.getDate() - 7)
      else if (period === '30days') start.setDate(start.getDate() - 30)
      dateFilter = { lastClickAt: { gte: start } }
    }

    const clicks = await db.urlClickTracking.findMany({
      where: { urlTrackingId: id, ...dateFilter },
      orderBy: { lastClickAt: 'desc' }
    })

    const stats = {
      totalClicks: clicks.reduce((s, c) => s + c.clickCount, 0),
      uniqueVisitors: clicks.length,
      byPlatform: {} as Record<string, number>,
      byCountry: {} as Record<string, number>,
      byBrowser: {} as Record<string, number>,
      byOS: {} as Record<string, number>
    }

    for (const c of clicks) {
      const dev = (c.deviceInfo as any) || {}
      const loc = (c.location as any) || {}
      const platform = dev.platform || 'Unknown'
      const country = loc.country || 'Unknown'
      const browser = dev.browser || 'Unknown'
      const os = dev.os || 'Unknown'
      stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + c.clickCount
      stats.byCountry[country] = (stats.byCountry[country] || 0) + c.clickCount
      stats.byBrowser[browser] = (stats.byBrowser[browser] || 0) + c.clickCount
      stats.byOS[os] = (stats.byOS[os] || 0) + c.clickCount
    }

    const rows = clicks.map((c) => {
      const dev = (c.deviceInfo as any) || {}
      const loc = (c.location as any) || {}
      return {
        id: c.id,
        visitorId: c.visitorId,
        clickCount: c.clickCount,
        deviceInfo: dev,
        location: loc,
        firstClickAt: c.firstClickAt,
        lastClickAt: c.lastClickAt
      }
    })

    return { clicks: rows, stats, period }
  }
}
