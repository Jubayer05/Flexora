import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'uhq_backend_default_key_32chars!';
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(`ENCRYPTION_KEY must be exactly ${ENCRYPTION_KEY.length} characters long`);
}

const key = Buffer.from(ENCRYPTION_KEY, 'utf8');

/**
 * Encrypt text using AES-256-GCM
 * @param text Text to encrypt
 * @returns Encrypted string with IV and auth tag
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt text using AES-256-GCM
 * @param encryptedData Encrypted string with IV and auth tag
 * @returns Decrypted text
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const encrypted = parts[2]!;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if string is encrypted (basic format check)
 */
export function isEncrypted(data: string): boolean {
  return data.includes(':') && data.split(':').length === 3;
}
