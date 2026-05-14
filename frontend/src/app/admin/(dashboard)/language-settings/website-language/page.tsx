'use client'
import { CustomTable } from '@/components/admin/common/data-table'
import LanguageForm, { LanguageType } from '@/components/admin/form/settings/Language'
import { languageColumns } from '@/components/admin/languages/languages-columns'
import PageHeader from '@/components/common//PageHeader'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useState } from 'react'

export default function WebsiteLangPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedData, setSelectedData] = useState<LanguageType | undefined>(undefined)

  const settingsKey = 'system_website_language'
  const { data, mutate, loading } = useAsync<SettingsData<LanguageType[]>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  // Enhanced mutate function that includes edit and delete functionality
  const editLanguage = (data: LanguageType) => {
    setSelectedData(data)
    setIsOpen(true)
  }

  const deleteLanguage = async (item: LanguageType) => {
    const current = data?.data?.value || []
    const filtered = current.filter((c) => c.id !== item.id)
    await import('@/services/network/http').then(({ default: requests }) =>
      requests.post(`/admin/settings/${settingsKey}`, { value: filtered })
    )
    mutate()
  }

  const handleModalClose = () => {
    setIsOpen(false)
    setSelectedData(undefined)
  }

  const handleFormSuccess = () => {
    handleModalClose()
    mutate() // Refresh the list
  }

  const handleAddNew = () => {
    setSelectedData(undefined)
    setIsOpen(true)
  }
  return (
    <>
      <PageHeader title='' extra={<AddButton resource='settings' onClick={handleAddNew} />} />

      {loading ? (
        <Skeleton />
      ) : (
        <CustomTable
          columns={languageColumns({ editLanguage, deleteLanguage })}
          data={data?.data?.value || []}
          getRowId={(row: LanguageType) =>
            Number(row.id) || Math.floor(Math.random() * 1_000_000_000)
          }
          emptyMessage={loading ? 'Loading languages...' : 'No language found.'}
          className={loading ? 'opacity-50 pointer-events-none' : ''}
        />
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{selectedData ? 'Edit Language' : 'Add New Language'}</DialogTitle>
          </DialogHeader>

          <LanguageForm
            settingsKey={settingsKey}
            initialValues={selectedData ? { ...selectedData } : undefined}
            data={data?.data?.value}
            onSuccess={handleFormSuccess}
            onCancel={handleModalClose}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
