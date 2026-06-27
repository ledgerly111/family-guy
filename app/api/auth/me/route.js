import { NextResponse } from 'next/server'
import { authPayload, getCurrentAuth } from '@/lib/server/auth'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await getCurrentAuth()
  if (!auth) {
    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({ authenticated: true, ...authPayload(auth) })
}
