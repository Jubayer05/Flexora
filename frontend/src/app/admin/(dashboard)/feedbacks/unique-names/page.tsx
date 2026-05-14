'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { feedbackNameColumns } from '@/components/admin/feedbacks/feedback-name-columns'
import CustomInput from '@/components/common/CustomInput'
import { Pagination } from '@/components/common/Pagination'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Download, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

function UniqueNameList() {
  const [bulkNames, setBulkNames] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { search, page, limit, filters } = useFilter(10)

  const { data, loading, mutate } = useAsync<{ data: { fakeNames: any; pagination: any } }>(
    () =>
      `/admin/fake-names` +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=ORD-${search?.toUpperCase().replace('ORD-', '')}` : '') +
      (filters.status ? `&status=${filters.status}` : '')
  )

  // Confirmation modal for delete
  const deleteModal = useConfirmationModal({
    title: 'Delete Name',
    description: 'Are you sure you want to delete this name? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash2
  })

  const handleDelete = (item: any) => {
    deleteModal.openModal(async () => {
      try {
        await requests.delete(`/admin/fake-names/${item.id}`)
        toast.success('Name deleted successfully')
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  const handleBulkNameSubmit = async () => {
    if (!bulkNames.trim()) {
      toast.error('Please enter at least one name')
      return
    }

    setIsProcessing(true)

    // Split by new line and filter out empty strings
    const namesArray = bulkNames
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    // Remove duplicates using Set
    const uniqueNames = [...new Set(namesArray)]

    try {
      await requests.post(`/admin/fake-names/bulk`, {
        names: uniqueNames
      })

      toast.success(`Uploaded ${uniqueNames.length} unique names`)
      setIsProcessing(false)
      setBulkNames('')
    } catch (error) {
      showError(error)
    } finally {
      setIsProcessing(false)
      mutate()
    }
  }

  const handleExportCSV = () => {
    if (!bulkNames.trim()) {
      toast.error('No names to export')
      return
    }

    // Split by new line and filter out empty strings
    const namesArray = bulkNames
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    // Remove duplicates using Set
    const uniqueNames = [...new Set(namesArray)]

    // Create CSV content
    const csvContent = 'Name\n' + uniqueNames.join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `customer-names-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${uniqueNames.length} names to CSV`)
  }

  return (
    <div className='mx-auto w-full overflow-x-hidden'>
      {/* Bulk Name Card */}
      <Card className='mb-10 border-0 w-full'>
        <CardHeader>
          <CardTitle>Add Bulk Names</CardTitle>
          <Typography variant='body2' className='text-muted-foreground text-sm'>
            Enter customer names (500-1000 names). Each name should be on a new line.
          </Typography>
        </CardHeader>
        <CardContent>
          <CustomInput
            label='Customer Names'
            type='textarea'
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            placeholder='Enter names (one per line)&#10;Example:&#10;John Doe&#10;Jane Smith&#10;Alice Johnson&#10;...'
            rows={10}
            className='max-h-60 font-mono text-sm custom-scrollbar'
            disabled={isProcessing}
          />
        </CardContent>
        <div className='flex w-full flex-wrap gap-2 px-3 sm:px-6 justify-center sm:justify-start'>
          <Button
            onClick={handleBulkNameSubmit}
            disabled={isProcessing}
            className='bg-slate-500 text-white'
          >
            <Upload />
            {isProcessing ? 'Uploading...' : 'Upload Names'}
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={isProcessing}
            className='bg-blue-500 text-white'
          >
            <Download /> Export CSV
          </Button>
          <Button
            onClick={() => setBulkNames('')}
            disabled={isProcessing}
            className='bg-red-500 text-white'
          >
            <Trash2 /> Clear All
          </Button>
        </div>
      </Card>
      {/* Table */}
      <CustomTable
        columns={feedbackNameColumns(mutate, handleDelete)}
        data={data?.data?.fakeNames ?? []}
        getRowId={(row: any) => row.id}
        emptyMessage={loading ? 'Loading names...' : 'No names found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />{' '}
      {/* Local Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[10, 20, 50, 100]} />
      {/* Guidelines Section */}
      <Card className='mt-10 border-0'>
        <CardHeader>
          <CardTitle className='font-semibold text-2xl'>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-8 grid grid-cols-1 md:grid-cols-2'>
            {/* Format Section */}
            <div>
              <Typography variant='body1' className='mb-2'>
                Format:
              </Typography>
              <ul className='space-y-2 text-muted-foreground text-sm'>
                <li>• One name per line</li>
                <li>• Maximum 100 characters per name</li>
                <li>• Duplicate names will be skipped</li>
              </ul>
            </div>

            {/* Features Section */}
            <div>
              <Typography variant='body1' className='mb-2'>
                Features:
              </Typography>
              <ul className='space-y-2 text-muted-foreground text-sm'>
                <li>• Automatic duplicate detection</li>
                <li>• Bulk status management</li>
                <li>• CSV export functionality</li>
                <li>• Search and filter options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Delete confirmation modal */}
      <deleteModal.ModalComponent />
    </div>
  )
}

export default function UniqueNameHandle() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UniqueNameList />
    </Suspense>
  )
}
