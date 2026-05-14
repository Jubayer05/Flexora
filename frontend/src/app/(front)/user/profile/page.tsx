'use client'

import CustomImage from '@/components/common/CustomImage'
import { BalanceProfileCard } from '@/components/profile/BalanceProfileCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TopupHistory } from '@/components/profile/TopupHistory'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import useAsync from '@/hooks/useAsync'
import { useMounted } from '@/hooks/useMounted'
import Cookies from 'js-cookie'
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  DollarSign,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShoppingBag,
  Star,
  Trophy,
  User,
  UserCheck,
  Verified,
  Package
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function UserProfilePage() {
  const mounted = useMounted()
  const router = useRouter()
  const userCookie = (typeof document !== 'undefined' ? Cookies.get('user') : null) ?? '{}'
  const userData = JSON.parse(userCookie)
  const token = typeof document !== 'undefined' ? Cookies.get('token') : null
  const [guestEmail, setGuestEmail] = useState('')
  // Use token (same as purchased-items/orders) so profile always fetches when logged in
  const { data } = useAsync(() => (token ? '/customer/profile' : null))
  const isGuestSession = !token && !!guestEmail

  // Prefer API data (has totalOrders, totalSpent, rank from server); fallback to cookie for initial paint
  const profileData = data?.data ?? userData

  useEffect(() => {
    if (!mounted || token) return

    const guestToken = Cookies.get('guestAccessToken') || sessionStorage.getItem('guestAccessToken')
    const email =
      Cookies.get('guestAccessEmail') ||
      sessionStorage.getItem('guestVerifiedEmail') ||
      sessionStorage.getItem('guestOrderEmail') ||
      ''

    if (guestToken && email) {
      sessionStorage.setItem('guestAccessToken', guestToken)
      sessionStorage.setItem('guestVerifiedEmail', email)
      sessionStorage.setItem('guestOrderEmail', email)
      setGuestEmail(email)
      return
    }

    setGuestEmail('')
  }, [mounted, token])

  if (!mounted) {
    return (
      <div className='mx-auto max-w-4xl container animate-pulse'>
        <div className='mb-8'>
          <div className='mb-2 h-9 w-48 rounded bg-muted' />
          <div className='h-5 w-72 rounded bg-muted' />
        </div>
        <div className='h-96 rounded-lg bg-muted/50' />
      </div>
    )
  }

  if (isGuestSession) {
    return (
      <div className='mx-auto max-w-4xl container'>
        <div className='mb-8'>
          <h1 className='mb-2 text-2xl font-bold text-foreground'>Your Profile</h1>
          <p className='text-base text-muted-foreground'>
            Review your guest access and continue to your delivered items.
          </p>
        </div>

        <Alert className='mb-6 border-amber-500/20 bg-amber-500/10'>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
          <AlertTitle className='text-foreground'>You&apos;re logged in as a guest.</AlertTitle>
          <AlertDescription className='space-y-4 text-muted-foreground'>
            <p>
              You can still view delivered purchases as a guest. Create an account with the same
              email when you want full dashboard tools, saved settings, and support tickets.
            </p>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button onClick={() => router.push('/user/purchased-items')} className='sm:flex-1'>
                <Package className='mr-2 h-4 w-4' />
                Open Purchased Items
              </Button>
              <Button onClick={() => router.push('/sign-up')} variant='outline' className='sm:flex-1'>
                Sign Up
              </Button>
              <Button onClick={() => router.push('/login')} variant='outline' className='sm:flex-1'>
                Sign In
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Card className='bg-card backdrop-blur-sm mb-6 p-6 border-border'>
          <div className='flex items-start gap-4 mb-6'>
            <div className='flex-shrink-0'>
              <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center'>
                <User className='w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground' />
              </div>
            </div>
            <div className='flex-1'>
              <div className='flex flex-wrap items-center gap-3 mb-2'>
                <h2 className='font-semibold text-card-foreground text-xl'>Guest User</h2>
                <Badge className='bg-green-500 text-primary-foreground px-2 py-1 text-xs font-normal border-0'>
                  Active
                </Badge>
                <Badge className='bg-muted text-card-foreground px-2 py-1 text-xs font-normal border-0'>
                  Guest
                </Badge>
              </div>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Email: {guestEmail}</p>
              <p className='text-muted-foreground text-sm'>Access: Guest dashboard</p>
              </div>
            </div>
          </div>

          <Separator className='bg-border mb-6' />

          <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 font-medium text-card-foreground'>
                <Mail className='w-4 h-4' />
                Email Address
              </div>
              <p className='pl-6 text-card-foreground text-sm'>{guestEmail}</p>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center gap-2 font-medium text-card-foreground'>
                <Shield className='w-4 h-4' />
                Access Level
              </div>
              <p className='pl-6 text-card-foreground text-sm'>Limited guest dashboard access</p>
            </div>
          </div>
        </Card>

        <div className='gap-6 grid grid-cols-1 lg:grid-cols-2'>
          <Card className='bg-background/50 backdrop-blur-sm p-6 border-border'>
            <h3 className='mb-4 font-semibold text-card-foreground text-lg'>Account Status</h3>
            <div className='gap-4 grid grid-cols-2 sm:grid-cols-2'>
              <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
                <div className='mb-1 font-semibold text-card-foreground text-2xl'>Guest</div>
                <div className='text-muted-foreground text-sm'>Account Type</div>
              </div>
              <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
                <div className='mb-1 font-semibold text-primary text-2xl'>Active</div>
                <div className='text-muted-foreground text-sm'>Session Status</div>
              </div>
              <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
                <div className='mb-1 font-semibold text-accent-foreground text-2xl'>OTP</div>
                <div className='text-muted-foreground text-sm'>Verified Access</div>
              </div>
              <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
                <div className='mb-1 font-semibold text-card-foreground text-2xl'>2</div>
                <div className='text-muted-foreground text-sm'>Available Sections</div>
              </div>
            </div>
          </Card>

          <Card className='bg-background/50 backdrop-blur-sm p-6 border-border'>
            <h3 className='mb-4 font-semibold text-card-foreground text-lg'>
              Keep your purchases connected to one account
            </h3>
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>
                Sign up with the same email to save your purchases, manage account settings, and
                open support tickets from any device.
              </p>
              <Button onClick={() => router.push('/sign-up')} className='w-full'>
                Sign Up
              </Button>
            </div>
          </Card>
        </div>

        <Card className='bg-background/50 backdrop-blur-sm mt-6 p-6 border-border'>
          <h3 className='mb-4 font-semibold text-card-foreground text-lg'>What guest access includes</h3>
          <div className='space-y-4 text-sm text-muted-foreground'>
            <p>You can review purchases and download delivered items from your dashboard.</p>
            <p>Subscriptions, tickets, profile settings, and full account tools unlock after signup with the same email.</p>
          </div>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFullName = () => {
    const firstName = profileData?.firstName || ''
    const lastName = profileData?.lastName || ''
    return `${firstName} ${lastName}`.trim() || profileData?.username || 'User'
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'NEW':
        return 'bg-blue-500'
      case 'BRONZE':
        return 'bg-orange-600'
      case 'SILVER':
        return 'bg-gray-500'
      case 'GOLD':
        return 'bg-yellow-500'
      case 'PLATINUM':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className='mx-auto max-w-4xl container'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='mb-2 text-2xl font-bold text-foreground'>Your Profile</h1>
        <p className='text-base text-muted-foreground'>
          Manage your account details, balance, rewards, and recent activity.
        </p>
      </div>

      {/* Balance Card - Prominent Display */}
      <div className='mb-20 z-10'>
        <BalanceProfileCard />
      </div>

      {/* Rank & Rewards Dashboard */}
      <Card className='mb-6 bg-card/80 backdrop-blur-sm border-border overflow-hidden py-0'>
        <div className='bg-gradient-to-br from-primary/10 via-background to-background p-6'>
          <h3 className='mb-1 font-semibold text-card-foreground text-lg flex items-center gap-2'>
            <Trophy className='w-5 h-5 text-primary' />
            Rank & Rewards
          </h3>
          <p className='text-muted-foreground text-sm mb-5'>
            See your current tier, progress, and active benefits.
          </p>

          {/* Progress bar full width (when next rank exists) */}
          {profileData?.nextRankName && (
            <div className='mb-6 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  ${Number(profileData?.totalSpent ?? 0).toFixed(0)} spent
                </span>
                <span className='text-muted-foreground'>
                  ${Number(profileData?.nextRankMinSpending ?? 0).toFixed(0)} to{' '}
                  {profileData.nextRankName}
                </span>
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted overflow-hidden'>
                <div
                  className='h-full rounded-full bg-primary transition-all duration-500'
                  style={{
                    width: `${(() => {
                      const spent = Number(profileData?.totalSpent ?? 0)
                      const minR = Number(profileData?.rankMinSpending ?? 0)
                      const nextMin = Number(profileData?.nextRankMinSpending ?? 0)
                      const denom = nextMin - minR
                      if (denom <= 0) return 0
                      return Math.min(100, Math.max(0, ((spent - minR) / denom) * 100))
                    })()}%`
                  }}
                />
              </div>
              <p className='text-muted-foreground text-xs'>
                Spend $
                {Math.max(
                  0,
                  Number(profileData?.nextRankMinSpending ?? 0) -
                    Number(profileData?.totalSpent ?? 0)
                ).toFixed(0)}{' '}
                more to reach {profileData.nextRankName}
              </p>
            </div>
          )}

          {/* Left: Current rank + benefits | Right: Next rank + benefits */}
          <div className='gap-6 grid grid-cols-1 lg:grid-cols-2'>
            {/* Left: Current Rank & benefits */}
            <div className='space-y-4'>
              <div>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2'>
                  Current Rank
                </p>
                <div className='inline-flex items-center gap-2 rounded-lg px-4 py-3 border bg-muted/40 border-border'>
                  {profileData?.rankIcon ? (
                    <span className='flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50'>
                      <CustomImage
                        src={profileData.rankIcon}
                        alt={profileData?.rank || 'Rank'}
                        width={40}
                        height={40}
                        className='h-10 w-10 object-contain'
                        unoptimized
                      />
                    </span>
                  ) : (
                    <Star className='w-6 h-6 flex-shrink-0 text-primary' />
                  )}
                  <span className='font-bold text-card-foreground text-xl'>
                    {profileData?.rank || 'NEW'}
                  </span>
                </div>
                {profileData?.discountPercent != null && profileData.discountPercent > 0 && (
                  <p className='mt-2 text-muted-foreground text-sm'>
                    {profileData.discountPercent}% discount on orders
                  </p>
                )}
              </div>
              <div>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2'>
                  Current rank benefits
                </p>
                {profileData?.rankBenefits && profileData.rankBenefits.length > 0 ? (
                  <ul className='gap-2 flex flex-col'>
                    {profileData.rankBenefits.map((benefit: string, index: number) => (
                      <li
                        key={index}
                        className='flex items-center gap-3 text-card-foreground text-sm'
                      >
                        <span className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary'>
                          <Check className='w-3 h-3' />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-muted-foreground text-sm'>No benefits listed for this rank.</p>
                )}
              </div>
            </div>

            {/* Right: Next Rank & benefits */}
            <div className='space-y-4'>
              <div>
                <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2'>
                  {profileData?.nextRankName ? `Next rank: ${profileData.nextRankName}` : 'Next rank'}
                </p>
                {profileData?.nextRankName ? (
                  <>
                    <div className='rounded-lg border border-primary/30 bg-primary/5 px-4 py-3'>
                      <span className='font-semibold text-primary text-lg'>
                        {profileData.nextRankName}
                      </span>
                    </div>
                    {profileData?.nextRankDiscount != null && profileData.nextRankDiscount > 0 && (
                      <p className='mt-2 text-muted-foreground text-sm'>
                        {profileData.nextRankDiscount}% discount on orders
                      </p>
                    )}
                  </>
                ) : (
                  <div className='rounded-lg bg-primary/10 border border-primary/20 px-4 py-3'>
                    <p className='font-medium text-primary text-sm flex items-center gap-2'>
                      <Trophy className='w-4 h-4' />
                      You&apos;re at the highest rank
                    </p>
                    <p className='text-muted-foreground text-xs mt-1'>
                      Keep enjoying your current benefits
                    </p>
                  </div>
                )}
              </div>
              {profileData?.nextRankName && (
                <div>
                  <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2'>
                    Benefits at next rank
                  </p>
                  {profileData?.nextRankBenefits && profileData.nextRankBenefits.length > 0 ? (
                    <ul className='gap-2 flex flex-col'>
                      {profileData.nextRankBenefits.map((benefit: string, index: number) => (
                        <li
                          key={index}
                          className='flex items-center gap-3 text-muted-foreground text-sm'
                        >
                          <Check className='w-3.5 h-3.5 flex-shrink-0 text-primary/80' />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='text-muted-foreground text-sm'>No additional benefits listed.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Card */}
      <Card className='bg-card backdrop-blur-sm mb-6 p-6 border-border'>
        <div className='flex items-start gap-4 mb-6'>
          {/* Profile image */}
          <div className='flex-shrink-0'>
            <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center'>
              {profileData?.photoUrl ? (
                <CustomImage
                  src={profileData.photoUrl}
                  alt={getFullName()}
                  width={96}
                  height={96}
                  className='w-full h-full object-cover'
                  unoptimized
                />
              ) : (
                <User className='w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground' />
              )}
            </div>
          </div>
          <div className='flex-1'>
            <div className='flex flex-wrap items-center gap-3 mb-2'>
              <h2 className='font-semibold text-card-foreground text-xl'>{getFullName()}</h2>
              <Badge
                className={`
                  px-2 py-1 text-xs font-normal border-0
                  ${
                    profileData?.isActive
                      ? 'bg-green-500 text-primary-foreground font-medium'
                      : 'bg-destructive text-primary-foreground'
                  }
                `}
              >
                {profileData?.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {profileData?.rank && (
                <Badge
                  className={`px-2 py-1 text-xs font-normal border-0 ${getRankColor(
                    profileData.rank
                  )} text-primary-foreground`}
                >
                  {profileData.rank}
                </Badge>
              )}
              {profileData?.isVerified && (
                <Badge className='bg-primary px-2 py-1 border-0 font-normal text-primary-foreground text-xs'>
                  <Verified className='mr-1 w-3 h-3' />
                  Verified
                </Badge>
              )}
              {profileData?.isBanned && (
                <Badge className='bg-destructive px-2 py-1 border-0 font-normal text-primary-foreground text-xs'>
                  <Ban className='mr-1 w-3 h-3' />
                  Banned
                </Badge>
              )}
            </div>
            <div className='space-y-1'>
              <p className='text-muted-foreground text-sm'>User ID: #{profileData?.id}</p>
              <p className='text-muted-foreground text-sm'>Role: {profileData?.role || 'N/A'}</p>
              {profileData?.username && (
                <p className='text-muted-foreground text-sm'>@{profileData.username}</p>
              )}
            </div>
          </div>
        </div>

        <Separator className='bg-border mb-6' />

        {/* User Details Grid */}
        <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
          {/* Personal Information */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-card-foreground'>
              <User className='w-4 h-4' />
              Full Name
            </div>
            <p className='pl-6 text-card-foreground text-sm'>{getFullName()}</p>
          </div>

          {/* Email */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-card-foreground'>
              <Mail className='w-4 h-4' />
              Email Address
            </div>
            <div className='space-y-1 pl-6'>
              <p className='text-card-foreground text-sm'>{profileData?.email}</p>
            </div>
          </div>

          {/* Phone */}
          {profileData?.phone && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2 font-medium text-card-foreground'>
                <Phone className='w-4 h-4' />
                Phone Number
              </div>
              <p className='pl-6 text-card-foreground text-sm'>{profileData.phone}</p>
            </div>
          )}

          {/* Country */}
          {profileData?.country && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2 font-medium text-card-foreground'>
                <MapPin className='w-4 h-4' />
                Country
              </div>
              <p className='pl-6 text-card-foreground text-sm'>{profileData.country}</p>
            </div>
          )}

          {/* Telegram */}
          {profileData?.telegramUsername && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2 font-medium text-card-foreground'>
                <Globe className='w-4 h-4' />
                Telegram
              </div>
              <p className='pl-6 text-card-foreground text-sm'>{profileData.telegramUsername}</p>
            </div>
          )}

          {/* Customer Rank */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-card-foreground'>
              <Star className='w-4 h-4' />
              Customer Rank
            </div>
            <p className='pl-6 text-card-foreground text-sm'>{profileData?.rank || 'NEW'}</p>
          </div>

          {/* Account Created */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-card-foreground'>
              <CalendarDays className='w-4 h-4' />
              Account Created
            </div>
            <p className='pl-6 text-card-foreground text-sm'>{formatDate(profileData?.createdAt)}</p>
          </div>

          {/* Last Login */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2 font-medium text-card-foreground'>
              <UserCheck className='w-4 h-4' />
              Last Login
            </div>
            <div className='space-y-1 pl-6'>
              <p className='text-card-foreground'>{formatDate(profileData?.lastLoginAt)}</p>
              {profileData?.lastLoginDevice && (
                <p className='text-muted-foreground text-xs'>Device: {profileData.lastLoginDevice}</p>
              )}
              {profileData?.lastLoginIp && (
                <p className='text-muted-foreground text-xs'>IP: {profileData.lastLoginIp}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Account Status & Statistics */}
      <div className='gap-6 grid grid-cols-1 lg:grid-cols-2'>
        {/* Account Status Card */}
        <Card className='bg-background/50 backdrop-blur-sm p-6 border-border'>
          <h3 className='mb-4 font-semibold text-card-foreground text-lg'>Account Status</h3>
          <div className='gap-4 grid grid-cols-2 sm:grid-cols-2'>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div className='mb-1 font-semibold text-card-foreground text-2xl'>#{profileData?.id}</div>
              <div className='text-muted-foreground text-sm'>User ID</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-1 ${
                  profileData?.isActive ? 'text-primary' : 'text-destructive'
                }`}
              >
                {profileData?.isActive ? 'Active' : 'Inactive'}
              </div>
              <div className='text-muted-foreground text-sm'>Account Status</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-1 ${
                  profileData?.isVerified ? 'text-primary' : 'text-accent-foreground'
                }`}
              >
                {profileData?.isVerified ? '✓' : '⚠'}
              </div>
              <div className='text-muted-foreground text-sm'>Verification</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-1 ${
                  profileData?.isBanned ? 'text-destructive' : 'text-primary'
                }`}
              >
                {profileData?.isBanned ? '⚠' : '✓'}
              </div>
              <div className='text-muted-foreground text-sm'>Account Standing</div>
            </div>
          </div>
        </Card>

        {/* Order Statistics Card */}
        <Card className='bg-background/50 backdrop-blur-sm p-6 border-border'>
          <h3 className='mb-4 font-semibold text-card-foreground text-lg'>Order Statistics</h3>
          <div className='gap-4 grid grid-cols-2 sm:grid-cols-2'>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <ShoppingBag className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                <div className='font-semibold text-card-foreground text-2xl'>
                  {profileData?.totalOrders || 0}
                </div>
              </div>
              <div className='text-muted-foreground text-sm'>Total Orders</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <DollarSign className='w-5 h-5 text-primary' />
                <div className='font-semibold text-card-foreground text-2xl'>
                  ${profileData?.totalSpent || '0'}
                </div>
              </div>
              <div className='text-muted-foreground text-sm'>Total Spent</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <Star className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
                <div className='font-semibold text-card-foreground text-2xl'>
                  {profileData?.rank || 'NEW'}
                </div>
              </div>
              <div className='text-muted-foreground text-sm'>Customer Rank</div>
            </div>
            <div className='bg-muted/50 p-4 border border-border rounded-lg text-center'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <Shield className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                <div className='font-semibold text-card-foreground text-2xl'>
                  {profileData?.discountPercent || 0}%
                </div>
              </div>
              <div className='text-muted-foreground text-sm'>Discount Rate</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Information */}
      {(profileData?.note ||
        profileData?.banReason ||
        (profileData?.tags && profileData.tags.length > 0)) && (
        <Card className='bg-background/50 backdrop-blur-sm mt-6 p-6 border-border'>
          <h3 className='mb-4 font-semibold text-card-foreground text-lg'>Additional Information</h3>
          <div className='space-y-4'>
            {profileData?.note && (
              <div>
                <h4 className='mb-2 font-medium text-card-foreground'>Note</h4>
                <p className='text-card-foreground'>{profileData.note}</p>
              </div>
            )}
            {profileData?.banReason && (
              <div>
                <h4 className='mb-2 font-medium text-red-600 dark:text-red-400'>Ban Reason</h4>
                <p className='text-red-600/90 dark:text-red-300'>{profileData.banReason}</p>
              </div>
            )}
            {profileData?.tags && profileData.tags.length > 0 && (
              <div>
                <h4 className='mb-2 font-medium text-card-foreground'>Tags</h4>
                <div className='flex flex-wrap gap-2'>
                  {profileData.tags
                    .filter((tag: string) => tag.trim())
                    .map((tag: string, index: number) => (
                      <Badge
                        key={index}
                        className='bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-300'
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Topup History */}
      <TopupHistory />
    </div>
  )
}
