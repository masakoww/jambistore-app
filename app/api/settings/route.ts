import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebaseAdmin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper to validate hex color
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// GET /api/settings - Get website settings
export async function GET(request: NextRequest) {
  try {
    const settingsDoc = await db.collection('settings').doc('global').get();
    
    if (!settingsDoc.exists) {
      // Return default settings if not exists
      return NextResponse.json({
        ok: true,
        settings: {
          siteName: 'JAMBI STORE',
          primaryColor: '#ec4899',
          secondaryColor: '#8b5cf6',
          accentColor: '#06b6d4',
          logoUrl: '',
          bannerUrls: [],
          paymentMethods: ['pakasir'],
          footer: {
            description: 'Premium game cheats and tools',
            socialLinks: []
          },
          updatedAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      ok: true,
      settings: settingsDoc.data()
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update website settings (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token
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

    // Parse request body
    const body = await request.json();

    // Validate color fields if provided
    if (body.primaryColor && !isValidHexColor(body.primaryColor)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid primaryColor - must be hex format (#RRGGBB)' },
        { status: 400 }
      );
    }
    if (body.secondaryColor && !isValidHexColor(body.secondaryColor)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid secondaryColor - must be hex format (#RRGGBB)' },
        { status: 400 }
      );
    }
    if (body.accentColor && !isValidHexColor(body.accentColor)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid accentColor - must be hex format (#RRGGBB)' },
        { status: 400 }
      );
    }

    // Get current settings
    const settingsRef = db.collection('settings').doc('global');
    const currentDoc = await settingsRef.get();
    const currentSettings = currentDoc.exists ? currentDoc.data() : {};

    // Merge with new settings (partial update)
    const updatedSettings = {
      ...currentSettings,
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.email
    };

    // Update Firestore
    await settingsRef.set(updatedSettings, { merge: true });

    console.log('✅ Settings updated by:', decodedToken.email);

    return NextResponse.json({
      ok: true,
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
