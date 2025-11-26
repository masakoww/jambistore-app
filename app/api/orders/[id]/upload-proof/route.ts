import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { uploadPaymentProof } from '@/lib/discordCDN';
import { sendStaffLog, StaffLogTemplates } from '@/lib/staffLogger';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const orderId = params.id;
    const formData = await request.formData();
    const proofFile = formData.get('proof') as File;
    const email = formData.get('email') as string;

    if (!proofFile) {
      return NextResponse.json(
        { ok: false, message: 'Payment proof file is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate order exists
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    if (!orderData) {
      return NextResponse.json(
        { ok: false, message: 'Order data not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer for Discord upload
    const arrayBuffer = await proofFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Discord CDN using Bot Token
    console.log('📤 Uploading payment proof to Discord CDN...');
    const uploadResult = await uploadPaymentProof(buffer, orderId, email);

    if (!uploadResult.success || !uploadResult.url) {
      console.error('❌ Failed to upload to Discord CDN:', uploadResult.error);
      throw new Error(uploadResult.error || 'Failed to upload payment proof to Discord');
    }

    const attachmentUrl = uploadResult.url;
    console.log('✅ Discord CDN URL:', attachmentUrl);

    // Format amount for display
    const amount = orderData.totalAmount || orderData.total || orderData.amount || 0;
    const currency = orderData.currency || 'IDR';
    const formattedAmount = currency === 'IDR' 
      ? `Rp ${Math.round(amount).toLocaleString('id-ID')}`
      : `$${amount.toFixed(2)}`;

    // Update order with proof info
    await orderRef.update({
      'customer.email': email,
      'payment.status': 'PROCESSING',
      'payment.proofUrl': attachmentUrl,
      'payment.proofUploadedAt': new Date(),
      status: 'PENDING',
      updatedAt: new Date()
    });

    console.log(`✅ Payment proof uploaded for order ${orderId}`);

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.paymentProofUploaded(orderId, email, formattedAmount),
      {
        orderId,
        action: 'payment_proof_uploaded',
        details: `Product: ${orderData.productName || 'Unknown'}\nAmount: ${formattedAmount}`,
        color: 'info'
      }
    );

    // Call bot webhook to create Discord ticket (with environment guards)
    const botWebhookUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
    
    if (!botWebhookUrl || botWebhookUrl.length === 0) {
      console.warn('⚠️ [Upload-Proof] BOT_WEBHOOK_URL not configured; skipping ticket creation');
    } else {
      try {
        const ticketResponse = await fetch(`${botWebhookUrl}/create-order-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            userId: orderData.userId || email || 'unknown',
            username: orderData.customer?.name || email?.split('@')[0] || 'Customer',
            email: email,
            productName: orderData.productName || 'Unknown Product',
            plan: orderData.planName || orderData.plan || orderData.variant || 'N/A',
            amount: orderData.totalAmount || orderData.total || 0,
            paymentProofUrl: attachmentUrl
          })
        });

        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          console.log(`✅ [Upload-Proof] Ticket created: ${ticketData.ticketId}`);
        } else {
          const errorText = await ticketResponse.text();
          console.error('❌ [Upload-Proof] Failed to create ticket:', errorText);
        }
      } catch (ticketError) {
        console.error('❌ [Upload-Proof] Error calling bot webhook:', ticketError);
        // Non-critical error, continue anyway
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment proof uploaded successfully. Admin will process your order shortly.',
      orderId
    });

  } catch (error) {
    console.error('Error uploading payment proof:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Failed to upload payment proof'
      },
      { status: 500 }
    );
  }
}
