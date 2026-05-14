'use client'

import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Edit, Plus, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface BlogAuthor {
  id: number
  name: string
  email: string
  bio: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type AuthorFormData = {
  name: string
  email: string
  bio: string
}

const initialForm: AuthorFormData = {
  name: '',
  email: '',
  bio: ''
}

type ApiListResponse = { success: boolean; data: BlogAuthor[]; message?: string }
type ApiOneResponse = { success: boolean; data: BlogAuthor; message?: string }
type ApiErrorResponse = { success: boolean; message?: string; error?: string }

export default function AuthorPool() {
  const [authors, setAuthors] = useState<BlogAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<AuthorFormData>(initialForm)

  const fetchAuthors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await requests.get<ApiListResponse>('admin/blog-authors')
      if (res?.success && Array.isArray(res.data)) {
        setAuthors(res.data)
      }
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuthors()
  }, [fetchAuthors])

  const handleCreate = () => {
    setFormData(initialForm)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (author: BlogAuthor) => {
    setFormData({
      name: author.name,
      email: author.email ?? '',
      bio: author.bio ?? ''
    })
    setEditingId(author.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Validation Error', {
        description: 'Please fill in all required fields.'
      })
      return
    }
    try {
      if (editingId) {
        const res = await requests.put<ApiOneResponse>(
          `admin/blog-authors/${editingId}`,
          {
            name: formData.name.trim(),
            email: formData.email.trim(),
            bio: formData.bio.trim() || null
          }
        )
        if (res?.success) {
          toast.success('Author Updated!', { description: res.message })
          setShowForm(false)
          setEditingId(null)
          setFormData(initialForm)
          fetchAuthors()
        } else {
          toast.error('Operation Failed', {
            description: (res as ApiErrorResponse)?.message ?? 'Update failed.'
          })
        }
      } else {
        const res = await requests.post<ApiOneResponse>('admin/blog-authors', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          bio: formData.bio.trim() || undefined
        })
        if (res?.success) {
          toast.success('Author Created!', { description: res.message })
          setShowForm(false)
          setFormData(initialForm)
          fetchAuthors()
        } else {
          toast.error('Operation Failed', {
            description: (res as ApiErrorResponse)?.message ?? 'Create failed.'
          })
        }
      }
    } catch (err) {
      showError(err)
    }
  }

  const deleteConfig = {
    title: 'Are you sure?',
    description: 'This action cannot be undone!',
    confirmText: 'Yes, delete it!',
    variant: 'destructive' as const,
    icon: Trash2
  }

  const { openModal, ModalComponent } = useConfirmationModal({
    ...deleteConfig,
    cancelText: 'Cancel'
  })

  const handleDeleteClick = (authorId: number) => {
    openModal(async () => {
      try {
        await requests.delete(`admin/blog-authors/${authorId}`)
        toast.success('Author Deleted!', { description: 'Author deleted successfully.' })
        fetchAuthors()
      } catch (err) {
        showError(err)
        throw err
      }
    })
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[120px] rounded-xl border border-border bg-card p-6'>
        <p className='text-sm text-muted-foreground'>Loading authors...</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-xl font-semibold text-foreground'>Manage Authors</h2>
        <Button type='button' onClick={handleCreate} className='gap-2 shrink-0'>
          <Plus className='size-4' />
          Create Author
        </Button>
      </div>

      {showForm && (
        <div className='rounded-lg border border-border bg-card p-4 sm:p-6'>
          <h3 className='text-lg font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Author' : 'Create New Author'}
          </h3>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <Label htmlFor='author-name' className='text-foreground'>
                Name *
              </Label>
              <Input
                id='author-name'
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder='Enter author name'
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='author-email' className='text-foreground'>
                Email
              </Label>
              <Input
                id='author-email'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder='Enter author email (optional)'
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='author-bio' className='text-foreground'>
                Bio
              </Label>
              <textarea
                id='author-bio'
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                placeholder='Enter author bio (optional)'
                className={cn(
                  'mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'resize-none'
                )}
              />
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button type='submit' className='gap-2'>
                <Save className='size-4' />
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData(initialForm)
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

      {authors.length === 0 ? (
        <div className='rounded-xl border border-border bg-card p-8 text-center'>
          <p className='text-muted-foreground'>No authors found.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {authors.map((author) => (
            <div
              key={author.id}
              className='rounded-lg border border-border bg-card p-4 sm:p-6'
            >
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0 flex-1'>
                  <h3 className='font-semibold text-foreground break-words'>{author.name}</h3>
                  {author.email && (
                    <p className='text-sm text-muted-foreground mt-1'>
                      Email: {author.email}
                    </p>
                  )}
                  {author.bio && (
                    <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
                      {author.bio}
                    </p>
                  )}
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleEdit(author)}
                    className='gap-1 border-border'
                  >
                    <Edit className='size-3' />
                    Edit
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    onClick={() => handleDeleteClick(author.id)}
                    className='gap-1'
                  >
                    <Trash2 className='size-3' />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalComponent />
    </div>
  )
}
