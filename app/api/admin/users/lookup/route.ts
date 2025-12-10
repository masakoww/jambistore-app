import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, db } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/users/lookup?email=...
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // verify requester is owner
    const requesterDoc = await db.collection('users').doc(decodedToken.uid).get()
    if (!requesterDoc.exists || requesterDoc.data()?.role !== 'owner') {
      return NextResponse.json({ ok: false, error: 'Only owner can lookup users' }, { status: 403 })
    }

    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    if (!email) {
      return NextResponse.json({ ok: false, error: 'email query param required' }, { status: 400 })
    }

    // Use Firebase Admin to lookup user by email
    try {
      const userRecord = await adminAuth.getUserByEmail(email)
      const userDoc = await db.collection('users').doc(userRecord.uid).get()
      return NextResponse.json({ ok: true, uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName || userDoc.data()?.displayName || null })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message || 'User not found' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('Error looking up user:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
