import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getStore } from './store'
import {
  createId,
  createPasswordHash,
  createSessionToken,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from './passwords'

export const sessionCookieName = 'fg_session'
const sessionDays = 30

function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...safeUser } = user
  return safeUser
}

export function authPayload({ user, family, members }) {
  return {
    user: publicUser(user),
    family,
    members,
  }
}

export function setSessionCookie(response, token) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDays * 24 * 60 * 60,
  })
}

export function clearSessionCookie(response) {
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function createSessionForUser(userId) {
  const store = getStore()
  const token = createSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000)
  const tokenHash = await hashSessionToken(token)

  await store.createSession({
    id: createId('session'),
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  })

  return token
}

export async function getCurrentAuth() {
  const token = cookies().get(sessionCookieName)?.value
  if (!token) return null

  const store = getStore()
  const auth = await store.getSession(await hashSessionToken(token))
  if (!auth) return null

  return {
    ...auth,
    token,
    members: await store.getMembers(auth.user.familyId),
  }
}

export async function requireAuth() {
  const auth = await getCurrentAuth()
  if (!auth) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  return { auth }
}

export async function authenticateUser(email, password) {
  const store = getStore()
  const user = await store.getUserByEmail(normalizeEmail(email))
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return null
  }

  return user
}

export async function buildUser({ familyId, email, password, role = 'member' }) {
  const normalizedEmail = normalizeEmail(email)
  const displayName = normalizedEmail.split('@')[0] || 'Family member'
  const now = new Date().toISOString()

  return {
    id: createId('user'),
    familyId,
    email: normalizedEmail,
    displayName,
    passwordHash: await createPasswordHash(password),
    role,
    createdAt: now,
  }
}
