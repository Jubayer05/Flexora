'use client'

import CustomInput from '@/components/common/CustomInput'
import { Checkbox } from '@/components/ui/checkbox'
import useSerialStockStore, {
  type SerialItem as SerialItemType
} from '@/services/state/serial-stock-state'
import { X } from 'lucide-react'

interface SerialItemProps {
  item: SerialItemType
}

const serializeStockItem = (item: SerialItemType) =>
  [item.id, item.email, item.username, item.password, item.phone, item.note]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(':')

const parseStockLine = (value: string, item: SerialItemType) => {
  const parts = value.split(':').map((part) => part.trim())
  const [id = '', email = '', username = '', password = '', phone = '', note = '', ...rest] = parts

  return {
    id,
    email,
    username,
    password,
    phone,
    note: [note, ...rest].filter(Boolean).join(':')
  }
}

export default function SerialItem({ item }: SerialItemProps) {
  const { toggleItemSelection, removeItem, updateItem } = useSerialStockStore()
  const stockLine = serializeStockItem(item)

  return (
    <div className='flex items-start gap-3'>
      <Checkbox
        checked={item.isSelected}
        onCheckedChange={() => toggleItemSelection(item._id)}
        className='mt-4 h-4 w-4'
      />

      <div className='min-w-0 flex-1 space-y-2'>
        <CustomInput
          size='small'
          type='text'
          value={stockLine}
          onChange={(e) => updateItem(item._id, parseStockLine(e.target.value, item))}
          inputClassName='font-mono text-sm!'
          placeholder='boss1:82727hehue:lordsd@gmx.com:92778w828:note'
        />
      </div>

      <button
        onClick={() => removeItem(item._id)}
        className='mt-4 flex size-5 items-center justify-center text-red-500 transition-colors hover:text-red-600'
      >
        <X className='size-5' strokeWidth={2} />
      </button>
    </div>
  )
}
