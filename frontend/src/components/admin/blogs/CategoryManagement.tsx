'use client'

import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
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
import { cn } from '@/lib/utils'
import { Edit, Plus, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { BlogAuthorRef, BlogCategory, BlogSubCategory } from './types'

type Tab = 'category' | 'subcategory'

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

// --- Category state & API types
type CategoriesListRes = {
  success: boolean
  data: { categories: BlogCategory[]; pagination?: unknown }
  message?: string
}
type CategoryOneRes = { success: boolean; data: BlogCategory; message?: string }

// --- SubCategory state & API types
type SubCategoriesListRes = { success: boolean; data: BlogSubCategory[]; message?: string }
type SubCategoryOneRes = { success: boolean; data: BlogSubCategory; message?: string }
type AuthorsListRes = { success: boolean; data: BlogAuthorRef[]; message?: string }

export default function CategoryManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('category')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [subCategories, setSubCategories] = useState<BlogSubCategory[]>([])
  const [authors, setAuthors] = useState<BlogAuthorRef[]>([])
  const [loading, setLoading] = useState(true)

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' })

  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false)
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<number | null>(null)
  const [subCategoryForm, setSubCategoryForm] = useState({
    name: '',
    slug: '',
    categoryId: '',
    authorId: ''
  })

  const fetchCategories = useCallback(async () => {
    try {
      const res = await requests.get<CategoriesListRes>(
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
      const res = await requests.get<SubCategoriesListRes>('admin/blog-subcategories')
      if (res?.success && Array.isArray(res.data)) {
        setSubCategories(res.data)
      }
    } catch (err) {
      showError(err)
    }
  }, [])

  const fetchAuthors = useCallback(async () => {
    try {
      const res = await requests.get<AuthorsListRes>('admin/blog-authors')
      if (res?.success && Array.isArray(res.data)) {
        setAuthors(res.data)
      }
    } catch (err) {
      showError(err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCategories(),
      fetchSubCategories(),
      fetchAuthors()
    ]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchCategories, fetchSubCategories, fetchAuthors])

  const handleCategoryCreate = () => {
    setCategoryForm({ name: '', slug: '' })
    setEditingCategoryId(null)
    setShowCategoryForm(true)
  }

  const handleCategoryEdit = (c: BlogCategory) => {
    setCategoryForm({ name: c.name, slug: c.slug })
    setEditingCategoryId(c.id)
    setShowCategoryForm(true)
  }

  const handleCategoryTitleChange = (value: string) => {
    setCategoryForm((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug || generateSlug(value)
    }))
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) {
      toast.error('Validation Error', { description: 'Please fill in all required fields.' })
      return
    }
    try {
      if (editingCategoryId) {
        await requests.put<CategoryOneRes>(
          `admin/blogs/categories/${editingCategoryId}`,
          { name: categoryForm.name.trim(), slug: categoryForm.slug.trim() }
        )
        toast.success('Category Updated!', { description: 'Category updated successfully.' })
      } else {
        await requests.post<CategoryOneRes>('admin/blogs/categories', {
          name: categoryForm.name.trim()
        })
        toast.success('Category Created!', { description: 'Category created successfully.' })
      }
      setShowCategoryForm(false)
      setEditingCategoryId(null)
      setCategoryForm({ name: '', slug: '' })
      fetchCategories()
      fetchSubCategories()
    } catch (err) {
      showError(err)
    }
  }

  const deleteCategoryConfig = {
    title: 'Are you sure?',
    description: 'This action cannot be undone!',
    confirmText: 'Yes, delete it!',
    variant: 'destructive' as const,
    icon: Trash2
  }
  const { openModal: openCategoryDeleteModal, ModalComponent: CategoryDeleteModal } =
    useConfirmationModal({ ...deleteCategoryConfig, cancelText: 'Cancel' })

  const handleCategoryDelete = (id: number) => {
    openCategoryDeleteModal(async () => {
      try {
        await requests.delete(`admin/blogs/categories/${id}`)
        toast.success('Category Deleted!', { description: 'Category deleted successfully.' })
        fetchCategories()
        fetchSubCategories()
      } catch (err) {
        showError(err)
        throw err
      }
    })
  }

  const handleSubCategoryCreate = () => {
    setSubCategoryForm({ name: '', slug: '', categoryId: '', authorId: '' })
    setEditingSubCategoryId(null)
    setShowSubCategoryForm(true)
  }

  const handleSubCategoryEdit = (s: BlogSubCategory) => {
    setSubCategoryForm({
      name: s.name,
      slug: s.slug,
      categoryId: String(s.categoryId),
      authorId: s.authorId ? String(s.authorId) : ''
    })
    setEditingSubCategoryId(s.id)
    setShowSubCategoryForm(true)
  }

  const handleSubCategoryTitleChange = (value: string) => {
    setSubCategoryForm((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug || generateSlug(value)
    }))
  }

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subCategoryForm.name.trim() || !subCategoryForm.categoryId) {
      toast.error('Validation Error', { description: 'Please fill in all required fields.' })
      return
    }
    const categoryId = Number(subCategoryForm.categoryId)
    if (!Number.isInteger(categoryId)) return
    const payload = {
      name: subCategoryForm.name.trim(),
      slug: subCategoryForm.slug.trim() || undefined,
      categoryId,
      authorId: subCategoryForm.authorId ? Number(subCategoryForm.authorId) : null
    }
    try {
      if (editingSubCategoryId) {
        await requests.put<SubCategoryOneRes>(
          `admin/blog-subcategories/${editingSubCategoryId}`,
          payload
        )
        toast.success('Sub-Category Updated!', { description: 'Subcategory updated successfully.' })
      } else {
        await requests.post<SubCategoryOneRes>('admin/blog-subcategories', payload)
        toast.success('Sub-Category Created!', { description: 'Subcategory created successfully.' })
      }
      setShowSubCategoryForm(false)
      setEditingSubCategoryId(null)
      setSubCategoryForm({ name: '', slug: '', categoryId: '', authorId: '' })
      fetchSubCategories()
    } catch (err) {
      showError(err)
    }
  }

  const { openModal: openSubCategoryDeleteModal, ModalComponent: SubCategoryDeleteModal } =
    useConfirmationModal({ ...deleteCategoryConfig, cancelText: 'Cancel' })

  const handleSubCategoryDelete = (id: number) => {
    openSubCategoryDeleteModal(async () => {
      try {
        await requests.delete(`admin/blog-subcategories/${id}`)
        toast.success('Sub-Category Deleted!', { description: 'Subcategory deleted successfully.' })
        fetchSubCategories()
      } catch (err) {
        showError(err)
        throw err
      }
    })
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[120px] rounded-xl border border-border bg-card p-6'>
        <p className='text-sm text-muted-foreground'>Loading...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <nav
        className='flex flex-wrap gap-2 border-b border-border pb-4'
        aria-label='Category management tabs'
      >
        <button
          type='button'
          onClick={() => setActiveTab('category')}
          className={cn(
            'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all',
            'border-input bg-transparent text-foreground hover:bg-muted/50',
            activeTab === 'category' &&
              'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50'
          )}
        >
          Category Management
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('subcategory')}
          className={cn(
            'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all',
            'border-input bg-transparent text-foreground hover:bg-muted/50',
            activeTab === 'subcategory' &&
              'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:border-primary/50'
          )}
        >
          Sub-Category Management
        </button>
      </nav>

      {activeTab === 'category' && (
        <div className='rounded-xl border border-border bg-card p-4 sm:p-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
            <h3 className='text-xl font-semibold text-foreground'>Manage Categories</h3>
            <Button type='button' onClick={handleCategoryCreate} className='gap-2 shrink-0'>
              <Plus className='size-4' />
              Create Category
            </Button>
          </div>

          {showCategoryForm && (
            <div className='mb-8 rounded-lg border border-border bg-muted/30 p-4 sm:p-6'>
              <h4 className='text-lg font-semibold text-foreground mb-4'>
                {editingCategoryId ? 'Edit Category' : 'Create New Category'}
              </h4>
              <form onSubmit={handleCategorySubmit} className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-foreground'>Title *</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => handleCategoryTitleChange(e.target.value)}
                      placeholder='Enter category title'
                      className='mt-2'
                    />
                  </div>
                  <div>
                    <Label className='text-foreground'>Slug</Label>
                    <Input
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm((p) => ({ ...p, slug: e.target.value }))
                      }
                      placeholder='category-url-slug'
                      className='mt-2'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      URL-friendly version of the title
                    </p>
                  </div>
                </div>
                <div className='flex gap-3'>
                  <Button type='submit' className='gap-2'>
                    <Save className='size-4' />
                    {editingCategoryId ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setShowCategoryForm(false)
                      setEditingCategoryId(null)
                    }}
                    className='gap-2 border-border'
                  >
                    <X className='size-4' />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {categories.length === 0 ? (
            <div className='py-12 text-center'>
              <p className='text-muted-foreground'>No categories found.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className='flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-foreground'>{cat.name}</p>
                    <p className='text-sm text-muted-foreground'>Slug: {cat.slug}</p>
                  </div>
                  <div className='flex gap-2 shrink-0'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => handleCategoryEdit(cat)}
                      className='gap-1 border-border'
                    >
                      <Edit className='size-3' />
                      Edit
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => handleCategoryDelete(cat.id)}
                      className='gap-1'
                    >
                      <Trash2 className='size-3' />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subcategory' && (
        <div className='rounded-xl border border-border bg-card p-4 sm:p-6'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6'>
            <h3 className='text-xl font-semibold text-foreground'>Manage Sub-Categories</h3>
            <Button type='button' onClick={handleSubCategoryCreate} className='gap-2 shrink-0'>
              <Plus className='size-4' />
              Create Sub-Category
            </Button>
          </div>

          {showSubCategoryForm && (
            <div className='mb-8 rounded-lg border border-border bg-muted/30 p-4 sm:p-6'>
              <h4 className='text-lg font-semibold text-foreground mb-4'>
                {editingSubCategoryId ? 'Edit Sub-Category' : 'Create New Sub-Category'}
              </h4>
              <form onSubmit={handleSubCategorySubmit} className='space-y-4'>
                <div>
                  <Label className='text-foreground'>Category *</Label>
                  <Select
                    value={subCategoryForm.categoryId}
                    onValueChange={(v) =>
                      setSubCategoryForm((p) => ({ ...p, categoryId: v }))
                    }
                    required
                  >
                    <SelectTrigger className='mt-2'>
                      <SelectValue placeholder='Select Category' />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className='text-foreground'>Author (Optional)</Label>
                  <Select
                    value={subCategoryForm.authorId || '_none'}
                    onValueChange={(v) =>
                      setSubCategoryForm((p) => ({
                        ...p,
                        authorId: v === '_none' ? '' : v
                      }))
                    }
                  >
                    <SelectTrigger className='mt-2'>
                      <SelectValue placeholder='Select Author' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_none'>None</SelectItem>
                      {authors.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-foreground'>Title *</Label>
                    <Input
                      value={subCategoryForm.name}
                      onChange={(e) => handleSubCategoryTitleChange(e.target.value)}
                      placeholder='Enter subcategory title'
                      className='mt-2'
                    />
                  </div>
                  <div>
                    <Label className='text-foreground'>Slug</Label>
                    <Input
                      value={subCategoryForm.slug}
                      onChange={(e) =>
                        setSubCategoryForm((p) => ({ ...p, slug: e.target.value }))
                      }
                      placeholder='subcategory-url-slug'
                      className='mt-2'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      URL-friendly version of the title
                    </p>
                  </div>
                </div>
                <div className='flex gap-3'>
                  <Button type='submit' className='gap-2'>
                    <Save className='size-4' />
                    {editingSubCategoryId ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                      setShowSubCategoryForm(false)
                      setEditingSubCategoryId(null)
                    }}
                    className='gap-2 border-border'
                  >
                    <X className='size-4' />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {subCategories.length === 0 ? (
            <div className='py-12 text-center'>
              <p className='text-muted-foreground'>No sub-categories found.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {subCategories.map((sub) => (
                <div
                  key={sub.id}
                  className='flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-foreground'>{sub.name}</p>
                    <p className='text-sm text-muted-foreground'>Slug: {sub.slug}</p>
                    <p className='text-sm text-muted-foreground'>
                      Category: {sub.category?.name ?? 'N/A'}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      Author: {sub.author?.name ?? 'N/A'}
                    </p>
                  </div>
                  <div className='flex gap-2 shrink-0'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => handleSubCategoryEdit(sub)}
                      className='gap-1 border-border'
                    >
                      <Edit className='size-3' />
                      Edit
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => handleSubCategoryDelete(sub.id)}
                      className='gap-1'
                    >
                      <Trash2 className='size-3' />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CategoryDeleteModal />
      <SubCategoryDeleteModal />
    </div>
  )
}
