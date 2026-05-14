'use client'
import { CustomTable } from '@/components/admin/common/data-table'
import { currencyColumns } from '@/components/admin/currencies/currencies-columns'
import CurrencyForm from '@/components/admin/form/settings/Currency'
import PageHeader from '@/components/common//PageHeader'
import { AddButton } from '@/components/common/PermissionGate'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { CurrencyType } from '@/lib/validations/schemas/currency'
import { useState } from 'react'

export default function CurrenciesPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedData, setSelectedData] = useState<CurrencyType | undefined>(undefined)

  const settingsKey = 'system_currency'
  const { data, mutate, loading } = useAsync<SettingsData<CurrencyType[]>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  // Enhanced mutate function that includes edit and delete functionality
  const editCurrency = (data: CurrencyType) => {
    setSelectedData(data)
    setIsOpen(true)
  }

  const deleteCurrency = async (item: CurrencyType) => {
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
      <PageHeader
        title='Currencies'
        extra={<AddButton resource='settings' onClick={handleAddNew} />}
      />

      {loading ? (
        <Skeleton />
      ) : (
        <CustomTable
          columns={currencyColumns({ editCurrency, deleteCurrency })}
          data={data?.data?.value || []}
          getRowId={(row: CurrencyType) =>
            Number(row.id) || Math.floor(Math.random() * 1_000_000_000)
          }
          emptyMessage={loading ? 'Loading currencies...' : 'No currency found.'}
          className={loading ? 'opacity-50 pointer-events-none' : ''}
        />
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{selectedData ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
          </DialogHeader>

          <CurrencyForm
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
