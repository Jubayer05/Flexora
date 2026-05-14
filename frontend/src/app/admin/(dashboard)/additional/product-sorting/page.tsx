'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Product {
  id: number
  name: string
  sku: string
  sortOrder: number | null
  category: {
    id: number
    name: string
  }
  platform: string
  price: string
  isActive: boolean
}

interface Category {
  id: number
  name: string
}

interface SortableRowProps {
  product: Product
}

function SortableRow({ product }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' as const
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted/50' : ''}>
      <TableCell className='w-12'>
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center -m-2 p-2'
          role='button'
          aria-label='Drag to reorder'
        >
          <GripVertical className='h-5 w-5 text-muted-foreground' />
        </div>
      </TableCell>
      <TableCell className='font-medium'>{product.name}</TableCell>
      <TableCell>{product.sku}</TableCell>
      <TableCell>{product.platform}</TableCell>
      <TableCell>${product.price}</TableCell>
      <TableCell>
        <span className={`text-xs ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      </TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {product.sortOrder || 'No order'}
      </TableCell>
    </TableRow>
  )
}

export default function ProductSortingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response: any = await requests.get('/admin/categories', {
          params: { limit: 100 }
        })
        if (response.success) {
          setCategories(response.data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        showError(error)
      }
    }

    fetchCategories()
  }, [])

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params: any = {
          limit: 100,
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        }

        if (selectedCategory !== 'all') {
          params.categoryId = selectedCategory
        }

        const response: any = await requests.get('/admin/products', { params })

        if (response.success) {
          const productList = response.data.products || []
          setProducts(productList)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
        showError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [selectedCategory])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = products.findIndex((p) => p.id === active.id)
    const newIndex = products.findIndex((p) => p.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update
    const newProducts = arrayMove(products, oldIndex, newIndex)
    setProducts(newProducts)

    // Get adjacent items for gap calculation
    const prevItem = newProducts[newIndex - 1]
    const nextItem = newProducts[newIndex + 1]

    const prevSortOrder = prevItem
      ? prevItem.sortOrder === 0 || prevItem.sortOrder === null
        ? null
        : prevItem.sortOrder
      : null
    const nextSortOrder = nextItem
      ? nextItem.sortOrder === 0 || nextItem.sortOrder === null
        ? null
        : nextItem.sortOrder
      : null

    console.log('[DragEnd]', {
      draggedId: active.id,
      newIndex,
      prevItem: prevItem ? { id: prevItem.id, sortOrder: prevItem.sortOrder } : null,
      nextItem: nextItem ? { id: nextItem.id, sortOrder: nextItem.sortOrder } : null,
      sending: { prevSortOrder, nextSortOrder }
    })

    setUpdating(true)

    try {
      const response: any = await requests.patch(`/admin/products/${active.id}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })

      if (response.success) {
        // Update the sortOrder in the local state
        const updatedProducts = newProducts.map((p) =>
          p.id === active.id ? { ...p, sortOrder: response.data.sortOrder } : p
        )
        setProducts(updatedProducts)

        toast.success('Product order updated successfully')
      }
    } catch (error: any) {
      console.error('Failed to update order:', error)
      // Revert optimistic update
      setProducts(products)
      showError(error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Product Sorting</CardTitle>
          <CardDescription>
            Drag and drop products to reorder them. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Category Filter */}
          <div className="w-full flex justify-center sm:justify-start">
            <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
              <label className="text-sm font-medium text-center sm:text-left">
                Filter by Category:
              </label>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className='text-center py-12 text-muted-foreground'>
              No products found in this category
            </div>
          )}

          {/* Products Table */}
          {!loading && products.length > 0 && (
            <div className='border rounded-lg'>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader className='text-white'>
                    <TableRow>
                      <TableHead className='w-12'></TableHead>
                      <TableHead className='text-white'>Product Name</TableHead>
                      <TableHead className='text-white'>SKU</TableHead>
                      <TableHead className='text-white'>Platform</TableHead>
                      <TableHead className='text-white'>Price</TableHead>
                      <TableHead className='text-white'>Status</TableHead>
                      <TableHead className='text-white'>Sort Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={products.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {products.map((product) => (
                        <SortableRow key={product.id} product={product} />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}

          {/* Info message */}
          {!loading && products.length > 0 && (
            <div className='text-sm text-muted-foreground'>
              Showing {products.length} product{products.length !== 1 ? 's' : ''}
              {updating && (
                <span className='ml-2 inline-flex items-center gap-1'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  Saving...
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
