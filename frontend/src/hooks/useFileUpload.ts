import { showError } from '@/lib/errMsg'
import {
  FileType,
  UploadOptions,
  convertToFileList,
  generateFilePreview,
  initialUploadState,
  processFileUpload,
  updateFileListWithPreviews,
  updateFileListWithUrls
} from '@/lib/uploader'
import { useEffect, useRef, useState } from 'react'

export interface UseImageUploaderProps extends UploadOptions {
  value?: string | string[]
  onChange?: (url: string | string[]) => void
}

export const useImageUploader = ({
  value,
  onChange,
  multiple = false,
  ...options
}: UseImageUploaderProps) => {
  const [fileLists, setFileLists] = useState<FileType[]>([])
  const [uploadState, setUploadState] = useState(initialUploadState)
  const [deletedUrls, setDeletedUrls] = useState<string[]>([])
  const uploadInProgress = useRef(false)

  useEffect(() => {
    // Don't reset fileLists if upload is in progress to preserve temporary files
    if (!uploadInProgress.current) {
      setFileLists(convertToFileList(value))
    }
  }, [value])

  const handleChange = async ({ fileList }: { fileList: FileType[] }) => {
    const updatedList = updateFileListWithPreviews(fileList)
    setFileLists(updatedList)

    if (uploadInProgress.current) return

    uploadInProgress.current = true
    setUploadState((prev) => ({ ...prev, isUploading: true }))

    try {
      await processFileUpload(updatedList, { ...options, deletes: deletedUrls }, (urls: any) => {
        // Extract URL strings from the response objects
        const urlStrings = Array.isArray(urls)
          ? urls.map((item: any) => (typeof item === 'string' ? item : item.url))
          : [typeof urls === 'string' ? urls : urls.url]

        const updatedFileList = updateFileListWithUrls(updatedList, urlStrings, multiple)
        setFileLists(updatedFileList)

        // Extract all URLs from the updated file list for onChange callback
        const allUrls = updatedFileList.filter((f) => f.url).map((f) => f.url!)
        // Call onChange with all URLs (existing + new)
        onChange?.(multiple ? allUrls : allUrls[0])
      })
    } catch (error) {
      showError(error)
    } finally {
      uploadInProgress.current = false
      setUploadState((prev) => ({ ...prev, isUploading: false }))
    }
  }

  const handleFileRemove = (fileToRemove: FileType) => {
    const newFileList = fileLists.filter((f) => f.uid !== fileToRemove.uid)

    // If the removed file has a URL (was uploaded), track it for deletion
    if (fileToRemove.url) {
      setDeletedUrls((prev) => [...prev, fileToRemove.url!])
    }

    // Update file list
    setFileLists(newFileList)

    // Extract URLs from remaining files and notify parent immediately
    const remainingUrls = newFileList.filter((f) => f.url).map((f) => f.url!)
    onChange?.(multiple ? remainingUrls : remainingUrls[0] || '')
  }

  const onPreview = async (file: any) => {
    const previewUrl = await generateFilePreview(file)
    setUploadState((prev) => ({
      ...prev,
      previewImage: previewUrl,
      previewOpen: true
    }))
  }

  const closePreview = () => {
    setUploadState((prev) => ({
      ...prev,
      previewOpen: false,
      previewImage: ''
    }))
  }

  return {
    fileLists,
    uploadState,
    handleChange,
    handleFileRemove,
    onPreview,
    closePreview
  }
}
