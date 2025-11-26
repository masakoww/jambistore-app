/**
 * Unified Delivery Handler Library
 * Used by webhook and admin closure for product delivery
 * 
 * Delivery Types:
 * 1. PRELOADED - Delivers from Firestore stock collection
 * 2. API - Calls external API for delivery
 * 3. MANUAL - Sets to PENDING for manual handling
 */

import { adminDb } from './firebaseAdmin';
import { queueEmail } from './emailUtil';

export interface DeliveryResult {
  success: boolean;
  message: string;
  deliveredData?: any;
  error?: any;
}

interface Order {
  id?: string;
  productId: string;
  productSlug: string;
  productName: string;
  customerEmail: string;
  customer?: {
    name?: string;
    email?: string;
  };
  userId?: string;
  [key: string]: any;
}

interface Product {
  id?: string;
  slug: string;
  title: string;
  delivery?: {
    type: 'preloaded' | 'api' | 'manual';
    instructions?: string;
    apiConfig?: {
      endpoint: string;
      method?: string;
      apiKey?: string;
      headers?: Record<string, string>;
      payloadTemplate?: Record<string, any>;
      retryAttempts?: number;
      retryDelay?: number;
    };
  };
  [key: string]: any;
}

/**
 * Deliver preloaded product from stock
 * Uses Firestore transaction to ensure atomic stock management
 */
export async function deliverPreloadedProduct(
  order: Order,
  product: Product,
  actor: { type: 'admin' | 'system'; userId?: string; email?: string } = { type: 'system' }
): Promise<DeliveryResult> {
  try {
    console.log(`📦 [Delivery/Preloaded] Starting delivery for order: ${order.id}`);
    
    const orderId = order.id!;
    const productSlug = product.slug;

    if (!order.customerEmail) {
      throw new Error('Customer email is required for delivery');
    }

    // Use Firestore transaction to atomically get and mark stock item as used
    const result = await adminDb.runTransaction(async (transaction) => {
      // Find an unused stock item
      const stockQuery = adminDb
        .collection('stock')
        .doc(productSlug)
        .collection('items')
        .where('used', '==', false)
        .limit(1);

      const stockSnapshot = await transaction.get(stockQuery);

      if (stockSnapshot.empty) {
        throw new Error('No stock available for this product');
      }

      const stockDoc = stockSnapshot.docs[0];
      const stockItem = stockDoc.data();

      // Mark item as used
      transaction.update(stockDoc.ref, {
        used: true,
        usedAt: new Date(),
        usedBy: orderId,
        usedByEmail: order.customerEmail,
      });

      // Update order with delivery content (admin-readable only)
      const orderRef = adminDb.collection('orders').doc(orderId);
      transaction.update(orderRef, {
        'delivery.status': 'DELIVERED',
        'delivery.deliveredAt': new Date(),
        'delivery.content': {
          itemId: stockDoc.id,
          ...stockItem, // Contains username/password or key
        },
        'delivery.deliveredBy': actor.userId || 'system',
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      // SYNC TRANSACTION HISTORY
      if (order.userId && order.userId !== 'guest') {
        const txRef = adminDb.collection('users').doc(order.userId).collection('transactions').doc(orderId);
        transaction.update(txRef, {
          status: 'COMPLETED',
          deliveryStatus: 'DELIVERED',
          updatedAt: new Date()
        });
      }

      return {
        itemId: stockDoc.id,
        content: stockItem,
      };
    });

    console.log(`✅ [Delivery/Preloaded] Delivered item: ${result.itemId}`);

    // Write audit log entry (outside transaction)
    await adminDb
      .collection('orders')
      .doc(orderId)
      .collection('auditLog')
      .add({
        event: 'DELIVERED_PRELOADED',
        actor: {
          type: actor.type,
          userId: actor.userId,
          email: actor.email,
        },
        payload: {
          itemId: result.itemId,
          productSlug: productSlug,
        },
        timestamp: new Date(),
      });

    // Queue "Order Delivered" email
    await queueEmail(order.customerEmail, 'order_delivered', {
      orderId: orderId,
      productName: product.title,
      customerName: order.customer?.name,
      content: Object.entries(result.content)
        .filter(([key]) => !['used', 'usedAt', 'usedBy'].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n'),
    });

    // Queue "Review Request" email (3 minutes delay)
    await queueEmail(
      order.customerEmail,
      'review_request',
      {
        productName: product.title,
        customerName: order.customer?.name,
        productSlug: productSlug,
      },
      3 // 3 minutes delay
    );

    console.log(`📧 [Delivery/Preloaded] Emails queued for: ${order.customerEmail}`);

    return {
      success: true,
      message: 'Product delivered successfully',
      deliveredData: {
        type: 'preloaded',
        itemId: result.itemId,
        deliveredAt: new Date().toISOString(),
      },
    };

    console.log(`📧 [Delivery/Preloaded] Email sent to: ${order.customerEmail}`);

    return {
      success: true,
      message: 'Product delivered successfully',
      deliveredData: {
        type: 'preloaded',
        itemId: result.itemId,
        deliveredAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('❌ [Delivery/Preloaded] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to deliver preloaded product',
      error: error.message,
    };
  }
}

/**
 * Deliver product via external API
 * Includes retry logic with exponential backoff
 */
export async function deliverViaAPI(
  order: Order,
  product: Product,
  actor: { type: 'admin' | 'system'; userId?: string; email?: string } = { type: 'system' }
): Promise<DeliveryResult> {
  try {
    console.log(`🔌 [Delivery/API] Starting API delivery for order: ${order.id}`);

    const orderId = order.id!;
    const apiConfig = product.delivery?.apiConfig;

    if (!order.customerEmail) {
      throw new Error('Customer email is required for API delivery');
    }

    if (!apiConfig || !apiConfig.endpoint) {
      return {
        success: false,
        message: 'No API delivery configuration found for this product',
      };
    }

    // Prepare payload with template substitution
    const payload = {
      orderId: orderId,
      productId: product.id,
      productSlug: product.slug,
      productName: product.title,
      customerEmail: order.customerEmail,
      customerName: order.customer?.name,
      ...apiConfig.payloadTemplate, // Merge custom payload
    };

    // Retry configuration
    const maxRetries = apiConfig.retryAttempts || 3;
    const baseDelay = apiConfig.retryDelay || 1000; // 1 second
    let lastError: any;

    // Retry with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 [Delivery/API] Attempt ${attempt + 1}/${maxRetries + 1}`);

        const response = await fetch(apiConfig.endpoint, {
          method: apiConfig.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiConfig.apiKey && { Authorization: `Bearer ${apiConfig.apiKey}` }),
            ...apiConfig.headers,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // Check if error is temporary (5xx) or permanent (4xx)
          if (response.status >= 500 && attempt < maxRetries) {
            throw new Error(`Temporary server error: ${response.status}`);
          } else {
            const errorText = await response.text();
            throw new Error(`API error ${response.status}: ${errorText}`);
          }
        }

        const apiResponse = await response.json();

        console.log(`✅ [Delivery/API] API delivery successful`);

        // Save API response to order
        const orderRef = adminDb.collection('orders').doc(orderId);
        await orderRef.update({
          'delivery.status': 'DELIVERED',
          'delivery.deliveredAt': new Date(),
          'delivery.content': {
            transactionId: apiResponse.transactionId || apiResponse.id,
            apiResponse: apiResponse,
          },
          'delivery.deliveredBy': actor.userId || 'system',
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        // SYNC TRANSACTION HISTORY
        if (order.userId && order.userId !== 'guest') {
           await adminDb.collection('users').doc(order.userId).collection('transactions').doc(orderId).update({
             status: 'COMPLETED',
             deliveryStatus: 'DELIVERED',
             updatedAt: new Date()
           }).catch(err => console.warn('Failed to sync transaction:', err));
        }

        // Write audit log
        await orderRef.collection('auditLog').add({
          event: 'DELIVERED_API',
          actor: {
            type: actor.type,
            userId: actor.userId,
            email: actor.email,
          },
          payload: {
            endpoint: apiConfig.endpoint,
            transactionId: apiResponse.transactionId || apiResponse.id,
            attempts: attempt + 1,
          },
          timestamp: new Date(),
        });

        // Queue "Order Delivered" email
        await queueEmail(order.customerEmail, 'order_delivered', {
          orderId: orderId,
          productName: product.title,
          customerName: order.customer?.name,
          content: product.delivery?.instructions || 'Please check your account for the delivered product.',
        });

        // Queue "Review Request" email (3 minutes delay)
        await queueEmail(
          order.customerEmail,
          'review_request',
          {
            productName: product.title,
            customerName: order.customer?.name,
            productSlug: product.slug,
          },
          3
        );

        console.log(`📧 [Delivery/API] Emails queued for: ${order.customerEmail}`);

        console.log(`📧 [Delivery/API] Email sent to: ${order.customerEmail}`);

        return {
          success: true,
          message: 'Product delivered via API successfully',
          deliveredData: {
            type: 'api',
            transactionId: apiResponse.transactionId || apiResponse.id,
            apiResponse: apiResponse,
            deliveredAt: new Date().toISOString(),
          },
        };
      } catch (error: any) {
        lastError = error;
        console.error(`❌ [Delivery/API] Attempt ${attempt + 1} failed:`, error.message);

        // If not last attempt, wait with exponential backoff
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`⏳ [Delivery/API] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('❌ [Delivery/API] All retry attempts failed');
    return {
      success: false,
      message: `Failed to deliver via API after ${maxRetries + 1} attempts`,
      error: lastError?.message,
    };
  } catch (error: any) {
    console.error('❌ [Delivery/API] Error:', error);
    return {
      success: false,
      message: 'Failed to deliver product via API',
      error: error.message,
    };
  }
}

/**
 * Mark order as pending admin manual delivery
 * Notifies admin via Discord and customer via email
 */
export async function markPendingAdmin(
  order: Order,
  product: Product
): Promise<DeliveryResult> {
  try {
    console.log(`👤 [Delivery/Manual] Setting order to manual delivery: ${order.id}`);

    const orderId = order.id!;
    const orderRef = adminDb.collection('orders').doc(orderId);

    // Update order status
    await orderRef.update({
      status: 'PENDING', // Enforce PENDING
      'delivery.type': 'manual',
      'delivery.status': 'AWAITING_ADMIN',
      'delivery.instructions': product.delivery?.instructions || 'Awaiting admin verification',
      updatedAt: new Date(),
    });

    // SYNC TRANSACTION HISTORY
    if (order.userId && order.userId !== 'guest') {
       await adminDb.collection('users').doc(order.userId).collection('transactions').doc(orderId).update({
         status: 'PENDING',
         deliveryStatus: 'PENDING',
         updatedAt: new Date()
       }).catch(err => console.warn('Failed to sync transaction:', err));
    }

    // Write audit log
    await orderRef.collection('auditLog').add({
      event: 'MARKED_PENDING_ADMIN',
      actor: {
        type: 'system',
      },
      payload: {
        productSlug: product.slug,
        reason: 'Manual delivery required',
      },
      timestamp: new Date(),
    });

    // Send Discord notification to admin
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      try {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: '📋 **New Manual Delivery Required**',
            embeds: [
              {
                title: '⚠️ Manual Delivery Needed',
                color: 16753920, // Orange color
                fields: [
                  {
                    name: 'Order ID',
                    value: orderId,
                    inline: true,
                  },
                  {
                    name: 'Product',
                    value: product.title,
                    inline: true,
                  },
                  {
                    name: 'Customer',
                    value: order.customer?.name || order.customerEmail,
                    inline: true,
                  },
                  {
                    name: 'Email',
                    value: order.customerEmail,
                    inline: true,
                  },
                  {
                    name: 'Amount',
                    value: `Rp ${(order.amount || order.total || 0).toLocaleString('id-ID')}`,
                    inline: true,
                  },
                  {
                    name: 'Status',
                    value: 'PENDING',
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
                footer: {
                  text: 'Please deliver this order manually',
                },
              },
            ],
          }),
        });

        console.log('✅ [Delivery/Manual] Discord notification sent');
      } catch (discordError) {
        console.error('❌ [Delivery/Manual] Failed to send Discord notification:', discordError);
      }
    }

    // Queue "Manual Pending" email
    await queueEmail(order.customerEmail, 'manual_pending', {
      orderId: orderId,
      productName: product.title,
      customerName: order.customer?.name,
    });

    console.log(`📧 [Delivery/Manual] Email queued for: ${order.customerEmail}`);

    console.log(`✅ [Delivery/Manual] Order set to manual delivery`);

    return {
      success: true,
      message: 'Order set to manual delivery',
      deliveredData: {
        type: 'manual',
        status: 'AWAITING_ADMIN',
      },
    };
  } catch (error: any) {
    console.error('❌ [Delivery/Manual] Error:', error);
    return {
      success: false,
      message: 'Failed to set manual delivery',
      error: error.message,
    };
  }
}

/**
 * Main delivery handler - routes to appropriate delivery method
 * This is the unified entry point used by webhooks and admin actions
 */
export async function handleDelivery(
  orderId: string,
  productId: string,
  orderData: any,
  actor?: { type: 'admin' | 'system'; userId?: string; email?: string }
): Promise<DeliveryResult> {
  try {
    // Get product to determine delivery type
    const productDoc = await adminDb.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return {
        success: false,
        message: 'Product not found',
      };
    }

    const product = { id: productDoc.id, ...productDoc.data() } as Product;
    const order = { id: orderId, ...orderData } as Order;
    const deliveryType = product.delivery?.type || 'manual';

    console.log(`📦 [Delivery] Handling ${deliveryType} delivery for order: ${orderId}`);

    let result: DeliveryResult;

    switch (deliveryType.toLowerCase()) {
      case 'preloaded':
      case 'auto':
        result = await deliverPreloadedProduct(order, product, actor);
        break;

      case 'api':
        result = await deliverViaAPI(order, product, actor);
        break;

      case 'manual':
      default:
        result = await markPendingAdmin(order, product);
        break;
    }

    // Update order with delivery result if failed
    if (!result.success) {
      await adminDb.collection('orders').doc(orderId).update({
        'delivery.error': result.error,
        'delivery.errorMessage': result.message,
        updatedAt: new Date(),
      });
    }

    return result;
  } catch (error: any) {
    console.error('❌ [Delivery] Error:', error);
    return {
      success: false,
      message: 'Failed to handle delivery',
      error: error.message,
    };
  }
}
