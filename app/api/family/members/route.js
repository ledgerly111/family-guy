import { NextResponse } from 'next/server'
import { buildUser, requireAuth } from '@/lib/server/auth'
import { createInvitePassword, normalizeEmail } from '@/lib/server/passwords'
import { getStore } from '@/lib/server/store'
import { parseBody, validateEmail, validatePassword } from '@/lib/server/validation'

export const runtime = 'nodejs'

export async function GET() {
  const { auth, error } = await requireAuth()
  if (error) return error

  return NextResponse.json({ members: await getStore().getMembers(auth.user.familyId) })
}

export async function POST(request) {
  const { auth, error } = await requireAuth()
  if (error) return error

  if (auth.user.role !== 'owner') {
    return NextResponse.json({ error: 'Only the family owner can add members.' }, { status: 403 })
  }

  const body = parseBody(await request.json())
  const email = normalizeEmail(body.email)
  const password = String(body.password || createInvitePassword())

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
  if (await store.getUserByEmail(email)) {
    return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
  }

  const user = await buildUser({
    familyId: auth.user.familyId,
    email,
    password,
    role: 'member',
  })
  await store.createUser(user)

  return NextResponse.json({
    member: {
      id: user.id,
      familyId: user.familyId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
    },
    password,
    members: await store.getMembers(auth.user.familyId),
  })
}
