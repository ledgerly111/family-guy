import crypto from 'crypto'

const iterations = 210000
const keyLength = 32
const digest = 'sha256'

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto
    .pbkdf2Sync(String(password), salt, iterations, keyLength, digest)
    .toString('base64url')

  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`
}

export function verifyPassword(password, storedHash) {
  const [scheme, storedDigest, storedIterations, salt, hash] = String(storedHash || '').split(':')
  if (scheme !== 'pbkdf2' || !storedDigest || !storedIterations || !salt || !hash) {
    return false
  }

  const candidate = crypto
    .pbkdf2Sync(String(password), salt, Number(storedIterations), keyLength, storedDigest)
    .toString('base64url')
  const a = Buffer.from(candidate)
  const b = Buffer.from(hash)

  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('base64url')
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function createInvitePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(12)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}
