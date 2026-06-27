import { NextResponse } from 'next/server'
import { authPayload, buildUser, createSessionForUser, setSessionCookie } from '@/lib/server/auth'
import { createId, normalizeEmail } from '@/lib/server/passwords'
import { getStore } from '@/lib/server/store'
import { parseBody, validateEmail, validatePassword } from '@/lib/server/validation'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = parseBody(await request.json())
    const email = normalizeEmail(body.email)
    const password = String(body.password || '')
    const familyName = String(body.familyName || 'Family Guy').trim() || 'Family Guy'

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      )
    }

    const store = getStore()
    await store.ensureSchema()

    if (await store.getUserByEmail(email)) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
    }

    const family = {
      id: createId('family'),
      name: familyName,
      createdAt: new Date().toISOString(),
    }
    const owner = buildUser({
      familyId: family.id,
      email,
      password,
      role: 'owner',
    })

    await store.createFamilyWithOwner({
      family,
      owner,
      state: {
        transactions: [],
        cards: [],
        settings: { openingBalance: 0, monthlyTarget: 0 },
      },
    })

    const token = await createSessionForUser(owner.id)
    const members = await store.getMembers(family.id)
    const response = NextResponse.json(authPayload({ user: owner, family, members }))
    setSessionCookie(response, token)

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Could not create account.' },
      { status: 500 },
    )
  }
}
