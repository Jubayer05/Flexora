'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import requests from '@/services/network/http'
import { AlertTriangle, CheckCircle2, Search, Loader2, InfoIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface DuplicateRecord {
  type: 'product' | 'transfer' | 'account'
  id: number
  name?: string
  url?: string
  status?: string
  createdAt: Date
}

export default function DuplicateChecker() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'url' | 'phone' | 'account'>('url')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    isDuplicate: boolean
    existingRecords?: DuplicateRecord[]
    message?: string
  } | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }

    setLoading(true)
    try {
      const endpoint = searchType === 'url' 
        ? '/admin/telegram/check-duplicate-url'
        : searchType === 'phone'
        ? '/admin/telegram/search-accounts'
        : '/admin/telegram/search-all'

      const response = await requests.post<{
        isDuplicate?: boolean
        existingRecords?: DuplicateRecord[]
        message?: string
        groups?: any[]
        accounts?: any[]
        total?: number
      }>(endpoint, {
        query: searchQuery.trim(),
        type: searchType
      })

      setResults({
        isDuplicate: response.isDuplicate || false,
        existingRecords: response.existingRecords || [],
        message: response.message
      })

      if (response.isDuplicate || (response.existingRecords && response.existingRecords.length > 0)) {
        toast.warning('⚠️ Duplicate or similar items found!')
      } else {
        toast.success('✅ No duplicates found')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Search failed. Please try again.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-500/10 text-blue-400'
      case 'transfer':
        return 'bg-purple-500/10 text-purple-400'
      case 'account':
        return 'bg-green-500/10 text-green-400'
      default:
        return 'bg-gray-500/10 text-gray-400'
    }
  }

  const getStatusBadgeColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'transferred':
      case 'used':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'invalid':
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className='space-y-6 w-full max-w-4xl mx-auto'>
      <Card className='bg-background/50 border-white/10 p-6'>
        <h2 className='text-xl font-semibold text-white mb-4'>🔍 Duplicate Detection</h2>
        <p className='text-white/60 text-sm mb-6'>
          Search for duplicate groups/channels, accounts, or Telegram usernames to prevent conflicts
        </p>

        <form onSubmit={handleSearch} className='space-y-4'>
          {/* Search Type Selection */}
          <div className='grid grid-cols-3 gap-3'>
            <button
              type='button'
              onClick={() => setSearchType('url')}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                searchType === 'url'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-background/50 border-white/10 text-white/60 hover:bg-background/70'
              }`}
            >
              Group/Channel URL
            </button>
            <button
              type='button'
              onClick={() => setSearchType('phone')}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                searchType === 'phone'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-background/50 border-white/10 text-white/60 hover:bg-background/70'
              }`}
            >
              Phone Number
            </button>
            <button
              type='button'
              onClick={() => setSearchType('account')}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                searchType === 'account'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  : 'bg-background/50 border-white/10 text-white/60 hover:bg-background/70'
              }`}
            >
              Search All
            </button>
          </div>

          {/* Search Input */}
          <div className='space-y-2'>
            <Label htmlFor='search'>
              {searchType === 'url'
                ? 'Enter Group/Channel URL (t.me/...)'
                : searchType === 'phone'
                ? 'Enter Phone Number (+1...) or Username (@...)'
                : 'Enter Any Search Query'}
            </Label>
            <div className='flex gap-2'>
              <Input
                id='search'
                placeholder={
                  searchType === 'url'
                    ? 'e.g., t.me/groupname or @channelname'
                    : searchType === 'phone'
                    ? 'e.g., +1234567890 or @username'
                    : 'Search groups, channels, accounts...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className='flex-1'
              />
              <Button type='submit' disabled={loading} className='px-6'>
                {loading ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Search className='w-4 h-4 mr-2' />
                )}
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Results */}
      {results && (
        <Card className='bg-background/50 border-white/10 p-6 space-y-4'>
          {/* Result Header */}
          {results.isDuplicate || (results.existingRecords && results.existingRecords.length > 0) ? (
            <div className='bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3'>
              <AlertTriangle className='w-4 h-4 text-red-400 flex-shrink-0 mt-0.5' />
              <div className='text-red-400'>
                {searchType === 'url' ? (
                  <strong>⚠️ This link is already in the system.</strong>
                ) : (
                  <>
                    <strong>⚠️ Duplicate Alert!</strong> This item already exists in the system.
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className='bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-3'>
              <CheckCircle2 className='w-4 h-4 text-green-400 flex-shrink-0 mt-0.5' />
              <div className='text-green-400'>
                <strong>✅ All Clear!</strong> No duplicates found. You can safely add this item.
              </div>
            </div>
          )}

          {/* Results Message */}
          {results.message && (
            <p className='text-white/70 text-sm p-3 bg-background/50 rounded-lg border border-white/10'>
              {results.message}
            </p>
          )}

          {/* Existing Records */}
          {results.existingRecords && results.existingRecords.length > 0 && (
            <div className='space-y-3'>
              <h3 className='font-semibold text-white'>Found {results.existingRecords.length} Existing Record(s):</h3>
              <div className='space-y-2 max-h-96 overflow-y-auto'>
                {results.existingRecords.map((record, idx) => (
                  <div
                    key={`${record.type}-${record.id}-${idx}`}
                    className='p-4 rounded-lg bg-background/50 border border-white/10 hover:border-white/20 transition-colors'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1 space-y-2'>
                        <div className='flex items-center gap-2'>
                          <Badge className={getRecordTypeColor(record.type)}>
                            {record.type.toUpperCase()}
                          </Badge>
                          {record.status && (
                            <Badge className={getStatusBadgeColor(record.status)}>
                              {record.status}
                            </Badge>
                          )}
                        </div>
                        {record.name && (
                          <p className='font-medium text-white'>{record.name}</p>
                        )}
                        {record.url && (
                          <p className='text-sm text-white/60 break-all'>
                            <strong>URL:</strong> {record.url}
                          </p>
                        )}
                        <p className='text-xs text-white/40'>
                          <strong>ID:</strong> {record.id} • <strong>Created:</strong>{' '}
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {(!results.existingRecords || results.existingRecords.length === 0) && !results.isDuplicate && (
            <div className='p-4 text-center'>
              <p className='text-white/60 text-sm'>No existing records found for this search.</p>
            </div>
          )}
        </Card>
      )}

      {/* Info Box */}
      <Card className='bg-blue-500/10 border-blue-500/20 p-4'>
        <div className='flex gap-3'>
          <div className='text-blue-400 flex-shrink-0'>💡</div>
          <div className='text-sm text-blue-300 space-y-1'>
            <p className='font-semibold'>How to use Duplicate Detection:</p>
            <ul className='list-disc list-inside space-y-0.5 text-xs'>
              <li>Search by Group/Channel URL to find similar groups already in system</li>
              <li>Search by Phone Number to verify account ownership</li>
              <li>Use "Search All" for comprehensive cross-database search</li>
              <li>Prevent adding duplicate links that could conflict with existing transfers</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
