import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint for guests to fetch their order by ID
 * More secure than allowing direct Firestore access
 */
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

    // Fetch order from Firestore
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const data = orderDoc.data();

    // Return sanitized order data (safe for public access)
    return NextResponse.json({
      ok: true,
      order: {
        id: orderDoc.id,
        productName: data?.productName || 'Unknown Product',
        planName: data?.planName || 'Unknown Plan',
        status: data?.status || 'PENDING',
        amount: data?.totalAmount || data?.amount || 0,
        createdAt: data?.createdAt || null,
        customer: {
          name: data?.customer?.name || 'Customer',
          email: data?.customer?.email || 'N/A',
        },
        payment: {
          status: data?.payment?.status || 'PENDING',
          provider: data?.payment?.provider || 'N/A',
        },
        delivery: {
          status: data?.delivery?.status || 'PENDING',
          method: data?.delivery?.method || null,
          deliveredAt: data?.delivery?.deliveredAt || null,
          productDetails: data?.delivery?.productDetails || null,
          instructions: data?.delivery?.instructions || null,
        },
      },
    });

  } catch (error) {
    console.error('❌ Error fetching public order:', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}
