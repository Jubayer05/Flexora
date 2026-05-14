'use client'

import { useState } from 'react'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'

interface AddGroupDialogContentProps {
  onClose: () => void
  onSuccess: () => void
}

export function AddGroupDialogContent({ onClose, onSuccess }: AddGroupDialogContentProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [category, setCategory] = useState<string>()
  const [categoryLabel, setCategoryLabel] = useState<string>()

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!category) {
      toast.error('Category is required')
      return
    }

    setIsCreating(true)
    try {
      await requests.post('/admin/product-groups', {
        name: groupName,
        productIds: selectedProductIds.map((id) => parseInt(id)),
        categoryId: Number(category)
      })
      toast.success('Product group created successfully')
      onClose()
      onSuccess()
    } catch (error) {
      showError(error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Product Group</DialogTitle>
        <DialogDescription>Create a new product group and select products.</DialogDescription>
      </DialogHeader>
      <div className='py-4'>
        <div className='space-y-6'>
          {/* Group Name */}
          <div className='space-y-2'>
            <Label htmlFor='groupName'>Group Name</Label>
            <Input
              id='groupName'
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder='Enter group name'
              disabled={isCreating}
            />
          </div>

          {/* Category Selection - only fetch when dialog is open */}
          <CustomSelect
            className='mb-6'
            label='Select Category'
            url='/admin/categories?isRoot=true&limit=20'
            options={(data) =>
              data?.data?.categories.map((category: Category) => ({
                value: category.id.toString(),
                title: category.name,
                label: category.name
              }))
            }
            value={category}
            defaultLabel={categoryLabel}
            onChange={(selectedOption: any) => {
              setCategory(selectedOption.value)
              setCategoryLabel(selectedOption.label)
            }}
            placeholder='Select category'
            returnFullData={true}
          />

          {/* Product Selection */}
          <div className='space-y-3'>
            <CustomSelect
              label='Select Products'
              placeholder='Select products for this group'
              url='/admin/products?limit=20'
              multiple={true}
              value={selectedProductIds}
              onChange={setSelectedProductIds}
              options={(data) =>
                data?.data?.products?.map((product: any) => ({
                  value: product.id.toString(),
                  label: `${product.name} (${product.sku})`
                })) || []
              }
              searchMode='server'
              showSearch={true}
              disabled={isCreating}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant='outline' onClick={onClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogFooter>
    </>
  )
}
