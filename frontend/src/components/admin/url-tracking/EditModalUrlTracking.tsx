'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle } from 'lucide-react'

export interface UrlTrackingFormData {
  title: string
  description: string
  url: string
  slug: string
  isActive: boolean
  pageType: 'existing' | 'non-existing'
}

export interface SlugValidation {
  isValid: boolean | null
  message: string
}

export interface EditModalUrlTrackingTexts {
  addUrl: string
  editUrl: string
  title: string
  description: string
  url: string
  pageType: string
  pageTypeDescription: string
  existingPage: string
  nonExistingPage: string
  active: string
  cancel: string
  save: string
}

interface EditModalUrlTrackingProps {
  isOpen: boolean
  onClose: () => void
  formData: UrlTrackingFormData
  setFormData: React.Dispatch<React.SetStateAction<UrlTrackingFormData>>
  onSubmit: (e: React.FormEvent) => void
  editingUrl: {
    id: number
    title: string
    description?: string | null
    url: string
    slug: string
    isActive: boolean
    pageType: string
  } | null
  texts: EditModalUrlTrackingTexts
  slugValidation: SlugValidation
}

export function EditModalUrlTracking({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  editingUrl,
  texts,
  slugValidation
}: EditModalUrlTrackingProps) {
  if (!isOpen) return null

  const displayUrl = formData.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/go/${formData.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9/-]/g, '-')
        .replace(/\/+/g, '/')}`
    : ''

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{editingUrl ? texts.editUrl : texts.addUrl}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <Label className='text-muted-foreground'>{texts.title} *</Label>
            <Input
              type='text'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className='mt-1'
              required
            />
          </div>

          <div>
            <Label className='text-muted-foreground'>{texts.description}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className='mt-1'
              rows={3}
            />
          </div>

          <div>
            <Label className='text-muted-foreground'>{texts.url} *</Label>
            <Input
              type='text'
              value={displayUrl}
              readOnly
              disabled
              className='mt-1 bg-muted cursor-not-allowed'
            />
            <p className='text-muted-foreground text-xs mt-1'>
              URL is automatically generated from the slug
            </p>
          </div>

          <div>
            <Label className='text-muted-foreground'>Destination URL *</Label>
            <Input
              type='url'
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className='mt-1'
              placeholder='https://facebook.com/your-page or https://your-site.com/pages/about'
              required={formData.pageType === 'non-existing'}
            />
            <p className='text-muted-foreground text-xs mt-1'>
              For external tracking (Facebook/footer/nav), put the real destination URL here. Users
              should click the tracking link (above) to be counted.
            </p>
          </div>

          <div>
            <Label className='text-muted-foreground'>Slug *</Label>
            <Input
              type='text'
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9/-]/g, '-')
                    .replace(/\/+/g, '/')
                })
              }
              className={`mt-1 ${
                slugValidation.isValid === false
                  ? 'border-destructive focus-visible:ring-destructive'
                  : slugValidation.isValid === true
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : ''
              }`}
              placeholder='facebook'
              required
            />
            <p className='text-muted-foreground text-xs mt-1'>
              Tracking URL will be: {typeof window !== 'undefined' && window.location.origin}/go/
              {formData.slug || 'slug'}
            </p>
            {formData.pageType === 'existing' &&
              slugValidation.isValid !== null &&
              slugValidation.message && (
                <div
                  className={`flex items-center gap-2 mt-2 text-xs ${
                    slugValidation.isValid
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-destructive'
                  }`}
                >
                  {slugValidation.isValid ? (
                    <CheckCircle className='w-4 h-4' />
                  ) : (
                    <XCircle className='w-4 h-4' />
                  )}
                  <span>{slugValidation.message}</span>
                </div>
              )}
          </div>

          <div>
            <Label className='text-muted-foreground'>{texts.pageType} *</Label>
            <p className='text-muted-foreground text-xs mb-3'>{texts.pageTypeDescription}</p>
            <div className='flex gap-6'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='pageType'
                  value='existing'
                  checked={formData.pageType === 'existing'}
                  onChange={(e) =>
                    setFormData({ ...formData, pageType: e.target.value as 'existing' })
                  }
                  className='rounded-full border-input'
                />
                <span className='text-sm'>{texts.existingPage}</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='pageType'
                  value='non-existing'
                  checked={formData.pageType === 'non-existing'}
                  onChange={(e) =>
                    setFormData({ ...formData, pageType: e.target.value as 'non-existing' })
                  }
                  className='rounded-full border-input'
                />
                <span className='text-sm'>{texts.nonExistingPage}</span>
              </label>
            </div>
            {formData.pageType === 'existing' && (
              <p className='text-amber-600 dark:text-amber-400 text-xs mt-2'>
                The slug must match an existing page route in the application
              </p>
            )}
          </div>

          <div className='flex items-center gap-4'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className='rounded border-input'
              />
              <span className='text-sm'>{texts.active}</span>
            </label>
          </div>

          <DialogFooter className='gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={onClose}>
              {texts.cancel}
            </Button>
            <Button type='submit'>{texts.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditModalUrlTracking
