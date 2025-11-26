import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settingsRef = adminDb.collection('settings').doc('email_template');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      return NextResponse.json({
        ok: true,
        settings: {
          brevoApiKey: '',
          senderEmail: 'noreply@yourstore.com',
          senderName: 'Your Store',
          headerImageUrl: '',
          footerText: 'Thank you for your purchase! If you have any questions, feel free to contact us.',
          primaryColor: '#FF006B'
        }
      });
    }

    const settings = settingsDoc.data();

    return NextResponse.json({
      ok: true,
      settings: {
        brevoApiKey: settings?.brevoApiKey || '',
        senderEmail: settings?.senderEmail || 'noreply@yourstore.com',
        senderName: settings?.senderName || 'Your Store',
        headerImageUrl: settings?.headerImageUrl || '',
        footerText: settings?.footerText || 'Thank you for your purchase!',
        primaryColor: settings?.primaryColor || '#FF006B'
      }
    });

  } catch (error) {
    console.error('Error fetching email template settings:', error);
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
    const { brevoApiKey, senderEmail, senderName, headerImageUrl, footerText, primaryColor } = body;

    const settingsRef = adminDb.collection('settings').doc('email_template');
    
    await settingsRef.set({
      brevoApiKey: brevoApiKey || '',
      senderEmail: senderEmail || 'noreply@yourstore.com',
      senderName: senderName || 'Your Store',
      headerImageUrl: headerImageUrl || '',
      footerText: footerText || 'Thank you for your purchase!',
      primaryColor: primaryColor || '#FF006B',
      updatedAt: new Date()
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      message: 'Email template settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating email template settings:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to update settings'
      },
      { status: 500 }
    );
  }
}
