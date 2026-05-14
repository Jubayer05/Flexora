'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import { CustomTable } from '@/components/admin/common/data-table'
import type { TableColumn } from '@/components/admin/common/data-table'
import { EditModalUrlTracking } from '@/components/admin/url-tracking/EditModalUrlTracking'
import type { UrlTrackingFormData, EditModalUrlTrackingTexts } from '@/components/admin/url-tracking/EditModalUrlTracking'
import { ShowModalUrlTracking } from '@/components/admin/url-tracking/ShowModalUrlTracking'
import { Button } from '@/components/ui/button'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import {
  BarChart3,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Plus,
  Trash2
} from 'lucide-react'

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
  'deposit/crypto',
  'support',
  'support/contact',
  'support/faq',
  'payment-status',
  'payment-status/failed',
  'payment-status/success',
  'payment-success',
  'payment-cancel',
  'sandbox-payment',
  'shop',
  'subscription'
]

interface UrlTrackingRow {
  id: number
  title: string
  description?: string | null
  url: string
  slug: string
  clickCount: number
  uniqueClickCount?: number
  lastAccessed?: string | null
  isActive: boolean
  pageType: string
}

const TEXTS: EditModalUrlTrackingTexts & Record<string, string> = {
  heading: 'URL Tracking',
  pageDescription: 'Manage and track URL clicks and analytics',
  addUrl: 'Add New URL',
  editUrl: 'Edit URL',
  title: 'Title',
  description: 'Description',
  url: 'URL',
  shortCode: 'Short Code',
  status: 'Status',
  clicks: 'Clicks',
  lastAccessed: 'Last Accessed',
  actions: 'Actions',
  active: 'Active',
  inactive: 'Inactive',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  hide: 'Hide',
  show: 'Show',
  confirmDelete: 'Are you sure you want to delete this URL?',
  urlDeleted: 'URL deleted successfully',
  urlSaved: 'URL saved successfully',
  error: 'An error occurred',
  loading: 'Loading...',
  noUrls: 'No URLs found',
  copyLink: 'Copy Link',
  linkCopied: 'Link copied to clipboard!',
  pageType: 'Page Type',
  existingPage: 'Existing Page',
  nonExistingPage: 'Non-existing Page',
  pageTypeDescription: 'Select whether this page exists in the application',
  slugValid: 'This slug matches an existing page in the application',
  slugInvalid:
    'This slug does not match any existing page. Please select "Non-existing page" or use a valid internal route.'
}

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

function getDestinationUrl(row: UrlTrackingRow): string {
  if (typeof window === 'undefined') return row.url
  const origin = window.location.origin
  if (row.url) return row.url
  // Fallback if destination not stored yet
  if (row.pageType === 'EXISTING') {
    return row.slug.includes('/') ? `${origin}/${row.slug}` : `${origin}/pages/${row.slug}`
  }
  return origin
}

export default function UrlTrackingPage() {
  const [urlTrackings, setUrlTrackings] = useState<UrlTrackingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedUrlTrackingId, setSelectedUrlTrackingId] = useState<number | null>(null)
  const [editingUrl, setEditingUrl] = useState<UrlTrackingRow | null>(null)
  const [formData, setFormData] = useState<UrlTrackingFormData>({
    title: '',
    description: '',
    url: '',
    slug: '',
    isActive: true,
    pageType: 'non-existing'
  })
  const [slugValidation, setSlugValidation] = useState<{ isValid: boolean | null; message: string }>({
    isValid: null,
    message: ''
  })

  const validateSlug = useCallback((slug: string, pageType: string) => {
    if (pageType !== 'existing' || !slug) {
      setSlugValidation({ isValid: null, message: '' })
      return
    }
    if (isValidInternalRoute(slug)) {
      setSlugValidation({
        isValid: true,
        message: '✓ This slug matches an existing page in the application'
      })
    } else {
      setSlugValidation({
        isValid: false,
        message: TEXTS.slugInvalid
      })
    }
  }, [])

  useEffect(() => {
    validateSlug(formData.slug, formData.pageType)
  }, [formData.slug, formData.pageType, validateSlug])

  const fetchUrlTrackings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await requests.get<{ success: boolean; data: UrlTrackingRow[] }>(
        '/admin/url-tracking'
      )
      if (res?.success && Array.isArray(res.data)) {
        setUrlTrackings(res.data)
      }
    } catch (e) {
      console.error('Failed to fetch URL trackings:', e)
      toast.error(TEXTS.error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUrlTrackings()
  }, [fetchUrlTrackings])

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      url: '',
      slug: '',
      isActive: true,
      pageType: 'non-existing'
    })
    setSlugValidation({ isValid: null, message: '' })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.pageType === 'existing' && formData.slug) {
      const normalized = normalizeSlug(formData.slug)
      if (!isValidInternalRoute(normalized)) {
        toast.error(TEXTS.error)
        return
      }
    }

    const normalizedSlug = normalizeSlug(formData.slug)
    const destinationUrl = formData.url?.trim()

    try {
      const payload = {
        title: formData.title,
        description: formData.description || '',
        url: destinationUrl,
        slug: normalizedSlug,
        isActive: formData.isActive,
        pageType: formData.pageType
      }

      if (editingUrl) {
        await requests.put(`/admin/url-tracking/${editingUrl.id}`, payload)
      } else {
        await requests.post('/admin/url-tracking', payload)
      }

      toast.success(TEXTS.urlSaved)
      setShowModal(false)
      setEditingUrl(null)
      resetForm()
      fetchUrlTrackings()
    } catch (err: any) {
      toast.error(err?.message || TEXTS.error)
    }
  }

  const handleEdit = useCallback((row: UrlTrackingRow) => {
    setEditingUrl(row)
    setFormData({
      title: row.title,
      description: row.description || '',
      url: row.url || '',
      slug: row.slug || '',
      isActive: row.isActive,
      pageType: row.pageType === 'EXISTING' ? 'existing' : 'non-existing'
    })
    setShowModal(true)
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm(TEXTS.confirmDelete)) return
    try {
      await requests.delete(`/admin/url-tracking/${id}`)
      toast.success(TEXTS.urlDeleted)
      fetchUrlTrackings()
    } catch (err: any) {
      toast.error(err?.message || TEXTS.error)
    }
  }, [fetchUrlTrackings])

  const toggleUrlStatus = useCallback(async (row: UrlTrackingRow) => {
    try {
      await requests.put(`/admin/url-tracking/${row.id}`, {
        isActive: !row.isActive
      })
      toast.success(row.isActive ? 'URL disabled' : 'URL enabled')
      fetchUrlTrackings()
    } catch (err: any) {
      toast.error(err?.message || TEXTS.error)
    }
  }, [fetchUrlTrackings])

  const copyTrackingLink = useCallback((row: UrlTrackingRow) => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/go/${row.slug}` : ''
    navigator.clipboard.writeText(url)
    toast.success(TEXTS.linkCopied)
  }, [])

  const columns: TableColumn<UrlTrackingRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: TEXTS.title,
        width: '200px',
        render: (_, row) => (
          <div className='text-left'>
            <p className='font-medium'>{row.title}</p>
            {row.description && (
              <p className='text-muted-foreground text-sm'>{row.description}</p>
            )}
          </div>
        )
      },
      {
        key: 'slug',
        header: 'Tracking Link',
        width: '220px',
        render: (_, row) => {
          const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/go/${row.slug}` : ''
          return (
            <a
              href={`/go/${row.slug}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline break-all'
            >
              {trackingUrl}
            </a>
          )
        }
      },
      {
        key: 'clickCount',
        header: TEXTS.clicks,
        width: '100px',
        render: (_, row) => (
          <div className='text-center'>
            <span className='font-semibold'>{row.clickCount ?? 0}</span>
            <p className='text-muted-foreground text-xs'>
              {row.uniqueClickCount ?? 0} unique
            </p>
          </div>
        )
      },
      {
        key: 'pageType',
        header: TEXTS.pageType,
        width: '140px',
        render: (_, row) => (
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
              row.pageType === 'EXISTING'
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.pageType === 'EXISTING' ? TEXTS.existingPage : TEXTS.nonExistingPage}
          </span>
        )
      },
      {
        key: 'isActive',
        header: TEXTS.status,
        width: '100px',
        render: (_, row) => (
          <Button
            variant='ghost'
            size='sm'
            className={
              row.isActive
                ? 'text-green-600 hover:text-green-700'
                : 'text-destructive hover:text-destructive/90'
            }
            onClick={() => toggleUrlStatus(row)}
          >
            {row.isActive ? <Eye className='w-4 h-4 mr-1' /> : <EyeOff className='w-4 h-4 mr-1' />}
            {row.isActive ? TEXTS.active : TEXTS.inactive}
          </Button>
        )
      },
      {
        key: 'actions',
        header: TEXTS.actions,
        width: '220px',
        render: (_, row) => (
          <div className='flex items-center gap-1 flex-wrap'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => handleEdit(row)}
              title={TEXTS.edit}
            >
              <Edit className='w-4 h-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-destructive hover:text-destructive'
              onClick={() => handleDelete(row.id)}
              title={TEXTS.delete}
            >
              <Trash2 className='w-4 h-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => copyTrackingLink(row)}
              title={TEXTS.copyLink}
            >
              <LinkIcon className='w-4 h-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => {
                setSelectedUrlTrackingId(row.id)
                setShowDetailsModal(true)
              }}
              title='Show Details'
            >
              <BarChart3 className='w-4 h-4' />
            </Button>
            <a
              href={getDestinationUrl(row)}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent'
              title='Open URL'
            >
              <ExternalLink className='w-4 h-4' />
            </a>
          </div>
        )
      }
    ],
    [handleEdit, handleDelete, toggleUrlStatus, copyTrackingLink]
  )

  return (
    <div className='space-y-6'>
      <PageHeader
        title={TEXTS.heading}
        subTitle={TEXTS.pageDescription}
        extra={
          <Button
            onClick={() => {
              setShowModal(true)
              setEditingUrl(null)
              resetForm()
            }}
          >
            <Plus className='w-4 h-4 mr-2' />
            {TEXTS.addUrl}
          </Button>
        }
      />

      <CustomTable
        columns={columns}
        data={urlTrackings}
        emptyMessage={loading ? TEXTS.loading : TEXTS.noUrls}
        getRowId={(row) => String(row.id)}
        className={loading ? 'opacity-60' : ''}
      />

      <EditModalUrlTracking
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingUrl(null)
          resetForm()
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        editingUrl={editingUrl}
        texts={TEXTS}
        slugValidation={slugValidation}
      />

      <ShowModalUrlTracking
        urlTrackingId={selectedUrlTrackingId}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedUrlTrackingId(null)
        }}
      />
    </div>
  )
}
