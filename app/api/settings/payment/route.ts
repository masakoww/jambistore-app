import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebaseAdmin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/settings/payment - Get payment method settings
export async function GET(request: NextRequest) {
  try {
    const settingsDoc = await db.collection('settings').doc('payment').get();
    
    if (!settingsDoc.exists) {
      // Return default settings if not exists
      return NextResponse.json({
        ok: true,
        methods: {
          manualQRIS: true,
          autoQRIS: false,
          paypal: false,
        },
        updatedAt: new Date().toISOString()
      });
    }

    const data = settingsDoc.data();
    
    // Backward compatibility: convert old activeGateway to new methods format
    if (data?.activeGateway && !data?.methods) {
      const methods = {
        manualQRIS: data.activeGateway === 'pakasir',
        autoQRIS: data.activeGateway === 'ipaymu' || data.activeGateway === 'tokopay',
        paypal: false,
      };
      return NextResponse.json({
        ok: true,
        methods,
        updatedAt: data.updatedAt || new Date().toISOString()
      });
    }

    return NextResponse.json({
      ok: true,
      methods: data?.methods || { manualQRIS: true, autoQRIS: false, paypal: false },
      updatedAt: data?.updatedAt || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching payment settings:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/payment - Update payment gateway settings (Admin only)
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

    // Validate methods object
    if (!body.methods || typeof body.methods !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Invalid payment methods configuration' },
        { status: 400 }
      );
    }

    const { methods } = body;
    
    // Validate each method is boolean
    const validMethods = ['manualQRIS', 'autoQRIS', 'paypal'];
    for (const key of validMethods) {
      if (methods[key] !== undefined && typeof methods[key] !== 'boolean') {
        return NextResponse.json(
          { ok: false, error: `Invalid value for ${key}. Must be boolean.` },
          { status: 400 }
        );
      }
    }

    // Update payment settings
    const settingsRef = db.collection('settings').doc('payment');
    const updatedSettings = {
      methods: {
        manualQRIS: methods.manualQRIS ?? true,
        autoQRIS: methods.autoQRIS ?? false,
        paypal: methods.paypal ?? false,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.email
    };

    await settingsRef.set(updatedSettings, { merge: true });

    console.log('✅ Payment methods updated by:', decodedToken.email, updatedSettings.methods);

    return NextResponse.json({
      ok: true,
      ...updatedSettings
    });
  } catch (error: any) {
    console.error('Error updating payment settings:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
