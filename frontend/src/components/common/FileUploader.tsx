'use client'

import { Button } from '@/components/ui/button'
import { useImageUploader } from '@/hooks/useFileUpload'
import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'
import { Eye, FileText, Loader2, Plus, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId } from 'react'
import { toast } from 'sonner'
import CustomImage from '../common/CustomImage'

// CVA variants
const containerVariants = cva('', {
  variants: {
    size: {
      small: 'w-16 h-16',
      medium: 'w-32 h-32',
      large: 'w-32 h-32',
      'extra-large': 'w-48 h-48'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

const thumbnailVariants = cva('', {
  variants: {
    size: {
      small: 'w-14 h-14 border-0!',
      medium: 'w-16 h-16',
      large: 'w-20 h-20',
      'extra-large': 'w-24 h-24 min-w-48 h-48 w-full'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

const iconVariants = cva('', {
  variants: {
    size: {
      small: 'w-6 h-6',
      medium: 'w-8 h-8',
      large: 'w-8 h-8',
      'extra-large': 'w-8 h-8'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

const uploadAreaVariants = cva('', {
  variants: {
    size: {
      small: 'w-24 h-24 p-4',
      medium: 'w-32 h-32 p-4',
      large: 'w-32 h-32 p-4',
      'extra-large': 'w-full min-h-60 p-4 auto-rows-fr'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

const textVariants = cva('', {
  variants: {
    size: {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
      'extra-large': 'text-base font-medium'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

const spacingVariants = cva('', {
  variants: {
    size: {
      small: 'gap-1',
      medium: 'gap-2',
      large: 'gap-2',
      'extra-large': 'gap-3'
    }
  },
  defaultVariants: {
    size: 'medium'
  }
})

// Helper function to get size classes
const getSizeClasses = (
  size: 'small' | 'medium' | 'large' | 'extra-large',
  hasFiles: boolean = false
) => ({
  container: containerVariants({ size }),
  thumbnail: thumbnailVariants({
    size: size === 'extra-large' && hasFiles ? 'large' : size
  }),
  icon: iconVariants({ size }),
  uploadArea: uploadAreaVariants({ size }),
  text: textVariants({ size }),
  spacing: spacingVariants({ size })
})

type TProps = {
  value?: string | string[]
  onChangeAction: (url: string | string[]) => void
  multiple?: boolean
  maxAllow?: number
  isCustomer?: boolean
  size?: 'small' | 'medium' | 'large' | 'extra-large'
  label?: string
}

type UploadButtonProps = {
  size: 'small' | 'medium' | 'large' | 'extra-large'
  isUploading: boolean
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  multiple?: boolean
  inputId?: string
}

// Separate Upload Button Component
const UploadButton = ({
  size,
  isUploading,
  onFileSelect,
  multiple = false,
  inputId
}: UploadButtonProps) => {
  const sizeClasses = getSizeClasses(size, false) // No files when showing upload button

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`group bg-card/50 border border-border p-6 rounded-md text-center flex items-center justify-center transition-colors cursor-pointer hover:border-primary/20 hover:bg-primary/5 ${sizeClasses.thumbnail}`}
      >
        <label className='flex flex-col justify-center items-center w-full h-full cursor-pointer gap-0'>
          <input
            type='file'
            multiple={multiple}
            // Accept common image, PDF, Excel, Word, and text file types
            accept='.png,.jpg,.jpeg,.gif,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*'
            onChange={onFileSelect}
            className='hidden'
            disabled={isUploading}
            id={inputId}
          />
          <div
            className={`flex flex-col items-center text-muted-foreground group-hover:text-primary transition-colors ${sizeClasses.spacing}`}
          >
            {isUploading ? (
              <>
                <Loader2 className={`${sizeClasses.icon} animate-spin`} />
                <span className={sizeClasses.text}>Uploading...</span>
                {size === 'extra-large' && (
                  <span className='text-muted-foreground/60 text-sm'>
                    Please wait while we process your files
                  </span>
                )}
              </>
            ) : (
              <>
                <div
                  className={cn({ 'bg-primary/5 mb-2 p-3 rounded-full': size === 'extra-large' })}
                >
                  <Plus
                    className={cn(sizeClasses.icon, { 'text-primary/80': size === 'extra-large' })}
                  />
                </div>
                <span
                  className={`${sizeClasses.text} ${
                    size === 'extra-large' ? 'text-muted-foreground/50' : ''
                  }`}
                >
                  {size === 'extra-large' ? 'Click to upload or drag and drop' : 'Upload'}
                </span>
                {size === 'extra-large' && (
                  <span className='text-muted-foreground text-xs'>
                    Images, PDF, Word, Excel, PowerPoint, CSV, TXT (max. 10MB)
                  </span>
                )}
              </>
            )}
          </div>
        </label>
      </div>
    </motion.div>
  )
}

export default function FileUploader({
  value,
  onChangeAction,
  multiple = false,
  maxAllow = 5,
  isCustomer = false,
  size = 'medium',
  label
}: TProps) {
  const inputId = useId()
  const { fileLists, uploadState, handleChange, handleFileRemove, onPreview, closePreview } =
    useImageUploader({
      value,
      onChange: (url) => onChangeAction(url),
      multiple,
      maxAllow,
      isCustomer
    })

  const hasFiles = fileLists.length > 0
  const sizeClasses = getSizeClasses(size, hasFiles)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      // Convert FileList to the format expected by handleChange
      let newFileList = Array.from(files).map((file, index) => ({
        uid: `${Date.now()}-${index}`,
        name: file.name,
        status: 'uploading' as const,
        originFileObj: file,
        preview: URL.createObjectURL(file)
      }))

      // For multiple mode: check maxAllow limit and concatenate with existing files
      // For single mode: replace existing files
      if (multiple) {
        const currentFileCount = fileLists.length
        const availableSlots = maxAllow - currentFileCount

        if (availableSlots <= 0) {
          toast.error(`Maximum ${maxAllow} files allowed`)
          return
        }

        if (newFileList.length > availableSlots) {
          // Reduce to available slots and show warning
          newFileList = newFileList.slice(0, availableSlots)
          toast.warning(
            `Only ${availableSlots} more file${
              availableSlots === 1 ? '' : 's'
            } allowed. Maximum limit is ${maxAllow}.`
          )
        }

        const finalFileList = [...fileLists, ...newFileList]
        handleChange({ fileList: finalFileList })
      } else {
        // Single mode: replace existing files
        handleChange({ fileList: newFileList })
      }
    }
    event.target.value = ''
  }

  // Show upload button conditions
  const showUploadButton = () => {
    if (multiple) {
      return fileLists.length < maxAllow
    } else {
      return fileLists.length === 0
    }
  }

  return (
    <div className='space-y-2'>
      {label && (
        <label htmlFor={inputId} className='block font-medium text-sm'>
          {label}
        </label>
      )}
      {/* File Grid */}
      <AnimatePresence>
        <div
          className={cn(
            'bg-background/5 flex border-2 border-dashed border-border/35 rounded-lg transition-colors hover:border-primary/50 hover:bg-primary/5',
            size === 'extra-large' ? 'w-full min-h-60' : sizeClasses.uploadArea,
            hasFiles ? 'items-start content-start justify-start' : 'items-center justify-center'
          )}
        >
          {/* File List */}
          {fileLists.map((file, index) => (
            <motion.div
              key={file.uid}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
            >
              <div
                className={`group relative border-2 rounded-lg ${sizeClasses.thumbnail} overflow-hidden hover:border-primary/50 transition-colors `}
              >
                {/* Check if file is an image */}
                {(file.url || file.preview) &&
                (file.originFileObj?.type?.startsWith('image/') ||
                  file.url?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ||
                  file.preview?.startsWith('data:image/') ||
                  file.preview?.startsWith('blob:')) ? (
                  <CustomImage
                    src={file.url || file.preview}
                    alt={file.name}
                    fill
                    className='p-1 rounded-md object-cover'
                  />
                ) : (
                  /* Non-image file display */
                  <div className='flex flex-col justify-center items-center bg-muted/50 p-2 w-full h-full'>
                    <FileText className='mb-1 w-8 h-8 text-muted-foreground' />
                    <span className='w-full text-muted-foreground text-xs text-center truncate'>
                      {file.name}
                    </span>
                  </div>
                )}

                {/* Overlay with actions */}
                <div className='absolute inset-0 flex justify-center items-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 p-2 transition-opacity duration-200'>
                  {/* Only show preview button for images */}
                  {(file.originFileObj?.type?.startsWith('image/') ||
                    file.url?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ||
                    file.preview?.startsWith('data:image/') ||
                    file.preview?.startsWith('blob:')) && (
                    <Button
                      type='button'
                      size={size === 'extra-large' ? 'icon' : 'sm'}
                      variant='ghost'
                      className='hover:bg-white/20 text-primary-foreground hover:text-primary-foreground'
                      onClick={() => onPreview(file)}
                    >
                      <Eye className={size === 'extra-large' ? 'w-5 h-5' : sizeClasses.icon} />
                    </Button>
                  )}

                  {/* Remove Item */}
                  <Button
                    type='button'
                    size={size === 'extra-large' ? 'icon' : 'sm'}
                    variant='ghost'
                    className='hover:bg-white/20 text-primary-foreground hover:text-primary-foreground'
                    onClick={() => handleFileRemove(file)}
                  >
                    <Trash2 className={size === 'extra-large' ? 'w-5 h-5' : sizeClasses.icon} />
                  </Button>
                </div>

                {/* Loading overlay */}
                {file.status === 'uploading' && (
                  <div className='absolute inset-0 flex justify-center items-center bg-card/90'>
                    <Loader2 className={`${sizeClasses.icon} text-primary animate-spin`} />
                  </div>
                )}

                {/* Error overlay */}
                {file.status === 'error' && (
                  <div className='absolute inset-0 flex justify-center items-center bg-red-500/80'>
                    <X className={`${sizeClasses.icon} text-white`} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Show upload button if no files and single mode, or if multiple mode and under limit */}
          {showUploadButton() && (
            <div
              className={cn(
                hasFiles && 'col-span-full',
                !hasFiles && size === 'extra-large' && 'w-full min-h-60 flex items-center justify-center'
              )}
            >
              <UploadButton
                size={size === 'extra-large' && hasFiles ? 'large' : size}
                isUploading={uploadState.isUploading}
                onFileSelect={handleFileSelect}
                multiple={multiple}
                inputId={inputId}
              />
            </div>
          )}
        </div>
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {uploadState.previewOpen && uploadState.previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='z-50 fixed inset-0 flex justify-center items-center bg-black/80'
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className='relative max-w-4xl max-h-full'
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='-top-12 right-0 z-10 absolute text-primary-foreground'
                onClick={closePreview}
              >
                <X className='w-6 h-6' />
              </Button>
              <CustomImage
                src={uploadState.previewImage}
                alt='Preview'
                width={800}
                height={600}
                className='rounded-lg max-w-full max-h-full size-auto object-contain'
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
