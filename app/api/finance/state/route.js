import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getStore } from '@/lib/server/store'
import { cleanFinanceState } from '@/lib/server/validation'

export const runtime = 'edge'

export async function GET() {
  const { auth, error } = await requireAuth()
  if (error) return error

  const store = getStore()
  const state = await store.getFamilyState(auth.user.familyId)
  const members = await store.getMembers(auth.user.familyId)

  return NextResponse.json({ ...state, members })
}

export async function PUT(request) {
  const { auth, error } = await requireAuth()
  if (error) return error

  const body = cleanFinanceState(await request.json())
  await getStore().saveFamilyState(auth.user.familyId, body)

  return NextResponse.json({ ok: true })
}
