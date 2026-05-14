'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import useAsync from '@/hooks/useAsync'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { format } from 'date-fns'
import {
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Gift,
  Link,
  RefreshCw,
  Share2,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface AffiliateStats {
  totalEarnings: number
  pendingEarnings: number
  totalReferrals: number
  activeReferrals: number
  clickCount: number
  conversionRate: number
}

interface AffiliateCode {
  id: string
  code: string
  isActive: boolean
  createdAt: string
  clickCount: number
  earnings: number
}

interface Referral {
  id: string
  email: string
  status: 'PENDING' | 'ACTIVE' | 'CONVERTED'
  joinedAt: string
  earnings: number
  lastActivity: string
}

export default function AffiliatePage() {
  const { push } = useRouter()
  const [newCodeName, setNewCodeName] = useState('')
  const [affiliateAmount, setAffiliateAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('USDT TRC20')
  const [walletAddress, setWalletAddress] = useState('')
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [convertSubmitting, setConvertSubmitting] = useState(false)

  // Fetch affiliate stats
  const {
    data: statsData,
    loading: statsLoading,
    mutate: refetchStats
  } = useAsync<{
    success: boolean
    data: AffiliateStats
  }>(() => '/customer/affiliate/stats')

  // Fetch affiliate codes
  const {
    data: codesData,
    loading: codesLoading,
    mutate: refetchCodes
  } = useAsync<{
    success: boolean
    data: AffiliateCode[]
  }>(() => '/customer/affiliate/codes')
  const [codesRefreshing, setCodesRefreshing] = useState(false)

  // Fetch referrals
  const { data: referralsData, loading: referralsLoading } = useAsync<{
    success: boolean
    data: { referrals: Referral[]; pagination: PaginationMeta }
  }>(() => '/customer/affiliate/referrals?page=1&limit=10')

  const stats = statsData?.data
  const codes = codesData?.data || []
  const referrals = referralsData?.data?.referrals || []
  const pendingEarnings = Number(stats?.pendingEarnings || 0)
  const withdrawalMethods = ['USDT TRC20', 'TRX', 'LTC', 'ETH', 'Solana']

  const handleGenerateCode = async () => {
    setCodesRefreshing(true)
    try {
      const res = await requests.post<{ success: boolean; data?: { code: string } }>(
        '/customer/affiliate/codes/generate',
        {}
      )
      if (res?.success) {
        toast.success(res.data?.code ? 'Affiliate code generated!' : 'Affiliate code ready.')
        await refetchCodes()
      } else {
        toast.error('Failed to generate code')
      }
    } catch {
      toast.error('Failed to generate code')
    } finally {
      setCodesRefreshing(false)
    }
  }

  const handleCopyCode = (code: string) => {
    const affiliateUrl = getAffiliateLink(code)
    copyToClipboard(affiliateUrl)
    toast.success('Affiliate link copied to clipboard!')
  }

  const handleCopyLink = (code: string) => {
    const affiliateUrl = getAffiliateLink(code)
    copyToClipboard(affiliateUrl)
    toast.success('Affiliate link copied to clipboard!')
  }

  const getAffiliateAmount = () => {
    const amount = Number(affiliateAmount)
    return Number.isFinite(amount) ? amount : 0
  }

  const handleWithdrawAffiliate = async () => {
    const amount = getAffiliateAmount()

    if (amount < 1) {
      toast.error('Minimum withdrawal amount is $1.00')
      return
    }

    if (amount > pendingEarnings) {
      toast.error('Insufficient affiliate earnings')
      return
    }

    if (!walletAddress.trim()) {
      toast.error('Please enter your wallet address')
      return
    }

    setWithdrawSubmitting(true)
    try {
      const response = await requests.post<{ success: boolean; message?: string }>(
        '/customer/withdrawals',
        {
          amount,
          method: withdrawMethod,
          source: 'referral',
          meta: {
            source: 'referral',
            walletAddress: walletAddress.trim(),
            payoutMethod: withdrawMethod
          }
        }
      )

      if (response.success) {
        toast.success(response.message || 'Affiliate withdrawal request submitted')
        setAffiliateAmount('')
        setWalletAddress('')
        await refetchStats()
      } else {
        toast.error(response.message || 'Failed to submit withdrawal request')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit withdrawal request')
    } finally {
      setWithdrawSubmitting(false)
    }
  }

  const handleConvertAffiliateToBalance = async () => {
    const amount = getAffiliateAmount()

    if (amount < 1) {
      toast.error('Minimum conversion amount is $1.00')
      return
    }

    if (amount > pendingEarnings) {
      toast.error('Insufficient affiliate earnings')
      return
    }

    setConvertSubmitting(true)
    try {
      const response = await requests.post<{ success: boolean; message?: string }>(
        '/customer/affiliate/transfer-to-balance',
        { amount }
      )

      if (response.success) {
        toast.success(response.message || 'Affiliate earnings converted to balance')
        setAffiliateAmount('')
        await refetchStats()
      } else {
        toast.error(response.message || 'Failed to convert affiliate earnings')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to convert affiliate earnings')
    } finally {
      setConvertSubmitting(false)
    }
  }

  /** Display code without ref_ prefix; used in link param so backend resolves both ref_xxx and xxx */
  function stripRefPrefix(code: string): string {
    return code.replace(/^ref_/, '')
  }

  /** Full affiliate URL: origin/sign-up?ref=CODE (code without ref_ prefix) */
  function getAffiliateLink(code: string): string {
    if (typeof window === 'undefined')
      return '/sign-up?ref=' + encodeURIComponent(stripRefPrefix(code))
    const refParam = stripRefPrefix(code)
    return `${window.location.origin}/sign-up?ref=${encodeURIComponent(refParam)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'CONVERTED':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  if (statsLoading || codesLoading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  return (
    <div className='space-y-4 mx-auto max-w-6xl font-manrope'>
      {/* Header */}
      <div className='space-y-1 text-center'>
        <h1 className='text-foreground text-2xl font-semibold'>Affiliate Program</h1>
        <p className='text-muted-foreground text-base'>
          Generate affiliate codes, track referrals, and earn commissions
        </p>
      </div>

      {/* Stats Overview */}
      <div className='gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-green-500/10 p-2 rounded-lg'>
                <DollarSign className='w-4 h-4 text-green-500' />
              </div>
              <div className='flex-1'>
                <p className='text-muted-foreground text-sm mb-1'>Total Earnings</p>
                <p className='text-green-600 dark:text-green-400 text-lg font-semibold'>
                  ${stats?.totalEarnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-yellow-500/10 p-2 rounded-lg'>
                <Gift className='w-4 h-4 text-yellow-500' />
              </div>
              <div className='flex-1'>
                <p className='text-muted-foreground text-sm mb-1'>Pending Earnings</p>
                <p className='text-yellow-600 dark:text-yellow-400 text-lg font-semibold'>
                  ${stats?.pendingEarnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-blue-500/10 p-2 rounded-lg'>
                <Users className='w-4 h-4 text-blue-500' />
              </div>
              <div className='flex-1'>
                <p className='text-muted-foreground text-sm mb-1'>Total Referrals</p>
                <p className='text-blue-600 dark:text-blue-400 text-lg font-semibold'>{stats?.totalReferrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-purple-500/10 p-2 rounded-lg'>
                <TrendingUp className='w-4 h-4 text-purple-500' />
              </div>
              <div className='flex-1'>
                <p className='text-muted-foreground text-sm mb-1'>Conversion Rate</p>
                <p className='text-purple-600 dark:text-purple-400 text-lg font-semibold'>
                  {stats?.conversionRate?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Earnings Actions */}
      <Card className='bg-card backdrop-blur-sm border border-border'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-card-foreground text-xl font-semibold'>
            <Wallet className='w-4 h-4' />
            Affiliate Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4'>
            <div>
              <p className='text-muted-foreground text-sm'>Available affiliate earnings</p>
              <p className='text-primary text-2xl font-semibold'>${pendingEarnings.toFixed(2)}</p>
            </div>
            <Button
              type='button'
              variant='outline'
              disabled={pendingEarnings < 1}
              onClick={() => setAffiliateAmount(pendingEarnings.toFixed(2))}
              className='border-border'
            >
              Use full amount
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div className='space-y-2'>
              <Label htmlFor='affiliateAmount' className='text-muted-foreground text-sm'>
                Amount
              </Label>
              <Input
                id='affiliateAmount'
                type='number'
                min='1'
                max={pendingEarnings}
                step='0.01'
                value={affiliateAmount}
                onChange={(event) => setAffiliateAmount(event.target.value)}
                placeholder='0.00'
                className='bg-muted/50 border-border text-card-foreground'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='withdrawMethod' className='text-muted-foreground text-sm'>
                Withdrawal method
              </Label>
              <select
                id='withdrawMethod'
                value={withdrawMethod}
                onChange={(event) => setWithdrawMethod(event.target.value)}
                className='h-10 w-full rounded-md border border-border bg-muted/50 px-3 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/40'
              >
                {withdrawalMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='walletAddress' className='text-muted-foreground text-sm'>
                Wallet address
              </Label>
              <Input
                id='walletAddress'
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder='Enter wallet address'
                className='bg-muted/50 border-border text-card-foreground'
              />
            </div>
          </div>

          <div className='rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300'>
            You cannot withdraw if you convert to balance.
          </div>

          <div className='flex flex-col sm:flex-row gap-3'>
            <Button
              type='button'
              onClick={handleWithdrawAffiliate}
              disabled={pendingEarnings < 1 || withdrawSubmitting || convertSubmitting}
              className='bg-primary hover:bg-primary/90'
            >
              {withdrawSubmitting ? (
                <MotionLoader size='sm' variant='dots' />
              ) : (
                <>
                  <DollarSign className='mr-2 w-4 h-4' />
                  Request Withdrawal
                </>
              )}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleConvertAffiliateToBalance}
              disabled={pendingEarnings < 1 || withdrawSubmitting || convertSubmitting}
              className='border-border'
            >
              {convertSubmitting ? (
                <MotionLoader size='sm' variant='dots' />
              ) : (
                <>
                  <RefreshCw className='mr-2 w-4 h-4' />
                  Convert to Balance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generate New Code Section */}
      <Card className='bg-card backdrop-blur-sm border border-border'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-card-foreground text-xl font-semibold'>
            <Link className='w-4 h-4' />
            Generate New Affiliate Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-3'>
            <div className='flex-1'>
              <Label htmlFor='codeName' className='text-muted-foreground text-sm'>
                Code Name (Optional)
              </Label>
              <Input
                id='codeName'
                placeholder='e.g., Social Media Campaign, Blog Post'
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                className='mt-1 bg-muted/50 border-border text-card-foreground'
              />
            </div>
            <div className='flex items-end'>
              <Button
                onClick={handleGenerateCode}
                disabled={codesRefreshing}
                className='px-6 bg-primary hover:bg-primary/90'
              >
                {codesRefreshing ? (
                  <MotionLoader size='sm' variant='dots' />
                ) : (
                  <>
                    <Link className='mr-2 w-4 h-4' />
                    Generate Code
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className='text-muted-foreground text-sm mt-2'>
            Create unique affiliate codes to track different marketing campaigns and sources.
          </p>
        </CardContent>
      </Card>

      <div className='gap-4 grid grid-cols-1 lg:grid-cols-2'>
        {/* Affiliate Codes */}
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-card-foreground text-xl font-semibold'>
              <Share2 className='w-4 h-4' />
              Your Affiliate Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <div className='py-8 text-center'>
                <Link className='mx-auto mb-3 w-10 h-10 text-muted-foreground' />
                <p className='mb-2 text-muted-foreground text-base'>No affiliate codes yet</p>
                <p className='text-muted-foreground text-sm'>
                  Generate your first affiliate code to start earning commissions.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {codes.map((code) => {
                  const displayCode = stripRefPrefix(code.code)
                  const fullLink = getAffiliateLink(code.code)
                  return (
                    <div key={code.id} className='bg-muted/50 p-3 border border-border rounded-lg'>
                      <div className='flex justify-between items-start gap-3'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-1.5'>
                            <p className='text-card-foreground text-base font-mono font-medium truncate'>
                              {displayCode}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                                code.isActive
                                  ? 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'
                                  : 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
                              )}
                            >
                              {code.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className='mb-2'>
                            <code className='block truncate text-muted-foreground text-xs'>
                              {fullLink}
                            </code>
                          </div>
                          <div className='flex items-center gap-4 text-muted-foreground text-sm'>
                            <span className='inline-flex items-center gap-1.5'>
                              <Eye className='w-3 h-3' />
                              {code.clickCount} clicks
                            </span>
                            <span>${(code.earnings ?? 0).toFixed(2)} earned</span>
                            <span>Created {format(new Date(code.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleCopyCode(code.code)}
                            className='w-8 h-8 text-card-foreground hover:text-card-foreground hover:bg-accent'
                            title='Copy affiliate link'
                          >
                            <Copy className='w-3 h-3' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleCopyLink(code.code)}
                            className='w-8 h-8 text-card-foreground hover:text-card-foreground hover:bg-accent'
                            title='Copy link'
                          >
                            <ExternalLink className='w-3 h-3' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card className='bg-card backdrop-blur-sm border border-border'>
          <CardHeader className='pb-3'>
            <div className='flex justify-between items-center'>
              <CardTitle className='flex items-center gap-2 text-card-foreground text-xl font-semibold'>
                <Users className='w-4 h-4' />
                Recent Referrals
              </CardTitle>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => push('/user/affiliate/referrals')}
                className='text-card-foreground hover:text-card-foreground hover:bg-accent'
              >
                View All
                <ExternalLink className='ml-2 w-4 h-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className='flex justify-center py-4'>
                <MotionLoader size='sm' variant='dots' />
              </div>
            ) : referrals.length === 0 ? (
              <div className='py-8 text-center'>
                <Users className='mx-auto mb-3 w-10 h-10 text-muted-foreground' />
                <p className='mb-2 text-muted-foreground text-base'>No referrals yet</p>
                <p className='text-muted-foreground text-sm'>
                  Share your affiliate codes to start earning from referrals.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {referrals.slice(0, 5).map((referral) => (
                  <div
                    key={referral.id}
                    className='bg-muted/50 p-3 border border-border rounded-lg'
                  >
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1.5'>
                          <p className='text-card-foreground text-base font-medium'>{referral.email}</p>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 border rounded-full font-medium text-sm',
                              getStatusColor(referral.status)
                            )}
                          >
                            {referral.status}
                          </span>
                        </div>
                        <div className='flex items-center gap-4 text-muted-foreground text-sm'>
                          <span>Joined {format(new Date(referral.joinedAt), 'MMM dd, yyyy')}</span>
                          <span className='flex items-center gap-1'>
                            <DollarSign className='w-3 h-3' />${referral.earnings.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works Section */}
      <Card className='bg-card backdrop-blur-sm border border-border'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-card-foreground text-xl font-semibold'>
            How the Affiliate Program Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 md:grid-cols-3'>
            <div className='space-y-2 text-center'>
              <div className='flex justify-center items-center bg-primary/10 mx-auto p-2.5 rounded-full w-10 h-10'>
                <Link className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h3 className='text-card-foreground text-base font-semibold mb-1'>1. Generate Your Code</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Create unique affiliate codes for different campaigns and track their performance.
                </p>
              </div>
            </div>

            <div className='space-y-2 text-center'>
              <div className='flex justify-center items-center bg-primary/10 mx-auto p-2.5 rounded-full w-10 h-10'>
                <Share2 className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h3 className='text-card-foreground text-base font-semibold mb-1'>2. Share Your Links</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Share your affiliate links on social media, blogs, or with friends and family.
                </p>
              </div>
            </div>

            <div className='space-y-2 text-center'>
              <div className='flex justify-center items-center bg-primary/10 mx-auto p-2.5 rounded-full w-10 h-10'>
                <DollarSign className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h3 className='text-card-foreground text-base font-semibold mb-1'>3. Earn Commissions</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  Earn 10% commission on every successful referral who makes a purchase.
                </p>
              </div>
            </div>
          </div>

          <Separator className='my-4 bg-border' />

          <div className='bg-blue-500/10 p-4 border border-blue-500/20 rounded-lg'>
            <p className='text-blue-600 dark:text-blue-400 text-base font-semibold mb-2'>💡 Pro Tips for Success</p>
            <ul className='space-y-1 text-blue-600 dark:text-blue-300 text-sm'>
              <li>• Use descriptive code names to track different marketing channels</li>
              <li>• Share genuine reviews and experiences with our products</li>
              <li>• Engage with your audience and answer their questions</li>
              <li>• Monitor your analytics to see which strategies work best</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
