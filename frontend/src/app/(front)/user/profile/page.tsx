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
  const { data } = useAsync(() => (token ? '/customer/profile' : null))
  const isGuestSession = !token && !!guestEmail

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
      <div className='max-w-container-max mx-auto animate-pulse'>
        <div className='mb-lg'>
          <div className='mb-base h-9 w-48 rounded bg-surface-container-high' />
          <div className='h-5 w-72 rounded bg-surface-container-high mt-sm' />
        </div>
        <div className='h-96 rounded-xl bg-surface-container-high' />
      </div>
    )
  }

  if (isGuestSession) {
    return (
      <div className='max-w-container-max mx-auto'>
        <div className='mb-lg'>
          <h1 className='mb-base text-xl font-bold text-on-surface'>Your Profile</h1>
          <p className='text-base text-on-surface-variant'>
            Review your guest access and continue to your delivered items.
          </p>
        </div>

        <Alert className='mb-gutter border-primary/20 bg-primary-container/10'>
          <AlertTriangle className='h-4 w-4 text-primary' />
          <AlertTitle className='text-on-surface'>You&apos;re logged in as a guest.</AlertTitle>
          <AlertDescription className='space-y-md text-on-surface-variant'>
            <p>
              You can still view delivered purchases as a guest. Create an account with the same
              email when you want full dashboard tools, saved settings, and support tickets.
            </p>
            <div className='flex flex-col gap-sm sm:flex-row'>
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

        <div className='glass-card rounded-xl p-lg mb-gutter'>
          <div className='flex items-start gap-md mb-lg'>
            <div className='flex-shrink-0'>
              <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-container-highest border-2 border-outline-variant flex items-center justify-center'>
                <User className='w-10 h-10 sm:w-12 sm:h-12 text-on-surface-variant' />
              </div>
            </div>
            <div className='flex-1'>
              <div className='flex flex-wrap items-center gap-sm mb-base'>
                <h2 className='font-semibold text-on-surface text-xl'>Guest User</h2>
                <Badge className='bg-tertiary-container text-on-tertiary-container px-sm py-xs text-xs font-normal border-0'>
                  Active
                </Badge>
                <Badge className='bg-surface-container text-on-surface-variant px-sm py-xs text-xs font-normal border-0'>
                  Guest
                </Badge>
              </div>
              <div className='space-y-xs'>
                <p className='text-on-surface-variant text-sm'>Email: {guestEmail}</p>
              <p className='text-on-surface-variant text-sm'>Access: Guest dashboard</p>
              </div>
            </div>
          </div>

          <Separator className='bg-outline-variant mb-lg' />

          <div className='gap-lg grid grid-cols-1 md:grid-cols-2'>
            <div className='space-y-sm'>
              <div className='flex items-center gap-sm font-medium text-on-surface'>
                <Mail className='w-4 h-4' />
                Email Address
              </div>
              <p className='pl-lg text-on-surface text-sm'>{guestEmail}</p>
            </div>

            <div className='space-y-sm'>
              <div className='flex items-center gap-sm font-medium text-on-surface'>
                <Shield className='w-4 h-4' />
                Access Level
              </div>
              <p className='pl-lg text-on-surface text-sm'>Limited guest dashboard access</p>
            </div>
          </div>
        </div>

        <div className='gap-lg grid grid-cols-1 lg:grid-cols-2'>
          <div className='glass-card rounded-xl p-lg'>
            <h3 className='mb-md font-semibold text-on-surface text-lg'>Account Status</h3>
            <div className='gap-md grid grid-cols-2 sm:grid-cols-2'>
              <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
                <div className='mb-xs font-semibold text-on-surface text-2xl'>Guest</div>
                <div className='text-on-surface-variant text-sm'>Account Type</div>
              </div>
              <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
                <div className='mb-xs font-semibold text-primary text-2xl'>Active</div>
                <div className='text-on-surface-variant text-sm'>Session Status</div>
              </div>
              <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
                <div className='mb-xs font-semibold text-tertiary text-2xl'>OTP</div>
                <div className='text-on-surface-variant text-sm'>Verified Access</div>
              </div>
              <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
                <div className='mb-xs font-semibold text-on-surface text-2xl'>2</div>
                <div className='text-on-surface-variant text-sm'>Available Sections</div>
              </div>
            </div>
          </div>

          <div className='glass-card rounded-xl p-lg'>
            <h3 className='mb-md font-semibold text-on-surface text-lg'>
              Keep your purchases connected to one account
            </h3>
            <div className='space-y-md'>
              <p className='text-on-surface-variant text-sm'>
                Sign up with the same email to save your purchases, manage account settings, and
                open support tickets from any device.
              </p>
              <Button onClick={() => router.push('/sign-up')} className='w-full'>
                Sign Up
              </Button>
            </div>
          </div>
        </div>

        <div className='glass-card rounded-xl p-lg mt-lg'>
          <h3 className='mb-md font-semibold text-on-surface text-lg'>What guest access includes</h3>
          <div className='space-y-md text-sm text-on-surface-variant'>
            <p>You can review purchases and download delivered items from your dashboard.</p>
            <p>Subscriptions, tickets, profile settings, and full account tools unlock after signup with the same email.</p>
          </div>
        </div>
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
        return 'bg-tertiary-container text-on-tertiary-container'
      case 'BRONZE':
        return 'bg-secondary-container text-on-secondary-container'
      case 'SILVER':
        return 'bg-surface-container-highest text-on-surface-variant'
      case 'GOLD':
        return 'bg-primary-container text-on-primary-container'
      case 'PLATINUM':
        return 'bg-tertiary-container text-on-tertiary-container'
      default:
        return 'bg-surface-container text-on-surface-variant'
    }
  }

  return (
    <div className='max-w-container-max mx-auto'>
      <div className='mb-lg'>
        <h1 className='mb-base text-xl font-bold text-on-surface'>Your Profile</h1>
        <p className='text-base text-on-surface-variant'>
          Manage your account details, balance, rewards, and recent activity.
        </p>
      </div>

      <div className='mb-xl z-10'>
        <BalanceProfileCard />
      </div>

      <div className='glass-card rounded-xl overflow-hidden mb-gutter'>
        <div className='bg-gradient-to-br from-primary/10 via-surface to-surface p-lg'>
          <h3 className='mb-xs font-semibold text-on-surface text-lg flex items-center gap-sm'>
            <Trophy className='w-5 h-5 text-primary' />
            Rank & Rewards
          </h3>
          <p className='text-on-surface-variant text-sm mb-md'>
            See your current tier, progress, and active benefits.
          </p>

          {profileData?.nextRankName && (
            <div className='mb-lg space-y-sm'>
              <div className='flex justify-between text-sm'>
                <span className='text-on-surface-variant'>
                  ${Number(profileData?.totalSpent ?? 0).toFixed(0)} spent
                </span>
                <span className='text-on-surface-variant'>
                  ${Number(profileData?.nextRankMinSpending ?? 0).toFixed(0)} to{' '}
                  {profileData.nextRankName}
                </span>
              </div>
              <div className='h-2.5 w-full rounded-full bg-surface-container overflow-hidden'>
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
              <p className='text-on-surface-variant text-xs'>
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

          <div className='gap-lg grid grid-cols-1 lg:grid-cols-2'>
            <div className='space-y-md'>
              <div>
                <p className='text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-sm'>
                  Current Rank
                </p>
                <div className='inline-flex items-center gap-sm rounded-lg px-md py-sm border bg-surface-container'>
                  {profileData?.rankIcon ? (
                    <span className='flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-container-high'>
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
                  <span className='font-bold text-on-surface text-xl'>
                    {profileData?.rank || 'NEW'}
                  </span>
                </div>
                {profileData?.discountPercent != null && profileData.discountPercent > 0 && (
                  <p className='mt-sm text-on-surface-variant text-sm'>
                    {profileData.discountPercent}% discount on orders
                  </p>
                )}
              </div>
              <div>
                <p className='text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-sm'>
                  Current rank benefits
                </p>
                {profileData?.rankBenefits && profileData.rankBenefits.length > 0 ? (
                  <ul className='gap-sm flex flex-col'>
                    {profileData.rankBenefits.map((benefit: string, index: number) => (
                      <li
                        key={index}
                        className='flex items-center gap-sm text-on-surface text-sm'
                      >
                        <span className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container'>
                          <Check className='w-3 h-3' />
                        </span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-on-surface-variant text-sm'>No benefits listed for this rank.</p>
                )}
              </div>
            </div>

            <div className='space-y-md'>
              <div>
                <p className='text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-sm'>
                  {profileData?.nextRankName ? `Next rank: ${profileData.nextRankName}` : 'Next rank'}
                </p>
                {profileData?.nextRankName ? (
                  <>
                    <div className='rounded-lg border border-primary/30 bg-primary/5 px-md py-sm'>
                      <span className='font-semibold text-primary text-lg'>
                        {profileData.nextRankName}
                      </span>
                    </div>
                    {profileData?.nextRankDiscount != null && profileData.nextRankDiscount > 0 && (
                      <p className='mt-sm text-on-surface-variant text-sm'>
                        {profileData.nextRankDiscount}% discount on orders
                      </p>
                    )}
                  </>
                ) : (
                  <div className='rounded-lg bg-primary/10 border border-primary/20 px-md py-sm'>
                    <p className='font-medium text-primary text-sm flex items-center gap-sm'>
                      <Trophy className='w-4 h-4' />
                      You&apos;re at the highest rank
                    </p>
                    <p className='text-on-surface-variant text-xs mt-xs'>
                      Keep enjoying your current benefits
                    </p>
                  </div>
                )}
              </div>
              {profileData?.nextRankName && (
                <div>
                  <p className='text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-sm'>
                    Benefits at next rank
                  </p>
                  {profileData?.nextRankBenefits && profileData.nextRankBenefits.length > 0 ? (
                    <ul className='gap-sm flex flex-col'>
                      {profileData.nextRankBenefits.map((benefit: string, index: number) => (
                        <li
                          key={index}
                          className='flex items-center gap-sm text-on-surface-variant text-sm'
                        >
                          <Check className='w-3.5 h-3.5 flex-shrink-0 text-primary/80' />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className='text-on-surface-variant text-sm'>No additional benefits listed.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='glass-card rounded-xl p-lg mb-gutter'>
        <div className='flex items-start gap-md mb-lg'>
          <div className='flex-shrink-0'>
            <div className='w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-surface-container-highest border-2 border-outline-variant flex items-center justify-center'>
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
                <User className='w-10 h-10 sm:w-12 sm:h-12 text-on-surface-variant' />
              )}
            </div>
          </div>
          <div className='flex-1'>
            <div className='flex flex-wrap items-center gap-sm mb-base'>
              <h2 className='font-semibold text-on-surface text-xl'>{getFullName()}</h2>
              <Badge
                className={`
                  px-sm py-xs text-xs font-normal border-0
                  ${
                    profileData?.isActive
                      ? 'bg-tertiary-container text-on-tertiary-container font-medium'
                      : 'bg-error-container text-on-error'
                  }
                `}
              >
                {profileData?.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {profileData?.rank && (
                <Badge
                  className={`px-sm py-xs text-xs font-normal border-0 ${getRankColor(
                    profileData.rank
                  )}`}
                >
                  {profileData.rank}
                </Badge>
              )}
              {profileData?.isVerified && (
                <Badge className='bg-primary px-sm py-xs border-0 font-normal text-on-primary text-xs'>
                  <Verified className='mr-1 w-3 h-3' />
                  Verified
                </Badge>
              )}
              {profileData?.isBanned && (
                <Badge className='bg-error-container px-sm py-xs border-0 font-normal text-on-error text-xs'>
                  <Ban className='mr-1 w-3 h-3' />
                  Banned
                </Badge>
              )}
            </div>
            <div className='space-y-xs'>
              <p className='text-on-surface-variant text-sm'>User ID: #{profileData?.id}</p>
              <p className='text-on-surface-variant text-sm'>Role: {profileData?.role || 'N/A'}</p>
              {profileData?.username && (
                <p className='text-on-surface-variant text-sm'>@{profileData.username}</p>
              )}
            </div>
          </div>
        </div>

        <Separator className='bg-outline-variant mb-lg' />

        <div className='gap-lg grid grid-cols-1 md:grid-cols-2'>
          <div className='space-y-sm'>
            <div className='flex items-center gap-sm font-medium text-on-surface'>
              <User className='w-4 h-4' />
              Full Name
            </div>
            <p className='pl-lg text-on-surface text-sm'>{getFullName()}</p>
          </div>

          <div className='space-y-sm'>
            <div className='flex items-center gap-sm font-medium text-on-surface'>
              <Mail className='w-4 h-4' />
              Email Address
            </div>
            <div className='space-y-xs pl-lg'>
              <p className='text-on-surface text-sm'>{profileData?.email}</p>
            </div>
          </div>

          {profileData?.phone && (
            <div className='space-y-sm'>
              <div className='flex items-center gap-sm font-medium text-on-surface'>
                <Phone className='w-4 h-4' />
                Phone Number
              </div>
              <p className='pl-lg text-on-surface text-sm'>{profileData.phone}</p>
            </div>
          )}

          {profileData?.country && (
            <div className='space-y-sm'>
              <div className='flex items-center gap-sm font-medium text-on-surface'>
                <MapPin className='w-4 h-4' />
                Country
              </div>
              <p className='pl-lg text-on-surface text-sm'>{profileData.country}</p>
            </div>
          )}

          {profileData?.telegramUsername && (
            <div className='space-y-sm'>
              <div className='flex items-center gap-sm font-medium text-on-surface'>
                <Globe className='w-4 h-4' />
                Telegram
              </div>
              <p className='pl-lg text-on-surface text-sm'>{profileData.telegramUsername}</p>
            </div>
          )}

          <div className='space-y-sm'>
            <div className='flex items-center gap-sm font-medium text-on-surface'>
              <Star className='w-4 h-4' />
              Customer Rank
            </div>
            <p className='pl-lg text-on-surface text-sm'>{profileData?.rank || 'NEW'}</p>
          </div>

          <div className='space-y-sm'>
            <div className='flex items-center gap-sm font-medium text-on-surface'>
              <CalendarDays className='w-4 h-4' />
              Account Created
            </div>
            <p className='pl-lg text-on-surface text-sm'>{formatDate(profileData?.createdAt)}</p>
          </div>

          <div className='space-y-sm'>
            <div className='flex items-center gap-sm font-medium text-on-surface'>
              <UserCheck className='w-4 h-4' />
              Last Login
            </div>
            <div className='space-y-xs pl-lg'>
              <p className='text-on-surface'>{formatDate(profileData?.lastLoginAt)}</p>
              {profileData?.lastLoginDevice && (
                <p className='text-on-surface-variant text-xs'>Device: {profileData.lastLoginDevice}</p>
              )}
              {profileData?.lastLoginIp && (
                <p className='text-on-surface-variant text-xs'>IP: {profileData.lastLoginIp}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='gap-lg grid grid-cols-1 lg:grid-cols-2'>
        <div className='glass-card rounded-xl p-lg'>
          <h3 className='mb-md font-semibold text-on-surface text-lg'>Account Status</h3>
          <div className='gap-md grid grid-cols-2 sm:grid-cols-2'>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div className='mb-xs font-semibold text-on-surface text-2xl'>#{profileData?.id}</div>
              <div className='text-on-surface-variant text-sm'>User ID</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-xs ${
                  profileData?.isActive ? 'text-primary' : 'text-error'
                }`}
              >
                {profileData?.isActive ? 'Active' : 'Inactive'}
              </div>
              <div className='text-on-surface-variant text-sm'>Account Status</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-xs ${
                  profileData?.isVerified ? 'text-primary' : 'text-tertiary'
                }`}
              >
                {profileData?.isVerified ? 'Yes' : 'No'}
              </div>
              <div className='text-on-surface-variant text-sm'>Verification</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div
                className={`font-semibold text-2xl mb-xs ${
                  profileData?.isBanned ? 'text-error' : 'text-primary'
                }`}
              >
                {profileData?.isBanned ? 'No' : 'OK'}
              </div>
              <div className='text-on-surface-variant text-sm'>Account Standing</div>
            </div>
          </div>
        </div>

        <div className='glass-card rounded-xl p-lg'>
          <h3 className='mb-md font-semibold text-on-surface text-lg'>Order Statistics</h3>
          <div className='gap-md grid grid-cols-2 sm:grid-cols-2'>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div className='flex justify-center items-center gap-sm mb-sm'>
                <ShoppingBag className='w-5 h-5 text-tertiary' />
                <div className='font-semibold text-on-surface text-2xl'>
                  {profileData?.totalOrders || 0}
                </div>
              </div>
              <div className='text-on-surface-variant text-sm'>Total Orders</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div className='flex justify-center items-center gap-sm mb-sm'>
                <DollarSign className='w-5 h-5 text-primary' />
                <div className='font-semibold text-on-surface text-2xl'>
                  ${profileData?.totalSpent || '0'}
                </div>
              </div>
              <div className='text-on-surface-variant text-sm'>Total Spent</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div className='flex justify-center items-center gap-sm mb-sm'>
                <Star className='w-5 h-5 text-secondary' />
                <div className='font-semibold text-on-surface text-2xl'>
                  {profileData?.rank || 'NEW'}
                </div>
              </div>
              <div className='text-on-surface-variant text-sm'>Customer Rank</div>
            </div>
            <div className='bg-surface-container p-md border border-outline-variant rounded-lg text-center'>
              <div className='flex justify-center items-center gap-sm mb-sm'>
                <Shield className='w-5 h-5 text-tertiary-container' />
                <div className='font-semibold text-on-surface text-2xl'>
                  {profileData?.discountPercent || 0}%
                </div>
              </div>
              <div className='text-on-surface-variant text-sm'>Discount Rate</div>
            </div>
          </div>
        </div>
      </div>

      {(profileData?.note ||
        profileData?.banReason ||
        (profileData?.tags && profileData.tags.length > 0)) && (
        <div className='glass-card rounded-xl p-lg mt-lg'>
          <h3 className='mb-md font-semibold text-on-surface text-lg'>Additional Information</h3>
          <div className='space-y-md'>
            {profileData?.note && (
              <div>
                <h4 className='mb-sm font-medium text-on-surface'>Note</h4>
                <p className='text-on-surface'>{profileData.note}</p>
              </div>
            )}
            {profileData?.banReason && (
              <div>
                <h4 className='mb-sm font-medium text-error'>Ban Reason</h4>
                <p className='text-error/90'>{profileData.banReason}</p>
              </div>
            )}
            {profileData?.tags && profileData.tags.length > 0 && (
              <div>
                <h4 className='mb-sm font-medium text-on-surface'>Tags</h4>
                <div className='flex flex-wrap gap-sm'>
                  {profileData.tags
                    .filter((tag: string) => tag.trim())
                    .map((tag: string, index: number) => (
                      <Badge
                        key={index}
                        className='bg-tertiary-container/20 border border-tertiary text-tertiary'
                      >
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <TopupHistory />
    </div>
  )
}