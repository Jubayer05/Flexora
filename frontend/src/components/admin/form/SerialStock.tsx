'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import useSerialStockStore from '@/services/state/serial-stock-state'
import type { SerialItem as SerialItemType, SerialStockFormat } from '@/services/state/serial-stock-state'
import { Download, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import SerialItem from './SerialItem'

type StockFormatType = SerialStockFormat

const DEFAULT_DELIMITER = ','
const getFormatLabel = (format: StockFormatType, delimiter = DEFAULT_DELIMITER) =>
  format === 'NEWLINE' ? 'New Line' : `Custom Delimiter (${delimiter || DEFAULT_DELIMITER})`

const getBatchId = () => `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const serializeStockItem = (item: {
  id: string
  email: string
  username: string
  password: string
  phone: string
  note?: string
}) =>
  [item.id, item.email, item.username, item.password, item.phone, item.note || '']
    .map((value) => value.trim())
    .filter(Boolean)
    .join(':')

const buildStockInputText = (
  items: Array<{
    id: string
    email: string
    username: string
    password: string
    phone: string
  }>,
  format: StockFormatType,
  delimiter: string
) => {
  const entries = items.map((item) => serializeStockItem(item)).filter(Boolean)

  if (format === 'CUSTOM_DELIMITER') {
    return entries.join(`\n${delimiter || DEFAULT_DELIMITER}\n`)
  }

  return entries.join('\n')
}

type StockDialogProps = {
  title: string
  mode: 'edit' | 'new'
  stockFormat: StockFormatType
  customDelimiter: string
  inputValue: string
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  onFormatChange: (value: StockFormatType) => void
  onDelimiterChange: (value: string) => void
  onInputChange: (value: string) => void
}

type StockGroup = {
  key: string
  label: string
  format: StockFormatType
  delimiter: string
  batchId: string
  items: SerialItemType[]
  text: string
}

function StockDialog({
  title,
  mode,
  stockFormat,
  customDelimiter,
  inputValue,
  isOpen,
  onClose,
  onSubmit,
  onFormatChange,
  onDelimiterChange,
  onInputChange
}: StockDialogProps) {
  if (!isOpen) return null

  const isCustomDelimiter = stockFormat === 'CUSTOM_DELIMITER'

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='mx-4 w-full max-w-2xl rounded-lg bg-gray-900 p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-medium text-white'>{title}</h3>
          <button onClick={onClose} className='text-gray-400 transition-colors hover:text-white'>
            <span className='text-xl'>x</span>
          </button>
        </div>

        <div className='space-y-4'>
          <div className='space-y-3'>
            <Label className='text-white'>Stock Format Type</Label>
            {mode === 'edit' ? (
              <div className='rounded-md border border-border bg-card px-3 py-2 text-sm text-white'>
                {stockFormat === 'NEWLINE'
                  ? 'New Line'
                  : `Custom Delimiter (${customDelimiter || DEFAULT_DELIMITER})`}
              </div>
            ) : (
              <RadioGroup
                value={stockFormat}
                onValueChange={(value: string) => onFormatChange(value as StockFormatType)}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='NEWLINE' id={`${mode}-newline`} />
                  <Label htmlFor={`${mode}-newline`} className='cursor-pointer text-white'>
                    New Line
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='CUSTOM_DELIMITER' id={`${mode}-custom-delimiter`} />
                  <Label htmlFor={`${mode}-custom-delimiter`} className='cursor-pointer text-white'>
                    Custom Delimiter
                  </Label>
                </div>
              </RadioGroup>
            )}
          </div>

          {isCustomDelimiter && (
            <CustomInput
              type='text'
              label='Custom Delimiter'
              placeholder='e.g. , or |'
              value={customDelimiter}
              onChange={(e) => onDelimiterChange(e.target.value)}
              disabled={mode === 'edit'}
              className='max-w-40'
            />
          )}

          <div>
            <Label className='mb-2 block text-white'>Paste Stock</Label>
            <textarea
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                stockFormat === 'NEWLINE'
                  ? 'boss1:82727hehue:lordsd@gmx.com:92778w828\nmollysatterlund7734454@gmail.com:kE5hXZfMGaU:vladislavsa3@terra.com'
                  : `boss1:82727hehue:lordsd@gmx.com:92778w828${customDelimiter || DEFAULT_DELIMITER}boss1:82727hehue:lordsd@gmx.com:92778w828`
              }
              className='h-48 w-full rounded border border-gray-700 bg-gray-800 p-3 font-mono text-sm text-white focus:border-primary focus:outline-none'
              rows={10}
            />
            <p className='mt-1 text-xs text-gray-400'>
              {stockFormat === 'NEWLINE'
                ? 'Each line will be treated as one stock item.'
                : 'Each separated block will be treated as one stock item.'}
            </p>
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='button' onClick={onSubmit} disabled={!inputValue.trim()}>
              {mode === 'edit' ? 'Update Stock' : 'Create Stock Batch'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type EditStockGroupsDialogProps = {
  groups: StockGroup[]
  groupInputs: Record<string, string>
  isOpen: boolean
  onClose: () => void
  onInputChange: (groupKey: string, value: string) => void
  onUpdateGroup: (group: StockGroup) => void
  onDeleteGroup: (group: StockGroup) => void
}

function EditStockGroupsDialog({
  groups,
  groupInputs,
  isOpen,
  onClose,
  onInputChange,
  onUpdateGroup,
  onDeleteGroup
}: EditStockGroupsDialogProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='mx-4 max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-gray-900 p-6'>
        <div className='mb-4 flex items-center justify-between gap-4'>
          <div>
            <h3 className='text-lg font-medium text-white'>Edit Stock</h3>
            <p className='text-xs text-gray-400'>
              Existing stock is grouped by saved format. Edit a box to bulk update that format, or delete the whole group.
            </p>
          </div>
          <button onClick={onClose} className='text-gray-400 transition-colors hover:text-white'>
            <span className='text-xl'>x</span>
          </button>
        </div>

        <div className='max-h-[70vh] space-y-4 overflow-y-auto pr-1 custom-scrollbar'>
          {groups.length === 0 ? (
            <div className='rounded-md border border-border bg-card p-6 text-center text-sm text-gray-400'>
              No stock items found.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className='rounded-lg border border-border bg-card p-4'>
                <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white'>{group.label}</p>
                    <p className='text-xs text-gray-400'>
                      {group.items.length} stock item{group.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      size='sm'
                      type='button'
                      variant='outline'
                      onClick={() => onUpdateGroup(group)}
                      disabled={!groupInputs[group.key]?.trim()}
                    >
                      Update Box
                    </Button>
                    <Button
                      size='sm'
                      type='button'
                      variant='destructive'
                      onClick={() => onDeleteGroup(group)}
                    >
                      <Trash2 className='mr-2 size-3.5' />
                      Delete Box
                    </Button>
                  </div>
                </div>

                <textarea
                  value={groupInputs[group.key] ?? ''}
                  onChange={(event) => onInputChange(group.key, event.target.value)}
                  className='h-56 w-full resize-y rounded border border-gray-700 bg-gray-800 p-3 font-mono text-sm text-white focus:border-primary focus:outline-none'
                />
                <p className='mt-2 text-xs text-gray-400'>
                  {group.format === 'NEWLINE'
                    ? 'Each line is one stock item.'
                    : `Each block separated by "${group.delimiter || DEFAULT_DELIMITER}" is one stock item.`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function SerialStock() {
  const {
    filteredItems,
    searchQuery,
    totalItems,
    selectedCount,
    items,
    setSearchQuery,
    exportSelectedItems,
    exportAllItems,
    removeSelectedItems,
    setItems
  } = useSerialStockStore()

  const [showBulkTakeDialog, setShowBulkTakeDialog] = useState(false)
  const [showEditStockDialog, setShowEditStockDialog] = useState(false)
  const [showAddStockDialog, setShowAddStockDialog] = useState(false)
  const [bulkTakeQuantity, setBulkTakeQuantity] = useState(1)
  const [currentFormat, setCurrentFormat] = useState<StockFormatType>('NEWLINE')
  const [currentDelimiter, setCurrentDelimiter] = useState(DEFAULT_DELIMITER)
  const [newFormat, setNewFormat] = useState<StockFormatType>('NEWLINE')
  const [newDelimiter, setNewDelimiter] = useState(DEFAULT_DELIMITER)
  const [editStockInputs, setEditStockInputs] = useState<Record<string, string>>({})
  const [newStockInput, setNewStockInput] = useState('')

  const currentFormatLabel = useMemo(() => {
    return getFormatLabel(currentFormat, currentDelimiter)
  }, [currentDelimiter, currentFormat])

  const stockGroups = useMemo<StockGroup[]>(() => {
    const groupedItems = new Map<string, StockGroup>()

    items.forEach((item) => {
      const format = item.stockFormat === 'CUSTOM_DELIMITER' ? 'CUSTOM_DELIMITER' : 'NEWLINE'
      const delimiter = item.delimiter || DEFAULT_DELIMITER
      const batchId = item.batchId || `${format}-${delimiter}`
      const key = `${format}:${delimiter}:${batchId}`
      const existingGroup = groupedItems.get(key)

      if (existingGroup) {
        existingGroup.items.push(item)
        return
      }

      groupedItems.set(key, {
        key,
        label: getFormatLabel(format, delimiter),
        format,
        delimiter,
        batchId,
        items: [item],
        text: ''
      })
    })

    return Array.from(groupedItems.values()).map((group) => ({
      ...group,
      text: buildStockInputText(group.items, group.format, group.delimiter)
    }))
  }, [items])

  const openEditStockDialog = () => {
    const nextInputs = stockGroups.reduce<Record<string, string>>((acc, group) => {
      acc[group.key] = group.text
      return acc
    }, {})
    setEditStockInputs(nextInputs)
    setShowEditStockDialog(true)
  }

  const parseEntries = (input: string, format: StockFormatType, delimiter: string) => {
    if (format === 'CUSTOM_DELIMITER') {
      return input
        .split(delimiter || DEFAULT_DELIMITER)
        .map((entry) => entry.trim())
        .filter(Boolean)
    }

    return input
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const buildItemsFromEntries = (
    entries: string[],
    existingItems: typeof items = [],
    format: StockFormatType = 'NEWLINE',
    delimiter: string = DEFAULT_DELIMITER,
    batchId: string = getBatchId()
  ) => {
    const noteMap = new Map(
      existingItems.map((item) => [
        serializeStockItem({
          id: item.id,
          email: item.email,
          username: item.username,
          password: item.password,
          phone: item.phone
        }),
        item.note
      ])
    )

    return entries.map((entry, index) => {
      const parts = entry
        .split(':')
        .map((part) => part.trim())
      const [field1 = '', field2 = '', field3 = '', field4 = '', field5 = '', field6 = '', ...rest] = parts

      return {
        _id: existingItems[index]?._id || `serial-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        id: field1,
        email: field2,
        username: field3,
        password: field4,
        phone: field5,
        note: [field6, ...rest].filter(Boolean).join(':') || noteMap.get(entry) || '',
        stockFormat: format,
        delimiter: delimiter || DEFAULT_DELIMITER,
        batchId,
        isSelected: false
      }
    })
  }

  const addEntries = (entries: string[], format: StockFormatType, delimiter: string) => {
    const batchId = getBatchId()
    const nextItems = buildItemsFromEntries(entries, [], format, delimiter || DEFAULT_DELIMITER, batchId)
    nextItems.reverse().forEach((item) => {
      useSerialStockStore.getState().addItem({
        id: item.id,
        email: item.email,
        username: item.username,
        password: item.password,
        phone: item.phone,
        note: item.note,
        stockFormat: item.stockFormat,
        delimiter: item.delimiter,
        batchId: item.batchId
      })
    })
  }

  const handleGroupInputChange = (groupKey: string, value: string) => {
    setEditStockInputs((current) => ({ ...current, [groupKey]: value }))
  }

  const handleUpdateStockGroup = (group: StockGroup) => {
    const entries = parseEntries(editStockInputs[group.key] || '', group.format, group.delimiter)

    if (entries.length === 0) {
      toast.error('No valid stock entries were found. Use Delete Box to remove this group.')
      return
    }

    const groupIds = new Set(group.items.map((item) => item._id))
    const untouchedItems = items.filter((item) => !groupIds.has(item._id))
    const updatedItems = buildItemsFromEntries(
      entries,
      group.items,
      group.format,
      group.delimiter,
      group.batchId
    )

    setItems([...updatedItems, ...untouchedItems])
    setEditStockInputs((current) => ({
      ...current,
      [group.key]: buildStockInputText(updatedItems, group.format, group.delimiter)
    }))
    toast.success(`Updated ${entries.length} stock item${entries.length > 1 ? 's' : ''}`)
  }

  const handleDeleteStockGroup = (group: StockGroup) => {
    const groupIds = new Set(group.items.map((item) => item._id))
    setItems(items.filter((item) => !groupIds.has(item._id)))
    setEditStockInputs((current) => {
      const next = { ...current }
      delete next[group.key]
      return next
    })
    toast.success(`Deleted ${group.items.length} stock item${group.items.length > 1 ? 's' : ''}`)
  }

  const handleAddNewStock = () => {
    const entries = parseEntries(newStockInput, newFormat, newDelimiter)

    if (entries.length === 0) {
      toast.error('No valid stock entries were found')
      return
    }

    addEntries(entries, newFormat, newDelimiter)
    setCurrentFormat(newFormat)
    setCurrentDelimiter(newDelimiter || DEFAULT_DELIMITER)
    setNewStockInput('')
    setShowAddStockDialog(false)
    toast.success(`Added ${entries.length} stock item${entries.length > 1 ? 's' : ''}`)
  }

  const handleExport = () => {
    const itemsToExport = selectedCount > 0 ? exportSelectedItems() : exportAllItems()

    const csvContent = [
      ['Stock Entry'].join(','),
      ...itemsToExport.map((item) =>
        JSON.stringify(
          serializeStockItem({
            id: item.id,
            email: item.email,
            username: item.username,
            password: item.password,
            phone: item.phone,
            note: item.note
          })
        )
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `serial-stock-${selectedCount > 0 ? 'selected' : 'all'}-${
      new Date().toISOString().split('T')[0]
    }.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleCopySelected = async () => {
    const selectedItems = exportSelectedItems()

    if (selectedItems.length === 0) {
      toast.error('Select at least one stock item to copy')
      return
    }

    const stockText = selectedItems
      .map((item) =>
        serializeStockItem({
          id: item.id,
          email: item.email,
          username: item.username,
          password: item.password,
          phone: item.phone
        })
      )
      .filter(Boolean)
      .join('\n')

    if (!stockText) {
      toast.error('Selected stock items are empty')
      return
    }

    try {
      await navigator.clipboard.writeText(stockText)
      toast.success(`Copied ${selectedItems.length} stock item${selectedItems.length > 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to copy selected stock')
    }
  }

  const handleBulkTake = () => {
    if (bulkTakeQuantity < 1 || bulkTakeQuantity > items.length) return

    const shuffled = [...items].sort(() => 0.5 - Math.random())
    const takenItems = shuffled.slice(0, bulkTakeQuantity)
    const remainingItems = items.filter(
      (item) => !takenItems.some((taken) => taken._id === item._id)
    )

    setItems(remainingItems)

    const csvContent = [
      ['Stock Entry'].join(','),
      ...takenItems.map((item) =>
        JSON.stringify(
          serializeStockItem({
            id: item.id,
            email: item.email,
            username: item.username,
            password: item.password,
            phone: item.phone,
            note: item.note
          })
        )
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bulk-take-${bulkTakeQuantity}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    setShowBulkTakeDialog(false)
    setBulkTakeQuantity(1)
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between border-b pb-2'>
        <div>
          <h2 className='text-sm font-normal text-white'>Credentials Stock (Total {totalItems} Items)</h2>
        </div>

        <div className='flex items-center gap-3'>
          {selectedCount > 0 && (
            <>
              <Button size='sm' type='button' onClick={handleCopySelected} variant='outline'>
                Copy Selected ({selectedCount})
              </Button>
              <Button size='sm' type='button' onClick={removeSelectedItems} variant='destructive'>
                Delete Selected ({selectedCount})
              </Button>
            </>
          )}
          <CustomInput
            size='small'
            type='text'
            placeholder='Search stock'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className='space-y-4 rounded-lg border border-border bg-card p-4'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm text-muted-foreground'>Current stock format</p>
            <p className='text-base font-medium text-white'>{currentFormatLabel}</p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              type='button'
              onClick={() => {
                setNewFormat(currentFormat)
                setNewDelimiter(currentDelimiter)
                setShowAddStockDialog(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add New Stock
            </Button>
          </div>
        </div>

        <Button
          type='button'
          variant='outline'
          onClick={openEditStockDialog}
          disabled={items.length === 0}
          className='w-full justify-center sm:w-auto'
        >
          <Pencil className='mr-2 h-4 w-4' />
          Edit Existing Stock
        </Button>

        <p className='text-xs text-gray-400'>
          <span className='text-white'>Edit Existing Stock</span> opens your current saved stock for editing.
          Use <span className='text-white'>Add New Stock</span> when you want to append more stock with the same or a different format.
        </p>
        <p className='text-xs text-gray-400'>
          You can also attach a private admin-only note to each stock row below for internal tracking.
        </p>
      </div>

      <div className='max-h-[400px] space-y-5 overflow-y-auto custom-scrollbar pt-2'>
        {filteredItems.map((item) => (
          <SerialItem key={item._id} item={item} />
        ))}

        {filteredItems.length === 0 && (
          <div className='py-8 text-center text-gray-400'>
            {searchQuery ? 'No items match your search' : 'No stock items found'}
          </div>
        )}
      </div>

      <div className='flex flex-wrap gap-3'>
        <Button
          size='sm'
          type='button'
          onClick={() => setShowBulkTakeDialog(true)}
          variant='outline'
          disabled={items.length === 0}
        >
          <Shuffle className='size-3.5' strokeWidth={1} />
          Bulk Take
        </Button>

        <Button size='sm' type='button' onClick={handleExport} variant='outline'>
          <Download className='size-3.5' strokeWidth={1} />
          Download
        </Button>
      </div>

      <EditStockGroupsDialog
        groups={stockGroups}
        groupInputs={editStockInputs}
        isOpen={showEditStockDialog}
        onClose={() => {
          setEditStockInputs({})
          setShowEditStockDialog(false)
        }}
        onInputChange={handleGroupInputChange}
        onUpdateGroup={handleUpdateStockGroup}
        onDeleteGroup={handleDeleteStockGroup}
      />

      <StockDialog
        title='Add New Stock'
        mode='new'
        stockFormat={newFormat}
        customDelimiter={newDelimiter}
        inputValue={newStockInput}
        isOpen={showAddStockDialog}
        onClose={() => {
          setNewStockInput('')
          setShowAddStockDialog(false)
        }}
        onSubmit={handleAddNewStock}
        onFormatChange={setNewFormat}
        onDelimiterChange={setNewDelimiter}
        onInputChange={setNewStockInput}
      />

      {showBulkTakeDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-gray-900 p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-medium text-white'>Bulk Take Random Stock</h3>
              <button
                onClick={() => setShowBulkTakeDialog(false)}
                className='text-gray-400 transition-colors hover:text-white'
              >
                <span className='text-xl'>x</span>
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <Label className='mb-2 block text-white'>Quantity to Take</Label>
                <CustomInput
                  type='number'
                  min={1}
                  max={items.length}
                  value={bulkTakeQuantity}
                  onChange={(e) => setBulkTakeQuantity(Number(e.target.value))}
                  placeholder={`Max: ${items.length}`}
                />
                <p className='mt-1 text-xs text-gray-400'>
                  Available: {items.length} stock items. Random selection will be downloaded as CSV.
                </p>
              </div>

              <div className='flex justify-end gap-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowBulkTakeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type='button'
                  onClick={handleBulkTake}
                  disabled={bulkTakeQuantity < 1 || bulkTakeQuantity > items.length}
                >
                  Take & Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
