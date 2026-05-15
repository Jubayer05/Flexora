'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { AnalyticsSummaryCard } from '@/components/admin/analytics/AnalyticsSummaryCard'
import {
  type AnalyticsTimeframe,
  TimeframeSelect
} from '@/components/admin/analytics/TimeframeSelect'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { Boxes, Crown, MessageSquareMore, Trophy } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useEffect, useMemo, useState } from 'react'

type ProductsResponse = {
  success: boolean
  data: {
    timeframe: AnalyticsTimeframe
    summary: {
      bestSeller: {
        name: string
        quantity: number
        revenue: number
      } | null
      totalTrackedProducts: number
      telegramRevenue: number
      premiumRevenue: number
    }
    products: Array<{
      productId: number
      name: string
      categoryName: string
      platform: string
      quantity: number
      revenue: number
      orders: number
      averageOrderValue: number
      conversionRate: number
      stockTurnoverRate: number
    }>
    categories: Array<{
      category: string
      revenue: number
      quantity: number
      orders: number
    }>
    specials: {
      telegramRevenue: number
      premiumRevenue: number
      transferCompletionRate: number
      averageFulfillmentTimeHours: number
    }
  }
}

const PRODUCTS_PER_PAGE = 10

export default function ProductPerformancePage() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('monthly')
  const [productsPage, setProductsPage] = useState(1)
  const { data, loading } = useAsync<ProductsResponse>(() => `/admin/analytics/products?timeframe=${timeframe}`)

  const analytics = data?.data
  const topProducts = useMemo(() => analytics?.products.slice(0, 10) || [], [analytics?.products])
  const totalProductPages = Math.max(1, Math.ceil((analytics?.products.length || 0) / PRODUCTS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const products = analytics?.products || []
    const start = (productsPage - 1) * PRODUCTS_PER_PAGE
    return products.slice(start, start + PRODUCTS_PER_PAGE)
  }, [analytics?.products, productsPage])

  useEffect(() => {
    setProductsPage(1)
  }, [timeframe])

  useEffect(() => {
    if (productsPage > totalProductPages) {
      setProductsPage(totalProductPages)
    }
  }, [productsPage, totalProductPages])

  return (
    <div className='space-y-6 py-4 md:py-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Product Performance</h1>
          <p className='text-sm text-muted-foreground'>
            Best sellers, conversion metrics, stock turnover, and product revenue.
          </p>
        </div>
        <TimeframeSelect value={timeframe} onChange={setTimeframe} />
      </div>

      {loading && !analytics ? (
        <div className='flex min-h-[320px] items-center justify-center'>
          <MotionLoader size='lg' variant='dots' />
        </div>
      ) : analytics ? (
        <>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <AnalyticsSummaryCard
              title='Best Seller'
              value={analytics.summary.bestSeller?.name || 'No sales yet'}
              description={
                analytics.summary.bestSeller
                  ? `${analytics.summary.bestSeller.quantity} units sold`
                  : 'Waiting for completed purchases'
              }
              icon={Trophy}
            />
            <AnalyticsSummaryCard
              title='Tracked Products'
              value={analytics.summary.totalTrackedProducts.toLocaleString()}
              description='Products with sales in the timeframe'
              icon={Boxes}
            />
            <AnalyticsSummaryCard
              title='Telegram Revenue'
              value={`$${analytics.summary.telegramRevenue.toFixed(2)}`}
              description='Telegram product revenue'
              icon={MessageSquareMore}
            />
            <AnalyticsSummaryCard
              title='Premium Revenue'
              value={`$${analytics.summary.premiumRevenue.toFixed(2)}`}
              description='Premium subscription revenue'
              icon={Crown}
            />
          </div>

          <style jsx>{`
            :global([data-analytics-card='true'] .analytics-card-value) {
              overflow-wrap: anywhere;
              word-break: break-word;
              line-height: 1.1;
            }
          `}</style>

          <div className='grid gap-4 xl:grid-cols-2'>
            <Card className='border border-outline-variant/40'>
              <CardHeader className='border-b border-outline-variant/30 bg-surface-container/30'>
                <CardTitle>Top Product Revenue</CardTitle>
                <CardDescription>Highest-earning products in the selected timeframe.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px] p-6'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='name' tick={{ fontSize: 11 }} interval={0} angle={-20} height={70} textAnchor='end' />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey='revenue' fill='#6d5efc' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className='border border-outline-variant/40'>
              <CardHeader className='border-b border-outline-variant/30 bg-surface-container/30'>
                <CardTitle>Stock Turnover Rate</CardTitle>
                <CardDescription>Products moving fastest through available stock.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px] p-6'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='name' tick={{ fontSize: 11 }} interval={0} angle={-20} height={70} textAnchor='end' />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey='stockTurnoverRate' fill='#10b981' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className='border border-outline-variant/40'>
            <CardHeader className='border-b border-outline-variant/30 bg-surface-container/30'>
              <CardTitle>Product Metrics Table</CardTitle>
              <CardDescription>Conversion, turnover, revenue, and quantity for sold products.</CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto p-6'>
              <table className='min-w-[980px] w-full table-fixed text-sm'>
                <thead>
                  <tr className='border-b border-outline-variant/40'>
                    <th className='w-[34%] py-3 pr-4 text-left text-on-surface-variant font-semibold'>Product</th>
                    <th className='w-[26%] py-3 pr-4 text-left text-on-surface-variant font-semibold'>Category</th>
                    <th className='w-[8%] py-3 text-right text-on-surface-variant font-semibold whitespace-nowrap'>Units</th>
                    <th className='w-[10%] py-3 text-right text-on-surface-variant font-semibold whitespace-nowrap'>Revenue</th>
                    <th className='w-[8%] py-3 text-right text-on-surface-variant font-semibold whitespace-nowrap'>Orders</th>
                    <th className='w-[7%] py-3 text-right text-on-surface-variant font-semibold whitespace-nowrap'>Conversion</th>
                    <th className='w-[7%] py-3 text-right text-on-surface-variant font-semibold whitespace-nowrap'>Turnover</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.productId} className='border-b border-outline-variant/20 hover:bg-muted/20 transition-colors'>
                      <td className='py-3 pr-4 align-top break-words text-on-surface font-medium'>{product.name}</td>
                      <td className='py-3 pr-4 align-top break-words text-on-surface-variant'>{product.categoryName}</td>
                      <td className='py-3 text-right align-top whitespace-nowrap text-on-surface tabular-nums'>{product.quantity.toLocaleString()}</td>
                      <td className='py-3 text-right align-top whitespace-nowrap text-on-surface font-semibold tabular-nums'>${product.revenue.toFixed(2)}</td>
                      <td className='py-3 text-right align-top whitespace-nowrap text-on-surface tabular-nums'>{product.orders.toLocaleString()}</td>
                      <td className='py-3 text-right align-top whitespace-nowrap text-on-surface-variant tabular-nums'>{product.conversionRate.toFixed(2)}%</td>
                      <td className='py-3 text-right align-top whitespace-nowrap text-on-surface-variant tabular-nums'>{product.stockTurnoverRate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className='mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <p className='text-sm text-muted-foreground'>
                  Showing {analytics.products.length === 0 ? 0 : (productsPage - 1) * PRODUCTS_PER_PAGE + 1}-
                  {Math.min(productsPage * PRODUCTS_PER_PAGE, analytics.products.length)} of{' '}
                  {analytics.products.length} products
                </p>

                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setProductsPage((current) => Math.max(1, current - 1))}
                    disabled={productsPage === 1}
                    className='border-outline-variant hover:bg-muted'
                  >
                    Previous
                  </Button>
                  <span className='min-w-[84px] text-center text-sm text-on-surface-variant'>
                    Page {productsPage} / {totalProductPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setProductsPage((current) => Math.min(totalProductPages, current + 1))
                    }
                    disabled={productsPage === totalProductPages}
                    className='border-outline-variant hover:bg-muted'
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
