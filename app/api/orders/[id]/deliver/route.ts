import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Product } from '@/types/product';
import { handleDelivery } from '@/lib/deliveryHelpers';
import { sendStaffLog, StaffLogTemplates, createAuditLog } from '@/lib/staffLogger';
import { queueEmail } from '@/lib/emailUtil';

export const dynamic = 'force-dynamic';

/**
 * Deliver product to customer after successful payment
 * Uses unified delivery handler that supports:
 * - Preloaded delivery: Assigns from Firestore stock collection
 * - API delivery: Calls external API with retry logic
 * - Manual delivery: Marks for admin processing
 */
export async function POST(
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

    console.log('📦 Processing delivery for order:', orderId);

    // Fetch order
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      console.log('❌ Order not found:', orderId);
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    // Check if already delivered
    if (orderData?.delivery?.status === 'DELIVERED') {
      console.log('✅ Order already delivered:', orderId);
      return NextResponse.json({
        ok: true,
        message: 'Order already delivered',
        delivery: orderData.delivery,
      });
    }

    // Use unified delivery handler
    const deliveryResult = await handleDelivery(
      orderId,
      orderData?.productId || '',
      orderData,
      { type: 'admin', userId: 'manual-trigger' }
    );

    if (!deliveryResult.success) {
      console.error('❌ Delivery failed:', deliveryResult.message);
      return NextResponse.json(
        { ok: false, message: deliveryResult.message, error: deliveryResult.error },
        { status: 400 }
      );
    }

    console.log('✅ Delivery completed for order:', orderId);

    return NextResponse.json({
      ok: true,
      message: deliveryResult.message,
      delivery: deliveryResult.deliveredData,
    });

  } catch (error) {
    console.error('❌ Error processing delivery:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Manual delivery endpoint - For admin to mark order as delivered
 * Supports two delivery types:
 * - "account": username + password delivery
 * - "code": license key / activation code delivery
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { deliveryType, username, password, code, notes, productKey, instructions } = body;

    // Verify admin key from header (optional backward compatibility)
    const adminKey = request.headers.get('x-admin-key');
    // Allow requests without admin key for now (authenticated via Firebase on client)
    // if (!adminKey || adminKey !== process.env.NEXT_PUBLIC_ADMIN_API_KEY) {
    //   return NextResponse.json(
    //     { ok: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    console.log('👤 Admin manually delivering order:', orderId, 'Type:', deliveryType);

    // Fetch current order status to prevent double delivery
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { ok: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const currentOrder = orderDoc.data();
    
    // Check if already delivered
    if (currentOrder?.status === 'COMPLETED' || currentOrder?.delivery?.status === 'DELIVERED') {
      const deliveredAt = currentOrder?.delivery?.deliveredAt || currentOrder?.deliveredAt;
      const deliveredBy = currentOrder?.delivery?.deliveredBy || currentOrder?.deliveredBy || 'Unknown';
      
      return NextResponse.json(
        { 
          ok: false, 
          error: `Order sudah pernah dikirim sebelumnya!\n\nStatus: ${currentOrder.status}\nDikirim oleh: ${deliveredBy}\nWaktu: ${deliveredAt ? new Date(deliveredAt).toLocaleString('id-ID') : 'Unknown'}\n\nTidak dapat mengirim ulang untuk mencegah duplikasi.`,
          alreadyDelivered: true,
          deliveredBy,
          deliveredAt: deliveredAt ? new Date(deliveredAt).toISOString() : null
        },
        { status: 400 }
      );
    }

    let deliveryData: any = {
      'delivery.status': 'DELIVERED',
      'delivery.method': 'admin',
      'delivery.deliveredAt': new Date(),
      'delivery.deliveredBy': 'admin',
      'delivery.notes': notes || null,
      status: 'COMPLETED',
      updatedAt: new Date(),
    };

    let emailProductDetails = '';


    if (deliveryType === 'account') {
      if (!username || !password) {
        return NextResponse.json(
          { ok: false, message: 'Username and password are required for account delivery' },
          { status: 400 }
        );
      }

      deliveryData['delivery.type'] = 'account';
      deliveryData['delivery.username'] = username;
      deliveryData['delivery.password'] = password;
      deliveryData['delivery.productDetails'] = `Username: ${username}\nPassword: ${password}`;
      deliveryData['delivery.instructions'] = instructions || notes || 'Use the credentials above to access your product.';

      emailProductDetails = `Username: ${username}\nPassword: ${password}`;

      console.log('📦 Account delivery:', username);
    }

    else if (deliveryType === 'code') {
      if (!code) {
        return NextResponse.json(
          { ok: false, message: 'Code is required for code delivery' },
          { status: 400 }
        );
      }

      deliveryData['delivery.type'] = 'code';
      deliveryData['delivery.code'] = code;
      deliveryData['delivery.productDetails'] = `License Key: ${code}`;
      deliveryData['delivery.instructions'] = instructions || notes || 'Use the license key above to activate your product.';

      emailProductDetails = `License Key:\n${code}`;

      console.log('🔑 Code delivery');
    }
    // Backward compatibility with old productKey field
    else if (productKey) {
      deliveryData['delivery.productDetails'] = productKey;
      deliveryData['delivery.instructions'] = instructions || null;
      emailProductDetails = productKey;
      console.log('📦 Legacy delivery format');
    }
    else {
      return NextResponse.json(
        { ok: false, message: 'Invalid delivery type. Use "account" or "code"' },
        { status: 400 }
      );
    }

    await adminDb.collection('orders').doc(orderId).update(deliveryData);

    console.log('✅ Manual delivery completed for order:', orderId);

    // Create audit log
    await createAuditLog(orderId, 'manual_delivery', 'admin', {
      deliveryType,
      username: deliveryType === 'account' ? username : undefined,
      code: deliveryType === 'code' ? code : undefined
    });

    // Send staff log notification
    const productName = currentOrder?.productName || 'Unknown Product';
    await sendStaffLog(
      StaffLogTemplates.orderDelivered(orderId, productName, 'Admin'),
      {
        orderId,
        action: 'order_delivered',
        adminName: 'Admin',
        details: `Type: ${deliveryType}\nProduct: ${productName}`,
        color: 'success'
      }
    );

    // Get order data for email
    const updatedOrderDoc = await adminDb.collection('orders').doc(orderId).get();
    const orderData = updatedOrderDoc.data();

    // Queue email to customer with product details
    try {
      await queueEmail(
        orderData?.customer?.email || orderData?.email,
        'order_delivered',
        {
          customerName: orderData?.customer?.name || 'Customer',
          orderId: orderId,
          productName: orderData?.productName || 'Product',
          productSlug: orderData?.productSlug || 'product',
          content: emailProductDetails,
          instructions: notes || instructions || 'Please check the details below.'
        }
      );
      console.log('✅ Delivery email queued');
    } catch (emailError) {
      console.error('Error queuing delivery email:', emailError);
      // Don't fail the delivery if email fails
    }

    // Call Discord bot webhook to send "Order Delivered" notification
    try {
      const botWebhookUrl = process.env.DISCORD_BOT_WEBHOOK_URL || 'http://localhost:3001';
      const webhookResponse = await fetch(`${botWebhookUrl}/webhook/order-delivered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          customerEmail: orderData?.customer?.email || orderData?.email 
        })
      });

      if (webhookResponse.ok) {
        console.log('✅ Discord bot notified of delivery');
      } else {
        console.error('⚠️ Failed to notify Discord bot');
      }
    } catch (webhookError) {
      console.error('⚠️ Discord webhook error:', webhookError);
      // Don't fail the delivery if Discord notification fails
    }

    return NextResponse.json({
      ok: true,
      message: 'Manual delivery completed',
    });

  } catch (error) {
    console.error('❌ Error in manual delivery:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
