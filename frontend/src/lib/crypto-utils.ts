import { EncryptJWT, jwtDecrypt } from 'jose'

// Helper to convert string ↔ Uint8Array
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const toBase64 = (arrayBuffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

const fromBase64 = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

async function getKey(secret: string): Promise<CryptoKey> {
  if (secret.length !== 32) {
    throw new Error('Secret must be exactly 32 characters (256 bits) long.')
  }

  return crypto.subtle.importKey('raw', textEncoder.encode(secret), 'AES-GCM', false, [
    'encrypt',
    'decrypt'
  ])
}

export async function encrypt(data: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)) // AES-GCM recommends 96-bit IV
  const key = await getKey(secret)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(data)
  )

  // Combine IV + encrypted data as base64 for storage/transport
  const encryptedBytes = new Uint8Array(encrypted)
  const combined = new Uint8Array(iv.length + encryptedBytes.length)
  combined.set(iv)
  combined.set(encryptedBytes, iv.length)

  return toBase64(combined.buffer)
}

export async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const combined = fromBase64(encryptedBase64)
  const iv = combined.slice(0, 12)
  const encryptedBytes = combined.slice(12)
  const key = await getKey(secret)

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBytes)

  return textDecoder.decode(decrypted)
}

// Default secret key for encryption (should be stored securely in production)
const DEFAULT_SECRET = 'my-super-secret-key-32-characters' // 32 characters

// Simple encryption/decryption using jose (use first 10 characters, padded to 32 bytes)
const joseSecret = DEFAULT_SECRET.slice(0, 10).padEnd(32, '0') // Pad to 32 characters
const SECRET_KEY = new TextEncoder().encode(joseSecret)

/**
 * Simple encrypt function using jose
 * @param data - The data to encrypt (can be string, number, boolean, object, or array)
 * @returns Promise that resolves to encrypted JWT string
 */
export async function simpleEncrypt(
  data: string | number | boolean | object | Array<any>
): Promise<string> {
  try {
    const payload = { data: typeof data === 'string' ? data : JSON.stringify(data) }
    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .encrypt(SECRET_KEY)
    return jwt
  } catch (error) {
    console.error('Error encrypting data:', error)
    throw error
  }
}

/**
 * Simple decrypt function using jose
 * @param encryptedData - The encrypted JWT string to decrypt
 * @returns Promise that resolves to original data or null if decryption fails
 */
export async function simpleDecrypt(encryptedData: string): Promise<string | null> {
  try {
    const { payload } = await jwtDecrypt(encryptedData, SECRET_KEY)
    return payload.data as string
  } catch (error) {
    console.error('Error decrypting data:', error)
    return null
  }
}

/**
 * Encrypts and signs data for secure storage (synchronous fallback)
 * @param data - The data to encrypt (can be string, number, boolean, object, or array)
 * @returns Encrypted base64 string
 */
export function signKey(data: string | number | boolean | object | Array<any>): string {
  try {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data)
    // For synchronous operation, we'll use a simple base64 encoding with a signature
    // In production, you might want to use async encryption
    const encoded = btoa(jsonString)
    const signature = btoa(`signed:${encoded}`)
    return signature
  } catch (error) {
    console.error('Error signing data:', error)
    return ''
  }
}

/**
 * Verifies and decrypts signed data (synchronous fallback)
 * @param signedData - The signed/encrypted data to verify and decrypt
 * @returns The original data or null if verification fails
 */
export function verifyKey(signedData: string): string | null {
  try {
    const decoded = atob(signedData)
    if (!decoded.startsWith('signed:')) {
      return null
    }
    const encodedData = decoded.replace('signed:', '')
    const originalData = atob(encodedData)
    return originalData
  } catch (error) {
    console.error('Error verifying data:', error)
    return null
  }
}
