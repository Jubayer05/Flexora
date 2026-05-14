'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import Cookies from 'js-cookie'
import { toast } from 'sonner'
import requests from '@/services/network/http'

export type CartItem = {
  productId: number
  quantity: number
  unitPrice: number
  name?: string
  thumbnail?: string | null
  platform?: string | null
  type?: string | null
  sku?: string | null
  stockCount?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  // For Telegram transfer products (TELEGRAM + SERVICE)
  customerTelegram?: string
  // For generic SERVICE products (non-Telegram)
  clientInput?: string
  // Store product meta for client input label
  clientInputLabel?: string
}

type CartState = {
  items: CartItem[]
  hydrated: boolean
  updating: number[] // quantity update in progress
  removing: number[] // remove in progress

  // Derived helpers
  getCount: () => number
  getSubtotal: () => number

  // Persistence / sync
  hydrate: () => void
  init: () => Promise<void>

  // Mutations
  addItem: (product: Product, quantity: number) => Promise<void>
  setQuantity: (productId: number, quantity: number) => Promise<void>
  removeItem: (productId: number) => Promise<void>
  clear: () => Promise<void>
  setCustomerTelegram: (productId: number, customerTelegram: string) => void
  setClientInput: (productId: number, clientInput: string) => void
  isUpdating: (productId: number) => boolean
  isRemoving: (productId: number) => boolean
}

// localStorage-based storage for better performance and faster interaction
const localStorageStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    try {
      // Use localStorage as primary storage
      return window.localStorage.getItem(name)
    } catch {
      // Fallback to cookie if localStorage fails
      try {
        return Cookies.get(name) || null
      } catch {
        return null
      }
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return
    try {
      // Store in localStorage as primary
        window.localStorage.setItem(name, value)
      // Also sync to cookie as backup (for SSR compatibility)
      try {
      Cookies.set(name, value, { expires: 7, sameSite: 'lax' })
      } catch {
        // Cookie backup failed, but localStorage succeeded
      }
    } catch (error) {
      // If localStorage fails (quota exceeded, etc.), fallback to cookie
      try {
        // Only store in cookie if value is small enough
        if (value.length <= 3500) {
          Cookies.set(name, value, { expires: 7, sameSite: 'lax' })
        }
      } catch {
        // Both failed, ignore
        console.warn('Failed to store cart data in both localStorage and cookie')
      }
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return
    try {
      // Remove from localStorage
      window.localStorage.removeItem(name)
    } catch {
      // Ignore localStorage removal errors
    }
    try {
      // Also remove from cookie
      Cookies.remove(name)
    } catch {
      // Ignore cookie removal errors
    }
  }
}

const isLoggedIn = () => !!Cookies.get('token')

const getEffectiveMaxQuantity = (item: {
  stockCount?: number | null
  maxQuantity?: number | null
  type?: string | null
}) => {
  if (['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(String(item.type))) {
    return 1000
  }

  const stockCount = Math.max(0, Number(item.stockCount ?? 0))
  const rawMaxQuantity = Number(item.maxQuantity ?? 0)

  if (rawMaxQuantity === 0) return stockCount

  const maxQuantity = Number.isFinite(rawMaxQuantity) && rawMaxQuantity > 0 ? rawMaxQuantity : 1000
  return Math.min(maxQuantity, stockCount)
}

// Debounce: sync quantity to server after user stops clicking (no UI blocking)
const SYNC_DEBOUNCE_MS = 350
const quantitySyncTimers = new Map<number, ReturnType<typeof setTimeout>>()

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      updating: [],
      removing: [],

      getCount: () => get().items.reduce((sum, i) => sum + (i.quantity || 0), 0),
      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + (Number(i.unitPrice) || 0) * (i.quantity || 0), 0),

      hydrate: () => set({ hydrated: true }),

      isUpdating: (productId: number) => get().updating.includes(productId),
      isRemoving: (productId: number) => get().removing.includes(productId),

      init: async () => {
        // If logged in, treat server cart as source of truth
        if (!isLoggedIn()) return

        try {
          // Fetch server cart first so we don't double quantities when merging
          const cart = await requests.get<{
            success: boolean
            data: {
              id: number
              items: Array<{
                productId: number
                quantity: number
                unitPrice?: any
                product?: {
                  id: number
                  name: string
                  thumbnail?: string | null
                  price: any
                  platform?: string | null
                  type?: string | null
                  sku?: string | null
                  stockCount?: number | null
                  minQuantity?: number | null
                  maxQuantity?: number | null
                }
              }>
            }
          }>('/customer/cart')

          const serverItems = cart?.data?.items ?? []
          const serverItemIds = new Set(serverItems.map((it: { productId: number }) => it.productId))

          // Only add local items that are NOT already on the server (avoid incrementing and doubling on reload)
          const localItems = get().items
          let itemsToSet = serverItems
          if (localItems.length > 0) {
            const toAdd = localItems.filter((it) => !serverItemIds.has(it.productId))
            if (toAdd.length > 0) {
              await Promise.all(
                toAdd.map((it) =>
                  requests.post('/customer/cart/items', { productId: it.productId, quantity: it.quantity })
                )
              )
              // Re-fetch to get merged cart with new items
              const updated = await requests.get<{
                success: boolean
                data: {
                  items: Array<{
                    productId: number
                    quantity: number
                    unitPrice: any
                    product?: {
                      id: number
                      name: string
                      thumbnail?: string | null
                      price: any
                      platform?: string | null
                      type?: string | null
                      sku?: string | null
                      stockCount?: number | null
                      minQuantity?: number | null
                      maxQuantity?: number | null
                    }
                  }>
                }
              }>('/customer/cart')
              itemsToSet = updated?.data?.items ?? []
            }
          }

          if (cart?.success) {
            const items: CartItem[] = itemsToSet.map((it: any) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice ?? it.product?.price ?? 0),
              name: it.product?.name,
              thumbnail: it.product?.thumbnail ?? null,
              platform: it.product?.platform ?? null,
              type: it.product?.type ?? null,
              sku: it.product?.sku ?? null,
              stockCount: it.product?.stockCount ?? 0,
              minQuantity: it.product?.minQuantity ?? 1,
              maxQuantity: it.product?.maxQuantity ?? 1000
            }))
            set({ items })
          }
        } catch {
          // If server cart fails, keep local cart as fallback
        }
      },

      addItem: async (product: Product, quantity: number) => {
        const q = Math.max(1, quantity || 1)
        const productId = product.id
        const stockCount = Math.max(0, Number(product.stockCount ?? 0))
        const minQuantity = Math.max(1, Number(product.minQuantity ?? 1))
        const maxQuantity = product.maxQuantity === 0 ? Infinity : Number(product.maxQuantity ?? 1000)
        const effectiveMax = maxQuantity === Infinity ? stockCount : Math.min(maxQuantity, stockCount)

        if (effectiveMax <= 0) {
          toast.error('Product is out of stock')
          return
        }

        // Optimistic update for guest users
        if (!isLoggedIn()) {
          const existing = get().items.find((i) => i.productId === productId)
          const requestedQuantity = (existing?.quantity || 0) + q

          if (!existing && q < minQuantity) {
            toast.error(`Minimum quantity is ${minQuantity}`)
            return
          }

          if (requestedQuantity > effectiveMax) {
            toast.error(`Only ${effectiveMax} item(s) available`)
            return
          }

          if (existing) {
            set({
              items: get().items.map((i) =>
                i.productId === productId
                  ? {
                      ...i,
                      quantity: requestedQuantity,
                      stockCount,
                      minQuantity,
                      maxQuantity: product.maxQuantity
                    }
                  : i
              )
            })
            return
          }

          const price = typeof product.price === 'string' ? parseFloat(product.price) : (product.price as any) || 0
          const meta = (product as any).meta || {}
          set({
            items: [
              ...get().items,
              {
                productId: productId,
                quantity: q,
                unitPrice: Number(price),
                name: product.name,
                thumbnail: (product as any).thumbnail ?? null,
                platform: (product as any).platform ?? null,
                type: (product as any).type ?? null,
                sku: (product as any).sku ?? null,
                stockCount,
                minQuantity,
                maxQuantity: product.maxQuantity,
                clientInputLabel: meta.clientInputLabel || null
              }
            ]
          })
          return
        }

        // For logged-in users, update server and sync
        try {
          await requests.post('/customer/cart/items', { productId: productId, quantity: q })
          await get().init()
        } catch (error) {
          console.error('Failed to add item to cart:', error)
          throw error
        }
      },

      setQuantity: async (productId: number, quantity: number) => {
        const q = Math.max(0, quantity || 0)
        const freshState = get()
        const currentItems = freshState.items
        const currentItem = currentItems.find((i) => i.productId === productId)

        if (!currentItem && q <= 0) return

        if (currentItem) {
          const minQuantity = Math.max(1, Number(currentItem.minQuantity ?? 1))
          const effectiveMax = getEffectiveMaxQuantity(currentItem)

          if (q > 0 && q < minQuantity) {
            toast.error(`Minimum quantity is ${minQuantity}`)
            return
          }

          if (q > effectiveMax) {
            toast.error(`Only ${effectiveMax} item(s) available`)
            return
          }
        }

        // Optimistic update immediately — UI never waits
        if (q <= 0) {
          set({ items: freshState.items.filter((i) => i.productId !== productId) })
        } else {
          set({
            items: freshState.items.map((i) =>
              i.productId === productId ? { ...i, quantity: q } : i
            )
          })
        }

        if (!isLoggedIn()) return

        // Debounced sync to server — no blocking, rapid clicks = one PATCH
        const existing = quantitySyncTimers.get(productId)
        if (existing) clearTimeout(existing)

        quantitySyncTimers.set(
          productId,
          setTimeout(() => {
            quantitySyncTimers.delete(productId)
            const item = get().items.find((i) => i.productId === productId)
            if (!item || item.quantity <= 0) return
            requests
              .patch(`/customer/cart/items/${productId}`, { quantity: item.quantity })
              .catch(() => {
                toast.error('Failed to update quantity')
                get().init()
              })
          }, SYNC_DEBOUNCE_MS)
        )
      },

      removeItem: async (productId: number) => {
        if (get().updating.includes(productId) || get().removing.includes(productId)) {
          return
        }

        // Guest: optimistic only
        if (!isLoggedIn()) {
          set({ items: get().items.filter((i) => i.productId !== productId) })
          return
        }

        set((state) => ({
          removing: state.removing.includes(productId) ? state.removing : [...state.removing, productId]
        }))

        const currentItems = get().items
        set({ items: currentItems.filter((i) => i.productId !== productId) })

        try {
          await requests.delete(`/customer/cart/items/${productId}`)
        } catch (error) {
          console.error('Failed to remove cart item:', error)
          set({ items: currentItems })
          throw error
        } finally {
          set((state) => ({
            removing: state.removing.filter((id) => id !== productId)
          }))
        }
      },

      clear: async () => {
        // Optimistic update
        set({ items: [] })

        if (isLoggedIn()) {
          try {
            await requests.delete('/customer/cart')
          } catch (error) {
            console.error('Failed to clear cart:', error)
            // Revert by re-fetching
            await get().init()
            throw error
          }
        }
      },

      setCustomerTelegram: (productId: number, customerTelegram: string) => {
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, customerTelegram } : i))
        })
      },
      setClientInput: (productId: number, clientInput: string) => {
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, clientInput } : i))
        })
      }
    }),
    {
      name: 'guestCart',
      storage: createJSONStorage(() => localStorageStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items, hydrated: state.hydrated }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        items: (persistedState as any)?.items ?? currentState.items,
        hydrated: (persistedState as any)?.hydrated ?? currentState.hydrated
      })
    }
  )
)


