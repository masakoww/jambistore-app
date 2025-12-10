import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { queueEmail } from '@/lib/emailUtil';
import { sendStaffLog, StaffLogTemplates, createAuditLog } from '@/lib/staffLogger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/[id]/complete-payment
 * Buyer completion endpoint - accepts payment details and marks order as awaiting delivery
 * 
 * Body: { paymentMethod, customerEmail, proofUrl }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { paymentMethod, customerEmail, proofUrl, userId, userEmail, discordUserId } = body;

    console.log('💳 Payment completion request:', { orderId, paymentMethod, customerEmail, proofUrl: !!proofUrl });

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

    // Validate order is in PENDING status and awaiting payment
    if (orderData?.status !== 'PENDING') {
      return NextResponse.json(
        { ok: false, message: `Order is not in PENDING status. Current status: ${orderData?.status}` },
        { status: 400 }
      );
    }

    // If locked, redirect to tracking
    if (orderData?.locked === true) {
      return NextResponse.json(
        { ok: false, message: 'Order is locked and cannot be modified', redirectTo: `/track?orderId=${orderId}` },
        { status: 400 }
      );
    }

    // Validate required fields for buyer completion
    if (paymentMethod && customerEmail && proofUrl) {
      // Buyer completion flow - update with payment details
      if (!customerEmail.includes('@')) {
        return NextResponse.json(
          { ok: false, message: 'Invalid email address' },
          { status: 400 }
        );
      }

      const now = new Date();

      // Update order with payment details
      await orderRef.update({
        customerEmail: customerEmail,
        email: customerEmail,
        'customer.email': customerEmail,
        'customer.name': customerEmail.split('@')[0],
        paymentMethod: paymentMethod,
        paymentProofURL: proofUrl,
        'payment.status': 'PROCESSING',
        'payment.method': paymentMethod,
        'payment.proofUrl': proofUrl,
        'payment.proofUploadedAt': now,
        'payment.completedAt': now,
        'delivery.status': 'PENDING',
        status: 'PENDING', // Still PENDING, awaiting admin approval/delivery
        locked: true,
        updatedAt: now,
        ...(userId && { userId }),
      });

      console.log('✅ Order payment details updated:', orderId);

      // Create audit log
      try {
        await createAuditLog(orderId, 'payment_completed', userId || 'buyer', {
          paymentMethod,
          customerEmail,
          proofUrl
        });
      } catch (auditError) {
        console.error('⚠️ Failed to create audit log:', auditError);
      }

      // Queue email to customer
      try {
        await queueEmail(customerEmail, 'order_created', {
          orderId: orderId,
          productName: orderData?.productName || 'Product',
          customerName: customerEmail.split('@')[0],
          amount: orderData?.amount || 0,
          paymentMethod: paymentMethod,
        });
        console.log('✅ Order confirmation email queued');
      } catch (emailError) {
        console.error('⚠️ Failed to queue email:', emailError);
      }

      // Send staff log notification
      try {
        await sendStaffLog(
          StaffLogTemplates.orderPaid(orderId, orderData?.productName || 'Product', customerEmail),
          {
            orderId,
            action: 'payment_completed',
            details: `Payment method: ${paymentMethod}\nEmail: ${customerEmail}`,
            color: 'info'
          }
        );
      } catch (staffLogError) {
        console.error('⚠️ Failed to send staff log:', staffLogError);
      }

      // Create Discord ticket if user has Discord connected
      let ticketCreated = false;
      let ticketId = null;

      if (discordUserId) {
        const botBaseUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
        const baseUrl = botBaseUrl.replace(/\/$/, '');
        const webhookUrl = `${baseUrl}/create-order-ticket`;

        try {
          console.log('🎮 Creating Discord ticket at:', webhookUrl);
          const ticketResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              userId: discordUserId,
              username: customerEmail.split('@')[0],
              email: customerEmail,
              productName: orderData?.productName || 'Unknown Product',
              plan: orderData?.planName || 'Unknown Plan',
              amount: orderData?.amount || 0,
              paymentProofUrl: proofUrl,
            }),
          });

          if (ticketResponse.ok) {
            const ticketData = await ticketResponse.json();
            ticketId = ticketData.ticketId || ticketData.channelId;
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
        }
      } else {
        // Try to create ticket anyway with the order info
        const botBaseUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
        const baseUrl = botBaseUrl.replace(/\/$/, '');
        const webhookUrl = `${baseUrl}/create-order-ticket`;

        try {
          console.log('🎮 Creating Discord ticket (no Discord user) at:', webhookUrl);
          const ticketResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              userId: null,
              username: customerEmail.split('@')[0],
              email: customerEmail,
              productName: orderData?.productName || 'Unknown Product',
              plan: orderData?.planName || 'Unknown Plan',
              amount: orderData?.amount || 0,
              paymentProofUrl: proofUrl,
            }),
          });

          if (ticketResponse.ok) {
            const ticketData = await ticketResponse.json();
            ticketId = ticketData.ticketId || ticketData.channelId;
            ticketCreated = true;
            await orderRef.update({
              ticket_id: ticketId,
              ticketCreated: true,
              ticketCreatedAt: new Date(),
            });
            console.log('✅ Discord ticket created:', ticketId);
          }
        } catch (error) {
          console.error('⚠️ Error creating Discord ticket:', error);
        }
      }

      return NextResponse.json({
        ok: true,
        success: true,
        message: 'Payment completed successfully',
        orderId: orderId,
        ticketCreated: ticketCreated,
        ticketId: ticketId,
      });
    }

    // Legacy flow - just mark payment as completed (backward compatibility)
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

    console.log('✅ Order payment marked completed (legacy flow):', orderId);

    // If user has Discord connected, create ticket (legacy flow)
    let ticketCreated = false;
    let ticketId = null;

    if (discordUserId) {
      const botBaseUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
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
      }
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
