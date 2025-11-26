import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Get list of orders pending manual delivery
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin key
    const adminKey = request.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY;
    
    if (!adminKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { ok: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📋 Fetching pending manual deliveries...');

    // Query orders with pending manual delivery
    // Get all orders with PENDING delivery (payment status can be PENDING_VERIFICATION or SUCCESS)
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('delivery.status', '==', 'PENDING')
      .where('status', 'in', ['PROCESSING', 'COMPLETED'])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const pendingOrders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ Found ${pendingOrders.length} pending manual deliveries`);

    return NextResponse.json({
      ok: true,
      orders: pendingOrders,
      count: pendingOrders.length,
    });

  } catch (error) {
    console.error('❌ Error fetching pending deliveries:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
