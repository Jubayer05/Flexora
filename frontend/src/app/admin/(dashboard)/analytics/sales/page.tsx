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
import { Banknote, Package2, ShoppingBag, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useEffect, useMemo, useState } from 'react'

type SalesResponse = {
  success: boolean
  data: {
    timeframe: AnalyticsTimeframe
    summary: {
      totalRevenue: number
      totalOrders: number
      totalUnits: number
      averageOrderValue: number
    }
    trend: Array<{
      label: string
      revenue: number
      orders: number
    }>
    countries: Array<{
      country: string
      revenue: number
      quantity: number
      orders: number
    }>
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

const PIE_COLORS = ['#6d5efc', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
const PRODUCTS_PER_PAGE = 10

export default function SalesAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('monthly')
  const [productsPage, setProductsPage] = useState(1)
  const { data, loading } = useAsync<SalesResponse>(() => `/admin/analytics/sales?timeframe=${timeframe}`)

  const analytics = data?.data
  const topCountries = useMemo(() => analytics?.countries.slice(0, 8) || [], [analytics?.countries])
  const topCategories = useMemo(() => analytics?.categories.slice(0, 6) || [], [analytics?.categories])
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
          <h1 className='text-2xl font-semibold'>Sales Analytics</h1>
          <p className='text-sm text-muted-foreground'>
            Revenue, country sales, categories, and special commerce tracking.
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
              title='Total Revenue'
              value={`$${analytics.summary.totalRevenue.toLocaleString()}`}
              description='Completed and partial order revenue'
              icon={Banknote}
            />
            <AnalyticsSummaryCard
              title='Total Orders'
              value={analytics.summary.totalOrders.toLocaleString()}
              description='Paid sales orders in the timeframe'
              icon={ShoppingBag}
            />
            <AnalyticsSummaryCard
              title='Units Sold'
              value={analytics.summary.totalUnits.toLocaleString()}
              description='Total quantity purchased'
              icon={Package2}
            />
            <AnalyticsSummaryCard
              title='Average Order Value'
              value={`$${analytics.summary.averageOrderValue.toFixed(2)}`}
              description='Revenue divided by total orders'
              icon={TrendingUp}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-3'>
            <Card className='xl:col-span-2'>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Revenue and order volume over time.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <ComposedChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='label' tick={{ fontSize: 12 }} />
                    <YAxis yAxisId='left' tick={{ fontSize: 12 }} />
                    <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId='left' dataKey='revenue' fill='#6d5efc' radius={[6, 6, 0, 0]} />
                    <Line yAxisId='right' type='monotone' dataKey='orders' stroke='#38bdf8' strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue By Category</CardTitle>
                <CardDescription>Category share of total revenue.</CardDescription>
              </CardHeader>
              <CardContent className='h-[340px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey='revenue'
                      nameKey='category'
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Sales By Country</CardTitle>
                <CardDescription>Countries generating the highest purchase value.</CardDescription>
              </CardHeader>
              <CardContent className='h-[320px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={topCountries}>
                    <CartesianGrid strokeDasharray='3 3' stroke='rgba(148,163,184,0.18)' />
                    <XAxis dataKey='country' tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey='revenue' fill='#10b981' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Special Tracking</CardTitle>
                <CardDescription>Telegram, premium, transfer, and fulfillment metrics.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <Card className='border-border/60 bg-muted/20'>
                    <CardContent className='p-4'>
                      <p className='text-sm text-muted-foreground'>Telegram Revenue</p>
                      <p className='text-2xl font-semibold'>${analytics.specials.telegramRevenue.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className='border-border/60 bg-muted/20'>
                    <CardContent className='p-4'>
                      <p className='text-sm text-muted-foreground'>Premium Revenue</p>
                      <p className='text-2xl font-semibold'>${analytics.specials.premiumRevenue.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className='border-border/60 bg-muted/20'>
                    <CardContent className='p-4'>
                      <p className='text-sm text-muted-foreground'>Transfer Completion Rate</p>
                      <p className='text-2xl font-semibold'>
                        {analytics.specials.transferCompletionRate.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className='border-border/60 bg-muted/20'>
                    <CardContent className='p-4'>
                      <p className='text-sm text-muted-foreground'>Avg. Fulfillment Time</p>
                      <p className='text-2xl font-semibold'>
                        {analytics.specials.averageFulfillmentTimeHours.toFixed(2)}h
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Bought Products</CardTitle>
              <CardDescription>Top-selling products with quantity and revenue breakdown.</CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto'>
              <table className='min-w-[980px] w-full table-fixed text-sm'>
                <thead className='text-muted-foreground'>
                  <tr className='border-b border-border'>
                    <th className='w-[34%] py-3 pr-4 text-left'>Product</th>
                    <th className='w-[26%] py-3 pr-4 text-left'>Category</th>
                    <th className='w-[8%] py-3 pl-4 text-right whitespace-nowrap'>Units</th>
                    <th className='w-[8%] py-3 pl-4 text-right whitespace-nowrap'>Orders</th>
                    <th className='w-[12%] py-3 pl-4 text-right whitespace-nowrap'>Revenue</th>
                    <th className='w-[12%] py-3 pl-4 text-right whitespace-nowrap'>AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.productId} className='border-b border-border/50'>
                      <td className='py-3 pr-4 align-top break-words'>{product.name}</td>
                      <td className='py-3 pr-4 align-top break-words text-muted-foreground'>
                        {product.categoryName}
                      </td>
                      <td className='py-3 pl-4 text-right align-top whitespace-nowrap'>
                        {product.quantity.toLocaleString()}
                      </td>
                      <td className='py-3 pl-4 text-right align-top whitespace-nowrap'>
                        {product.orders.toLocaleString()}
                      </td>
                      <td className='py-3 pl-4 text-right align-top whitespace-nowrap'>
                        ${product.revenue.toFixed(2)}
                      </td>
                      <td className='py-3 pl-4 text-right align-top whitespace-nowrap'>
                        ${product.averageOrderValue.toFixed(2)}
                      </td>
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
                  >
                    Previous
                  </Button>
                  <span className='min-w-[84px] text-center text-sm text-muted-foreground'>
                    Page {productsPage} / {totalProductPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      setProductsPage((current) => Math.min(totalProductPages, current + 1))
                    }
                    disabled={productsPage === totalProductPages}
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
