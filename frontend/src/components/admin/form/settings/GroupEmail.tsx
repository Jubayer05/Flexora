'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import requests from '@/services/network/http'
import { ChevronDown, Eye, EyeOff, Loader2, Mail, Send, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import TextEditor from '../../common/TextEditor'

type TargetUsers = 'all' | 'guest' | 'loggedIn' | 'purchased' | 'loggedInNoPurchase'
type UserRole = 'ADMIN' | 'CUSTOMER' | 'GUEST' | 'MODERATOR'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type GroupEmailStats = {
  totalUsers: number
  guestUsers: number
  loggedInUsers: number
  purchasedUsers: number
  loggedInNoPurchase: number
  countries: string[]
  roles: UserRole[]
}

type PreviewRecipient = {
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
}

const targetOptions: Array<{
  value: TargetUsers
  label: string
  accent: string
  statKey: keyof Pick<
    GroupEmailStats,
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

const emptyStats: GroupEmailStats = {
  totalUsers: 0,
  guestUsers: 0,
  loggedInUsers: 0,
  purchasedUsers: 0,
  loggedInNoPurchase: 0,
  countries: [],
  roles: []
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
    values.length > 0
      ? values.map((value) => getLabel?.(value) ?? value).join(', ')
      : placeholder

  return (
    <div className='space-y-2'>
      <label className='font-medium text-sm'>{label}</label>
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

const GroupEmailForm = () => {
  const [stats, setStats] = useState<GroupEmailStats>(emptyStats)
  const [targetUsers, setTargetUsers] = useState<TargetUsers>('all')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([])
  const [minSpent, setMinSpent] = useState('')
  const [subject, setSubject] = useState('')
  const [mailText, setMailText] = useState('')
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

  const customFilters = useMemo(
    () => ({
      countries: selectedCountries,
      roles: selectedRoles,
      minSpent: minSpent.trim() ? Number(minSpent) : undefined
    }),
    [selectedCountries, selectedRoles, minSpent]
  )

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      try {
        const response = await requests.get<ApiResponse<GroupEmailStats>>('/admin/emails/group-stats')
        if (response.success) {
          setStats(response.data)
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load group email stats')
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  useEffect(() => {
    setPreviewData(null)
  }, [targetUsers, selectedCountries, selectedRoles, minSpent])

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

  const handlePreviewUsers = async () => {
    setLoadingPreview(true)
    try {
      const response = await requests.post<ApiResponse<PreviewData>>('/admin/emails/group-preview', {
        targetUsers,
        customFilters
      })

      if (response.success) {
        setPreviewData(response.data)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to preview recipients')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Please enter email subject')
      return
    }

    if (!getPlainText(mailText)) {
      toast.error('Please enter email message')
      return
    }

    const confirmed = window.confirm(
      `Send this email to ${estimatedRecipients} selected recipient(s)?`
    )

    if (!confirmed) return

    setLoadingSend(true)
    try {
      const response = await requests.post<ApiResponse<any>>('/admin/emails/send-group', {
        targetUsers,
        subject,
        html: mailText,
        message: mailText,
        customFilters
      })

      if (response.success) {
        toast.success(response.message || 'Email successfully sent')
        setSubject('')
        setMailText('')
        setPreviewData(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send group email')
    } finally {
      setLoadingSend(false)
    }
  }

  return (
    <div className='mx-auto max-w-6xl space-y-8'>
      <div className='space-y-2'>
        <div className='flex items-center gap-3'>
          <Mail className='size-8 text-primary' />
          <h2 className='font-semibold text-3xl'>Bulk Notification System</h2>
        </div>
        <p className='text-muted-foreground'>
          Send emails to multiple users based on audience, country, role, and spending filters.
        </p>
      </div>

      <Card className='rounded-lg'>
        <CardContent className='space-y-6 p-6'>
          <div className='-mt-2'>
            <label className='block font-semibold text-base'>Target Users</label>
            <div className='mt-6 grid grid-cols-2 gap-5 lg:grid-cols-5'>
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

          <div className='grid gap-4 md:grid-cols-3'>
            <MultiSelectBox
              label='Countries (Optional)'
              placeholder='Select countries...'
              values={selectedCountries}
              options={stats.countries}
              onToggle={toggleCountry}
              emptyText='No countries available'
            />

            <MultiSelectBox
              label='Roles (Optional)'
              placeholder='Select roles...'
              values={selectedRoles}
              options={roles}
              getLabel={(role) => roleLabels[role as UserRole] ?? role}
              onToggle={(role) => toggleRole(role as UserRole)}
              emptyText='No roles available'
            />

            <div className='space-y-2'>
              <label className='font-medium text-sm'>Min Spent $ (Optional)</label>
              <Input
                type='number'
                min='0'
                step='0.01'
                value={minSpent}
                onChange={(event) => setMinSpent(event.target.value)}
                placeholder='e.g., 100'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='font-medium text-sm'>Email Subject *</label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder='Enter email subject...'
            />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between gap-3'>
              <label className='font-medium text-sm'>Email Message *</label>
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
                dangerouslySetInnerHTML={{ __html: mailText || '<p>Preview will appear here...</p>' }}
              />
            ) : (
              <TextEditor
                value={mailText}
                onChange={(txt) => setMailText(txt)}
                label=''
                placeholder='Start typing...'
                required
              />
            )}
          </div>

          <div className='rounded-lg border border-border bg-background/40 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <Users className='size-5 text-primary' />
              <div>
                <div className='text-muted-foreground text-sm'>Estimated Recipients</div>
                <div className='font-semibold text-xl'>
                  <span className='text-primary'>{estimatedRecipients}</span> users
                </div>
              </div>
              {previewData && (
                <Badge variant='secondary'>
                  Showing {previewData.showing} of {previewData.total}
                </Badge>
              )}
            </div>
            <Button type='button' variant='secondary' onClick={handlePreviewUsers} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Users className='mr-2 size-4' />}
              Preview Users
            </Button>
            </div>
          </div>

          {previewData && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='flex items-center gap-2 font-semibold text-lg'>
                  <Users className='size-5 text-primary' />
                  User Preview ({previewData.total} users)
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
                          No users match the selected filters.
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
            <Button type='button' onClick={handleSend} disabled={loadingSend || estimatedRecipients === 0}>
              {loadingSend ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Send className='mr-2 size-4' />}
              Send Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GroupEmailForm
