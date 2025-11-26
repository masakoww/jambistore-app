import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/roles/list - Get all admins (Owner only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Verify requester is owner
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'owner') {
      return NextResponse.json(
        { ok: false, error: 'Only owner can list admins' },
        { status: 403 }
      );
    }

    // Get all admins
    const adminsSnapshot = await db.collection('users')
      .where('role', 'in', ['owner', 'admin'])
      .get();

    const admins = adminsSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      ok: true,
      admins
    });
  } catch (error: any) {
    console.error('Error listing admins:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
