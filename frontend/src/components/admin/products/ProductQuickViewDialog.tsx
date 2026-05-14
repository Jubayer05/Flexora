'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Lock, Star } from 'lucide-react'
import { useState } from 'react'
import ProductDescription from './ProductDescription'

interface ProductQuickViewDialogProps {
  product: Product
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export default function ProductQuickViewDialog({
  product,
  open: externalOpen,
  onOpenChange
}: ProductQuickViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className='lg:min-w-2xl max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span>{product.name}</span>
            {product.isFeatured && (
              <Badge variant='secondary'>
                <Star className='mr-1 w-3 h-3' />
                Featured
              </Badge>
            )}
            {product.isPrivate && (
              <Badge variant='secondary'>
                <Lock className='mr-1 w-3 h-3' />
                Private
              </Badge>
            )}
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
          <DialogDescription>Product details and information</DialogDescription>
        </DialogHeader>

        <ProductDescription product={product} compact={false} />
      </DialogContent>
    </Dialog>
  )
}
