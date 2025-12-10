import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { queueEmail } from '@/lib/emailUtil';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const body = await req.json();
    const { type, email, password, code, notes, senderName, senderDiscordId } = body;

    // Fetch order from Firestore
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderDoc.data();
    const customerEmail = order?.customerEmail || order?.email;
    
    if (!customerEmail) {
      return NextResponse.json(
        { success: false, message: 'Customer email not found' },
        { status: 400 }
      );
    }

    // Prepare email content based on type
    let emailContent = '';
    let productData: any = {};
    
    if (type === 'account') {
      emailContent = `
Account Credentials:
Email/Username: ${email}
Password: ${password}
${notes ? `\nAdditional Notes:\n${notes}` : ''}
      `.trim();
      
      productData = { email, password, notes };
    } else if (type === 'code') {
      emailContent = `
Redemption Code: ${code}
${notes ? `\nInstructions:\n${notes}` : ''}
      `.trim();
      
      productData = { code, instructions: notes };
    }

    // Send email to customer
    await queueEmail(
      customerEmail,
      'order_delivered',
      {
        orderId: orderId,
        productName: order?.productName || 'Product',
        customerName: customerEmail.split('@')[0],
        content: emailContent
      }
    );

    // Update order in Firestore
    await adminDb.collection('orders').doc(orderId).update({
      status: 'COMPLETED',
      deliveryMethod: type,
      deliveredAt: new Date(),
      deliveredBy: senderDiscordId || 'bot',
      productData: productData
    });

    // Notify bot ticket (if bot webhook is configured)
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL;
    if (botWebhookUrl) {
      try {
        await fetch(`${botWebhookUrl}/notify-delivery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            type,
            senderName: senderName || 'Admin',
            senderDiscordId
          })
        });
      } catch (webhookError) {
        console.error('Failed to notify bot:', webhookError);
        // Don't fail the whole request if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product sent to customer successfully'
    });

  } catch (error: any) {
    console.error('Error sending product:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send product' },
      { status: 500 }
    );
  }
}
