import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    logger.info('📦 Fetching order:', { orderId });

    // Fetch order from Firestore
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      logger.warn('❌ Order not found:', { orderId });
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    logger.info('✅ Order found:', { orderId });

    return NextResponse.json({
      ok: true,
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    });
  } catch (error) {
    logger.error('❌ Error fetching order:', { error });
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
