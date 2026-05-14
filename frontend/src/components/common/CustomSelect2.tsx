'use client'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Types
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  data?: any
}

export type SelectValue = string | number | (string | number)[]

export interface CustomSelectProps {
  // Basic props
  value?: SelectValue
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string

  // Form integration
  label?: string
  error?: string
  required?: boolean
  name?: string

  // Options
  options?: SelectOption[] | ((data: any) => SelectOption[]) // Support both static options and transform function

  // Multiple selection
  multiple?: boolean
  maxTagCount?: number

  // Search functionality
  searchable?: boolean
  searchPlaceholder?: string

  // Remote data
  url?: string
  transform?: (data: any) => SelectOption[]

  // Behavior
  clearable?: boolean

  // Event handlers
  onChange?: (value: SelectValue, option: SelectOption | SelectOption[]) => void
  onSearch?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
}

// Utility functions
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

function buildApiUrl(baseUrl: string, searchValue?: string, timestamp?: number): string {
  const url = new URL(baseUrl, window.location.origin)

  if (searchValue) {
    url.searchParams.set('search', searchValue)
  }

  if (timestamp) {
    url.searchParams.set('_t', String(timestamp))
  }

  return url.toString()
}

function transformApiData(data: any, transform?: (data: any) => SelectOption[]): SelectOption[] {
  if (transform) {
    return transform(data)
  }

  // Default transformation
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      label: item.name || item.label || String(item.value),
      value: item.id || item.value,
      disabled: item.disabled || false,
      data: item
    }))
  }

  if (data?.data && Array.isArray(data.data)) {
    return transformApiData(data.data, transform)
  }

  return []
}

// Main component
export function CustomSelect2({
  value,
  placeholder,
  disabled = false,
  loading = false,
  className,
  label,
  error,
  required = false,
  name,
  options: optionsProp = [],
  multiple = false,
  maxTagCount,
  searchable = false,
  searchPlaceholder = 'Search...',
  url,
  transform,
  clearable = false,
  onChange,
  onSearch,
  onFocus,
  onBlur
}: CustomSelectProps) {
  // Memoize static options and transform function to prevent unnecessary re-renders
  const staticOptions = useMemo(() => {
    return Array.isArray(optionsProp) ? optionsProp : []
  }, [optionsProp])

  const transformFunction = useMemo(() => {
    return typeof optionsProp === 'function' ? optionsProp : transform
  }, [optionsProp, transform])
  // State management
  const [options, setOptions] = useState<SelectOption[]>(staticOptions)
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Remote data fetching
  const { data, loading: remoteLoading } = useAsync(() => {
    if (!url || fetchTrigger === 0) return null

    return buildApiUrl(url, searchValue, fetchTrigger)
  })

  // Debounced search
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      const debouncedFn = debounce((term: string) => {
        setSearchValue(term)
        if (url) {
          setFetchTrigger((prev) => prev + 1)
        }
        onSearch?.(term)
      }, 300)
      debouncedFn(searchTerm)
    },
    [url, onSearch]
  )

  // Process remote data
  useEffect(() => {
    if (data && url) {
      const transformedOptions = transformApiData(data, transformFunction)
      setOptions(transformedOptions)
    }
  }, [data, url, transformFunction])

  // Set static options
  useEffect(() => {
    if (!url && staticOptions.length > 0) {
      setOptions(staticOptions)
    }
  }, [staticOptions, url])

  // Filter options for local search
  const filteredOptions = url
    ? options
    : searchable && searchValue
    ? options?.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
    : options

  // Get selected options
  const selectedOptions =
    multiple && Array.isArray(value)
      ? options?.filter((opt) => value.includes(opt.value))
      : value
      ? options?.filter((opt) => opt.value === value)
      : []

  // Handle selection
  const handleSelect = (optionValue: string) => {
    const option = options?.find((opt) => String(opt.value) === optionValue)
    if (!option || !onChange) return

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter((v) => v !== option.value)
        : [...currentValues, option.value]

      const newSelectedOptions = options?.filter((opt) => newValues.includes(opt.value))
      onChange(newValues, newSelectedOptions)
    } else {
      onChange(option.value, option)
      setIsOpen(false)
    }
  }

  // Handle remove (for multiple)
  const handleRemove = (valueToRemove: string | number) => {
    if (!multiple || !Array.isArray(value) || !onChange) return

    const newValues = value.filter((v) => v !== valueToRemove)
    const newSelectedOptions = options?.filter((opt) => newValues.includes(opt.value))
    onChange(newValues, newSelectedOptions)
  }

  // Handle clear
  const handleClear = () => {
    if (!onChange) return
    const newValue = multiple ? [] : ''
    onChange(newValue, multiple ? [] : (null as any))
  }

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)

    if (open) {
      // Trigger initial fetch for remote data
      if (url && fetchTrigger === 0) {
        setFetchTrigger(1)
      }

      // Focus search input if searchable
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }

      onFocus?.()
    } else {
      onBlur?.()
    }
  }

  // Get display value
  const getDisplayValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return placeholder
    }

    if (multiple && Array.isArray(value)) {
      return `${value.length} selected`
    }

    const option = options?.find((opt) => opt.value === value)
    return option?.label || String(value)
  }

  const hasValue = value && (Array.isArray(value) ? value.length > 0 : true)
  const isLoading = loading || remoteLoading

  return (
    <div className='space-y-2 w-full'>
      {/* Label */}
      {label && (
        <Label
          className={cn(
            'block font-medium text-sm leading-none',
            required && "after:content-['*'] after:ml-1 after:text-destructive"
          )}
        >
          {label}
        </Label>
      )}

      {/* Select */}
      <Select
        open={isOpen}
        onOpenChange={handleOpenChange}
        value={Array.isArray(value) ? undefined : String(value || '')}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger className={cn('w-full', className)}>
          <div className='flex justify-between items-center w-full'>
            <SelectValue placeholder={placeholder}>
              {!hasValue ? (
                <span className='text-muted-foreground'>{placeholder}</span>
              ) : (
                <span>{getDisplayValue()}</span>
              )}
            </SelectValue>

            {clearable && hasValue && !disabled && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className='hover:bg-muted opacity-60 hover:opacity-100 ml-2 p-1 rounded'
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>
        </SelectTrigger>

        <SelectContent className='p-0'>
          {/* Search Input */}
          {searchable && (
            <div className='p-2 border-b'>
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchValue(value)
                  debouncedSearch(value)
                }}
                className='h-8'
                autoFocus
              />
            </div>
          )}

          {/* Options */}
          <div className='max-h-64 overflow-auto'>
            {isLoading ? (
              <div className='space-y-2 p-4'>
                <Skeleton className='w-full h-8' />
                <Skeleton className='w-3/4 h-8' />
                <Skeleton className='w-1/2 h-8' />
              </div>
            ) : filteredOptions?.length === 0 ? (
              <div className='p-4 text-muted-foreground text-sm text-center'>No options found</div>
            ) : (
              filteredOptions?.map((option, index) => {
                const isSelected =
                  multiple && Array.isArray(value)
                    ? value.includes(option.value)
                    : value === option.value

                return (
                  <div key={`${option.value}-${index}`}>
                    {multiple ? (
                      <div
                        className={cn(
                          'flex items-center space-x-2 hover:bg-accent px-3 py-2 text-sm cursor-pointer',
                          option.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                        )}
                        onClick={() => !option.disabled && handleSelect(String(option.value))}
                      >
                        <input
                          type='checkbox'
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={option.disabled}
                          className='rounded'
                        />
                        <span>{option.label}</span>
                      </div>
                    ) : (
                      <SelectItem value={String(option.value)} disabled={option.disabled}>
                        {option.label}
                      </SelectItem>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </SelectContent>
      </Select>

      {/* Selected Tags (Multiple Mode) */}
      {multiple && Array.isArray(value) && value.length > 0 && (
        <div className='flex flex-wrap gap-1 p-2 border border-dashed rounded-md'>
          {selectedOptions.slice(0, maxTagCount || selectedOptions.length).map((option) => (
            <Badge key={option.value} variant='default' className='text-xs'>
              {option.label}
              <button
                type='button'
                onClick={() => handleRemove(option.value)}
                className='hover:bg-muted ml-1 p-0.5 rounded-full'
                disabled={disabled}
              >
                <X className='w-3 h-3' />
              </button>
            </Badge>
          ))}

          {maxTagCount && selectedOptions.length > maxTagCount && (
            <Badge variant='secondary' className='text-xs'>
              +{selectedOptions.length - maxTagCount} more
            </Badge>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <p className='text-destructive text-sm'>{error}</p>}

      {/* Hidden Input for Form Integration */}
      {name && (
        <input
          type='hidden'
          name={name}
          value={Array.isArray(value) ? value.join(',') : value || ''}
        />
      )}
    </div>
  )
}

export default CustomSelect2
