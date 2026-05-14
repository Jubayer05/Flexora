'use client';

import { Suspense, memo, useMemo, useCallback } from 'react';

import { CustomTable } from '@/components/admin/common/data-table';
import { withdrawalColumns } from '@/components/admin/withdrawals/withdrawal-columns';
import CustomInput from '@/components/common/CustomInput';
import { CustomSelect } from '@/components/common/CustomSelect';
import PageHeader from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import useAsync from '@/hooks/useAsync';
import { useFilter } from '@/hooks/useFilter';

// Memoized status options to prevent recreations
const withdrawalStatus = [
  {
    title: 'All Status',
    label: 'All Status',
    value: 'ALL',
  },
  {
    title: 'Pending',
    label: 'Pending',
    value: 'PENDING',
  },
  {
    title: 'Done',
    label: 'Done',
    value: 'DONE',
  },
];

interface Withdrawal {
  id: number;
  userId: number;
  amount: number;
  method: string;
  status: 'PENDING' | 'DONE';
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

// Memoize filters to prevent unnecessary re-renders and forced reflows
const WithdrawalFilters = memo(({ filters, setFilter, clearFilters, search, setSearch }: any) => {
  // Use useCallback to stabilize event handlers
  const handleSearchChange = useCallback((e: any) => {
    setSearch(e.target.value);
  }, [setSearch]);

  const handleStatusChange = useCallback((value: string) => {
    setFilter('status', value);
  }, [setFilter]);

  const handleClearClick = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  return (
    <div className="flex sm:flex-row flex-col sm:justify-between sm:items-end gap-4 mb-6">
      {/* Filter By User/Email */}
      <CustomInput
        placeholder="Search by email or user ID"
        value={(filters.search as string) ?? ''}
        onChange={handleSearchChange}
      />

      {/* Filter By Status */}
      <CustomSelect
        placeholder="Filter By Status"
        value={(filters.status as string) ?? 'ALL'}
        onChange={handleStatusChange}
        showSearch={false}
        staticOptions={withdrawalStatus}
        className="bg-background border-border w-full sm:w-40 text-foreground"
      />

      {/* Clear Filters */}
      {(search || (filters.status && filters.status !== 'ALL')) && (
        <Button
          variant="outline"
          onClick={handleClearClick}
          className="bg-background hover:bg-muted border-border text-foreground"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
});
WithdrawalFilters.displayName = 'WithdrawalFilters';

function WithdrawalList() {
  const { search, page, limit, filters, setFilter, clearFilters, setSearch } = useFilter(10);

  // Build query string once, avoid recreating on each render
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (filters.status && filters.status !== 'ALL') params.append('status', String(filters.status));
    return params.toString();
  }, [page, limit, search, filters.status]);

  const { data, loading } = useAsync<{
    data: Withdrawal[];
    pagination: any;
  }>(
    () => `/admin/withdrawals${queryParams ? '?' + queryParams : ''}`
  );

  const columns = useMemo(() => withdrawalColumns(), []);

  // Memoize handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilter(key, value);
  }, [setFilter]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, [setSearch]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <PageHeader
        title="Manage Withdrawals"
        subTitle="View and manage customer withdrawal requests"
        extra={
          <WithdrawalFilters 
            filters={filters} 
            setFilter={handleFilterChange} 
            clearFilters={handleClearFilters} 
            search={search} 
            setSearch={handleSearchChange}
          />
        }
      />

      {/* Table */}
      <CustomTable
        columns={columns}
        data={data?.data ?? []}
        getRowId={(row: Withdrawal) => row.id}
        emptyMessage={loading ? 'Loading withdrawals...' : 'No withdrawals found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />
      {/* Pagination */}
      <Pagination paginationData={data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />
    </div>
  );
}

export default function WithdrawalListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WithdrawalList />
    </Suspense>
  );
}
