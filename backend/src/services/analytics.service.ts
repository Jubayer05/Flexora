import db from '../configs/db'

type AnalyticsTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly'

type OrderRecord = {
  id: number
  total: number
  quantity: number
  createdAt: Date
  deliveredAt: Date | null
  guestEmail: string | null
  meta: any
  user: { country: string | null } | null
  product: {
    id: number
    name: string
    slug: string | null
    stockCount: number
    soldCount: number
    platform: string | null
    category: { id: number; name: string } | null
  }
}

type UrlClickRecord = {
  visitorId: string
  clickCount: number
  lastClickAt: Date
  location: any
  urlTracking: {
    slug: string
    title: string
  }
}

const COMPLETED_ORDER_STATUSES = ['COMPLETED', 'PARTIAL'] as const
const COMPLETED_PAYMENT_STATUSES = ['COMPLETED', 'PARTIAL'] as const

const formatNumber = (value: number, digits = 2) => Number(value.toFixed(digits))

const startOfDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const startOfWeek = (date: Date) => {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

const startOfMonth = (date: Date) => {
  const next = startOfDay(date)
  next.setDate(1)
  return next
}

const startOfYear = (date: Date) => {
  const next = startOfDay(date)
  next.setMonth(0, 1)
  return next
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const addWeeks = (date: Date, weeks: number) => addDays(date, weeks * 7)

const addMonths = (date: Date, months: number) => {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

const addYears = (date: Date, years: number) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

const formatBucketLabel = (date: Date, timeframe: AnalyticsTimeframe) => {
  if (timeframe === 'daily') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (timeframe === 'weekly') {
    return `W/C ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  if (timeframe === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return date.getFullYear().toString()
}

const getTimeframeWindow = (timeframe: AnalyticsTimeframe) => {
  const now = new Date()

  switch (timeframe) {
    case 'daily': {
      const start = addDays(startOfDay(now), -6)
      return { start, end: now }
    }
    case 'weekly': {
      const start = addWeeks(startOfWeek(now), -11)
      return { start, end: now }
    }
    case 'monthly': {
      const start = addMonths(startOfMonth(now), -11)
      return { start, end: now }
    }
    case 'yearly': {
      const start = addYears(startOfYear(now), -4)
      return { start, end: now }
    }
  }
}

const getBucketStart = (date: Date, timeframe: AnalyticsTimeframe) => {
  if (timeframe === 'daily') return startOfDay(date)
  if (timeframe === 'weekly') return startOfWeek(date)
  if (timeframe === 'monthly') return startOfMonth(date)
  return startOfYear(date)
}

const getBucketKey = (date: Date, timeframe: AnalyticsTimeframe) =>
  getBucketStart(date, timeframe).toISOString()

const buildEmptyBuckets = (timeframe: AnalyticsTimeframe) => {
  const { start, end } = getTimeframeWindow(timeframe)
  const buckets: Array<{
    key: string
    label: string
    visitors: number
    pageViews: number
    uniqueVisitors: number
    orders: number
    revenue: number
    conversionRate: number
  }> = []

  let cursor = getBucketStart(start, timeframe)

  while (cursor <= end) {
    buckets.push({
      key: cursor.toISOString(),
      label: formatBucketLabel(cursor, timeframe),
      visitors: 0,
      pageViews: 0,
      uniqueVisitors: 0,
      orders: 0,
      revenue: 0,
      conversionRate: 0
    })

    cursor =
      timeframe === 'daily'
        ? addDays(cursor, 1)
        : timeframe === 'weekly'
          ? addWeeks(cursor, 1)
          : timeframe === 'monthly'
            ? addMonths(cursor, 1)
            : addYears(cursor, 1)
  }

  return buckets
}

const parseCountry = (value?: string | null) => value?.trim() || 'Unknown'

const parseFulfillmentHours = (order: OrderRecord) => {
  const completedAt =
    order.deliveredAt ||
    (((order.meta as any)?.serviceFulfillment?.completedAt &&
      new Date((order.meta as any).serviceFulfillment.completedAt)) as Date | undefined)

  if (!completedAt || Number.isNaN(completedAt.getTime())) return null

  const hours = (completedAt.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
  return hours >= 0 ? hours : null
}

export class AnalyticsService {
  private async getBaseData(timeframe: AnalyticsTimeframe) {
    const { start, end } = getTimeframeWindow(timeframe)

    const [visitors, urlClicks, orders, subscriptions] = await Promise.all([
      db.visitor.findMany({
        where: { date: { gte: startOfDay(start), lte: end } },
        orderBy: { date: 'asc' },
        select: { date: true, count: true }
      }),
      db.urlClickTracking.findMany({
        where: { lastClickAt: { gte: start, lte: end } },
        select: {
          visitorId: true,
          clickCount: true,
          lastClickAt: true,
          location: true,
          urlTracking: { select: { slug: true, title: true } }
        }
      }),
      db.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: [...COMPLETED_ORDER_STATUSES] }
        },
        select: {
          id: true,
          total: true,
          quantity: true,
          createdAt: true,
          deliveredAt: true,
          guestEmail: true,
          meta: true,
          user: { select: { country: true } },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              stockCount: true,
              soldCount: true,
              platform: true,
              category: { select: { id: true, name: true } }
            }
          }
        }
      }),
      db.subscriptionPayment.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          paymentStatus: { in: [...COMPLETED_PAYMENT_STATUSES] }
        },
        select: {
          amount: true,
          createdAt: true
        }
      })
    ])

    const guestEmails = Array.from(
      new Set(orders.map((order) => order.guestEmail).filter(Boolean) as string[])
    )

    const guestUsers = guestEmails.length
      ? await db.user.findMany({
          where: { email: { in: guestEmails } },
          select: { email: true, country: true }
        })
      : []

    const guestCountryMap = new Map(guestUsers.map((user) => [user.email, parseCountry(user.country)]))

    return {
      timeframe,
      start,
      end,
      visitors,
      urlClicks: urlClicks as UrlClickRecord[],
      orders: orders.map((order) => ({
        ...order,
        total: Number(order.total),
        quantity: Number(order.quantity)
      })) as OrderRecord[],
      subscriptions: subscriptions.map((item) => ({
        amount: Number(item.amount),
        createdAt: item.createdAt
      })),
      guestCountryMap
    }
  }

  async getTrafficAnalytics(timeframe: AnalyticsTimeframe) {
    const { visitors, urlClicks, orders, guestCountryMap } = await this.getBaseData(timeframe)

    const totalVisitors = visitors.reduce((sum, row) => sum + row.count, 0)
    const totalPageViews = urlClicks.reduce((sum, row) => sum + row.clickCount, 0)
    const uniqueVisitorSet = new Set(urlClicks.map((row) => row.visitorId))
    const uniqueVisitors = uniqueVisitorSet.size
    const conversions = orders.length
    const conversionBase = uniqueVisitors || totalVisitors || 0
    const conversionRate = conversionBase ? formatNumber((conversions / conversionBase) * 100) : 0

    const countryMap = new Map<
      string,
      { pageViews: number; uniqueVisitors: Set<string>; orders: number; revenue: number }
    >()

    urlClicks.forEach((row) => {
      const country = parseCountry((row.location as any)?.country)
      const current = countryMap.get(country) || {
        pageViews: 0,
        uniqueVisitors: new Set<string>(),
        orders: 0,
        revenue: 0
      }
      current.pageViews += row.clickCount
      current.uniqueVisitors.add(row.visitorId)
      countryMap.set(country, current)
    })

    orders.forEach((order) => {
      const country = parseCountry(order.user?.country || guestCountryMap.get(order.guestEmail || '') || null)
      const current = countryMap.get(country) || {
        pageViews: 0,
        uniqueVisitors: new Set<string>(),
        orders: 0,
        revenue: 0
      }
      current.orders += 1
      current.revenue += order.total
      countryMap.set(country, current)
    })

    const topCountries = Array.from(countryMap.entries())
      .map(([country, value]) => ({
        country,
        pageViews: value.pageViews,
        uniqueVisitors: value.uniqueVisitors.size,
        orders: value.orders,
        revenue: formatNumber(value.revenue),
        engagementRate:
          value.uniqueVisitors.size > 0
            ? formatNumber(value.pageViews / value.uniqueVisitors.size)
            : 0
      }))
      .sort((a, b) => b.pageViews - a.pageViews)

    const topPagesMap = new Map<string, { title: string; pageViews: number; uniqueVisitors: Set<string> }>()
    urlClicks.forEach((row) => {
      const slug = row.urlTracking.slug || 'unknown'
      const current = topPagesMap.get(slug) || {
        title: row.urlTracking.title || slug,
        pageViews: 0,
        uniqueVisitors: new Set<string>()
      }
      current.pageViews += row.clickCount
      current.uniqueVisitors.add(row.visitorId)
      topPagesMap.set(slug, current)
    })

    const topPages = Array.from(topPagesMap.entries())
      .map(([slug, value]) => ({
        slug,
        title: value.title,
        pageViews: value.pageViews,
        uniqueVisitors: value.uniqueVisitors.size
      }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 10)

    const trendBuckets = buildEmptyBuckets(timeframe)
    const bucketMap = new Map(trendBuckets.map((bucket) => [bucket.key, bucket]))

    visitors.forEach((row) => {
      const key = getBucketKey(row.date, timeframe)
      const bucket = bucketMap.get(key)
      if (bucket) bucket.visitors += row.count
    })

    const bucketVisitorSets = new Map<string, Set<string>>()
    urlClicks.forEach((row) => {
      const key = getBucketKey(row.lastClickAt, timeframe)
      const bucket = bucketMap.get(key)
      if (!bucket) return
      bucket.pageViews += row.clickCount
      const set = bucketVisitorSets.get(key) || new Set<string>()
      set.add(row.visitorId)
      bucketVisitorSets.set(key, set)
    })

    orders.forEach((order) => {
      const key = getBucketKey(order.createdAt, timeframe)
      const bucket = bucketMap.get(key)
      if (!bucket) return
      bucket.orders += 1
      bucket.revenue += order.total
    })

    trendBuckets.forEach((bucket) => {
      bucket.uniqueVisitors = bucketVisitorSets.get(bucket.key)?.size || 0
      const base = bucket.uniqueVisitors || bucket.visitors || 0
      bucket.conversionRate = base ? formatNumber((bucket.orders / base) * 100) : 0
      bucket.revenue = formatNumber(bucket.revenue)
    })

    return {
      timeframe,
      summary: {
        totalVisitors,
        uniqueVisitors,
        pageViews: totalPageViews,
        conversionRate
      },
      trend: trendBuckets.map(({ key, ...rest }) => rest),
      countries: topCountries,
      topPages
    }
  }

  async getSalesAnalytics(timeframe: AnalyticsTimeframe) {
    const { orders, subscriptions, guestCountryMap, urlClicks } =
      await this.getBaseData(timeframe)

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = orders.length
    const totalUnits = orders.reduce((sum, order) => sum + order.quantity, 0)
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0

    const countryMap = new Map<string, { orders: number; revenue: number; quantity: number }>()
    const productMap = new Map<
      number,
      {
        productId: number
        name: string
        slug: string
        categoryName: string
        platform: string
        quantity: number
        revenue: number
        orders: number
        stockCount: number
        soldCount: number
      }
    >()
    const categoryMap = new Map<string, { revenue: number; quantity: number; orders: number }>()

    orders.forEach((order) => {
      const country = parseCountry(order.user?.country || guestCountryMap.get(order.guestEmail || '') || null)
      const countryCurrent = countryMap.get(country) || { orders: 0, revenue: 0, quantity: 0 }
      countryCurrent.orders += 1
      countryCurrent.revenue += order.total
      countryCurrent.quantity += order.quantity
      countryMap.set(country, countryCurrent)

      const categoryName = order.product.category?.name || 'Uncategorized'
      const productCurrent = productMap.get(order.product.id) || {
        productId: order.product.id,
        name: order.product.name,
        slug: order.product.slug || '',
        categoryName,
        platform: order.product.platform || 'OTHER',
        quantity: 0,
        revenue: 0,
        orders: 0,
        stockCount: order.product.stockCount,
        soldCount: order.product.soldCount
      }
      productCurrent.quantity += order.quantity
      productCurrent.revenue += order.total
      productCurrent.orders += 1
      productMap.set(order.product.id, productCurrent)

      const categoryCurrent = categoryMap.get(categoryName) || { revenue: 0, quantity: 0, orders: 0 }
      categoryCurrent.revenue += order.total
      categoryCurrent.quantity += order.quantity
      categoryCurrent.orders += 1
      categoryMap.set(categoryName, categoryCurrent)
    })

    const trendBuckets = buildEmptyBuckets(timeframe)
    const trendMap = new Map(trendBuckets.map((bucket) => [bucket.key, bucket]))
    orders.forEach((order) => {
      const key = getBucketKey(order.createdAt, timeframe)
      const bucket = trendMap.get(key)
      if (!bucket) return
      bucket.orders += 1
      bucket.revenue += order.total
    })

    trendBuckets.forEach((bucket) => {
      bucket.revenue = formatNumber(bucket.revenue)
    })

    const productPageViewMap = new Map<string, { pageViews: number; uniqueVisitors: Set<string> }>()
    urlClicks.forEach((row) => {
      const slug = row.urlTracking.slug
      const current = productPageViewMap.get(slug) || { pageViews: 0, uniqueVisitors: new Set<string>() }
      current.pageViews += row.clickCount
      current.uniqueVisitors.add(row.visitorId)
      productPageViewMap.set(slug, current)
    })

    const products = Array.from(productMap.values())
      .map((product) => {
        const pageStats = product.slug ? productPageViewMap.get(product.slug) || null : null
        const uniqueVisitors = pageStats?.uniqueVisitors.size || 0
        const stockBase = product.stockCount + product.quantity

        return {
          ...product,
          revenue: formatNumber(product.revenue),
          averageOrderValue: product.orders ? formatNumber(product.revenue / product.orders) : 0,
          conversionRate: uniqueVisitors ? formatNumber((product.orders / uniqueVisitors) * 100) : 0,
          stockTurnoverRate: stockBase > 0 ? formatNumber((product.quantity / stockBase) * 100) : 0
        }
      })
      .sort((a, b) => b.quantity - a.quantity)

    const categories = Array.from(categoryMap.entries())
      .map(([category, value]) => ({
        category,
        revenue: formatNumber(value.revenue),
        quantity: value.quantity,
        orders: value.orders
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const countries = Array.from(countryMap.entries())
      .map(([country, value]) => ({
        country,
        revenue: formatNumber(value.revenue),
        quantity: value.quantity,
        orders: value.orders
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const premiumRevenue = subscriptions.reduce((sum, item) => sum + item.amount, 0)

    const fulfillmentHours = orders
      .map(parseFulfillmentHours)
      .filter((value): value is number => value !== null)
    const averageFulfillmentTimeHours = fulfillmentHours.length
      ? formatNumber(fulfillmentHours.reduce((sum, value) => sum + value, 0) / fulfillmentHours.length)
      : 0

    return {
      timeframe,
      summary: {
        totalRevenue: formatNumber(totalRevenue),
        totalOrders,
        totalUnits,
        averageOrderValue: formatNumber(averageOrderValue)
      },
      trend: trendBuckets.map(({ key, ...rest }) => ({
        label: rest.label,
        revenue: rest.revenue,
        orders: rest.orders
      })),
      countries,
      products: products.slice(0, 20),
      categories,
      specials: {
        premiumRevenue: formatNumber(premiumRevenue),
        averageFulfillmentTimeHours
      }
    }
  }

  async getProductPerformanceAnalytics(timeframe: AnalyticsTimeframe) {
    const sales = await this.getSalesAnalytics(timeframe)

    return {
      timeframe,
      summary: {
        bestSeller: sales.products[0] || null,
        totalTrackedProducts: sales.products.length,
        premiumRevenue: sales.specials.premiumRevenue
      },
      products: sales.products,
      categories: sales.categories,
      specials: sales.specials
    }
  }
}

export const analyticsService = new AnalyticsService()
