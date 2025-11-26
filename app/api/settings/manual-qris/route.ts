import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settingsRef = adminDb.collection('settings').doc('manual_qris');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      return NextResponse.json({
        ok: true,
        settings: {
          qris1: { enabled: false, label: 'Manual QRIS 1', imageUrl: '', description: '' },
          qris2: { enabled: false, label: 'Manual QRIS 2', imageUrl: '', description: '' }
        }
      });
    }

    const settings = settingsDoc.data();

    return NextResponse.json({
      ok: true,
      settings: {
        qris1: settings?.qris1 || { enabled: false, label: 'Manual QRIS 1', imageUrl: '', description: '' },
        qris2: settings?.qris2 || { enabled: false, label: 'Manual QRIS 2', imageUrl: '', description: '' }
      }
    });

  } catch (error) {
    console.error('Error fetching manual QRIS settings:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to fetch settings'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const { adminAuth } = await import('@/lib/firebaseAdmin');
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin via custom claims
    if (!decodedToken.admin) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { qris1, qris2, discordWebhookUrl } = body;

    const settingsRef = adminDb.collection('settings').doc('manual_qris');
    
    await settingsRef.set({
      qris1: qris1 || { enabled: false, label: 'Manual QRIS 1', imageUrl: '', description: '' },
      qris2: qris2 || { enabled: false, label: 'Manual QRIS 2', imageUrl: '', description: '' },
      discordWebhookUrl: discordWebhookUrl || '',
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      message: 'Manual QRIS settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating manual QRIS settings:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to update settings'
      },
      { status: 500 }
    );
  }
}
