'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomSelect } from '@/components/common/CustomSelect'
import requests from '@/services/network/http'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface GroupChannel {
  id: number
  url: string
  name?: string
  type: 'group' | 'channel'
  members?: number
  isSelected?: boolean
}

interface GroupChannelSelectionProps {
  onSelectionChange: (selected: GroupChannel[]) => void
  onClose?: () => void
  currentProductId?: number
  currentAssignedUrls?: string[]
}

export default function GroupChannelSelection({
  onSelectionChange,
  onClose,
  currentProductId,
  currentAssignedUrls = []
}: GroupChannelSelectionProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [groupsChannels, setGroupsChannels] = useState<GroupChannel[]>([])
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [blockedUrls, setBlockedUrls] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAssignedUrls = async () => {
      try {
        const response = await requests.get<any>('/admin/transfer-products?limit=500')
        const products = response?.data || response?.data?.data || response?.data?.products || []
        const nextBlocked = new Set<string>()

        ;(Array.isArray(products) ? products : []).forEach((product: any) => {
          if (currentProductId && Number(product?.id) === Number(currentProductId)) {
            return
          }

          const assigned = Array.isArray(product?.meta?.assignedGroupsChannels)
            ? product.meta.assignedGroupsChannels
            : []

          assigned.forEach((item: any) => {
            if (typeof item?.url === 'string' && item.url.trim()) {
              nextBlocked.add(item.url.trim().toLowerCase())
            }
          })
        })

        setBlockedUrls(nextBlocked)
      } catch {
        setBlockedUrls(new Set())
      }
    }

    fetchAssignedUrls()
  }, [currentProductId])

  // Fetch groups/channels when account is selected
  useEffect(() => {
    if (!selectedAccountId) return

    const fetchGroupsChannels = async () => {
      setLoading(true)
      try {
        const response = await requests.get<{
          success: boolean
          data: GroupChannel[]
          message: string
        }>(`/admin/telegram-accounts/${selectedAccountId}/groups-channels`)

        if (response.success && response.data) {
          const allowedUrls = new Set(currentAssignedUrls.map((url) => url.trim().toLowerCase()))
          const incomingItems = Array.isArray(response.data) ? response.data : []
          const filteredItems = incomingItems.filter((item) => {
            const normalizedUrl = typeof item?.url === 'string' ? item.url.trim().toLowerCase() : ''
            return normalizedUrl && (!blockedUrls.has(normalizedUrl) || allowedUrls.has(normalizedUrl))
          })

          setGroupsChannels(filteredItems)
          setSelectedItems(
            filteredItems
              .filter((item) => allowedUrls.has((item.url || '').trim().toLowerCase()))
              .map((item) => item.id)
          )
        } else {
          toast.error(response.message || 'Failed to fetch groups/channels')
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to fetch groups/channels')
        setGroupsChannels([])
      } finally {
        setLoading(false)
      }
    }

    fetchGroupsChannels()
  }, [selectedAccountId, blockedUrls, currentAssignedUrls])

  const handleSelectAll = () => {
    if (selectedItems.length === groupsChannels.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(groupsChannels.map((item) => item.id))
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    const selected = groupsChannels.filter((item) => selectedItems.includes(item.id))

    if (selected.length === 0) {
      toast.error('Please select at least one group or channel')
      return
    }

    onSelectionChange(selected)
    toast.success(`${selected.length} item(s) selected`)

    if (onClose) {
      onClose()
    }
  }

  return (
    <div className='space-y-6 w-full max-w-4xl mx-auto p-6 bg-background/50 border border-white/10 rounded-lg'>
      {/* Header */}
      <div className='space-y-2'>
        <h2 className='text-2xl font-bold text-white'>📱 Select Groups & Channels</h2>
        <p className='text-white/60'>
          Choose the transfer account and select which groups/channels to include as stock
        </p>
      </div>

      {/* Account Selection */}
      <Card className='bg-background/50 border-white/10 p-4 space-y-3'>
        <Label className='text-white font-semibold'>Step 1: Select Transfer Account</Label>
        <CustomSelect
          placeholder='Select an account that owns groups/channels'
          url='/admin/telegram-accounts?isTransferOnly=true'
          showSearch={true}
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          options={(data: any) =>
            data?.data?.accounts
              ?.filter((account: any) => account.isTransferOnly)
              ?.map((account: any) => ({
                title: `${account.username || account.phone || 'Unknown'} (${account._count?.groupsChannels || 0} items)`,
                label: `${account.username || account.phone} - ${account._count?.groupsChannels || 0} groups/channels`,
                value: account.id.toString()
              })) || []
          }
          className='bg-background border-white/20 w-full text-white'
        />
        <p className='text-xs text-white/50'>
          Only accounts marked as "Transfer Only" are shown here
        </p>
      </Card>

      {/* Groups/Channels Selection */}
      {selectedAccountId && (
        <Card className='bg-background/50 border-white/10 p-4 space-y-4'>
          <div className='flex items-center justify-between'>
            <Label className='text-white font-semibold'>
              Step 2: Select Groups & Channels ({selectedItems.length}/{groupsChannels.length})
            </Label>
            {groupsChannels.length > 0 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleSelectAll}
                className='text-xs'
              >
                {selectedItems.length === groupsChannels.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='w-5 h-5 animate-spin text-blue-400 mr-2' />
              <span className='text-white/60'>Loading groups and channels...</span>
            </div>
          ) : groupsChannels.length === 0 ? (
            <div className='p-6 text-center bg-yellow-500/10 border border-yellow-500/20 rounded-lg'>
              <AlertCircle className='w-8 h-8 text-yellow-400 mx-auto mb-2' />
              <p className='text-yellow-400'>
                No groups or channels found for the selected account
              </p>
              <p className='text-yellow-300 text-sm mt-1'>
                Make sure the account has access to transfer groups/channels
              </p>
            </div>
          ) : (
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              {groupsChannels.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedItems.includes(item.id)
                      ? 'bg-blue-500/20 border-blue-500/40'
                      : 'bg-background/50 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => toggleSelection(item.id)}
                >
                  <div className='flex items-start gap-3'>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                      className='mt-1'
                    />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-xs font-semibold px-2 py-1 rounded bg-white/10 text-white/70'>
                          {item.type.toUpperCase()}
                        </span>
                        <span className='text-xs text-white/50'>ID: {item.id}</span>
                      </div>
                      <p className='font-medium text-white break-all'>{item.name || 'Unnamed'}</p>
                      <p className='text-sm text-white/60 break-all'>{item.url}</p>
                      {item.members && (
                        <p className='text-xs text-white/40 mt-1'>
                          👥 {item.members.toLocaleString()} members
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Summary */}
      {selectedItems.length > 0 && groupsChannels.length > 0 && (
        <Card className='bg-green-500/10 border-green-500/20 p-4 flex items-start gap-3'>
          <CheckCircle2 className='w-5 h-5 text-green-400 flex-shrink-0 mt-0.5' />
          <div className='flex-1 space-y-1'>
            <p className='font-semibold text-green-400'>
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </p>
            <p className='text-sm text-green-300'>
              These will be added as stock. Each selected item = 1 stock unit.
            </p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className='flex gap-3 justify-end'>
        {onClose && (
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          type='button'
          onClick={handleConfirm}
          disabled={selectedItems.length === 0 || !selectedAccountId}
          className='px-6'
        >
          {selectedItems.length > 0
            ? `Confirm Selection (${selectedItems.length})`
            : 'Select Items to Continue'}
        </Button>
      </div>

      {/* Info */}
      <Card className='bg-blue-500/10 border-blue-500/20 p-4'>
        <div className='flex gap-3'>
          <div className='text-blue-400 flex-shrink-0'>ℹ️</div>
          <div className='text-sm text-blue-300 space-y-1'>
            <p className='font-semibold'>How it works:</p>
            <ul className='list-disc list-inside space-y-0.5 text-xs'>
              <li>Each group/channel becomes 1 unit of stock</li>
              <li>When customers purchase, they receive transfer access to selected items</li>
              <li>Multiple purchases = multiple items transferred sequentially</li>
              <li>Account must be marked as "Transfer Only" to appear here</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
