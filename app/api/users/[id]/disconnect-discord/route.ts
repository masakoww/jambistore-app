import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove Discord fields from user document
    await adminDb.collection('users').doc(userId).update({
      discordUserId: FieldValue.delete(),
      discordUsername: FieldValue.delete(),
      discordEmail: FieldValue.delete(),
      discordAvatar: FieldValue.delete(),
      discordConnectedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Discord account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Discord:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Discord account' },
      { status: 500 }
    );
  }
}
