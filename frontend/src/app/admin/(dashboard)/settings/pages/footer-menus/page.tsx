'use client'

import CustomLink from '@/components/common/CustomLink'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { AddButton } from '@/components/common/PermissionGate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Edit, Trash } from 'lucide-react'
import { toast } from 'sonner'

export default function PagesListPage() {
  const location = 'FOOTER'
  const { data, mutate, loading } = useAsync<{ data: { pages: any[] } }>(
    () =>
      `/admin/custom-pages?location=${location}&page=1&limit=50&sortBy=createdAt&sortOrder=desc`,
    true
  )

  const pages = data?.data?.pages || []

  const deleteModal = useConfirmationModal({
    title: 'Delete Page',
    description: 'Are you sure you want to delete this page? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash,
    showInput: false
  })

  return (
    <>
      <PageHeader
        title='Pages'
        subTitle='Manage static pages and their visibility'
        extra={<AddButton resource='pages' href='/admin/settings/pages/footer-menus/create' />}
      />

      {loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : pages.length === 0 ? (
        <div className='pt-6'>
          <EmptyState title='No pages yet' description='Create your first page to get started.' />
        </div>
      ) : (
        <div className='space-y-3'>
          {pages.map((p: any) => (
            <div
              key={p.id || p.slug}
              className='flex justify-between items-center gap-4 p-4 border rounded-md'
            >
              <div>
                <div className='font-medium'>{p.title || '-'}</div>
                <div className='text-muted-foreground text-sm'>{p.url || `/pages/${p.slug}`}</div>
              </div>
              {/* <div className='flex flex-wrap gap-2 shrink-0'>
                {p?.meta?.featured && <Badge variant='secondary'>Featured</Badge>}
                {p?.meta?.showInFooter && <Badge variant='outline'>Footer</Badge>}
              </div> */}
              <div className='flex items-center gap-2 shrink-0'>
                <CustomLink href={`/admin/settings/pages/footer-menus/${p.id}/edit`}>
                  <Button variant={'ghost'} size={'icon'}>
                    <Edit className='size-5 text-muted' />
                  </Button>
                </CustomLink>

                {/* TODO: on click button open delete action modal and delete the data */}
                <Button
                  variant={'ghost'}
                  size={'icon'}
                  title='Delete'
                  onClick={() =>
                    deleteModal.openModal(async () => {
                      try {
                        await requests.delete(`/admin/custom-pages/${p.id}`)

                        toast.success('Page deleted successfully')
                        mutate?.()
                      } catch (error) {
                        showError(error)
                        throw error
                      }
                    })
                  }
                >
                  <Trash className='size-5 text-muted' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <deleteModal.ModalComponent />
    </>
  )
}
