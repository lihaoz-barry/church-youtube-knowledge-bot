/**
 * Encryption Utilities for Sensitive Data
 *
 * Uses AES-256-GCM encryption to protect OAuth tokens and other sensitive data.
 * Encryption key must be stored in environment variables (ENCRYPTION_KEY).
 *
 * Constitutional Principle: Privacy & Theological Content Sensitivity
 * - Sermon transcripts and OAuth tokens are encrypted at rest
 * - AES-256 provides strong encryption for stored credentials
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from environment variable using PBKDF2
 */
function getKey(salt: Buffer): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY

  if (!encryptionKey) {
    throw new Error(
      'ENCRYPTION_KEY environment variable not set. Please add it to .env.local'
    )
  }

  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Encrypt sensitive text (e.g., OAuth access tokens)
 *
 * @param text - Plain text to encrypt
 * @returns Base64-encoded encrypted string with format: salt:iv:encrypted:authTag
 *
 * @example
 * const encryptedToken = encrypt('ya29.a0AfH6SMBx...')
 * // Store encryptedToken in database
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getKey(salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: salt:iv:encrypted:authTag (all base64 encoded)
  return [salt, iv, encrypted, authTag]
    .map((buf) => buf.toString('base64'))
    .join(':')
}

/**
 * Decrypt encrypted text
 *
 * @param encryptedText - Encrypted string from encrypt() function
 * @returns Original plain text
 *
 * @example
 * const token = decrypt(storedEncryptedToken)
 * // Use token for API calls
 */
export function decrypt(encryptedText: string): string {
  const [saltB64, ivB64, encryptedB64, authTagB64] = encryptedText.split(':')

  if (!saltB64 || !ivB64 || !encryptedB64 || !authTagB64) {
    throw new Error('Invalid encrypted text format')
  }

  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  const key = getKey(salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Hash sensitive data for comparison (e.g., API keys)
 * Use this when you need to verify a value but don't need to decrypt it
 *
 * @param text - Text to hash
 * @returns SHA-256 hash as hex string
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}
