'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  placeholder?: string
  emptyText?: string
  onSelect?: (value: string) => void
  onSearch?: (search: string) => void
  disabled?: boolean
  className?: string
  searchPlaceholder?: string
  loading?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Combobox({
  options,
  value,
  placeholder = 'Choose an option...',
  emptyText = 'No matching option found.',
  onSelect,
  onSearch,
  disabled,
  className,
  searchPlaceholder = 'Search...',
  loading = false,
  open,
  onOpenChange
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const isControlled = open !== undefined
  const openState = isControlled ? open : isOpen
  const setOpenState = isControlled ? onOpenChange : setIsOpen

  const selectedOption = options.find((option) => option.value === value)
  const normalizedSearch = searchValue.trim().toLowerCase()
  const filteredOptions = React.useMemo(() => {
    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) => {
      const optionLabel = option.label.toLowerCase()
      const optionValue = option.value.toLowerCase()
      return optionLabel.includes(normalizedSearch) || optionValue.includes(normalizedSearch)
    })
  }, [normalizedSearch, options])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenState?.(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setOpenState])

  const handleSearch = (searchTerm: string) => {
    setSearchValue(searchTerm)
    onSearch?.(searchTerm)
  }

  const handleOptionSelect = (optionValue: string) => {
    onSelect?.(optionValue)
    setOpenState?.(false)
    setSearchValue('')
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <Button
        variant='outline'
        role='combobox'
        aria-expanded={openState}
        className='justify-between w-full'
        disabled={disabled}
        onClick={() => setOpenState?.(!openState)}
        type='button'
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className='opacity-50 ml-2 w-4 h-4 shrink-0' />
      </Button>

      {openState && (
        <div className='top-full right-0 left-0 z-50 absolute bg-popover shadow-md mt-1 border rounded-md text-popover-foreground'>
          {onSearch && (
            <div className='p-2 border-b'>
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className='h-8'
                autoFocus
              />
            </div>
          )}

          <div className='p-1 max-h-60 overflow-y-auto'>
            {loading ? (
              <div className='px-2 py-3 text-muted-foreground text-sm text-center'>
                Loading options...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className='px-2 py-3 text-muted-foreground text-sm text-center'>{emptyText}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'relative flex items-center hover:bg-accent px-2 py-1.5 rounded-sm outline-none text-sm hover:text-accent-foreground cursor-default select-none',
                    option.disabled && 'pointer-events-none opacity-50',
                    value === option.value && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => !option.disabled && handleOptionSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 w-4 h-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
