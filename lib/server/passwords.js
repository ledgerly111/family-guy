const iterations = 210000
const keyLength = 32
const digest = 'sha256'
const encoder = new TextEncoder()

function getCrypto() {
  if (!globalThis.crypto) {
    throw new Error('Web Crypto is not available')
  }

  return globalThis.crypto
}

function randomBytes(length) {
  const bytes = new Uint8Array(length)
  getCrypto().getRandomValues(bytes)
  return bytes
}

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function derivePasswordHash(password, salt, hashIterations, hashDigest) {
  const key = await getCrypto().subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await getCrypto().subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64UrlDecode(salt),
      iterations: Number(hashIterations),
      hash: hashDigest.toUpperCase().replace('SHA', 'SHA-'),
    },
    key,
    keyLength * 8,
  )

  return base64UrlEncode(new Uint8Array(bits))
}

function safeEqual(a, b) {
  const left = base64UrlDecode(a)
  const right = base64UrlDecode(b)
  if (left.length !== right.length) return false

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }

  return diff === 0
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function createPasswordHash(password) {
  const salt = base64UrlEncode(randomBytes(16))
  const hash = await derivePasswordHash(password, salt, iterations, digest)

  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`
}

export async function verifyPassword(password, storedHash) {
  const [scheme, storedDigest, storedIterations, salt, hash] = String(storedHash || '').split(':')
  if (scheme !== 'pbkdf2' || !storedDigest || !storedIterations || !salt || !hash) {
    return false
  }

  const candidate = await derivePasswordHash(password, salt, Number(storedIterations), storedDigest)
  return safeEqual(candidate, hash)
}

export function createSessionToken() {
  return base64UrlEncode(randomBytes(32))
}

export async function hashSessionToken(token) {
  const hash = await getCrypto().subtle.digest('SHA-256', encoder.encode(String(token)))
  return base64UrlEncode(new Uint8Array(hash))
}

export function createId(prefix) {
  return `${prefix}_${getCrypto().randomUUID()}`
}

export function createInvitePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(12)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}
