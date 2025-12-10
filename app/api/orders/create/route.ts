import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Product } from '@/types/product';
import { verifyAuthToken } from '@/lib/authMiddleware';
import { generateOrderId } from '@/lib/orderHelpers';
import { queueEmail } from '@/lib/emailUtil';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Zod validation schema for PENDING orders (minimal requirements)
const PendingOrderSchema = z.object({
  productSlug: z.string().min(1, 'Product slug is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
  qty: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

// Zod validation schema for COMPLETED orders (full requirements)
const CompletedOrderSchema = z.object({
  userId: z.string().optional(),
  productSlug: z.string().min(1, 'Product slug is required'),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
  customerEmail: z.string().email('Valid email is required'),
  qty: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.any()).optional(),
  planId: z.string().min(1, 'Plan ID is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  proofUrl: z.string().url('Valid proof URL is required'),
  customer: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  idempotencyKey: z.string().optional(),
});

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

export async function GET(req: NextRequest) {
  return successResponse({ timestamp: new Date().toISOString() }, 'Order creation endpoint is working');
}

export async function POST(req: NextRequest) {
  try {
    logger.info('📦 [Orders/Create] Order creation request received');
    
    const body = await req.json();
    const { productSlug, planId, amount, customerEmail, paymentMethod, proofUrl, currency = 'IDR', qty = 1 } = body;

    // Determine if this is a PENDING order (no email/proof) or COMPLETED order (with everything)
    const isPendingOrder = !customerEmail && !proofUrl;

    // HARD VALIDATION - common fields
    if (!productSlug) {
      return new Response(JSON.stringify({ success: false, message: "Missing productSlug" }), { status: 400 });
    }

    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      return new Response(JSON.stringify({ success: false, message: "Missing planId" }), { status: 400 });
    }

    if (!amount || typeof amount !== "number") {
      return new Response(JSON.stringify({ success: false, message: "Invalid amount" }), { status: 400 });
    }

    // For completed orders, require additional fields
    if (!isPendingOrder) {
      if (!customerEmail || !customerEmail.includes("@")) {
        return new Response(JSON.stringify({ success: false, message: "Invalid email" }), { status: 400 });
      }

      if (!paymentMethod) {
        return new Response(JSON.stringify({ success: false, message: "Missing paymentMethod" }), { status: 400 });
      }

      if (!proofUrl) {
        return new Response(JSON.stringify({ success: false, message: "Missing payment proof" }), { status: 400 });
      }
    }

    // 1. Try to authenticate user (optional)
    const authenticatedUser = await verifyAuthToken(req);
    
    // 2. Parse and validate with appropriate schema
    let data: any;
    if (isPendingOrder) {
      const validation = PendingOrderSchema.safeParse(body);
      if (!validation.success) {
        logger.error('❌ [Orders/Create] Validation failed', { issues: validation.error.issues });
        return errorResponse('Invalid request data', 'VALIDATION_ERROR', validation.error.issues, 400);
      }
      data = validation.data;
    } else {
      const validation = CompletedOrderSchema.safeParse(body);
      if (!validation.success) {
        logger.error('❌ [Orders/Create] Validation failed', { issues: validation.error.issues });
        return errorResponse('Invalid request data', 'VALIDATION_ERROR', validation.error.issues, 400);
      }
      data = validation.data;
    }
    
    // Use authenticated user's info if available, otherwise guest
    const userId = body.userId || authenticatedUser?.uid || 'guest';
    
    logger.info('✅ [Orders/Create] Validation passed', { slug: data.productSlug, isPendingOrder });

    // 3. Idempotency check
    if (data.idempotencyKey) {
      const existingSnapshot = await db.collection('orders')
        .where('idempotencyKey', '==', data.idempotencyKey)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        return successResponse({
          orderId: existingDoc.id,
          order: { id: existingDoc.id, ...existingDoc.data() },
        }, 'Existing order returned for idempotent request');
      }
    }

    // 4. Fetch product
    const productSnapshot = await db.collection('products')
      .where('slug', '==', data.productSlug)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (productSnapshot.empty) {
      return errorResponse('Product not found or inactive', 'PRODUCT_NOT_FOUND', null, 404);
    }

    const productDoc = productSnapshot.docs[0];
    const product = { id: productDoc.id, ...productDoc.data() } as Product;

    // 5. Validate product state
    if (product.flags?.isUpdating === true) {
      return errorResponse('Product is currently being updated. Please try again later.', 'PRODUCT_UPDATING', null, 400);
    }

    if (product.flags?.isPublic === false) {
      return errorResponse('Product is not available for purchase', 'PRODUCT_NOT_PUBLIC', null, 400);
    }

    // 6. Generate custom order ID
    const customOrderId = generateOrderId();
    
    // 7. Determine plan details
    let planName = 'Standard';
    if (data.planId && product.plans) {
      const selectedPlan = product.plans.find((p: any) => p.id === data.planId);
      if (selectedPlan) {
        planName = selectedPlan.name;
      }
    }

    // 8. Create order document
    const now = new Date();
    const ordersRef = db.collection('orders');
    
    let orderData: any;
    
    if (isPendingOrder) {
      // PENDING order - awaiting payment details
      orderData = {
        id: customOrderId,
        productId: product.id,
        productSlug: data.productSlug,
        productName: product.title,
        productImage: product.heroImageUrl || `/img/${data.productSlug}-banner.png`,
        
        planId: data.planId,
        planName: planName,
        
        userId: userId,
        customerEmail: null,
        email: null,
        customer: {
          name: authenticatedUser?.email?.split('@')[0] || 'Guest',
          email: null,
        },
        
        currency: data.currency,
        sellingPrice: data.amount / (data.qty || 1),
        amount: data.amount,
        total: data.amount,
        totalAmount: data.amount,
        quantity: data.qty || 1,
        
        status: 'PENDING',
        locked: false,
        
        paymentMethod: null,
        paymentProofURL: null,
        discordId: null,
        
        payment: {
          status: 'AWAITING_PAYMENT',
          method: null,
          proofUrl: null,
          amount: data.amount,
          currency: data.currency,
          createdAt: now,
        },
        
        delivery: {
          type: product.delivery?.type || 'manual',
          status: 'PENDING',
        },
        
        createdAt: now,
        timestamp: now,
        updatedAt: now,
        
        metadata: data.metadata || {},
        idempotencyKey: data.idempotencyKey || null,
      };
    } else {
      // COMPLETED order - with payment details
      orderData = {
        id: customOrderId,
        productId: product.id,
        productSlug: data.productSlug,
        productName: product.title,
        productImage: product.heroImageUrl || `/img/${data.productSlug}-banner.png`,
        
        planId: data.planId,
        planName: planName,
        
        userId: userId,
        customerEmail: data.customerEmail,
        email: data.customerEmail,
        customer: {
          name: data.customer?.name || authenticatedUser?.email?.split('@')[0] || 'Guest',
          email: data.customerEmail,
        },
        
        currency: data.currency,
        sellingPrice: data.amount / (data.qty || 1),
        amount: data.amount,
        total: data.amount,
        totalAmount: data.amount,
        quantity: data.qty || 1,
        
        status: 'PENDING',
        locked: false,
        
        paymentMethod: data.paymentMethod,
        paymentProofURL: data.proofUrl,
        discordId: null,
        
        payment: {
          status: 'PROCESSING',
          method: data.paymentMethod,
          proofUrl: data.proofUrl,
          proofUploadedAt: now,
          amount: data.amount,
          currency: data.currency,
          createdAt: now,
        },
        
        delivery: {
          type: product.delivery?.type || 'manual',
          status: 'PENDING',
        },
        
        createdAt: now,
        timestamp: now,
        updatedAt: now,
        
        metadata: data.metadata || {},
        idempotencyKey: data.idempotencyKey || null,
      };
    }

    await ordersRef.doc(customOrderId).set(orderData);
    const orderId = customOrderId;
    
    logger.info('✅ [Orders/Create] Order created', { orderId, isPendingOrder });

    // 9. Save audit log
    try {
      await db.collection('orders').doc(orderId).collection('auditLog').add({
        event: 'ORDER_CREATED',
        actor: { userId, email: isPendingOrder ? null : data.customerEmail },
        payload: {
          productSlug: data.productSlug,
          amount: data.amount,
          isPendingOrder,
          paymentMethod: isPendingOrder ? null : data.paymentMethod,
          proofUrl: isPendingOrder ? null : data.proofUrl
        },
        timestamp: now,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    } catch (auditError) {
      logger.error('⚠️ Failed to save audit log', { error: auditError });
    }

    // For completed orders, do additional processing
    if (!isPendingOrder) {
      // 10. Sync transaction
      if (authenticatedUser && authenticatedUser.uid !== 'guest') {
        try {
          await db.collection('users').doc(authenticatedUser.uid).collection('transactions').doc(orderId).set({
            orderId: orderId,
            productId: product.id,
            productSlug: data.productSlug,
            productName: product.title,
            planId: data.planId,
            planName: planName,
            amount: data.amount,
            currency: data.currency,
            status: 'PENDING',
            paymentStatus: 'PROCESSING',
            paymentMethod: data.paymentMethod,
            paymentProofURL: data.proofUrl,
            createdAt: now,
            updatedAt: now,
          });
        } catch (syncError) {
          logger.error('⚠️ Failed to sync transaction', { error: syncError });
        }
      }

      // 11. Queue email
      try {
        await queueEmail(data.customerEmail, 'order_created', {
          orderId: orderId,
          productName: product.title,
          customerName: orderData.customer.name,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
        });
      } catch (emailError) {
        logger.error('⚠️ Failed to queue email', { error: emailError });
      }

      // 12. Create Discord ticket
      const botWebhookUrl = (process.env.BOT_WEBHOOK_URL || 'http://localhost:3001').trim();
      
      if (botWebhookUrl && botWebhookUrl.length > 0) {
        try {
          logger.info('🎮 [Orders/Create] Creating Discord ticket', { orderId });
          const ticketResponse = await fetch(`${botWebhookUrl}/create-order-ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              userId: userId,
              username: orderData.customer.name,
              email: data.customerEmail,
              productName: product.title,
              plan: planName,
              amount: data.amount,
              paymentProofUrl: data.proofUrl
            })
          });

          if (ticketResponse.ok) {
            const ticketData = await ticketResponse.json();
            const ticketId = ticketData.ticketId || ticketData.channelId;
            
            await ordersRef.doc(orderId).update({
              ticket_id: ticketId,
              ticketCreated: true,
              ticketCreatedAt: now
            });
            
            logger.info('✅ [Orders/Create] Discord ticket created', { orderId, ticketId });
          } else {
            const errorText = await ticketResponse.text();
            logger.error('❌ [Orders/Create] Failed to create Discord ticket', { error: errorText });
          }
        } catch (ticketError) {
          logger.error('❌ [Orders/Create] Error calling bot webhook', { error: ticketError });
        }
      }
    }

    return successResponse({
      orderId: orderId,
      order: {
        id: orderId,
        status: 'PENDING',
        createdAt: now.toISOString(),
      },
    }, 'Order created successfully');

  } catch (error) {
    logger.error('❌ [Orders/Create] Error creating order', { error });
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? String(error) : undefined,
      500
    );
  }
}
