'use client'

// import { MenuBuilder } from '@/components/admin/menu-builder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { PageItem, pageSchema, PageSettings } from '@/lib/validations/schemas/pageSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { MenuBuilder } from '../../menu-builder'
import PageEditorModal from './PageEditorModal'

type TProps = {
  initialValues?: PageSettings
  refetch?: () => void
  menuKey: string
}

const PageForm = ({ initialValues, refetch, menuKey }: TProps) => {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<PageItem | null>(null)
  const [parentSlugForNew, setParentSlugForNew] = useState<string>()

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting }
  } = useForm<PageSettings>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialValues || { pages: [] }
  })

  const pages = watch('pages') || []

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${menuKey}`, { value: data })
      if (res?.success) {
        toast.success('Pages updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  const handlePagesChange = (newPages: PageItem[]) => {
    setValue('pages', newPages, { shouldDirty: true })
  }

  const handleEditContent = (slug: string) => {
    // TODO: Before navigating, ensure the items to save current changes onSubmit call
    // Navigate to content editor
    router.push(`/admin/settings/pages/footer-menus/${slug}`)
  }

  const handleEditPage = (page: PageItem) => {
    setEditingPage(page)
    setParentSlugForNew(page.parentSlug)
    setIsModalOpen(true)
  }

  const handleSavePage = (pageData: Omit<PageItem, 'id'>) => {
    const newPage: PageItem = {
      ...pageData,
      id: editingPage?.id || crypto.randomUUID()
    }

    if (editingPage) {
      // Update existing page in nested structure
      const updatePageInStructure = (pages: PageItem[]): PageItem[] => {
        return pages.map((page) => {
          if (page.slug === editingPage.slug) {
            return { ...newPage, children: page.children || [] }
          }
          if (page.children && page.children.length > 0) {
            return { ...page, children: updatePageInStructure(page.children) }
          }
          return page
        })
      }
      const updatedPages = updatePageInStructure(pages)
      handlePagesChange(updatedPages)
    } else {
      // Add new page to nested structure
      if (parentSlugForNew) {
        // Add as child to specific parent
        const addToParent = (pages: PageItem[]): PageItem[] => {
          return pages.map((page) => {
            if (page.slug === parentSlugForNew) {
              const children = page.children || []
              const newChild = {
                ...newPage,
                children: [],
                parentSlug: parentSlugForNew,
                depth: (page.depth || 0) + 1,
                menuOrder: children.length
              }
              return {
                ...page,
                children: [...children, newChild]
              }
            }
            if (page.children && page.children.length > 0) {
              return { ...page, children: addToParent(page.children) }
            }
            return page
          })
        }
        const updatedPages = addToParent(pages)
        handlePagesChange(updatedPages)
      } else {
        // Add as root level page
        const newRootPage = {
          ...newPage,
          children: [],
          depth: 0,
          menuOrder: pages.length
        }
        handlePagesChange([...pages, newRootPage])
      }
    }

    setIsModalOpen(false)
    setEditingPage(null)
    setParentSlugForNew(undefined)
  }

  return (
    <>
      <form onSubmit={onSubmit} className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              Page Management
            </CardTitle>
            <p className='max-w-xl text-muted-foreground text-sm'>
              Build your navigation menu with our advanced drag & drop interface featuring dynamic
              placeholders, smooth animations, and intelligent nesting detection.
            </p>
            <div className='bg-gradient-to-r from-foreground to-background mt-2 p-3 border border-dashed rounded-md'>
              <h5 className='mb-1 font-medium text-sm'>� Menu Builder:</h5>
              <ul className='space-y-1 text-muted text-xs'>
                <li>• Dynamic drag placeholders that follow your mouse movement</li>
                <li>• Horizontal offset detection for intelligent nesting behavior</li>
                <li>• Smooth layout animations with Framer Motion</li>
                <li>• Inline editing with real-time feedback</li>
                <li>• One-level depth limitation with visual cues</li>
                <li>• Toggle visibility, active status, and menu display</li>
              </ul>
            </div>
          </CardHeader>
          <CardContent>
            {/* <PageTreeManager
              pages={pages}
              onPagesChange={handlePagesChange}
              onEditContent={handleEditContent}
              onAddPage={function (parentSlug?: string): void {
                throw new Error('Function not implemented.')
              }}
            /> */}
            <MenuBuilder
              items={pages}
              onChange={handlePagesChange}
              onEditContent={handleEditContent}
              onEdit={handleEditPage}
            />
          </CardContent>
        </Card>

        <Button type='submit' disabled={isSubmitting} className='w-full md:w-auto'>
          {isSubmitting ? 'Saving...' : 'Save Pages'}
        </Button>
      </form>

      <PageEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPage(null)
          setParentSlugForNew(undefined)
        }}
        onSave={handleSavePage}
        allPages={pages}
        parentSlug={parentSlugForNew}
        initialValues={editingPage}
      />
    </>
  )
}

export default PageForm
