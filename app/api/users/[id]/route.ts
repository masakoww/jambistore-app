import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[id]
 * Get user information including Discord connection status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // User document doesn't exist yet (common for new users)
      return NextResponse.json({
        ok: true,
        user: {
          uid: userId,
          discordUserId: null,
          discordUsername: null,
          discordConnectedAt: null,
        },
      });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      ok: true,
      user: {
        uid: userId,
        email: userData?.email || null,
        displayName: userData?.displayName || null,
        discordUserId: userData?.discordUserId || null,
        discordUsername: userData?.discordUsername || null,
        discordConnectedAt: userData?.discordConnectedAt || null,
        createdAt: userData?.createdAt || null,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
