import { decrypt, encrypt } from '@/lib/crypto-utils'

export function normalizeCallback(raw: string | null | undefined): string | undefined {
  if (!raw) return
  if (raw === 'null' || raw === 'undefined' || raw.trim() === '') return
  return raw
}

/**
 * Normalize secret to exactly 32 characters for AES-256-GCM
 */
function normalizeSecret(secret: string): string {
  if (secret.length === 32) return secret

  // Hash the secret to always get consistent 32 characters
  if (secret.length > 32) {
    return secret.substring(0, 32)
  }

  // Pad shorter secrets to 32 characters
  return secret.padEnd(32, '0')
}

/**
 * Validates that a callback path is safe (internal path only)
 */
function isValidCallbackPath(path: string): boolean {
  // Must start with / but not //
  if (!path.startsWith('/') || path.startsWith('//')) return false

  // Should not contain protocol
  if (path.includes('://')) return false

  // Should not start with known auth routes (prevent loops)
  const authPaths = [
    '/login',
    '/register',
    '/sign-up',
    '/admin/login',
    '/forget-password',
    '/admin/forget-password'
  ]
  if (authPaths.some((authPath) => path === authPath || path.startsWith(`${authPath}?`)))
    return false

  return true
}

export async function encryptCallback(path: string, secret: string) {
  try {
    // Validate path before encrypting
    if (!isValidCallbackPath(path)) {
      console.error('Invalid callback path:', path)
      return undefined
    }

    const normalizedSecret = normalizeSecret(secret)
    const encrypted = await encrypt(path, normalizedSecret)
    return encodeURIComponent(encrypted)
  } catch (error) {
    console.error('Error encrypting callback:', error)
    return undefined
  }
}

export async function decryptCallback(raw: string, secret: string) {
  try {
    const normalizedSecret = normalizeSecret(secret)
    const decrypted = await decrypt(decodeURIComponent(raw), normalizedSecret)

    // Validate decrypted path
    if (!isValidCallbackPath(decrypted)) {
      console.error('Invalid decrypted callback path:', decrypted)
      return undefined
    }

    return decrypted
  } catch (error) {
    console.error('Error decrypting callback:', error)
    return undefined
  }
}
