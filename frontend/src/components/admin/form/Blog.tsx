'use client'

import TextEditor from '@/components/admin/common/TextEditor'
import FileUploader from '@/components/common/FileUploader'
import { showError } from '@/lib/errMsg'
import { CreateBlogSchema, CreateBlogType } from '@/lib/validations/schemas/blog'
import requests from '@/services/network/http'
import type { BlogCategory, BlogSubCategory } from '@/components/admin/blogs/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type CategoriesRes = {
  success: boolean
  data: { categories: BlogCategory[] }
}
type SubCategoriesRes = { success: boolean; data: BlogSubCategory[] }

type TProps = {
  initialData?: {
    id?: number
    title?: string
    slug?: string
    categoryId?: number | null
    subCategoryId?: number | null
    authorName?: string
    author?: { name?: string } | null
    thumbnail?: string
    content?: string
    tags?: string[]
    isPublished?: boolean
    publishedAt?: string | Date | null
  }
}

const defaultValues: CreateBlogType = {
  title: '',
  slug: '',
  categoryId: undefined,
  subCategoryId: undefined,
  authorName: '',
  thumbnail: '',
  content: '',
  tags: [],
  isPublished: true,
  publishLater: false,
  publishedAt: ''
}

export default function BlogForm({ initialData }: TProps) {
  const router = useRouter()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<CreateBlogType>({
    resolver: zodResolver(CreateBlogSchema),
    mode: 'onSubmit',
    defaultValues: {
      ...defaultValues,
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      categoryId: initialData?.categoryId ?? undefined,
      subCategoryId: initialData?.subCategoryId ?? undefined,
      authorName: initialData?.authorName ?? (initialData as { author?: { name?: string } } | undefined)?.author?.name ?? '',
      thumbnail: initialData?.thumbnail ?? '',
      content: initialData?.content ?? '',
      tags: (() => {
        const t = initialData?.tags as string[] | string | undefined
        if (Array.isArray(t)) return t.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        if (typeof t === 'string') return t.split(',').map((s: string) => s.trim()).filter(Boolean)
        return []
      })(),
      isPublished: initialData?.isPublished ?? true,
      publishLater: Boolean(
        initialData?.publishedAt && new Date(initialData.publishedAt as string) > new Date()
      ),
      publishedAt: initialData?.publishedAt ? String(initialData.publishedAt).slice(0, 16) : ''
    }
  })

  const watchTitle = watch('title')
  const watchCategoryId = watch('categoryId')
  const watchSubCategoryId = watch('subCategoryId')
  const watchPublishLater = watch('publishLater')

  // Initial content for editor (only set when loading edit data). After user types we stop passing
  // value so Jodit isn't overwritten on re-render and focus is kept.
  const [editorContent, setEditorContent] = useState(initialData?.content ?? '')
  const editorHasBeenEditedRef = useRef(false)

  // Local string for tags input so user can type commas; sync to form (array) only on blur
  const tagsToDisplayString = (t: string[] | string | undefined) => {
    if (Array.isArray(t)) return t.filter(Boolean).join(', ')
    if (typeof t === 'string') return t
    return ''
  }
  const [tagsInputString, setTagsInputString] = useState(() =>
    tagsToDisplayString(initialData?.tags as string[] | string | undefined)
  )

  useEffect(() => {
    const content = initialData?.content ?? ''
    setEditorContent(content)
    setValue('content', content)
    editorHasBeenEditedRef.current = false
  }, [initialData?.content, setValue])

  useEffect(() => {
    if (initialData != null) {
      setTagsInputString(tagsToDisplayString(initialData.tags as string[] | string | undefined))
    }
    // Only sync when editing a different blog (by id); avoid overwriting user input on re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id])

  // Auto-generate slug from title (when not editing existing)
  useEffect(() => {
    if (!watchTitle) return
    if (initialData?.slug) return
    const slug = watchTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setValue('slug', slug)
  }, [watchTitle, setValue, initialData?.slug])

  // Fetch subcategories by category id (backend supports ?category=id)
  const fetchSubCategories = useCallback(async (categoryId: number): Promise<BlogSubCategory[]> => {
    try {
      const res = await requests.get<SubCategoriesRes>(
        `admin/blog-subcategories?category=${categoryId}`
      )
      if (res?.success && Array.isArray(res.data)) return res.data as BlogSubCategory[]
    } catch {
      // ignore
    }
    return []
  }, [])

  useEffect(() => {
    if (!watchCategoryId) {
      setValue('subCategoryId', undefined)
      setValue('authorName', '')
      return
    }
    fetchSubCategories(Number(watchCategoryId)).then((subs) => {
      if (subs.length === 0) setValue('subCategoryId', undefined)
    })
  }, [watchCategoryId, fetchSubCategories, setValue])

  useEffect(() => {
    if (!watchSubCategoryId) return
    fetchSubCategories(Number(watchCategoryId)).then((subs) => {
      const sub = subs.find((s) => s.id === Number(watchSubCategoryId))
      if (sub?.author?.name) setValue('authorName', sub.author.name)
    })
  }, [watchSubCategoryId, watchCategoryId, fetchSubCategories, setValue])

  const onSubmit = async (data: CreateBlogType) => {
    try {
      // Use getValues() so we have the latest form state (e.g. editor content) in case of batching
      const latest = getValues()
      const content = latest.content ?? data.content ?? ''
      const tagsFromInput = tagsInputString.split(',').map((t) => t.trim()).filter(Boolean)
      const tagsArray =
        tagsFromInput.length > 0
          ? tagsFromInput
          : (Array.isArray(latest.tags) ? latest.tags : Array.isArray(data.tags) ? data.tags : [])
              .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      // Match AutoBlogUpload: scheduled = isPublished:true + publishedAt:future
      const publishLater = !!latest.publishLater
      const rawDate = latest.publishedAt?.trim()
      if (publishLater && !rawDate) {
        toast.error('Please select a date and time when using Publish later.')
        return
      }
      const publishedAtValue =
        publishLater && rawDate
          ? new Date(rawDate).toISOString()
          : new Date().toISOString()

      const payload = {
        title: latest.title ?? data.title,
        content,
        excerpt: '',
        thumbnail: latest.thumbnail || data.thumbnail || undefined,
        tags: tagsArray,
        categoryId: latest.categoryId ?? data.categoryId ?? undefined,
        isPublished: true,
        publishedAt: publishedAtValue,
        meta: {
          ...(latest.authorName && { authorName: latest.authorName }),
          ...(latest.subCategoryId != null && { subCategoryId: latest.subCategoryId })
        }
      }

      if (initialData?.id) {
        await requests.put(`/admin/blogs/${initialData.id}`, {
          ...payload,
          slug: latest.slug ?? data.slug
        })
        toast.success('Blog updated successfully')
      } else {
        await requests.post('/admin/blogs', payload)
        toast.success('Blog created successfully')
      }
      router.push('/admin/blogs')
    } catch (error) {
      showError(error)
    }
  }

  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [subCategories, setSubCategories] = useState<BlogSubCategory[]>([])

  useEffect(() => {
    requests.get<CategoriesRes>('admin/blogs/categories?page=1&limit=100').then((res) => {
      if (res?.success && res.data?.categories) setCategories(res.data.categories)
    })
  }, [])

  useEffect(() => {
    if (!watchCategoryId) {
      setSubCategories([])
      return
    }
    fetchSubCategories(Number(watchCategoryId)).then(setSubCategories)
  }, [watchCategoryId, fetchSubCategories])

  return (
    <div className="mb-6 sm:mb-8 rounded-lg border border-border bg-card p-4 sm:p-6 text-card-foreground">
      <h4 className="mb-3 sm:mb-4 text-lg font-semibold sm:text-xl">
        {initialData?.id ? 'Edit Blog' : 'Create New Blog'}
      </h4>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
              Title *
            </label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  autoComplete="off"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  placeholder="Enter blog title"
                />
              )}
            />
            {errors.title && (
              <p className="mt-1 text-[10px] text-destructive sm:text-xs">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
              Slug *
            </label>
            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  autoComplete="off"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  placeholder="Blog URL slug"
                />
              )}
            />
            <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
              URL-friendly version of the title
            </p>
            {errors.slug && (
              <p className="mt-1 text-[10px] text-destructive sm:text-xs">{errors.slug.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
              Category *
            </label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    const categoryId = v ? Number(v) : undefined
                    field.onChange(categoryId)
                    setValue('subCategoryId', undefined)
                    if (categoryId) {
                      fetchSubCategories(categoryId).then(setSubCategories)
                    } else {
                      setSubCategories([])
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
              Sub Category *
            </label>
            <Controller
              name="subCategoryId"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!watchCategoryId}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 sm:text-sm"
                >
                  <option value="">
                    {watchCategoryId ? 'Select Sub Category' : 'Select Category first'}
                  </option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
              Author Name
            </label>
            <Controller
              name="authorName"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  value={field.value ?? ''}
                  autoComplete="off"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  placeholder="Enter author name"
                />
              )}
            />
            <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
              Author will be from subcategory if available
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">Tags</label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  value={tagsInputString}
                  onChange={(e) => setTagsInputString(e.target.value)}
                  onBlur={() => {
                    const arr = tagsInputString
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                    field.onChange(arr)
                    setTagsInputString(arr.join(', '))
                    field.onBlur()
                  }}
                  autoComplete="off"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  placeholder="Enter tags separated by commas"
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">Image *</label>
          <Controller
            control={control}
            name="thumbnail"
            render={({ field }) => (
              <div className="space-y-2">
                <FileUploader
                  value={field.value ?? ''}
                  onChangeAction={field.onChange}
                  maxAllow={1}
                  size="extra-large"
                />
                <p className="text-[10px] text-muted-foreground sm:text-xs">Max file size 5MB</p>
              </div>
            )}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
            Content *
          </label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextEditor
                {...(editorHasBeenEditedRef.current ? {} : { value: editorContent })}
                onChange={(value) => {
                  editorHasBeenEditedRef.current = true
                  field.onChange(value)
                }}
                placeholder="Write your blog content here"
                backgroundColor="var(--card)"
              />
            )}
          />
          {errors.content && (
            <p className="mt-1 text-[10px] text-destructive sm:text-xs">{errors.content.message}</p>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Controller
              name="publishLater"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => {
                      field.onChange(e.target.checked)
                      if (!e.target.checked) setValue('publishedAt', '')
                    }}
                    className="h-3 w-3 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 sm:h-4 sm:w-4"
                  />
                  <span className="text-xs text-foreground sm:text-sm">Publish later</span>
                </label>
              )}
            />
          </div>

          {watchPublishLater && (
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground sm:text-sm">
                Published Time
              </label>
              <Controller
                name="publishedAt"
                control={control}
                render={({ field }) => (
                  <input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    placeholder="Select date and time"
                  />
                )}
              />
              <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                Set a future date/time to schedule publication
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-3 sm:space-y-0">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
            {initialData?.id ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/blogs')}
            className="flex items-center justify-center gap-2 rounded border border-input bg-secondary px-3 py-2 text-xs text-secondary-foreground transition-colors hover:bg-secondary/80 sm:px-4 sm:text-sm"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" /> Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
