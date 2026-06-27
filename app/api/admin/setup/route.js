import { NextResponse } from 'next/server'
import { getStore } from '@/lib/server/store'

export const runtime = 'edge'

export async function POST() {
  await getStore().ensureSchema()
  return NextResponse.json({ ok: true })
}
