import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/[id]/complete-payment
 * Mark order as payment completed and trigger Discord ticket creation if user has Discord
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { userId, userEmail, discordUserId } = body;

    console.log('💳 Payment completion request:', { orderId, userId, userEmail, discordUserId });

    if (!orderId) {
      return NextResponse.json(
        { ok: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order from Firestore
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.log('❌ Order not found:', orderId);
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    // Normalize status: after payment, order is still PENDING (awaiting delivery)
    await orderRef.update({
      status: 'PENDING',
      updatedAt: new Date(),
      'payment.status': 'COMPLETED',
      'payment.completedAt': new Date(),
      'delivery.status': 'PENDING',
      'delivery.type': 'manual',
      locked: true,
      ...(userId && { userId }),
    });

    console.log('✅ Order payment marked completed; status set to PENDING:', orderId);

    // If user has Discord connected, create ticket
    let ticketCreated = false;
    let ticketId = null;

    if (discordUserId) {
      const botBaseUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
      // Ensure no trailing slash
      const baseUrl = botBaseUrl.replace(/\/$/, '');
      const webhookUrl = `${baseUrl}/create-order-ticket`;

      try {
        console.log('🎮 User has Discord, creating ticket at:', webhookUrl);
        const ticketResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            userId: discordUserId,
            username: orderData?.customer?.name || 'Customer',
            email: orderData?.customer?.email || userEmail,
            productName: orderData?.productName || 'Unknown Product',
            plan: orderData?.planName || 'Unknown Plan',
            amount: orderData?.amount || 0,
            paymentProofUrl: orderData?.payment?.proofUrl || null,
          }),
        });

          if (ticketResponse.ok) {
            const ticketData = await ticketResponse.json();
            ticketId = ticketData.ticketId;
            ticketCreated = true;
            await orderRef.update({
              ticket_id: ticketId,
              ticketCreated: true,
              ticketCreatedAt: new Date(),
            });
            console.log('✅ Discord ticket created:', ticketId);
          } else {
            const errText = await ticketResponse.text();
            console.error('❌ Failed to create Discord ticket:', errText);
          }
        } catch (error) {
          console.error('❌ Error creating Discord ticket:', error);
          // Intentionally not failing main request
        }
    } else {
      console.log('ℹ️ User has no Discord, skipping ticket creation');
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment marked as completed',
      orderId: orderId,
      ticketCreated: ticketCreated,
      ticketId: ticketId,
    });

  } catch (error) {
    console.error('❌ Error completing payment:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
