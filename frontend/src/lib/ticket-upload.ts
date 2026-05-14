import requests from '@/services/network/http'
import { showError } from '@/lib/errMsg'
import { toast } from 'sonner'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export function validateTicketImage(file: File): boolean {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Only images are allowed (JPEG, PNG, GIF, WebP)')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error('Each image must be 2MB or less')
    return false
  }
  return true
}

/**
 * Upload ticket images. Use isAdmin true for admin panel, false for customer.
 * Returns array of public URLs.
 */
export async function uploadTicketImages(
  files: File[],
  isAdmin: boolean
): Promise<string[]> {
  const valid = files.every(validateTicketImage)
  if (!valid) return []

  const formData = new FormData()
  files.forEach((file) => formData.append('files[]', file))

  const endpoint = isAdmin ? '/admin/tickets/upload' : '/customer/tickets/upload'
  try {
    const response = (await requests.post(endpoint, formData as any)) as {
      data?: string[]
      success?: boolean
    }
    const urls = Array.isArray(response?.data) ? response.data : []
    if (!urls.length) throw new Error('No URLs returned')
    return urls
  } catch (error) {
    showError(error)
    return []
  }
}
