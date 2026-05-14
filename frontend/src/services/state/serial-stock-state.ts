import { generateRandomString } from '@/utils/string'
import { create } from 'zustand'

export type SerialStockFormat = 'NEWLINE' | 'CUSTOM_DELIMITER'

export interface SerialItem {
  _id: string // Internal unique identifier for edit/delete operations
  id: string // User-editable social ID field
  username: string
  email: string
  phone: string
  password: string
  note: string
  stockFormat?: SerialStockFormat
  delimiter?: string
  batchId?: string
  isSelected: boolean
}

const buildSearchText = (item: SerialItem) =>
  [
    item.id,
    item.username,
    item.email,
    item.phone,
    item.password,
    item.note,
    item.stockFormat,
    item.delimiter,
    [item.id, item.email, item.username, item.password, item.phone, item.note]
      .map((value) => value?.trim() || '')
      .filter(Boolean)
      .join(':')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

interface SerialStockState {
  // Data
  items: SerialItem[]
  searchQuery: string

  // Computed (will be calculated in selectors)
  filteredItems: SerialItem[]
  selectedItems: SerialItem[]
  totalItems: number
  selectedCount: number

  // Actions
  setSearchQuery: (query: string) => void
  addItem: (item: Omit<SerialItem, '_id' | 'isSelected'>) => void
  removeItem: (id: string) => void
  removeSelectedItems: () => void
  toggleItemSelection: (id: string) => void
  toggleAllSelection: () => void
  clearSelection: () => void
  clearAllItems: () => void
  updateItem: (id: string, updates: Partial<SerialItem>) => void

  // Bulk operations
  setItems: (items: SerialItem[]) => void
  exportSelectedItems: () => SerialItem[]
  exportAllItems: () => SerialItem[]

  // Helper to recalculate computed values
  _recalculate: () => void
}

const useSerialStockStore = create<SerialStockState>((set, get) => ({
  // Initial state
  items: [],
  searchQuery: '',

  // Computed values as functions
  filteredItems: [],
  selectedItems: [],
  totalItems: 0,
  selectedCount: 0,

  // Actions
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
    get()._recalculate()
  },

  addItem: (newItem) => {
    const item: SerialItem = {
      ...newItem,
      _id: generateRandomString(8), // Generate random string ID
      isSelected: false
    }

    set((state) => ({
      items: [item, ...state.items]
    }))
    get()._recalculate()
  },

  removeItem: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item._id !== id)
    }))
    get()._recalculate()
  },

  removeSelectedItems: () => {
    set((state) => ({
      items: state.items.filter((item) => !item.isSelected)
    }))
    get()._recalculate()
  },

  toggleItemSelection: (id: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item._id === id ? { ...item, isSelected: !item.isSelected } : item
      )
    }))
    get()._recalculate()
  },

  toggleAllSelection: () => {
    const state = get()
    const shouldSelectAll = state.selectedCount < state.totalItems

    set((state) => ({
      items: state.items.map((item) => {
        const isInFilteredList = state.filteredItems.some((filtered) => filtered._id === item._id)
        return isInFilteredList ? { ...item, isSelected: shouldSelectAll } : item
      })
    }))
    get()._recalculate()
  },

  clearSelection: () => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, isSelected: false }))
    }))
    get()._recalculate()
  },

  clearAllItems: () => {
    set({ items: [], searchQuery: '' })
    get()._recalculate()
  },

  updateItem: (id: string, updates: Partial<SerialItem>) => {
    set((state) => ({
      items: state.items.map((item) => (item._id === id ? { ...item, ...updates } : item))
    }))
    get()._recalculate()
  },

  setItems: (items: SerialItem[]) => {
    set({ items })
    get()._recalculate()
  },

  exportSelectedItems: () => {
    return get().selectedItems
  },

  exportAllItems: () => {
    return get().filteredItems
  },

  // Helper to recalculate computed values
  _recalculate: () => {
    const state = get()
    const { items, searchQuery } = state

    // Calculate filtered items
    let filteredItems = items
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredItems = items.filter((item) => buildSearchText(item).includes(query))
    }

    // Calculate selected items
    const selectedItems = filteredItems.filter((item) => item.isSelected)

    set({
      filteredItems,
      selectedItems,
      totalItems: filteredItems.length,
      selectedCount: selectedItems.length
    })
  }
}))

// Initialize computed values
useSerialStockStore.getState()._recalculate()

export default useSerialStockStore
