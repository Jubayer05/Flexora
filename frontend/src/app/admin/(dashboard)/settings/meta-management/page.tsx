'use client'
import PageMetaForm from '@/components/admin/form/settings/PageMetaForm'
import PageHeader from '@/components/common//PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import { PageBannersFormData, PageData } from '@/lib/validations/schemas/pageSchema'
import requests from '@/services/network/http'
import { Plus, Trash, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function MetaManagementPage() {
  const [pageData, setPageData] = useState<PageData | null>(null)
  const { data, mutate, loading } = useAsync<{ data: PageBannersFormData }>(
    () => `/admin/custom-pages/info?includes=seo`,
    true
  )

  const deleteModal = useConfirmationModal({
    title: 'Delete Page',
    description: 'Are you sure you want to delete this page? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash,
    showInput: false
  })

  const onClose = () => {
    mutate()
  }

  const handleDeletePage = async (pageId: string) => {
    try {
      await requests.delete(`/admin/custom-pages/${pageId}`)
      toast.success('Page deleted successfully')
      
      // If the deleted page was currently selected, clear selection
      if (pageData?.id === pageId) {
        setPageData(null)
      }
      
      // Refresh the page list
      await mutate()
    } catch (error) {
      showError(error)
      throw error
    }
  }

  useEffect(() => {
    if (data?.data?.pages && data.data.pages.length > 0) {
      // If no page is selected or the selected page no longer exists, select the first one
      const currentPageExists = pageData && data.data.pages.find((p) => p.id === pageData.id)
      if (!currentPageExists) {
        setPageData(data.data?.pages[0])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return (
    <>
      <PageHeader
        title='Meta Management'
        subTitle='Manage page meta content including SEO title, description, and keywords.'
      />

      {loading ? (
        <div className='flex justify-center items-center min-h-[200px]'>
          <div className='text-center'>
            <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
            <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
          </div>
        </div>
      ) : (
        <>
         <div className="mb-4 flex flex-wrap justify-center sm:justify-start gap-4 items-center">
            {data?.data?.pages?.map((page, idx) => (
              <div
                key={page.id || idx}
                className="flex items-center gap-2 group"
              >
                <Button
                  size={'lg'}
                  variant={'outline'}
                  onClick={() => setPageData(page)}
                  className={pageData?.id === page.id ? 'border-primary text-primary' : ''}
                >
                  {page.title || `Page ${idx + 1}`}
                </Button>
                {page.id && (
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteModal.openModal(async () => {
                        await handleDeletePage(page.id!)
                      })
                    }}
                    title="Delete page"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              size={'lg'}
              variant={'default'}
              asChild
              className='gap-2'
            >
              <Link href='/admin/settings/create-page'>
                <Plus className='w-4 h-4' />
                Add New Page
              </Link>
            </Button>
          </div>
          {data?.data?.pages && data.data.pages.length === 0 ? (
            <EmptyState />
          ) : pageData ? (
            <PageMetaForm initialValues={pageData} refetch={onClose} />
          ) : null}
        </>
      )}

      <deleteModal.ModalComponent />
    </>
  )
}
