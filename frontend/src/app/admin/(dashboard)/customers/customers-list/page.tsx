'use client'

import { Suspense, memo, useCallback, useEffect, useMemo, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { createCustomerColumns } from '@/components/admin/customers/customer-columns'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { allcountries } from '@/data/country'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Search, X } from 'lucide-react'

const DEBOUNCE_MS = 350

const GUEST_FILTER_OPTIONS = [
  { value: 'all', label: 'All Customers' },
  { value: 'false', label: 'Registered Users' },
  { value: 'true', label: 'Guest Users' }
]

const CustomerFilters = memo(
  ({
    filters,
    setFilter,
    clearFilters,
    search,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    countries = allcountries
  }: {
    filters: any
    setFilter: (key: string, value: string | number | boolean | undefined) => void
    clearFilters: () => void
    search: string
    searchInput: string
    onSearchInputChange: (value: string) => void
    onClearSearch: () => void
    countries?: string[]
  }) => {
    const countryOptions = countries.map((country) => ({
      label: country,
      value: country
    }))
    const selectedGuestType =
      filters.guestType === true || filters.guestType === 'true'
        ? 'true'
        : filters.guestType === false || filters.guestType === 'false'
          ? 'false'
          : 'all'

    return (
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 flex-wrap'>
        <div className='relative w-full sm:max-w-xs order-first'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none' />
          <Input
            type='text'
            placeholder='Search by name, email, username...'
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className='pl-9 pr-9 bg-background border-border text-foreground placeholder:text-muted-foreground h-9'
            aria-label='Search customers'
          />
          {searchInput ? (
            <button
              type='button'
              onClick={onClearSearch}
              className='absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted'
              aria-label='Clear search'
            >
              <X className='h-4 w-4' />
            </button>
          ) : null}
        </div>

        <div className='flex flex-wrap items-end gap-4'>
          <div className='w-full sm:w-52'>
            <Combobox
              options={countryOptions}
              value={(filters.country as string) || ''}
              placeholder='Filter by Country'
              searchPlaceholder='Search country...'
              emptyText='No country found.'
              onSearch={() => {}}
              onSelect={(value) => setFilter('country', value)}
              className='[&_button]:h-9 [&_button]:border-border [&_button]:bg-background'
            />
          </div>

          <div className='space-y-0'>
            <Select
              value={selectedGuestType}
              onValueChange={(value) => setFilter('guestType', value === 'all' ? undefined : value)}
            >
              <SelectTrigger
                id='guest-filter'
                className='bg-background border-border w-full sm:w-44 h-9 text-foreground'
              >
                <SelectValue placeholder='User Type' />
              </SelectTrigger>
              <SelectContent className='bg-background border-border'>
                {GUEST_FILTER_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className='hover:bg-muted focus:bg-muted'
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-0'>
            <Select
              value={filters.spend as string}
              onValueChange={(value) => setFilter('spend', value)}
            >
              <SelectTrigger
                id='spend-filter'
                className='bg-background border-border w-full sm:w-40 h-9 text-foreground'
              >
                <SelectValue placeholder='Filter by Spent' />
              </SelectTrigger>
              <SelectContent className='bg-background border-border'>
                <SelectItem value='desc' className='hover:bg-muted focus:bg-muted'>
                  <ArrowDownNarrowWide className='h-4 w-4 inline mr-2' />
                  High to low
                </SelectItem>
                <SelectItem value='asc' className='hover:bg-muted focus:bg-muted'>
                  <ArrowUpNarrowWide className='h-4 w-4 inline mr-2' />
                  Low to High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(search || filters.spend || filters.country || filters.guestType) && (
            <Button variant='outline' size='sm' onClick={clearFilters} className='h-9'>
              Clear filters
            </Button>
          )}
        </div>
      </div>
    )
  }
)
CustomerFilters.displayName = 'CustomerFilters'

function CustomerList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch, setPage } = useFilter(10)
  const [searchInput, setSearchInput] = useState(search)

  const countriesList = useMemo(() => {
    return Array.from(
      new Set(
        allcountries
          .map((country) => country.trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))
  }, [])

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== search) {
        setSearch(trimmed)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput, search, setSearch])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearch('')
  }, [setSearch])

  const selectedGuestType =
    filters.guestType === true || filters.guestType === 'true'
      ? 'true'
      : filters.guestType === false || filters.guestType === 'false'
        ? 'false'
        : 'all'

  const guestQuery =
    selectedGuestType === 'true'
      ? '&isGuest=true'
      : selectedGuestType === 'false'
        ? '&isGuest=false'
        : ''

  const { data, loading, mutate } = useAsync<{
    data: {
      customers: User[]
      pagination: any
    }
  }>(
    () =>
      '/admin/customers' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${encodeURIComponent(search)}` : '') +
      (filters.spend ? `&sortBy=totalSpent&sortOrder=${filters.spend}` : '') +
      (filters.country ? `&country=${encodeURIComponent(String(filters.country))}` : '') +
      guestQuery,
    false,
    false,
    true,
    5000
  )

  useEffect(() => {
    const totalPages = data?.data?.pagination?.pages || 0
    if (!loading && totalPages > 0 && page > totalPages) {
      setPage(1)
    }
  }, [data?.data?.pagination?.pages, loading, page, setPage])

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader title='All Customers' subTitle='Manage your customer accounts and their details'>
        <CustomerFilters
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          search={search}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onClearSearch={handleClearSearch}
          countries={countriesList}
        />
      </PageHeader>

      <CustomTable
        columns={useMemo(() => createCustomerColumns(mutate), [mutate])}
        data={data?.data?.customers ?? []}
        getRowId={(row: User) => row.id}
        emptyMessage={loading ? 'Loading customers...' : 'No customers found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  )
}

export default function CustomerListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerList />
    </Suspense>
  )
}
