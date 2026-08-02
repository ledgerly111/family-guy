import { NextResponse } from 'next/server'
import {
  authPayload,
  authenticateUser,
  createSessionForUser,
  setSessionCookie,
} from '@/lib/server/auth'
import { createPasswordHash, hashSessionToken } from '@/lib/server/passwords'
import { getStore } from '@/lib/server/store'
import { parseBody } from '@/lib/server/validation'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = parseBody(await request.json())
    const store = getStore()
    await store.ensureSchema()
    const authResult = await authenticateUser(body.email, body.password)

    if (!authResult) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const { user, legacyPassword } = authResult

    if (legacyPassword) {
      await store.updatePasswordHash(user.id, await createPasswordHash(body.password))
    }

    const members = await store.getMembers(user.familyId)
    const token = await createSessionForUser(user.id)
    const auth = await store.getSession(await hashSessionToken(token))
    const response = NextResponse.json(
      authPayload({
        user: auth?.user || user,
        family: auth?.family || { id: user.familyId, name: 'Family Guy' },
        members,
      }),
    )
    setSessionCookie(response, token)

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Could not log in.' },
      { status: 500 },
    )
  }
}
