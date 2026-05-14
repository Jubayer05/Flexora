'use client'

import TextEditor from '@/components/admin/common/TextEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Bell, ChevronDown, Eye, EyeOff, Loader2, Send, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type TargetUsers = 'all' | 'guest' | 'loggedIn' | 'purchased' | 'loggedInNoPurchase'
type UserRole = 'ADMIN' | 'CUSTOMER' | 'GUEST' | 'MODERATOR'
type NotificationType = 'ORDER' | 'PAYMENT' | 'RESTOCK' | 'SYSTEM' | 'PROMOTION' | 'OTHERS'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type CategoryOption = {
  id: number
  name: string
  slug: string
}

type GroupNotificationStats = {
  totalUsers: number
  guestUsers: number
  loggedInUsers: number
  purchasedUsers: number
  loggedInNoPurchase: number
  countries: string[]
  roles: UserRole[]
  categories: CategoryOption[]
}

type PreviewRecipient = {
  id?: number
  email: string
  name: string | null
  country: string | null
  role: string
  totalSpent: number
  source: string
}

type PreviewData = {
  users: PreviewRecipient[]
  total: number
  showing: number
  dashboardEligible: number
  emailEligible: number
}

const targetOptions: Array<{
  value: TargetUsers
  label: string
  accent: string
  statKey: keyof Pick<
    GroupNotificationStats,
    'totalUsers' | 'guestUsers' | 'loggedInUsers' | 'purchasedUsers' | 'loggedInNoPurchase'
  >
}> = [
  { value: 'all', label: 'All Users', accent: 'text-blue-400', statKey: 'totalUsers' },
  { value: 'guest', label: 'Guest Users', accent: 'text-purple-400', statKey: 'guestUsers' },
  { value: 'loggedIn', label: 'Logged In Users', accent: 'text-green-400', statKey: 'loggedInUsers' },
  { value: 'purchased', label: 'Purchased Users', accent: 'text-yellow-400', statKey: 'purchasedUsers' },
  {
    value: 'loggedInNoPurchase',
    label: 'Logged In (No Purchase)',
    accent: 'text-red-400',
    statKey: 'loggedInNoPurchase'
  }
]

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
  GUEST: 'Guest',
  MODERATOR: 'Moderator'
}

const emptyStats: GroupNotificationStats = {
  totalUsers: 0,
  guestUsers: 0,
  loggedInUsers: 0,
  purchasedUsers: 0,
  loggedInNoPurchase: 0,
  countries: [],
  roles: [],
  categories: []
}

const getPlainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()

const MultiSelectBox = ({
  label,
  placeholder,
  values,
  options,
  getLabel,
  onToggle,
  emptyText
}: {
  label: string
  placeholder: string
  values: string[]
  options: string[]
  getLabel?: (value: string) => string
  onToggle: (value: string) => void
  emptyText: string
}) => {
  const selectedText =
    values.length > 0 ? values.map((value) => getLabel?.(value) ?? value).join(', ') : placeholder

  return (
    <div className='space-y-2'>
      <Label className='font-medium text-sm'>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background/40 px-4 text-left text-sm transition hover:border-primary/60'
          >
            <span className={values.length > 0 ? 'truncate' : 'truncate text-muted-foreground'}>
              {selectedText}
            </span>
            <ChevronDown className='ml-3 size-4 shrink-0 text-muted-foreground' />
          </button>
        </PopoverTrigger>
        <PopoverContent align='start' className='max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto p-2'>
          {options.length === 0 ? (
            <p className='px-2 py-3 text-muted-foreground text-sm'>{emptyText}</p>
          ) : (
            <div className='space-y-1'>
              {options.map((option) => (
                <button
                  key={option}
                  type='button'
                  onClick={() => onToggle(option)}
                  className='flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted'
                >
                  <Checkbox checked={values.includes(option)} />
                  <span>{getLabel?.(option) ?? option}</span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

const NotificationForm = ({
  setCreateDialogOpen,
  mutate
}: {
  setCreateDialogOpen: (state: boolean) => void
  mutate: () => void
}) => {
  const [stats, setStats] = useState<GroupNotificationStats>(emptyStats)
  const [targetUsers, setTargetUsers] = useState<TargetUsers>('all')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [minSpent, setMinSpent] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('OTHERS')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [showMessagePreview, setShowMessagePreview] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)

  const selectedTarget = targetOptions.find((option) => option.value === targetUsers)
  const estimatedRecipients = previewData?.total ?? stats[selectedTarget?.statKey ?? 'totalUsers']

  const roles = useMemo<UserRole[]>(() => {
    return stats.roles.length > 0 ? stats.roles : ['CUSTOMER', 'GUEST', 'MODERATOR', 'ADMIN']
  }, [stats.roles])

  const categoryLabelMap = useMemo(() => {
    return stats.categories.reduce<Record<string, string>>((acc, category) => {
      acc[String(category.id)] = category.name
      return acc
    }, {})
  }, [stats.categories])

  const customFilters = useMemo(
    () => ({
      countries: selectedCountries,
      roles: selectedRoles,
      categoryIds: selectedCategoryIds.map(Number),
      minSpent: minSpent.trim() ? Number(minSpent) : undefined
    }),
    [selectedCountries, selectedRoles, selectedCategoryIds, minSpent]
  )

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      try {
        const response = await requests.get<ApiResponse<GroupNotificationStats>>(
          '/admin/notifications/group-stats'
        )
        if (response.success) {
          setStats(response.data)
        }
      } catch (error) {
        showError(error)
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  useEffect(() => {
    setPreviewData(null)
  }, [targetUsers, selectedCountries, selectedRoles, selectedCategoryIds, minSpent])

  const toggleCountry = (country: string) => {
    setSelectedCountries((current) =>
      current.includes(country) ? current.filter((item) => item !== country) : [...current, country]
    )
  }

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    )
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    )
  }

  const handlePreviewUsers = async () => {
    setLoadingPreview(true)
    try {
      const response = await requests.post<ApiResponse<PreviewData>>(
        '/admin/notifications/group-preview',
        {
          targetUsers,
          customFilters
        }
      )

      if (response.success) {
        setPreviewData(response.data)
      }
    } catch (error) {
      showError(error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!title.trim()) {
      toast.error('Add a notification title before sending.')
      return
    }

    if (!getPlainText(message)) {
      toast.error('Write the dashboard notification message before sending.')
      return
    }

    const confirmed = window.confirm(
      `Send this dashboard notification to ${estimatedRecipients} selected recipient(s)?`
    )

    if (!confirmed) return

    setLoadingSend(true)
    try {
      const response = await requests.post<ApiResponse<any>>('/admin/notifications/send-group', {
        targetUsers,
        title,
        message,
        type,
        customFilters,
        delivery: {
          email: false,
          dashboard: true
        }
      })

      if (response.success) {
        toast.success(response.message || 'Dashboard notification sent.')
        mutate()
        setCreateDialogOpen(false)
      }
    } catch (error) {
      showError(error)
    } finally {
      setLoadingSend(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card className='rounded-lg'>
        <CardContent className='space-y-6 p-6'>
          <div className='space-y-2'>
            <div className='flex items-center gap-3'>
              <Bell className='size-7 text-primary' />
              <div>
                <h2 className='font-semibold text-2xl'>Group Notifications</h2>
                <p className='text-muted-foreground text-sm'>
                  Send dashboard notifications to the right audience using purchase, category, country, role, and spend filters.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label className='block font-semibold text-base'>Target Users</Label>
            <div className='mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5'>
              {targetOptions.map((option) => {
                const active = targetUsers === option.value

                return (
                  <label
                    key={option.value}
                    className={`relative cursor-pointer rounded-lg border-2 p-4 text-center transition ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background/30 hover:border-primary/50'
                    }`}
                  >
                    <input
                      type='radio'
                      name='targetUsers'
                      value={option.value}
                      checked={active}
                      onChange={() => setTargetUsers(option.value)}
                      className='sr-only'
                    />
                    <div className={`font-semibold text-2xl ${option.accent}`}>
                      {loadingStats ? '...' : stats[option.statKey]}
                    </div>
                    <div className='mt-1 text-muted-foreground text-sm'>{option.label}</div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <MultiSelectBox
              label='Categories (Optional)'
              placeholder='Choose product categories...'
              values={selectedCategoryIds}
              options={stats.categories.map((category) => String(category.id))}
              getLabel={(categoryId) => categoryLabelMap[categoryId] ?? categoryId}
              onToggle={toggleCategory}
              emptyText='No categories are available yet.'
            />

            <MultiSelectBox
              label='Countries (Optional)'
              placeholder='Choose countries...'
              values={selectedCountries}
              options={stats.countries}
              onToggle={toggleCountry}
              emptyText='No countries are available yet.'
            />
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <MultiSelectBox
              label='Roles (Optional)'
              placeholder='Choose roles...'
              values={selectedRoles}
              options={roles}
              getLabel={(role) => roleLabels[role as UserRole] ?? role}
              onToggle={(role) => toggleRole(role as UserRole)}
              emptyText='No roles are available yet.'
            />

            <div className='space-y-2'>
              <Label>Minimum Spend $ (Optional)</Label>
              <Input
                type='number'
                min='0'
                step='0.01'
                value={minSpent}
                onChange={(event) => setMinSpent(event.target.value)}
                placeholder='Example: 100'
              />
            </div>

            <div className='space-y-2'>
              <Label>Notification Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as NotificationType)}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose notification type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ORDER'>Order</SelectItem>
                  <SelectItem value='PAYMENT'>Payment</SelectItem>
                  <SelectItem value='RESTOCK'>Restock</SelectItem>
                  <SelectItem value='SYSTEM'>System</SelectItem>
                  <SelectItem value='PROMOTION'>Promotion</SelectItem>
                  <SelectItem value='OTHERS'>Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid gap-4'>
            <div className='space-y-2'>
              <Label>Notification Title *</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder='Example: New Twitter stock is available'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between gap-3'>
              <Label>Dashboard Notification Message *</Label>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setShowMessagePreview((current) => !current)}
              >
                {showMessagePreview ? (
                  <EyeOff className='mr-2 size-4' />
                ) : (
                  <Eye className='mr-2 size-4' />
                )}
                {showMessagePreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>

            {showMessagePreview ? (
              <div
                className='min-h-48 rounded-lg border border-border bg-background p-4'
                dangerouslySetInnerHTML={{ __html: message || '<p>Your notification preview will appear here.</p>' }}
              />
            ) : (
              <TextEditor
                value={message}
                onChange={(txt) => setMessage(txt)}
                label=''
                placeholder='Write the message users will see in their dashboard.'
                required
              />
            )}
          </div>

          <div className='rounded-lg border border-border bg-background/40 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-center gap-3'>
                <Users className='size-5 text-primary' />
                <div>
                  <div className='text-muted-foreground text-sm'>Estimated recipients</div>
                  <div className='font-semibold text-xl'>
                    <span className='text-primary'>{estimatedRecipients}</span> users
                  </div>
                </div>
                {previewData && (
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='secondary'>Dashboard: {previewData.dashboardEligible}</Badge>
                  </div>
                )}
              </div>
              <Button type='button' variant='secondary' onClick={handlePreviewUsers} disabled={loadingPreview}>
                {loadingPreview ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Users className='mr-2 size-4' />
                )}
                Preview Users
              </Button>
            </div>
          </div>

          {previewData && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='flex items-center gap-2 font-semibold text-lg'>
                  <Users className='size-5 text-primary' />
                  Matching users ({previewData.total})
                </h3>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  onClick={() => setPreviewData(null)}
                  aria-label='Close user preview'
                >
                  <X className='size-5' />
                </Button>
              </div>
              <div className='max-h-80 overflow-auto rounded-lg border border-border'>
                <table className='w-full text-left text-sm'>
                  <thead className='sticky top-0 bg-background'>
                    <tr className='border-border border-b'>
                      <th className='p-3'>Email</th>
                      <th className='p-3'>Name</th>
                      <th className='p-3'>Country</th>
                      <th className='p-3'>Role</th>
                      <th className='p-3'>Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.users.length === 0 ? (
                      <tr>
                        <td className='p-4 text-center text-muted-foreground' colSpan={5}>
                          No users match these filters. Adjust the audience and preview again.
                        </td>
                      </tr>
                    ) : (
                      previewData.users.map((user) => (
                        <tr key={`${user.source}-${user.email}`} className='border-border border-b last:border-0'>
                          <td className='p-3'>{user.email}</td>
                          <td className='p-3'>{user.name || '-'}</td>
                          <td className='p-3'>{user.country || '-'}</td>
                          <td className='p-3'>{user.role}</td>
                          <td className='p-3'>${Number(user.totalSpent || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className='flex justify-end'>
            <Button type='submit' disabled={loadingSend || estimatedRecipients === 0}>
              {loadingSend ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Send className='mr-2 size-4' />}
              Send Dashboard Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default NotificationForm
