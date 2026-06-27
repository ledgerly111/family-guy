const sessionCookieName = 'fg_session'
const sessionDays = 30
const iterations = 60000
const keyLength = 32
const digest = 'sha256'
const encoder = new TextEncoder()

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS family_state (
    family_id TEXT PRIMARY KEY,
    transactions_json TEXT NOT NULL DEFAULT '[]',
    cards_json TEXT NOT NULL DEFAULT '[]',
    settings_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
]

const repairStatements = [
  `ALTER TABLE families ADD COLUMN name TEXT NOT NULL DEFAULT 'Family Guy'`,
  `ALTER TABLE families ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN family_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'Family member'`,
  `ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'`,
  `ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN token_hash TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN expires_at TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE sessions ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE family_state ADD COLUMN transactions_json TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE family_state ADD COLUMN cards_json TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE family_state ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE family_state ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`,
]

function getDb(env) {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding "DB" is missing.')
  }

  return env.DB
}

function json(data, status = 200) {
  return Response.json(data, { status })
}

export function withErrors(handler) {
  return async context => {
    try {
      return await handler(context)
    } catch (error) {
      const message = error?.message || 'Unexpected server error'
      const status = message.includes('D1 binding') ? 503 : 500
      return json({ error: message }, status)
    }
  }
}

function parseCookie(request, name) {
  const cookies = request.headers.get('Cookie') || ''
  const match = cookies
    .split(';')
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : ''
}

function setSessionCookie(response, token) {
  response.headers.append(
    'Set-Cookie',
    `${sessionCookieName}=${encodeURIComponent(
      token,
    )}; Path=/; Max-Age=${sessionDays * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`,
  )
}

function clearSessionCookie(response) {
  response.headers.append(
    'Set-Cookie',
    `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  )
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function validatePassword(password) {
  return String(password || '').length >= 8
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

function randomBytes(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
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
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
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

async function createPasswordHash(password) {
  const salt = base64UrlEncode(randomBytes(16))
  const hash = await derivePasswordHash(password, salt, iterations, digest)

  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`
}

async function verifyPassword(password, storedHash) {
  const [scheme, storedDigest, storedIterations, salt, hash] = String(storedHash || '').split(':')
  if (scheme === 'sha256' && salt && hash) {
    return safeEqual(await hashToken(`${salt}:${String(password)}`), hash)
  }

  if (scheme !== 'pbkdf2' || !storedDigest || !storedIterations || !salt || !hash) {
    return false
  }

  const candidate = await derivePasswordHash(password, salt, Number(storedIterations), storedDigest)
  return safeEqual(candidate, hash)
}

function createSessionToken() {
  return base64UrlEncode(randomBytes(32))
}

async function hashSessionToken(token) {
  return hashToken(token)
}

async function hashToken(token) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(String(token)))
  return base64UrlEncode(new Uint8Array(hash))
}

function createInvitePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from(randomBytes(12), byte => alphabet[byte % alphabet.length]).join('')
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || '')
  } catch {
    return fallback
  }
}

function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    familyId: row.family_id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  }
}

function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...safeUser } = user
  return safeUser
}

function mapFamily(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }
}

async function readBody(request) {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? body : {}
  } catch {
    return {}
  }
}

export async function ensureSchema(env) {
  const db = getDb(env)
  for (const statement of schemaStatements) {
    await db.prepare(statement).run()
  }
  for (const statement of repairStatements) {
    try {
      await db.prepare(statement).run()
    } catch (error) {
      if (!String(error?.message || '').toLowerCase().includes('duplicate column')) {
        throw error
      }
    }
  }
}

async function getUserByEmail(env, email) {
  const row = await getDb(env).prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first()
  return mapUser(row)
}

async function getUserById(env, id) {
  const row = await getDb(env).prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first()
  return mapUser(row)
}

async function getMembers(env, familyId) {
  const result = await getDb(env)
    .prepare('SELECT * FROM users WHERE family_id = ? ORDER BY created_at ASC')
    .bind(familyId)
    .all()

  return (result.results || []).map(row => publicUser(mapUser(row)))
}

async function createSession(env, userId) {
  const token = createSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000)

  await getDb(env)
    .prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(createId('session'), userId, await hashSessionToken(token), expiresAt.toISOString(), now.toISOString())
    .run()

  return token
}

async function getCurrentAuth(env, request) {
  const token = parseCookie(request, sessionCookieName)
  if (!token) return null

  const tokenHash = await hashSessionToken(token)
  const row = await getDb(env)
    .prepare(
      `SELECT
        sessions.id AS session_id,
        sessions.user_id,
        sessions.expires_at,
        sessions.created_at AS session_created_at,
        users.*,
        families.id AS family_id_result,
        families.name AS family_name,
        families.created_at AS family_created_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       JOIN families ON families.id = users.family_id
       WHERE sessions.token_hash = ?
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first()

  if (!row || new Date(row.expires_at) <= new Date()) return null

  const user = mapUser(row)
  const family = mapFamily({
    id: row.family_id_result,
    name: row.family_name,
    created_at: row.family_created_at,
  })

  return {
    token,
    tokenHash,
    user,
    family,
    members: await getMembers(env, user.familyId),
  }
}

function authPayload(auth) {
  return {
    user: publicUser(auth.user),
    family: auth.family,
    members: auth.members,
  }
}

export async function handleSetup({ env }) {
  await ensureSchema(env)
  return json({ ok: true })
}

export async function handleRegister({ request, env }) {
  await ensureSchema(env)
  const body = await readBody(request)
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  const familyName = String(body.familyName || 'Family Guy').trim() || 'Family Guy'

  if (!validateEmail(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (!validatePassword(password)) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (await getUserByEmail(env, email)) return json({ error: 'This email is already registered.' }, 409)

  const now = new Date().toISOString()
  const family = { id: createId('family'), name: familyName, createdAt: now }
  const user = {
    id: createId('user'),
    familyId: family.id,
    email,
    displayName: email.split('@')[0] || 'Family member',
    passwordHash: await createPasswordHash(password),
    role: 'owner',
    createdAt: now,
  }

  const db = getDb(env)
  await db.prepare('INSERT INTO families (id, name, created_at) VALUES (?, ?, ?)').bind(family.id, family.name, family.createdAt).run()
  await db
    .prepare(
      `INSERT INTO users
        (id, family_id, email, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(user.id, user.familyId, user.email, user.displayName, user.passwordHash, user.role, user.createdAt)
    .run()
  await db
    .prepare(
      `INSERT INTO family_state
        (family_id, transactions_json, cards_json, settings_json, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(family.id, '[]', '[]', JSON.stringify({ openingBalance: 0, monthlyTarget: 0 }), now)
    .run()

  const token = await createSession(env, user.id)
  const response = json(authPayload({ user, family, members: await getMembers(env, family.id) }))
  setSessionCookie(response, token)
  return response
}

export async function handleLogin({ request, env }) {
  await ensureSchema(env)
  const body = await readBody(request)
  const user = await getUserByEmail(env, normalizeEmail(body.email))

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return json({ error: 'Invalid email or password.' }, 401)
  }

  const family = mapFamily(
    await getDb(env).prepare('SELECT * FROM families WHERE id = ? LIMIT 1').bind(user.familyId).first(),
  )
  const token = await createSession(env, user.id)
  const response = json(authPayload({ user, family, members: await getMembers(env, user.familyId) }))
  setSessionCookie(response, token)
  return response
}

export async function handleLogout({ request, env }) {
  const token = parseCookie(request, sessionCookieName)
  if (token) {
    await getDb(env).prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashSessionToken(token)).run()
  }

  const response = json({ ok: true })
  clearSessionCookie(response)
  return response
}

export async function handleMe({ request, env }) {
  await ensureSchema(env)
  const auth = await getCurrentAuth(env, request)
  if (!auth) return json({ authenticated: false })
  return json({ authenticated: true, ...authPayload(auth) })
}

export async function handleMembers({ request, env }) {
  await ensureSchema(env)
  const auth = await getCurrentAuth(env, request)
  if (!auth) return json({ error: 'Not authenticated' }, 401)

  if (request.method === 'GET') {
    return json({ members: auth.members })
  }

  if (auth.user.role !== 'owner') {
    return json({ error: 'Only the family owner can add members.' }, 403)
  }

  const body = await readBody(request)
  const email = normalizeEmail(body.email)
  const password = String(body.password || createInvitePassword())

  if (!validateEmail(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (!validatePassword(password)) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (await getUserByEmail(env, email)) return json({ error: 'This email is already registered.' }, 409)

  const now = new Date().toISOString()
  const user = {
    id: createId('user'),
    familyId: auth.user.familyId,
    email,
    displayName: email.split('@')[0] || 'Family member',
    passwordHash: await createPasswordHash(password),
    role: 'member',
    createdAt: now,
  }

  await getDb(env)
    .prepare(
      `INSERT INTO users
        (id, family_id, email, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(user.id, user.familyId, user.email, user.displayName, user.passwordHash, user.role, user.createdAt)
    .run()

  return json({
    member: publicUser(user),
    password,
    members: await getMembers(env, auth.user.familyId),
  })
}

export async function handleFinanceState({ request, env }) {
  await ensureSchema(env)
  const auth = await getCurrentAuth(env, request)
  if (!auth) return json({ error: 'Not authenticated' }, 401)

  if (request.method === 'GET') {
    const row = await getDb(env)
      .prepare('SELECT * FROM family_state WHERE family_id = ? LIMIT 1')
      .bind(auth.user.familyId)
      .first()

    return json({
      transactions: parseJson(row?.transactions_json, []),
      cards: parseJson(row?.cards_json, []),
      settings: parseJson(row?.settings_json, {}),
      members: auth.members,
    })
  }

  const body = await readBody(request)
  const transactions = Array.isArray(body.transactions) ? body.transactions : []
  const cards = Array.isArray(body.cards) ? body.cards : []
  const settings = body.settings && typeof body.settings === 'object' ? body.settings : {}

  await getDb(env)
    .prepare(
      `INSERT INTO family_state
        (family_id, transactions_json, cards_json, settings_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(family_id) DO UPDATE SET
        transactions_json = excluded.transactions_json,
        cards_json = excluded.cards_json,
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at`,
    )
    .bind(auth.user.familyId, JSON.stringify(transactions), JSON.stringify(cards), JSON.stringify(settings), new Date().toISOString())
    .run()

  return json({ ok: true })
}
