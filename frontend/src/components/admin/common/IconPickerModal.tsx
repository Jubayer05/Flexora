'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { icons } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface IconPickerModalProps {
  value?: string
  onChange?: (iconName: string) => void
}

export default function IconPickerModal({ value, onChange }: IconPickerModalProps) {
  const [visible, setVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const isLoading = search !== debouncedSearch
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // slight delay ensures modal is fully mounted
    }
  }, [visible])

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  function normalizeIconName(str: string) {
    return str
      .replace(/[-_]/g, ' ') // replace dash or underscore with space
      .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
      .toLowerCase()
  }

  const filteredIcons = useMemo(() => {
    if (!debouncedSearch.trim()) return Object.entries(icons)

    const searchWords = normalizeIconName(debouncedSearch).split(/\s+/)

    return Object.entries(icons).filter(([name]) => {
      const normalizedName = normalizeIconName(name)
      return searchWords.every((word) => normalizedName.includes(word))
    })
  }, [debouncedSearch])

  const SelectedIcon = value ? icons[value as keyof typeof icons] : null

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogTrigger asChild>
        <Button variant='outline' className='flex items-center gap-2'>
          {SelectedIcon && <SelectedIcon className='w-4 h-4' />}
          {value || 'Choose Icon'}
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Input
            ref={inputRef}
            placeholder='Search icons...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <div className='border-primary border-b-2 rounded-full w-6 h-6 animate-spin'></div>
            </div>
          ) : (
            <div className='gap-3 grid grid-cols-8 max-h-[400px] overflow-auto'>
              {filteredIcons.map(([name, Icon]) => (
                <div
                  key={name}
                  title={name}
                  onClick={() => {
                    onChange?.(name)
                    setVisible(false)
                  }}
                  className={`p-2 rounded cursor-pointer flex items-center justify-center border hover:border-primary hover:bg-primary/10 transition-colors
                    ${name === value ? 'border-primary bg-primary/10' : 'border-gray-200'}
                  `}
                >
                  <Icon className='w-5 h-5' />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
