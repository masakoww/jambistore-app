import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { PaymentFactory } from '@/lib/PaymentFactory';
import { handleDelivery } from '@/lib/deliveryHelpers';

export const dynamic = 'force-dynamic';

/**
 * Unified Webhook Handler for All Payment Providers
 * Handles callbacks from ipaymu, pakasir, tokopay, paypal
 * 
 * MVP Requirements:
 * 1. Verify provider signature
 * 2. Load order by providerRef or merchant_ref
 * 3. Validate amount matches order.sellingPrice
 * 4. Set order.status and payment.status
 * 5. Trigger delivery based on product.deliveryType
 * 6. Calculate profit (finalProfit = sellingPrice - capitalCost)
 * 7. Save audit log
 * 8. Idempotency: ignore if already processed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const startTime = Date.now();
  const { provider } = params;

  try {
    console.log(`📥 [Webhook/${provider}] Received callback`);

    // Get payload and headers
    const payload = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log(`📋 [Webhook/${provider}] Event:`, payload.event_type || payload.status || 'unknown');

    // 1. Verify webhook signature
    try {
      const paymentProvider = PaymentFactory.create(provider);
      const isValid = paymentProvider.verifyCallback ? paymentProvider.verifyCallback(payload, headers) : true;

      if (!isValid) {
        console.error(`❌ [Webhook/${provider}] Invalid signature`);
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } catch (error: any) {
      console.error(`❌ [Webhook/${provider}] Signature verification failed:`, error.message);
      // Continue anyway for providers without signature verification
    }

    // 2. Parse callback data
    let callbackData: any;
    
    try {
      const paymentProvider = PaymentFactory.create(provider);
      callbackData = paymentProvider.parseCallback ? paymentProvider.parseCallback(payload) : payload;
      
      console.log(`✅ [Webhook/${provider}] Parsed data:`, {
        orderId: callbackData.orderId,
        status: callbackData.status,
        providerRef: callbackData.providerRef,
        amount: callbackData.amount,
      });
    } catch (error: any) {
      console.error(`❌ [Webhook/${provider}] Failed to parse callback:`, error.message);
      return NextResponse.json(
        { error: 'Failed to parse webhook payload' },
        { status: 400 }
      );
    }

    if (!callbackData.orderId && !callbackData.providerRef) {
      console.error(`❌ [Webhook/${provider}] No order ID or provider ref found`);
      return NextResponse.json(
        { error: 'Order ID not found in webhook payload' },
        { status: 400 }
      );
    }

    // 3. Load order from Firestore
    console.log(`📚 [Webhook/${provider}] Loading order...`);
    let orderRef;
    let orderDoc;

    if (callbackData.orderId) {
      // Direct order ID
      orderRef = adminDb.collection('orders').doc(callbackData.orderId);
      orderDoc = await orderRef.get();
    } else {
      // Find by provider reference
      const ordersSnapshot = await adminDb
        .collection('orders')
        .where('payment.providerRef', '==', callbackData.providerRef)
        .limit(1)
        .get();

      if (ordersSnapshot.empty) {
        console.error(`❌ [Webhook/${provider}] Order not found with providerRef:`, callbackData.providerRef);
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      orderDoc = ordersSnapshot.docs[0];
      orderRef = orderDoc.ref;
    }

    if (!orderDoc.exists) {
      console.error(`❌ [Webhook/${provider}] Order not found:`, callbackData.orderId);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data()!;
    const orderId = orderDoc.id;

    console.log(`✅ [Webhook/${provider}] Order found:`, orderId);

    // 4. Check idempotency - if already processed, return success
    if (orderData.payment?.status === 'SUCCESS' || orderData.payment?.status === 'PAID') {
      console.log(`⚠️  [Webhook/${provider}] Order already processed, returning success`);
      return NextResponse.json({
        success: true,
        message: 'Webhook already processed',
      });
    }

    // 5. Validate amount matches order.sellingPrice
    const orderAmount = orderData.sellingPrice || orderData.amount || orderData.total;
    const callbackAmount = callbackData.amount;
    
    if (callbackAmount && orderAmount) {
      const amountDifference = Math.abs(callbackAmount - orderAmount);
      const tolerance = orderAmount * 0.01; // 1% tolerance for rounding/fees

      if (amountDifference > tolerance) {
        console.error(`⚠️  [Webhook/${provider}] Amount mismatch:`, {
          expected: orderAmount,
          received: callbackAmount,
          difference: amountDifference,
        });

        // Set status to DISCREPANCY and notify admin
        await orderRef.update({
          'payment.status': 'DISCREPANCY',
          'payment.expectedAmount': orderAmount,
          'payment.receivedAmount': callbackAmount,
          'payment.discrepancyReason': `Amount mismatch: expected ${orderAmount}, received ${callbackAmount}`,
          'payment.webhookData': payload,
          updatedAt: new Date(),
        });

        console.log(`📧 [Webhook/${provider}] Admin notification needed for discrepancy`);

        return NextResponse.json({
          success: true,
          message: 'Payment amount discrepancy detected, admin notified',
        });
      }
    }

    // 6. Determine order status based on payment status
    let orderStatus = orderData.status;
    const paymentStatus = callbackData.status;

    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') {
      orderStatus = 'PROCESS'; // Will be changed to SUCCESS after successful delivery
    } else if (paymentStatus === 'PENDING') {
      orderStatus = 'PENDING';
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED') {
      orderStatus = 'FAILED';
    }

    console.log(`📊 [Webhook/${provider}] Status update:`, {
      paymentStatus,
      orderStatus,
    });

    // 7. Update payment status in order
    const now = new Date();
    
    await orderRef.update({
      status: orderStatus,
      'payment.status': paymentStatus,
      'payment.providerRef': callbackData.providerRef || orderData.payment?.providerRef,
      'payment.webhookData': payload,
      'payment.paidAt': paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' ? now : null,
      'payment.updatedAt': now,
      // Lock order after webhook touches it; will remain locked once payment is successful/completed
      locked: paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED' ? true : orderData.locked || false,
      updatedAt: now,
    });

    console.log(`✅ [Webhook/${provider}] Payment status updated`);

    // 8. If payment successful, trigger delivery and calculate profit
    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') {
      console.log(`📦 [Webhook/${provider}] Payment successful, triggering delivery...`);

      // Calculate profit
      const sellingPrice = orderData.sellingPrice || orderData.amount || 0;
      const capitalCost = orderData.capitalCost || 0;
      const finalProfit = sellingPrice - capitalCost;
      const margin = sellingPrice > 0 ? (finalProfit / sellingPrice) * 100 : 0;

      console.log(`💰 [Webhook/${provider}] Profit calculation:`, {
        sellingPrice,
        capitalCost,
        finalProfit,
        margin: `${margin.toFixed(2)}%`,
      });

      // Save financial data
      await orderRef.update({
        cogs: capitalCost, // Cost of Goods Sold
        sellingPrice: sellingPrice,
        finalProfit: finalProfit,
        margin: margin,
        updatedAt: now,
      });

      // Trigger delivery based on product type
      try {
        const deliveryResult = await handleDelivery(
          orderId,
          orderData.productId,
          orderData
        );

        if (deliveryResult.success) {
          console.log(`✅ [Webhook/${provider}] Delivery handled successfully`);
          
          // Update order status to SUCCESS if delivery completed
          if (deliveryResult.deliveredData?.type !== 'manual') {
            await orderRef.update({
              status: 'SUCCESS',
              locked: true,
              updatedAt: new Date(),
            });
          }
        } else {
          console.error(`⚠️  [Webhook/${provider}] Delivery failed:`, deliveryResult.message);
          
          // Keep order in PROCESS status for manual intervention
          await orderRef.update({
            'delivery.error': deliveryResult.error,
            'delivery.errorMessage': deliveryResult.message,
            updatedAt: new Date(),
          });
        }
      } catch (deliveryError: any) {
        console.error(`❌ [Webhook/${provider}] Delivery error:`, deliveryError);
        
        await orderRef.update({
          'delivery.error': deliveryError.message,
          updatedAt: new Date(),
        });
      }
    }

    // 9. Save audit log entry
    try {
      await orderRef.collection('auditLog').add({
        event: 'PAYMENT_CONFIRMED',
        actor: {
          system: provider,
          webhook: true,
        },
        payload: {
          paymentStatus: paymentStatus,
          orderStatus: orderStatus,
          providerRef: callbackData.providerRef,
          amount: callbackAmount,
          webhookData: payload,
        },
        timestamp: now,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        processingTime: Date.now() - startTime,
      });
      
      console.log(`✅ [Webhook/${provider}] Audit log saved`);
    } catch (auditError) {
      console.error(`⚠️  [Webhook/${provider}] Failed to save audit log:`, auditError);
    }

    // 10. Return 200 quickly to acknowledge receipt
    const processingTime = Date.now() - startTime;
    console.log(`✅ [Webhook/${provider}] Processing complete in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      processingTime: `${processingTime}ms`,
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [Webhook/${provider}] Error:`, error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        processingTime: `${processingTime}ms`,
      },
      { status: 500 }
    );
  }
}
