'use client'

import { Badge } from '@/components/ui/badge'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
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
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

type Option = {
  title?: string
  value: string
  label?: string
  disabled?: boolean
  children?: Option[]
}

type CustomSelectProps = {
  name?: string
  label?: string // Add label prop
  placeholder?: string
  url?: string // Optional API endpoint
  multiple?: boolean
  tree?: boolean
  value?: string | string[]
  onChange?: (val: any) => void
  options?: (data: any) => Option[] | Option[] // Optional data mapping function or static options
  defaultLabel?: string
  defaultValue?: Option[]
  returnFullData?: boolean
  searchMode?: 'server' | 'client'
  className?: string
  style?: CSSProperties
  disabled?: boolean
  showSearch?: boolean // New prop to control search functionality
  staticOptions?: Option[] // For non-API based options
}

export function CustomSelect({
  label,
  placeholder,
  url,
  multiple = false,
  tree = false,
  value,
  onChange,
  options: mapOptions,
  defaultLabel,
  returnFullData,
  defaultValue,
  searchMode = 'server',
  className,
  style,
  disabled,
  showSearch = false,
  staticOptions
}: CustomSelectProps) {
  const [options, setOptions] = useState<Option[]>(staticOptions || [])
  const [searchValue, setSearchValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [shouldFetch, setShouldFetch] = useState(false) // Control when to fetch

  // Use useAsync to fetch data based on URL and search query
  // Only fetch when user interaction triggers it (shouldFetch = true)
  const { data, loading } = useAsync(() => {
    if (!url) return null
    if (searchMode !== 'server') return null
    if (!shouldFetch) return null // Don't fetch unless explicitly triggered

    // Build endpoint with search query if available
    const endpoint = searchQuery
      ? `${url}${url.includes('?') ? '&' : '?'}search=${searchQuery.trim()}`
      : url
    return endpoint
  })

  // Debounced search function
  const debouncedSearch = useCallback(
    (search: string) => {
      const debouncedFn = debounce(() => {
        setSearchQuery(search)
        setShouldFetch(true) // Trigger fetch on search
      }, 300)
      debouncedFn()
    },
    [setShouldFetch]
  )

  // Function to trigger initial data fetch when select is opened
  const triggerInitialFetch = useCallback(() => {
    if (url && searchMode === 'server' && !staticOptions) {
      setShouldFetch(true)
    }
  }, [url, searchMode, staticOptions])

  // Process API data when it changes
  useEffect(() => {
    if (data && searchMode === 'server' && url) {
      const rawOptions = mapOptions
        ? Array.isArray(mapOptions)
          ? mapOptions
          : mapOptions(data)
        : Array.isArray(data?.data)
          ? data.data.map((item: any) =>
              returnFullData
                ? {
                    ...item,
                    label: item.name,
                    title: item.name,
                    value: item.id
                  }
                : {
                    label: item.name,
                    title: item.name,
                    value: item.id
                  }
            )
          : []
      setOptions(Array.isArray(rawOptions) ? rawOptions : [])
      setShouldFetch(false) // Reset fetch trigger after successful data load
    }
  }, [data, mapOptions, returnFullData, searchMode, url])

  // Handle static options
  useEffect(() => {
    if (staticOptions) {
      setOptions(staticOptions)
    }
  }, [staticOptions])

  // Handle options function with static data
  useEffect(() => {
    if (Array.isArray(mapOptions)) {
      setOptions(mapOptions)
    }
  }, [mapOptions])

  // --- Default label/value handling ---
  useEffect(() => {
    if (defaultLabel && value && !options.some((opt) => opt.value === value)) {
      setOptions((prev) => [
        { label: defaultLabel, title: defaultLabel, value: value as string },
        ...prev
      ])
    }
  }, [defaultLabel, value, options])

  useEffect(() => {
    if (defaultValue?.length) {
      setOptions(defaultValue)
    }
  }, [defaultValue])

  // Filter options for client-side search
  const filteredOptions =
    searchMode === 'client' && searchValue
      ? options.filter(
          (opt) =>
            opt.title?.toLowerCase().includes(searchValue.toLowerCase()) ||
            opt.label?.toLowerCase().includes(searchValue.toLowerCase())
        )
      : options

  const handleValueChange = (selectedValue: string) => {
    if (!onChange) return

    const selectedOption = options.find((opt) => opt.value === selectedValue)

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      // Ensure string comparison by converting both to strings
      const stringCurrentValues = currentValues.map((v) => String(v))
      const stringSelectedValue = String(selectedValue)

      const newValues = stringCurrentValues.includes(stringSelectedValue)
        ? currentValues.filter((v) => String(v) !== stringSelectedValue)
        : [...currentValues, selectedValue]

      const selectedOptions = options.filter((opt) => newValues.includes(opt.value))
      onChange(returnFullData ? selectedOptions : newValues)
    } else {
      onChange(returnFullData ? selectedOption : selectedValue)
    }

    if (!multiple) {
      setIsOpen(false)
    }
  }

  // For tree select, we'll create a simple hierarchical display
  if (tree) {
    return (
      <TreeSelectComponent
        options={filteredOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        loading={loading}
        onSearch={searchMode === 'server' ? debouncedSearch : setSearchValue}
        multiple={multiple}
        disabled={disabled}
        className={className}
        label={label}
        style={style}
      />
    )
  }

  // Regular select with multiple support
  if (multiple) {
    return (
      <MultiSelectComponent
        options={filteredOptions}
        value={Array.isArray(value) ? value : []}
        onChange={handleValueChange}
        placeholder={placeholder}
        loading={loading}
        onSearch={searchMode === 'server' ? debouncedSearch : setSearchValue}
        disabled={disabled}
        className={className}
        label={label}
        showSearch={showSearch}
        triggerInitialFetch={triggerInitialFetch}
        style={style}
      />
    )
  }

  // Single select with conditional rendering based on showSearch
  if (showSearch) {
    const comboboxOptions: ComboboxOption[] = filteredOptions.map((option) => ({
      value: option.value,
      label: option.label ?? option.title ?? '',
      disabled: option.disabled || false
    }))

    return (
      <div className={cn('space-y-2', label && 'space-y-2')}>
        {label && (
          <label className='block font-medium text-sm text-foreground leading-none peer-disabled:opacity-70 peer-disabled:cursor-not-allowed'>
            {label}
          </label>
        )}
        <Combobox
          options={comboboxOptions}
          value={Array.isArray(value) ? value[0] : value}
          placeholder={placeholder}
          onSelect={handleValueChange}
          onSearch={searchMode === 'server' ? debouncedSearch : setSearchValue}
          disabled={disabled}
          className={className}
          loading={loading}
          emptyText='No options found'
          searchPlaceholder='Search...'
          open={isOpen}
          onOpenChange={(open: boolean) => {
            setIsOpen(open)
            // Trigger initial fetch when opening if no options and using server mode with URL
            if (open) {
              triggerInitialFetch()
            }
          }}
        />
      </div>
    )
  }

  // Simple Select without search
  const displayValue = Array.isArray(value) ? value[0] : value
  const selectedOption = options.find((opt) => opt.value === displayValue)

  return (
    <div className={cn('space-y-2', label && 'space-y-2')}>
      {label && (
        <label className='block font-medium text-sm text-foreground leading-none peer-disabled:opacity-70 peer-disabled:cursor-not-allowed'>
          {label}
        </label>
      )}
      <Select
        value={displayValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        open={isOpen}
        onOpenChange={(open: boolean) => {
          setIsOpen(open)
          // Trigger initial fetch when opening if no options and using server mode with URL
          if (open) {
            triggerInitialFetch()
          }
        }}
      >
        <SelectTrigger className={cn('w-full', className)} type='button' style={style}>
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.label || selectedOption.title : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className='p-4'>
              <Skeleton className='w-full h-4' />
            </div>
          ) : options.length === 0 ? (
            <div className='p-4 text-muted-foreground text-sm text-center'>No options found</div>
          ) : (
            options.map((option, idx) => (
              <SelectItem key={idx} value={option.value} disabled={option.disabled}>
                {option.label || option.title}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

// Multi-select component with badges
function MultiSelectComponent({
  options,
  value,
  onChange,
  placeholder,
  loading,
  onSearch,
  disabled,
  className,
  label,
  showSearch,
  triggerInitialFetch,
  style
}: {
  options: Option[]
  value: string[]
  onChange: (val: string) => void
  placeholder?: string
  loading: boolean
  onSearch?: (search: string) => void
  disabled?: boolean
  className?: string
  label?: string
  showSearch?: boolean
  triggerInitialFetch?: () => void
  style?: CSSProperties
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const selectedOptions = options.filter((opt) => value.includes(opt.value))

  const handleRemove = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Call onChange which will trigger the parent's handleValueChange
    // The parent handleValueChange has toggle logic that will remove the item
    onChange(valueToRemove)
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // Trigger initial fetch when opening if no options and using server mode with URL
    if (open && triggerInitialFetch) {
      triggerInitialFetch()
    }
  }

  return (
    <div>
      {label && (
        <label className='block mb-2 font-medium text-sm text-foreground leading-none peer-disabled:opacity-70 peer-disabled:cursor-not-allowed'>
          {label}
        </label>
      )}
      <div className={cn('relative', className)}>
        <Select open={isOpen} onOpenChange={handleOpenChange} disabled={disabled}>
          <SelectTrigger
            className='w-full'
            type='button'
            style={style}
            onClick={() => !disabled && setIsOpen(true)}
          >
            <div className='flex justify-between items-center w-full'>
              <span className='text-muted-foreground text-sm'>
                {selectedOptions.length > 0 ? `${selectedOptions.length} selected` : placeholder}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {showSearch && onSearch && (
              <div className='p-2'>
                <Input
                  placeholder='Search...'
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value)
                    onSearch(e.target.value)
                  }}
                  // className='h-8'
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {loading ? (
              <div className='p-4'>
                <Skeleton className='w-full h-4' />
              </div>
            ) : options.length === 0 ? (
              <div className='p-4 text-muted-foreground text-sm text-center'>No options found</div>
            ) : (
              <div className='max-h-48 overflow-auto'>
                {options.map((option, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center space-x-2 hover:bg-accent px-2 py-2 text-sm cursor-pointer',
                      option.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!option.disabled) {
                        handleSelect(option.value)
                      }
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={value.includes(option.value)}
                      onChange={() => {}}
                      disabled={option.disabled}
                      className='rounded'
                    />
                    <span className='text-foreground'>{option.label || option.title}</span>
                  </div>
                ))}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selected options badges - displayed outside Select */}
      {selectedOptions.length > 0 && (
        <div className='flex flex-wrap gap-1 bg-muted/30 mt-3 p-2 border border-dashed border-border rounded-md'>
          {selectedOptions.map((option, idx) => (
            <Badge key={idx} variant='default' className='text-xs'>
              {option.label || option.title}
              <button
                type='button'
                onClick={(e) => handleRemove(option.value, e)}
                className='hover:bg-muted ml-1 p-0.5 rounded-full'
                disabled={disabled}
              >
                <X className='w-3 h-3' />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Tree select component
function TreeSelectComponent({
  options,
  value,
  onChange,
  placeholder,
  loading,
  onSearch,
  multiple,
  disabled,
  className,
  label,
  style
}: {
  options: Option[]
  value: string | string[] | undefined
  onChange?: (val: any) => void
  placeholder?: string
  loading: boolean
  onSearch?: (search: string) => void
  multiple?: boolean
  disabled?: boolean
  className?: string
  label?: string
  style?: CSSProperties
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const renderTreeNode = (option: Option, level = 0) => {
    const hasChildren = option.children && option.children.length > 0
    const isExpanded = expandedNodes.has(option.value)
    const isSelected = multiple
      ? Array.isArray(value) && value.includes(option.value)
      : value === option.value

    return (
      <div key={option.value}>
        <div
          className={cn(
            'flex items-center gap-2 hover:bg-accent px-2 py-1 cursor-pointer',
            isSelected && 'bg-accent',
            option.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (option.disabled) return
            if (hasChildren) {
              const newExpanded = new Set(expandedNodes)
              if (isExpanded) {
                newExpanded.delete(option.value)
              } else {
                newExpanded.add(option.value)
              }
              setExpandedNodes(newExpanded)
            }
            onChange?.(option.value)
          }}
        >
          {hasChildren && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                const newExpanded = new Set(expandedNodes)
                if (isExpanded) {
                  newExpanded.delete(option.value)
                } else {
                  newExpanded.add(option.value)
                }
                setExpandedNodes(newExpanded)
              }}
            >
              {isExpanded ? (
                <ChevronDown className='w-4 h-4' />
              ) : (
                <ChevronRight className='w-4 h-4' />
              )}
            </button>
          )}
          {multiple && (
            <input
              type='checkbox'
              checked={isSelected}
              onChange={() => {}}
              disabled={option.disabled}
              className='rounded'
            />
          )}
          <span className='text-sm text-foreground'>{option.label || option.title}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>{option.children!.map((child) => renderTreeNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div>
      {label && (
        <label className='block mb-2 font-medium text-sm text-foreground leading-none peer-disabled:opacity-70 peer-disabled:cursor-not-allowed'>
          {label}
        </label>
      )}
      <Select open={isOpen} onOpenChange={setIsOpen} disabled={disabled}>
        <SelectTrigger className={cn('w-full', className)} type='button' style={style}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className='p-0'>
          {onSearch && (
            <div className='p-2 border-b'>
              <Input
                placeholder='Search...'
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  onSearch(e.target.value)
                }}
                className='h-8'
              />
            </div>
          )}
          <div className='max-h-64 overflow-auto'>
            {loading ? (
              <div className='p-4'>
                <Skeleton className='w-full h-4' />
              </div>
            ) : options.length === 0 ? (
              <div className='p-4 text-muted-foreground text-sm text-center'>No options found</div>
            ) : (
              options.map((option, idx) => renderTreeNode(option, idx))
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  )
}
