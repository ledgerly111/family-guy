const iterations = 60000
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

function parseDigest(hashDigest) {
  return hashDigest.toUpperCase().replace('SHA', 'SHA-')
}

function parseStoredPasswordHash(storedHash) {
  const parts = String(storedHash || '').split(':')

  if (parts[0] === 'sha256' && parts.length >= 3) {
    return {
      scheme: 'sha256',
      salt: parts[1],
      hash: parts[2],
    }
  }

  if (parts[0] === 'pbkdf2' && parts.length >= 5) {
    return {
      scheme: 'pbkdf2',
      digest: parts[1],
      iterations: Number(parts[2]),
      salt: parts[3],
      hash: parts.slice(4).join(':'),
    }
  }

  return null
}

async function derivePasswordHash(password, salt, hashIterations, hashDigest, saltMode = 'decoded') {
  const key = await getCrypto().subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const saltBytes = saltMode === 'string' ? encoder.encode(String(salt)) : base64UrlDecode(salt)
  const bits = await getCrypto().subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: Number(hashIterations),
      hash: parseDigest(hashDigest),
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

async function hashToken(token) {
  const hash = await getCrypto().subtle.digest('SHA-256', encoder.encode(String(token)))
  return base64UrlEncode(new Uint8Array(hash))
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export async function createPasswordHash(password) {
  const salt = base64UrlEncode(randomBytes(16))
  const hash = await derivePasswordHash(password, salt, iterations, digest)

  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`
}

export async function verifyPasswordDetailed(password, storedHash) {
  const parsed = parseStoredPasswordHash(storedHash)
  if (!parsed) {
    return { valid: false, legacy: false }
  }

  if (parsed.scheme === 'sha256') {
    const valid = safeEqual(
      await hashToken(`${parsed.salt}:${String(password)}`),
      parsed.hash,
    )
    return { valid, legacy: valid }
  }

  const modern = await derivePasswordHash(
    password,
    parsed.salt,
    parsed.iterations,
    parsed.digest,
    'decoded',
  )
  if (safeEqual(modern, parsed.hash)) {
    return { valid: true, legacy: false }
  }

  const legacy = await derivePasswordHash(
    password,
    parsed.salt,
    parsed.iterations,
    parsed.digest,
    'string',
  )
  if (safeEqual(legacy, parsed.hash)) {
    return { valid: true, legacy: true }
  }

  return { valid: false, legacy: false }
}

export async function verifyPassword(password, storedHash) {
  const result = await verifyPasswordDetailed(password, storedHash)
  return result.valid
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
