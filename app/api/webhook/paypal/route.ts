import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { PayPalProvider } from '@/lib/payments/PayPalProvider';

export const dynamic = 'force-dynamic';

/**
 * PayPal Webhook Handler
 * Receives payment notifications from PayPal
 * 
 * Setup in PayPal Dashboard:
 * 1. Go to: https://developer.paypal.com/dashboard/webhooks
 * 2. Create webhook with URL: https://yourdomain.com/api/webhook/paypal
 * 3. Subscribe to events:
 *    - CHECKOUT.ORDER.APPROVED
 *    - PAYMENT.CAPTURE.COMPLETED
 *    - PAYMENT.CAPTURE.DENIED
 *    - PAYMENT.CAPTURE.DECLINED
 *    - PAYMENT.CAPTURE.REFUNDED (optional)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 [PayPal Webhook] Received callback');

    // Get payload and headers
    const payload = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log('📋 Event Type:', payload.event_type);
    console.log('🆔 Event ID:', payload.id);

    // Verify webhook signature (MVP - simplified)
    const provider = new PayPalProvider();
    const isValid = provider.verifyCallback(payload, headers);

    if (!isValid) {
      console.error('❌ [PayPal Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse callback data
    const callbackData = provider.parseCallback(payload);
    
    console.log('✅ [PayPal Webhook] Parsed data:', {
      orderId: callbackData.orderId,
      status: callbackData.status,
      providerRef: callbackData.providerRef,
    });

    if (!callbackData.orderId) {
      console.error('❌ [PayPal Webhook] No order ID found in callback');
      return NextResponse.json(
        { error: 'Order ID not found in webhook payload' },
        { status: 400 }
      );
    }

    // Update order in Firestore
    const orderRef = adminDb.collection('orders').doc(callbackData.orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('❌ [PayPal Webhook] Order not found:', callbackData.orderId);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update payment status
    const now = new Date();
    const isSuccess = callbackData.status === 'SUCCESS' || callbackData.status === 'PAID' || callbackData.status === 'COMPLETED';

    await orderRef.update({
      'payment.status': callbackData.status,
      'payment.providerRef': callbackData.providerRef,
      'payment.webhookData': payload,
      'payment.updatedAt': now,
      updatedAt: now,
      status: callbackData.status, // Also update order status
      ...(isSuccess ? { locked: true } : {}),
    });

    console.log('✅ [PayPal Webhook] Order updated successfully');

    // Trigger product delivery if payment successful
    if (callbackData.status === 'SUCCESS' || callbackData.status === 'PAID') {
      console.log('📦 [PayPal Webhook] Triggering product delivery...');
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const deliveryResponse = await fetch(`${baseUrl}/api/orders/${callbackData.orderId}/deliver`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const deliveryData = await deliveryResponse.json();
        
        if (deliveryData.ok) {
          console.log('✅ [PayPal Webhook] Product delivery triggered successfully');
        } else {
          console.error('⚠️ [PayPal Webhook] Delivery failed:', deliveryData.message);
        }
      } catch (deliveryError) {
        console.error('❌ [PayPal Webhook] Error triggering delivery:', deliveryError);
        // Don't fail the webhook - we can retry delivery later
      }
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error: any) {
    console.error('❌ [PayPal Webhook] Error:', error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
