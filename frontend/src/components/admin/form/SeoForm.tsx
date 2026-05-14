'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showError } from '@/lib/errMsg'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect, useMemo } from 'react'

// SEO Form Schema
const seoFormSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().max(160, 'Meta description must be 160 characters or less').optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  ogImage: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().max(200, 'OG description must be 200 characters or less').optional(),
  ogSiteName: z.string().optional(),
  ogImageWidth: z.number().min(1).max(10000).optional(),
  ogImageHeight: z.number().min(1).max(10000).optional(),
  ogImageAlt: z.string().optional(),
  twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().max(200, 'Twitter description must be 200 characters or less').optional(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional()
})

export type SeoFormData = z.infer<typeof seoFormSchema>

type SeoFormProps = {
  initialValues?: Partial<SeoFormData>
  onSubmit: (data: SeoFormData) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
}

export default function SeoForm({
  initialValues,
  onSubmit,
  isLoading = false,
  title = 'SEO Settings',
  description = 'Configure SEO metadata for better search engine visibility'
}: SeoFormProps) {
  const {
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SeoFormData>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      metaTitle: initialValues?.metaTitle || '',
      metaDescription: initialValues?.metaDescription || '',
      keywords: initialValues?.keywords || [],
      canonicalUrl: initialValues?.canonicalUrl || '',
      ogImage: initialValues?.ogImage || '',
      ogTitle: initialValues?.ogTitle || '',
      ogDescription: initialValues?.ogDescription || '',
      ogSiteName: initialValues?.ogSiteName || '',
      ogImageWidth: initialValues?.ogImageWidth || 1200,
      ogImageHeight: initialValues?.ogImageHeight || 630,
      ogImageAlt: initialValues?.ogImageAlt || '',
      twitterCard: initialValues?.twitterCard || 'summary_large_image',
      twitterTitle: initialValues?.twitterTitle || '',
      twitterDescription: initialValues?.twitterDescription || '',
      robotsIndex: initialValues?.robotsIndex !== undefined ? initialValues.robotsIndex : true,
      robotsFollow: initialValues?.robotsFollow !== undefined ? initialValues.robotsFollow : true
    }
  })

  // Memoize form values to avoid unnecessary resets
  const formValues = useMemo(() => {
    // Ensure keywords is always an array
    const keywords = Array.isArray(initialValues?.keywords) 
      ? initialValues.keywords 
      : (initialValues?.keywords ? [initialValues.keywords] : [])
    
    return {
      metaTitle: initialValues?.metaTitle || '',
      metaDescription: initialValues?.metaDescription || '',
      keywords: keywords,
      canonicalUrl: initialValues?.canonicalUrl || '',
      ogImage: initialValues?.ogImage || '',
      ogTitle: initialValues?.ogTitle || '',
      ogDescription: initialValues?.ogDescription || '',
      ogSiteName: initialValues?.ogSiteName || '',
      ogImageWidth: initialValues?.ogImageWidth || 1200,
      ogImageHeight: initialValues?.ogImageHeight || 630,
      ogImageAlt: initialValues?.ogImageAlt || '',
      twitterCard: initialValues?.twitterCard || 'summary_large_image',
      twitterTitle: initialValues?.twitterTitle || '',
      twitterDescription: initialValues?.twitterDescription || '',
      robotsIndex: initialValues?.robotsIndex !== undefined ? initialValues.robotsIndex : true,
      robotsFollow: initialValues?.robotsFollow !== undefined ? initialValues.robotsFollow : true
    }
  }, [
    initialValues?.metaTitle,
    initialValues?.metaDescription,
    initialValues?.keywords,
    initialValues?.canonicalUrl,
    initialValues?.ogImage,
    initialValues?.ogTitle,
    initialValues?.ogDescription,
    initialValues?.ogSiteName,
    initialValues?.ogImageWidth,
    initialValues?.ogImageHeight,
    initialValues?.ogImageAlt,
    initialValues?.twitterCard,
    initialValues?.twitterTitle,
    initialValues?.twitterDescription,
    initialValues?.robotsIndex,
    initialValues?.robotsFollow
  ])

  // Reset form when initialValues change (e.g., after successful save and refetch)
  useEffect(() => {
    reset(formValues)
  }, [formValues, reset])
 
  const onFormSubmit = handleSubmit(async (data) => {
    try {
        console.log("SUBMIT DATA:", data)
      await onSubmit(data)
    } catch (error) {
      showError(error)
    }
  })

  const watchKeywords = watch('keywords')
  const watchRobotsIndex = watch('robotsIndex')
  const watchRobotsFollow = watch('robotsFollow')

  // Handle SEO keywords input - this will be called with field.onChange from Controller
  const handleSeoKeywordInput = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentKeywords: string[],
    onChange: (value: string[]) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const input = e.target as HTMLInputElement
      const newKeyword = input.value.trim()
      if (newKeyword && !(currentKeywords ?? []).includes(newKeyword)) {
        onChange([...(currentKeywords ?? []), newKeyword])
        input.value = ''
      }
    }
  }

  const removeKeyword = (indexToRemove: number, currentKeywords: string[], onChange: (value: string[]) => void) => {
    onChange((currentKeywords ?? []).filter((_, index) => index !== indexToRemove))
  }

  return (
    <form onSubmit={onFormSubmit} className='space-y-6'>
      {/* Basic SEO */}
      <Card>
        <CardHeader>
          <CardTitle>Basic SEO</CardTitle>
          <CardDescription>Essential metadata for search engines</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='metaTitle'
            render={({ field }) => (
              <CustomInput
                label='Meta Title'
                placeholder='Enter meta title (recommended: 50-60 characters)'
                error={errors.metaTitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='metaDescription'
            render={({ field }) => (
              <CustomInput
                label='Meta Description'
                type='textarea'
                rows={3}
                maxLength={160}
                showCharCount={true}
                placeholder='Enter meta description (recommended: 150-160 characters)'
                helperText='Max 160 characters. This appears in search engine results.'
                error={errors.metaDescription?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='keywords'
            render={({ field }) => {
              const currentKeywords = field.value ?? []
              return (
                <div className='space-y-2'>
                  <Label>Keywords</Label>
                  <CustomInput
                    type='text'
                    placeholder='Type keyword and press Enter or comma'
                    onKeyDown={(e) => handleSeoKeywordInput(e, currentKeywords, field.onChange)}
                  />
                  <div className='flex flex-wrap gap-2'>
                    {currentKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className='inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md text-primary text-sm'
                      >
                        {keyword}
                        <button
                          type='button'
                          onClick={() => removeKeyword(index, currentKeywords, field.onChange)}
                          className='ml-1 text-primary/70 hover:text-primary'
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {errors.keywords && (
                    <span className='text-red-500 text-sm'>{errors.keywords.message}</span>
                  )}
                </div>
              )
            }}
          />

          <Controller
            control={control}
            name='canonicalUrl'
            render={({ field }) => (
              <CustomInput
                label='Canonical URL'
                placeholder='https://example.com/page'
                helperText='The preferred URL for this page (prevents duplicate content issues)'
                error={errors.canonicalUrl?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Open Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Open Graph (Social Sharing)</CardTitle>
          <CardDescription>Control how your page appears when shared on social media</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='ogTitle'
            render={({ field }) => (
              <CustomInput
                label='OG Title'
                placeholder='Enter Open Graph title (defaults to meta title if empty)'
                error={errors.ogTitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='ogDescription'
            render={({ field }) => (
              <CustomInput
                label='OG Description'
                type='textarea'
                rows={3}
                maxLength={200}
                showCharCount={true}
                placeholder='Enter Open Graph description (defaults to meta description if empty)'
                helperText='Max 200 characters. This appears when shared on Facebook, LinkedIn, etc.'
                error={errors.ogDescription?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='ogSiteName'
            render={({ field }) => (
              <CustomInput
                label='OG Site Name'
                placeholder='Enter site name (e.g., UHQ Accounts)'
                error={errors.ogSiteName?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='ogImage'
            render={({ field }) => (
              <div className='space-y-2'>
                <Label>OG Image</Label>
                <FileUploader
                  value={field.value || undefined}
                  onChangeAction={field.onChange}
                  maxAllow={1}
                  size='small'
                />
                <p className='text-muted-foreground text-sm'>
                  Recommended: 1200x630px. This image appears when sharing on social media.
                </p>
                <span className='text-red-500 text-xs'>{errors.ogImage?.message}</span>
              </div>
            )}
          />

          <div className='gap-4 grid grid-cols-2'>
            <Controller
              control={control}
              name='ogImageWidth'
              render={({ field }) => (
                <CustomInput
                  label='OG Image Width (px)'
                  type='number'
                  placeholder='1200'
                  error={errors.ogImageWidth?.message}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1200)}
                />
              )}
            />

            <Controller
              control={control}
              name='ogImageHeight'
              render={({ field }) => (
                <CustomInput
                  label='OG Image Height (px)'
                  type='number'
                  placeholder='630'
                  error={errors.ogImageHeight?.message}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 630)}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name='ogImageAlt'
            render={({ field }) => (
              <CustomInput
                label='OG Image Alt Text'
                placeholder='Enter alt text for the OG image'
                error={errors.ogImageAlt?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Twitter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Twitter Card</CardTitle>
          <CardDescription>Control how your page appears when shared on Twitter/X</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='twitterCard'
            render={({ field }) => (
              <div className='space-y-2'>
                <Label>Twitter Card Type</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select card type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='summary'>Summary</SelectItem>
                    <SelectItem value='summary_large_image'>Summary with Large Image</SelectItem>
                  </SelectContent>
                </Select>
                <p className='text-muted-foreground text-sm'>
                  Summary: Small image. Summary with Large Image: Large image (recommended).
                </p>
              </div>
            )}
          />

          <Controller
            control={control}
            name='twitterTitle'
            render={({ field }) => (
              <CustomInput
                label='Twitter Title'
                placeholder='Enter Twitter title (defaults to meta title if empty)'
                error={errors.twitterTitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='twitterDescription'
            render={({ field }) => (
              <CustomInput
                label='Twitter Description'
                type='textarea'
                rows={3}
                maxLength={200}
                showCharCount={true}
                placeholder='Enter Twitter description (defaults to meta description if empty)'
                helperText='Max 200 characters'
                error={errors.twitterDescription?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Robots */}
      <Card>
        <CardHeader>
          <CardTitle>Search Engine Indexing</CardTitle>
          <CardDescription>Control how search engines index this page</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center space-x-2'>
            <Controller
              control={control}
              name='robotsIndex'
              render={({ field }) => (
                <input
                  type='checkbox'
                  id='robotsIndex'
                  checked={field.value ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300'
                />
              )}
            />
            <Label htmlFor='robotsIndex' className='cursor-pointer'>
              Allow search engines to index this page
            </Label>
          </div>

          <div className='flex items-center space-x-2'>
            <Controller
              control={control}
              name='robotsFollow'
              render={({ field }) => (
                <input
                  type='checkbox'
                  id='robotsFollow'
                  checked={field.value ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300'
                />
              )}
            />
            <Label htmlFor='robotsFollow' className='cursor-pointer'>
              Allow search engines to follow links on this page
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type='submit' disabled={isSubmitting || isLoading}>
        {isSubmitting || isLoading ? 'Saving...' : 'Save SEO Settings'}
      </Button>
    </form>
  )
}





