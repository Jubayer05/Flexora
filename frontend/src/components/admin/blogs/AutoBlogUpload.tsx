'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import TextEditor from '@/components/admin/common/TextEditor'
import { showError } from '@/lib/errMsg'
import axiosInstance from '@/services/api/axiosInstance'
import requests from '@/services/network/http'
import { Copy, Plus, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { BlogAuthorRef, BlogCategory, BlogSubCategory } from './types'

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export interface BlogPostEntry {
  title: string
  content: string
  tags: string
  image: string
}

type CategoriesRes = { success: boolean; data: { categories: BlogCategory[] }; message?: string }
type SubCategoriesRes = { success: boolean; data: BlogSubCategory[]; message?: string }
type AuthorsRes = { success: boolean; data: BlogAuthorRef[]; message?: string }
type UploadRes = { success: boolean; data: { url: string }; message?: string }
type BulkRes = { success: boolean; data: { count: number; data: unknown[] }; message?: string }

export interface AutoBlogUploadProps {
  onSuccess?: (() => void) | null
}

const initialPost = (): BlogPostEntry => ({
  title: '',
  content: '',
  tags: '',
  image: ''
})

export default function AutoBlogUpload({ onSuccess = null }: AutoBlogUploadProps) {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [subCategories, setSubCategories] = useState<BlogSubCategory[]>([])
  const [authors, setAuthors] = useState<BlogAuthorRef[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('')
  const [authorRotation, setAuthorRotation] = useState(true)
  const [minHours, setMinHours] = useState(8)
  const [maxHours, setMaxHours] = useState(11)
  const [blogPosts, setBlogPosts] = useState<BlogPostEntry[]>([initialPost()])
  const [loading, setLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await requests.get<CategoriesRes>(
        'admin/blogs/categories?page=1&limit=100'
      )
      if (res?.success && res.data?.categories) {
        setCategories(res.data.categories)
      }
    } catch (err) {
      showError(err)
    }
  }, [])

  const fetchSubCategories = useCallback(async () => {
    try {
      const res = await requests.get<SubCategoriesRes>('admin/blog-subcategories')
      if (res?.success && Array.isArray(res.data)) {
        setSubCategories(res.data)
      }
    } catch (err) {
      showError(err)
    }
  }, [])

  const fetchAuthors = useCallback(async () => {
    try {
      const res = await requests.get<AuthorsRes>('admin/blog-authors')
      if (res?.success && Array.isArray(res.data)) {
        setAuthors(res.data)
      }
    } catch (err) {
      showError(err)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchSubCategories()
    fetchAuthors()
  }, [fetchCategories, fetchSubCategories, fetchAuthors])

  const filteredSubCategories = subCategories.filter(
    (sub) =>
      String(sub.categoryId) === selectedCategory ||
      (sub.category && String(sub.category.id) === selectedCategory)
  )

  const addBlogPost = () => {
    setBlogPosts((prev) => [...prev, initialPost()])
  }

  const removeBlogPost = (index: number) => {
    if (blogPosts.length <= 1) return
    setBlogPosts((prev) => prev.filter((_, i) => i !== index))
  }

  const duplicateBlogPost = (index: number) => {
    const post = blogPosts[index]
    setBlogPosts((prev) => [
      ...prev,
      { ...post, title: post.title ? `${post.title} (Copy)` : '' }
    ])
  }

  const updateBlogPost = (index: number, field: keyof BlogPostEntry, value: string) => {
    setBlogPosts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, postIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('File size too large. Maximum size is 5MB.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    updateBlogPost(postIndex, 'image', 'uploading...')

    try {
      const response = await axiosInstance.post<UploadRes>('admin/blogs/upload-image', formData)
      const result = response.data
      if (result?.success && result?.data?.url) {
        updateBlogPost(postIndex, 'image', result.data.url)
        toast.success('Image uploaded')
      } else {
        toast.error((result as any)?.message ?? 'Failed to upload image')
        updateBlogPost(postIndex, 'image', '')
      }
    } catch (err: any) {
      showError(err)
      updateBlogPost(postIndex, 'image', '')
    }
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validPosts = blogPosts.filter((p) => p.title.trim())
    if (validPosts.length === 0) {
      toast.error('Please add at least one blog post with a title.')
      return
    }
    if (!selectedCategory) {
      toast.error('Please select a category.')
      return
    }
    if (!selectedSubCategory) {
      toast.error('Please select a sub-category.')
      return
    }
    if (authors.length === 0) {
      toast.error('No authors available. Please create authors first in Author Management.')
      return
    }
    if (!authorRotation && !selectedAuthor) {
      toast.error('Please select an author or enable author rotation.')
      return
    }

    try {
      setLoading(true)

      const blogs = validPosts.map((p) => ({
        title: p.title.trim(),
        content: p.content?.trim() || `<p>${p.title}</p>`,
        tags: p.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        thumbnail: p.image && p.image !== 'uploading...' ? p.image : undefined
      }))

      const payload = {
        blogs,
        categoryId: Number(selectedCategory),
        subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
        authorRotation,
        selectedAuthorId: selectedAuthor ? Number(selectedAuthor) : undefined,
        timeBetweenPosts: { min: minHours, max: maxHours }
      }

      const result = await requests.post<BulkRes>('admin/blogs/bulk', payload)

      if (result?.success && result?.data) {
        const count = result.data.count ?? validPosts.length
        toast.success(`Successfully created ${count} blog${count !== 1 ? 's' : ''}.`)
        setBlogPosts([initialPost()])
        setSelectedCategory('')
        setSelectedSubCategory('')
        setSelectedAuthor('')
        onSuccess?.()
      } else {
        toast.error((result as any)?.error ?? (result as any)?.message ?? 'Failed to create blogs.')
      }
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='rounded-xl border border-border bg-card p-6'>
      <h2 className='text-2xl font-bold text-foreground mb-6'>Auto Blog Upload</h2>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Category, Sub-Category & Author */}
        <div className='rounded-lg border border-border bg-muted/30 p-4'>
          <h3 className='text-lg font-semibold text-foreground mb-4'>Blog configuration</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div>
              <Label className='text-foreground'>
                Category <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(v) => {
                  setSelectedCategory(v)
                  setSelectedSubCategory('')
                }}
                required
              >
                <SelectTrigger className='mt-2'>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className='text-foreground'>
                Sub-category <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={selectedSubCategory}
                onValueChange={setSelectedSubCategory}
                disabled={!selectedCategory || filteredSubCategories.length === 0}
                required
              >
                <SelectTrigger className='mt-2'>
                  <SelectValue placeholder='Select sub-category' />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubCategories.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className='text-foreground'>
                Author {!authorRotation && <span className='text-destructive'>*</span>}
              </Label>
              <Select
                value={selectedAuthor}
                onValueChange={setSelectedAuthor}
                disabled={authorRotation}
                required={!authorRotation}
              >
                <SelectTrigger className='mt-2'>
                  <SelectValue
                    placeholder={authorRotation ? 'Random rotation' : 'Select author'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {authors.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {authors.length === 0 && (
                <p className='mt-1 text-xs text-destructive'>
                  No authors found. Create authors in Author Management.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Blog posts */}
        <div>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <Label className='text-foreground'>
                Blog posts <span className='text-destructive'>*</span>
              </Label>
              <p className='text-xs text-muted-foreground'>
                Each block is one post with title, content, tags, and image.
              </p>
            </div>
            <Button type='button' variant='outline' size='sm' onClick={addBlogPost} className='gap-2'>
              <Plus className='size-4' />
              Add more
            </Button>
          </div>

          <div className='space-y-4'>
            {blogPosts.map((post, index) => (
              <div
                key={index}
                className='space-y-4 rounded-xl border-2 border-border bg-muted/20 p-5 transition-colors hover:border-primary/40'
              >
                <div className='flex items-center justify-between border-b border-border pb-3'>
                  <span className='font-semibold text-primary'>Post #{index + 1}</span>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='secondary'
                      size='sm'
                      className='gap-1'
                      onClick={() => duplicateBlogPost(index)}
                    >
                      <Copy className='size-4' />
                      Copy
                    </Button>
                    {blogPosts.length > 1 && (
                      <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        className='gap-1'
                        onClick={() => removeBlogPost(index)}
                      >
                        <Trash2 className='size-4' />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className='text-foreground'>
                    Title <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    value={post.title}
                    onChange={(e) => updateBlogPost(index, 'title', e.target.value)}
                    placeholder='Enter blog title'
                    className='mt-2'
                  />
                </div>

                <div>
                  <TextEditor
                    label='Content'
                    value={post.content}
                    onChange={(value) => updateBlogPost(index, 'content', value)}
                    placeholder='Write your blog content here'
                    height={220}
                    theme='auto'
                  />
                </div>

                <div>
                  <Label className='text-foreground'>Tags</Label>
                  <Input
                    value={post.tags}
                    onChange={(e) => updateBlogPost(index, 'tags', e.target.value)}
                    placeholder='tag1, tag2, tag3'
                    className='mt-2'
                  />
                  <p className='mt-1 text-xs text-muted-foreground'>Separate tags with commas.</p>
                </div>

                <div>
                  <Label className='text-foreground'>Image</Label>
                  <div className='mt-2 flex flex-wrap items-center gap-4'>
                    <Label className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-muted/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted'>
                      <Upload className='size-4' />
                      Choose image
                      <input
                        type='file'
                        accept='image/jpeg,image/jpg,image/png,image/webp,image/gif'
                        className='hidden'
                        onChange={(e) => handleImageUpload(e, index)}
                      />
                    </Label>
                    {post.image && (
                      <div className='relative'>
                        {post.image === 'uploading...' ? (
                          <div className='flex h-20 w-20 items-center justify-center rounded-lg border-2 border-primary bg-muted'>
                            <span className='text-xs text-primary'>Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={post.image}
                              alt='Preview'
                              className='h-20 w-20 rounded-lg border-2 border-green-500 object-cover'
                              onError={(ev) => {
                                ;(ev.target as HTMLImageElement).src =
                                  'https://via.placeholder.com/80x80?text=Error'
                              }}
                            />
                            <Button
                              type='button'
                              variant='destructive'
                              size='icon'
                              className='absolute -right-2 -top-2 size-6'
                              onClick={() => updateBlogPost(index, 'image', '')}
                            >
                              <Trash2 className='size-3' />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Max 5MB. JPG, PNG, WebP, GIF. Stored in Cloudflare R2.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduling */}
        <div className='rounded-lg border border-border bg-muted/30 p-4 space-y-4'>
          <h3 className='text-lg font-semibold text-foreground'>Scheduling</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <Label className='text-foreground'>Min hours between posts</Label>
              <Input
                type='number'
                min={1}
                value={minHours}
                onChange={(e) => setMinHours(parseInt(e.target.value, 10) || 0)}
                className='mt-2'
              />
            </div>
            <div>
              <Label className='text-foreground'>Max hours between posts</Label>
              <Input
                type='number'
                min={1}
                value={maxHours}
                onChange={(e) => setMaxHours(parseInt(e.target.value, 10) || 0)}
                className='mt-2'
              />
            </div>
          </div>

          <div className='flex items-start gap-3 border-t border-border pt-4'>
            <input
              type='checkbox'
              id='authorRotation'
              checked={authorRotation}
              onChange={(e) => setAuthorRotation(e.target.checked)}
              className='mt-1 size-5 rounded border-input text-primary focus:ring-primary'
            />
            <div>
              <Label htmlFor='authorRotation' className='cursor-pointer font-medium text-foreground'>
                Author rotation
                <span
                  className={`ml-2 rounded px-2 py-0.5 text-xs ${
                    authorRotation ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {authorRotation ? 'ON' : 'OFF'}
                </span>
              </Label>
              <p className='mt-1 text-sm text-muted-foreground'>
                {authorRotation
                  ? 'Authors will be rotated across posts.'
                  : 'The selected author will be used for all posts.'}
              </p>
            </div>
          </div>
        </div>

        <div className='flex gap-4'>
          <Button type='submit' disabled={loading}>
            {loading ? 'Creating blogs…' : 'Create bulk blogs'}
          </Button>
        </div>
      </form>
    </div>
  )
}
