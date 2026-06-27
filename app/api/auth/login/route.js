import { NextResponse } from 'next/server'
import {
  authPayload,
  authenticateUser,
  createSessionForUser,
  setSessionCookie,
} from '@/lib/server/auth'
import { hashSessionToken } from '@/lib/server/passwords'
import { getStore } from '@/lib/server/store'
import { parseBody } from '@/lib/server/validation'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = parseBody(await request.json())
    const user = await authenticateUser(body.email, body.password)

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const store = getStore()
    const family = { id: user.familyId, name: 'Family Guy' }
    const session = await store.getUserById(user.id)
    const token = await createSessionForUser(user.id)
    const auth = await store.getSession(hashSessionToken(token))
    const members = await store.getMembers(user.familyId)
    const response = NextResponse.json(
      authPayload({
        user: session || user,
        family: auth?.family || family,
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
