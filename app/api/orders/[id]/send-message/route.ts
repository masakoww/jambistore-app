import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * POST /api/orders/[id]/send-message
 * Send a message from dashboard to Discord ticket
 * 
 * Body: { message: string, userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const body = await request.json();
    
    if (!body.message || !body.userId) {
      return NextResponse.json(
        { ok: false, message: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Get order to verify user owns it
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data();

    if (!orderData) {
      return NextResponse.json(
        { ok: false, message: 'Order data not found' },
        { status: 404 }
      );
    }

    // Verify user owns this order
    if (orderData.userId !== body.userId) {
      return NextResponse.json(
        { ok: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Save message to Firestore chat subcollection
    const chatRef = orderRef.collection('chat');
    const messageData = {
      content: body.message,
      sender: 'buyer',
      senderId: body.userId,
      senderName: orderData.username || 'Customer',
      timestamp: new Date(),
      attachments: [],
      fromDashboard: true // Flag to indicate this came from dashboard
    };

    await chatRef.add(messageData);

    // Try to send message to Discord ticket channel
    try {
      const ticketChannelId = orderData.ticket_id || orderId;
      
      // Make webhook call to bot to send message
      const botWebhookUrl = process.env.BOT_WEBHOOK_URL || 'http://localhost:3001';
      
      await fetch(`${botWebhookUrl}/send-ticket-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: ticketChannelId,
          message: body.message,
          username: orderData.username || 'Customer'
        })
      }).catch(err => {
        console.error('[Send Message] Bot webhook failed:', err);
        // Continue even if webhook fails - message is saved to Firestore
      });
      
    } catch (webhookError) {
      console.error('[Send Message] Webhook error:', webhookError);
      // Non-critical error, message is still saved
    }

    return NextResponse.json({
      ok: true,
      message: 'Message sent successfully'
    });

  } catch (error: any) {
    console.error('[Send Message] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
