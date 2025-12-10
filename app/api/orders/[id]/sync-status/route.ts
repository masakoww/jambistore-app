import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const body = await req.json();
    const { discordStatus, discordTicketId, websiteStatus } = body;

    // Update order with sync metadata
    const updateData: any = {
      'sync.lastSync': new Date(),
    };

    if (discordStatus) {
      updateData['sync.discordStatus'] = discordStatus;
    }

    if (discordTicketId) {
      updateData['sync.discordTicketId'] = discordTicketId;
    }

    if (websiteStatus) {
      updateData['sync.websiteStatus'] = websiteStatus;
    }

    await adminDb.collection('orders').doc(orderId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Order sync status updated'
    });

  } catch (error: any) {
    console.error('Error updating sync status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update sync status' },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    const syncData = orderData?.sync || null;

    return NextResponse.json({
      success: true,
      sync: syncData
    });

  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
