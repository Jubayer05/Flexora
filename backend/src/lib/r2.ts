import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3'

// Lazy-initialized S3 client so env vars are read after dotenv has loaded
let _r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (_r2Client) return _r2Client
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || ''
  if (!accountId || accountId === '000') {
    throw new Error(
      'R2_ACCOUNT_ID is missing or invalid. Set it in backend .env to your Cloudflare account ID (not "000").'
    )
  }
  if (!accessKeyId || accessKeyId === '000') {
    throw new Error(
      'R2_ACCESS_KEY_ID is missing or invalid. Create an R2 API token in Cloudflare dashboard and set it in backend .env.'
    )
  }
  if (!secretAccessKey || secretAccessKey === '0000') {
    throw new Error(
      'R2_SECRET_ACCESS_KEY is missing or invalid. Set the secret from your R2 API token in backend .env.'
    )
  }
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  _r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey }
  })
  return _r2Client
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME?.trim() || ''
  if (!bucket) {
    throw new Error('R2_BUCKET_NAME is not set in backend .env.')
  }
  return bucket
}

function getPublicDomain(): { publicDomain: string; customDomain: string } {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.trim() || ''
  const customDomain = process.env.R2_CUSTOM_DOMAIN?.trim() || ''
  return { publicDomain, customDomain }
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf',
    txt: 'text/plain',
    json: 'application/json'
  }
  return types[ext] || 'application/octet-stream'
}

/**
 * Upload a file buffer to Cloudflare R2
 * @param fileBuffer - File buffer (Buffer or Uint8Array)
 * @param fileName - Original filename (used for extension)
 * @param folder - R2 folder/prefix (default: "gallery")
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  folder = 'gallery'
): Promise<string> {
  const bucket = getBucket()
  const { publicDomain, customDomain } = getPublicDomain()

  console.log('[R2] uploadToR2 called', {
    fileName,
    folder,
    bufferLength: fileBuffer?.byteLength ?? fileBuffer?.length ?? 0,
    bucket,
    hasPublicDomain: Boolean(publicDomain),
    hasCustomDomain: Boolean(customDomain)
  })

  const key = `${folder}/${fileName}`
  const contentType = getContentType(fileName)

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  } as PutObjectCommandInput)

  try {
    await getR2Client().send(command)
  } catch (r2Error: any) {
    console.error('[R2] PutObject failed', {
      key,
      code: r2Error?.name ?? r2Error?.code,
      message: r2Error?.message,
      statusCode: r2Error?.$metadata?.httpStatusCode
    })
    throw r2Error
  }

  // Public URL: must use R2_PUBLIC_DOMAIN (r2.dev) or R2_CUSTOM_DOMAIN.
  // The S3 endpoint (r2.cloudflarestorage.com) does NOT serve public HTTP; it's API-only.
  const domain = customDomain || publicDomain
  if (!domain) {
    const err = new Error(
      'R2 upload succeeded but no public URL: set R2_PUBLIC_DOMAIN (e.g. pub-xxx.r2.dev) or R2_CUSTOM_DOMAIN in backend .env. Enable "Public access" on your R2 bucket in Cloudflare dashboard.'
    )
    console.error('[R2]', err.message)
    throw err
  }
  const host = domain.replace(/^https?:\/\//, '')
  const publicUrl = `https://${host}/${key}`
  console.log('[R2] Upload success, publicUrl:', publicUrl)
  return publicUrl
}

/**
 * Delete a file from Cloudflare R2
 * @param fileNameOrKey - Filename (e.g. "xyz.png") or full R2 key (e.g. "gallery/xyz.png")
 * @param folder - R2 folder/prefix when fileNameOrKey is just a filename (default: "gallery")
 */
export async function deleteFromR2(
  fileNameOrKey: string,
  folder = 'gallery'
): Promise<void> {
  const bucket = getBucket()
  const key = fileNameOrKey.includes('/') ? fileNameOrKey : `${folder}/${fileNameOrKey}`

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  })

  await getR2Client().send(command)
}

/**
 * Extract R2 key from a public URL for deletion
 * e.g. "https://www.flexora.com/gallery/xyz.png" -> "gallery/xyz.png"
 */
export function extractR2KeyFromUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\//, '')
    return path || null
  } catch {
    return null
  }
}

export default { getR2Client }
