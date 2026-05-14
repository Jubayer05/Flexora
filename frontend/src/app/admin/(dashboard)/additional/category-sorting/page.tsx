'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

interface Category {
  id: number
  name: string
  slug: string
  sortOrder: number | null
  isActive: boolean
  parentId: number | null
}

interface SortableRowProps {
  category: Category
}

function SortableRow({ category }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id
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
      <TableCell className='font-medium'>{category.name}</TableCell>
      <TableCell>{category.slug}</TableCell>
      <TableCell>
        <span className={`text-xs ${category.isActive ? 'text-green-600' : 'text-red-600'}`}>
          {category.isActive ? 'Active' : 'Inactive'}
        </span>
      </TableCell>
      <TableCell>{category.parentId ? `Parent ID: ${category.parentId}` : 'Root'}</TableCell>
      <TableCell className='text-muted-foreground text-sm'>
        {category.sortOrder || 'No order'}
      </TableCell>
    </TableRow>
  )
}

export default function CategorySortingPage() {
  const [categories, setCategories] = useState<Category[]>([])
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
      setLoading(true)
      try {
        const params: any = {
          limit: 100,
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        }

        const response: any = await requests.get('/admin/categories', { params })

        if (response.success) {
          const categoryList = response.data.categories || []
          setCategories(categoryList)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        showError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update
    const newCategories = arrayMove(categories, oldIndex, newIndex)
    setCategories(newCategories)

    // Get adjacent items for gap calculation
    const prevItem = newCategories[newIndex - 1]
    const nextItem = newCategories[newIndex + 1]

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
      const response: any = await requests.patch(`/admin/categories/${active.id}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })

      if (response.success) {
        // Update the sortOrder in the local state
        const updatedCategories = newCategories.map((c) =>
          c.id === active.id ? { ...c, sortOrder: response.data.sortOrder } : c
        )
        setCategories(updatedCategories)

        toast.success('Category order updated successfully')
      }
    } catch (error: any) {
      console.error('Failed to update order:', error)
      // Revert optimistic update
      setCategories(categories)
      showError(error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Category Sorting</CardTitle>
          <CardDescription>
            Drag and drop categories to reorder them. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Loading State */}
          {loading && (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}

          {/* Empty State */}
          {!loading && categories.length === 0 && (
            <div className='text-center py-12 text-muted-foreground'>No categories found</div>
          )}

          {/* Categories Table */}
          {!loading && categories.length > 0 && (
            <div className='border rounded-lg'>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-12'></TableHead>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Sort Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={categories.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {categories.map((category) => (
                        <SortableRow key={category.id} category={category} />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}

          {/* Info message */}
          {!loading && categories.length > 0 && (
            <div className='text-sm text-muted-foreground'>
              Showing {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
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
