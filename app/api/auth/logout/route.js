import { NextResponse } from 'next/server'
import { clearSessionCookie, sessionCookieName } from '@/lib/server/auth'
import { hashSessionToken } from '@/lib/server/passwords'
import { getStore } from '@/lib/server/store'

export const runtime = 'nodejs'

export async function POST(request) {
  const token = request.cookies.get(sessionCookieName)?.value
  if (token) {
    await getStore().deleteSession(await hashSessionToken(token))
  }

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)

  return response
}
