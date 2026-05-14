import requests from '@/services/network/http'
import Cookies from 'js-cookie'
import { toast } from 'sonner'
import { showError } from './errMsg'

export type RcFile = File & {
  uid?: string
}

export type FileType = {
  preview: any
  originFileObj: any
  uid: string
  name: string
  status: 'uploading' | 'done' | 'error' | 'removed'
  url?: string
  response?: any
}

export const convertToFileList = (urls: string | string[] | undefined): FileType[] => {
  const list = Array.isArray(urls) ? urls : urls ? [urls] : []
  return list.map((url, i) => {
    // Extract filename from URL or use generic name
    const filename = url.split('/').pop() || `file-${i}`
    return {
      uid: `${i}`,
      name: filename,
      status: 'done',
      url,
      preview: url,
      originFileObj: null,
      response: undefined
    }
  })
}

export const beforeCrop = (targetAspect: number) => {
  return async (file: RcFile) => {
    const image = await getImageDimensions(file)
    const imgRatio = image.width / image.height
    const isSameRatio = Math.abs(imgRatio - targetAspect) < 0.01
    return !isSameRatio // ⛔ Skip cropping if already same aspect
  }
}

// helper to get image dimensions
const getImageDimensions = (file: RcFile): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.src = URL.createObjectURL(file)
  })
}

// export const getBase64 = (file: FileType): Promise<string> =>
//   new Promise((resolve, reject) => {
//     const reader = new FileReader()
//     reader.readAsDataURL(file as any)
//     reader.onload = () => resolve(reader.result as string)
//     reader.onerror = (error) => reject(error)
//   })

export interface UploadOptions {
  isCustomer?: boolean
  existing?: string[]
  deletes?: string[]
  multiple?: boolean
  maxAllow?: number
}

// File validation utilities
export const validateFile = (file: RcFile): boolean => {
  // Allow all file types - remove the restrictive type checking
  // const allowedTypes = [
  //   'image/jpeg',
  //   'image/png',
  //   'image/webp',
  //   'image/svg+xml',
  //   'image/x-icon',
  //   'image/vnd.microsoft.icon'
  // ]

  // if (!allowedTypes.includes(file.type)) {
  //   toast.error('Unsupported file type')
  //   return false
  // }

  // Check file size limit (increased to 10MB to match UI text)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File too large (Max 10MB)')
    return false
  }

  return true
}

export const validateFiles = (files: FileType[]): FileType[] => {
  return files.filter((file) => {
    if (!file.originFileObj) return false
    return validateFile(file.originFileObj)
  })
}

// File conversion utilities
// export const convertToFileList = (value?: string | string[]): FileType[] => {
//   if (!value) return []

//   const urls = Array.isArray(value) ? value : [value]
//   return urls.map((url, index) => ({
//     uid: `existing-${index}`,
//     name: `image-${index}.png`,
//     status: 'done' as const,
//     url
//   }))
// }

export const createFilePreview = (file: FileType): FileType => {
  if (!file.url && !file.preview && file.originFileObj) {
    // Only create object URL preview for image files
    const isImage = file.originFileObj.type.startsWith('image/')
    if (isImage) {
      return {
        ...file,
        preview: URL.createObjectURL(file.originFileObj as Blob)
      }
    } else {
      // For non-image files, use filename as preview
      return {
        ...file,
        preview: file.name || 'file'
      }
    }
  }
  return file
}

export const updateFileListWithPreviews = (fileList: FileType[]): FileType[] => {
  return fileList.map(createFilePreview)
}

// FormData creation utilities
export const createUploadFormData = (
  files: FileType[],
  existing: string[] = [],
  deletes: string[] = []
): FormData => {
  const formData = new FormData()

  files.forEach((file) => {
    if (file.originFileObj) {
      formData.append('files[]', file.originFileObj as File)
    }
  })

  existing.filter(Boolean).forEach((url) => formData.append('existing', url))
  deletes.filter(Boolean).forEach((url) => formData.append('deletes', url))

  return formData
}

// Preview utilities
export const getBase64 = (file: RcFile): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export const generateFilePreview = async (file: FileType): Promise<string> => {
  if (file.url) return file.url
  if (file.preview) return file.preview
  if (file.originFileObj) {
    // Only generate base64 preview for image files
    const isImage = file.originFileObj.type.startsWith('image/')
    if (isImage) {
      return await getBase64(file.originFileObj as RcFile)
    } else {
      // For non-image files, return a generic file icon or filename
      return file.name || 'file'
    }
  }
  return ''
}

// Upload API utilities
export const uploadImages = async (
  formData: FormData,
  options: UploadOptions
): Promise<string[]> => {
  const token = Cookies.get('token')

  // Do NOT set Content-Type for FormData – axios must set multipart/form-data with boundary
  const response = await requests.post(
    options.isCustomer ? '/upload/image' : '/admin/gallery/upload',
    formData,
    {
      headers: {
        ...(options.isCustomer ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  )
  // API returns { success, data: Gallery[], message }; response here is the full body (http client returns axios response.data)
  const urls = response?.data
  if (process.env.NODE_ENV === 'development') {
    console.log('[Upload] API response', { hasData: Boolean(response?.data), isArray: Array.isArray(urls), count: Array.isArray(urls) ? urls.length : 0, sample: Array.isArray(urls) && urls[0] ? (typeof urls[0] === 'string' ? urls[0] : (urls[0] as any)?.url) : null })
  }
  if (!urls || (Array.isArray(urls) && urls.length === 0)) {
    throw new Error('No file URL returned')
  }

  return urls
}

// File list management utilities
export const updateFileListWithUrls = (
  fileList: FileType[],
  urls: string[],
  multiple: boolean
): FileType[] => {
  const urlsCopy = [...urls]

  const updated = fileList.map((file) => {
    if (file.originFileObj && !file.url) {
      const newUrl = urlsCopy.shift()
      if (!newUrl) return file
      return {
        ...file,
        status: 'done' as const,
        url: newUrl
      }
    }
    return file
  })

  if (multiple && urlsCopy.length > 0) {
    const extras = urlsCopy.map((url, i) => ({
      uid: `uploaded-extra-${i}`,
      name: `image-extra-${i}.png`,
      status: 'done' as const,
      url,
      preview: url,
      originFileObj: null,
      response: undefined
    }))
    return [...updated, ...extras]
  }

  return updated
}

export const getNewFiles = (fileList: FileType[]): FileType[] => {
  return fileList.filter((file) => file.originFileObj && !file.url)
}

export const shouldAllowMoreUploads = (
  fileList: FileType[],
  multiple: boolean,
  maxAllow: number
): boolean => {
  return fileList.length < (multiple ? maxAllow : 1)
}

// Upload process utilities
export const processFileUpload = async (
  fileList: FileType[],
  options: UploadOptions,
  onSuccess: (urls: string[]) => void
): Promise<void> => {
  const newFiles = getNewFiles(fileList)
  const hasDeletes = options.deletes && options.deletes.length > 0

  // Return early only if there are no new files AND no deletes
  if (!newFiles.length && !hasDeletes) return

  const validFiles = validateFiles(newFiles)

  // Create form data even if there are no new files (for deletes)
  const formData = createUploadFormData(validFiles, options.existing, options.deletes)

  try {
    const urls = await uploadImages(formData, options)
    toast.success('Upload successful')
    onSuccess(urls)
  } catch (error) {
    showError(error)
  }
}

// URL extraction utilities
export const extractUrlsFromFileList = (fileList: FileType[]): string[] => {
  return fileList.filter((file) => file.url).map((file) => file.url!)
}

export const extractSingleUrl = (fileList: FileType[]): string | undefined => {
  const urls = extractUrlsFromFileList(fileList)
  return urls[0]
}

// Upload configuration utilities
export const createUploadProps = (fileList: FileType[], multiple: boolean, maxAllow: number) => ({
  listType: 'picture-card' as const,
  fileList,
  multiple,
  beforeUpload: () => true,
  maxCount: multiple ? maxAllow : 1,
  showUploadList: true,
  accept: '*/*' // Accept all file types
})

// Upload state management
export interface UploadState {
  isUploading: boolean
  uploadInProgress: boolean
  previewOpen: boolean
  previewImage: string
}

export const initialUploadState: UploadState = {
  isUploading: false,
  uploadInProgress: false,
  previewOpen: false,
  previewImage: ''
}

export const setUploadInProgress = (inProgress: boolean) => {
  // This would be managed by the custom hook
  return { uploadInProgress: inProgress, isUploading: inProgress }
}
