'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { uploadTicketImages, validateTicketImage } from '@/lib/ticket-upload'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import CustomImage from './CustomImage'

const MAX_FILES = 10
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

interface TicketImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  isAdmin?: boolean
  maxFiles?: number
  className?: string
  disabled?: boolean
}

export default function TicketImageUpload({
  value,
  onChange,
  isAdmin = false,
  maxFiles = MAX_FILES,
  className,
  disabled = false
}: TicketImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length) return

    const remaining = maxFiles - value.length
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} images allowed`)
      return
    }
    const toUpload = files.slice(0, remaining)
    const invalid = toUpload.find((f) => !validateTicketImage(f))
    if (invalid) return

    setUploading(true)
    try {
      const urls = await uploadTicketImages(toUpload, isAdmin)
      if (urls.length) {
        onChange([...value, ...urls])
      }
    } finally {
      setUploading(false)
    }
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className='flex flex-wrap items-center gap-2'>
        <input
          ref={inputRef}
          type='file'
          accept='image/jpeg,image/jpg,image/png,image/gif,image/webp'
          multiple
          className='hidden'
          onChange={handleSelect}
          disabled={disabled || uploading || value.length >= maxFiles}
        />
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='shrink-0'
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading || value.length >= maxFiles}
          title='Upload image (max 2MB each)'
        >
          {uploading ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <ImagePlus className='w-4 h-4' />
          )}
        </Button>
        {value.length > 0 && (
          <span className='text-muted-foreground text-xs'>
            {value.length} / {maxFiles} images
          </span>
        )}
      </div>

      {value.length > 0 && (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className='relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/30 group'
            >
              <CustomImage
                src={url}
                alt={`Attachment ${index + 1}`}
                fill
                className='object-cover'
              />
              <Button
                type='button'
                variant='secondary'
                size='icon'
                className='absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive hover:text-destructive-foreground'
                onClick={() => remove(index)}
                disabled={disabled}
              >
                <X className='w-3 h-3' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
