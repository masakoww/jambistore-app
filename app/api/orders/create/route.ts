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

// Zod validation schema
const OrderCreateSchema = z.object({
  userId: z.string().optional(), // Optional - will use authenticated user if not provided
  productSlug: z.string().min(1, 'Product slug is required'),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
  customerEmail: z.string().email('Valid email is required').optional(), // Optional for guest checkout
  qty: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.any()).optional(),
  // Legacy support
  planId: z.string().optional(),
  customer: z.object({
    name: z.string().optional(),
    email: z.string().optional(), // Allow empty email - will be collected on payment page
    phone: z.string().optional(),
  }).optional(),
  amount: z.number().optional(),
  // Idempotency key to prevent duplicate orders from double submission
  idempotencyKey: z.string().optional(),
});

type OrderCreateInput = z.infer<typeof OrderCreateSchema>;


export async function OPTIONS(request: NextRequest) {
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


export async function GET(request: NextRequest) {
  return successResponse({ timestamp: new Date().toISOString() }, 'Order creation endpoint is working');
}

export async function POST(request: NextRequest) {
  try {
    logger.info('📦 [Orders/Create] Order creation request received');
    
    // 1. Try to authenticate user (optional for guest checkout)
    const authenticatedUser = await verifyAuthToken(request);
    
    if (authenticatedUser) {
      logger.info('✅ [Orders/Create] User authenticated', { uid: authenticatedUser.uid, email: authenticatedUser.email });
    } else {
      logger.info('👤 [Orders/Create] Guest checkout - no authentication');
    }
    
    // 2. Parse and validate request body
    const body = await request.json();
    logger.debug('📝 [Orders/Create] Request body', body);
    
    const validation = OrderCreateSchema.safeParse(body);
    
    if (!validation.success) {
      logger.error('❌ [Orders/Create] Validation failed', { issues: validation.error.issues });
      return errorResponse('Invalid request data', 'VALIDATION_ERROR', validation.error.issues, 400);
    }

    const data = validation.data;
    
    // Use authenticated user's info if available, otherwise guest
    const userId = data.userId || authenticatedUser?.uid || 'guest';
    const customerEmail = data.customerEmail || authenticatedUser?.email || data.customer?.email || '';

    // STRICT EMAIL VALIDATION
    if (!customerEmail && userId !== 'guest') {
       return errorResponse('Email is required for authenticated orders.', 'VALIDATION_ERROR', null, 400);
    }
    if (!customerEmail) {
       logger.warn('⚠️ Creating order without email (Guest). Delivery might fail if not provided later.');
    }
    
    logger.info('✅ [Orders/Create] Validation passed, fetching product', { slug: data.productSlug });

    // 3. Idempotency check
    if (data.idempotencyKey) {
      logger.info('🔐 [Orders/Create] Idempotency key provided, checking existing orders');

      const existingSnapshot = await db.collection('orders')
        .where('idempotencyKey', '==', data.idempotencyKey)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingOrder = existingDoc.data();

        logger.warn('⚠️  [Orders/Create] Existing order found for idempotencyKey', { orderId: existingDoc.id });

        return successResponse({
          orderId: existingDoc.id,
          order: {
            id: existingDoc.id,
            productSlug: existingOrder.productSlug,
            currency: existingOrder.currency,
            sellingPrice: existingOrder.sellingPrice,
            totalAmount: existingOrder.totalAmount ?? existingOrder.total ?? existingOrder.amount,
            status: existingOrder.status,
            createdAt: existingOrder.createdAt,
            locked: existingOrder.locked === true,
          },
        }, 'Existing order returned for idempotent request');
      }
    }

    // 3. Fetch product from Firestore by slug (server-side with admin SDK)
    const productSnapshot = await db.collection('products')
      .where('slug', '==', data.productSlug)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (productSnapshot.empty) {
      logger.error('❌ [Orders/Create] Product not found', { slug: data.productSlug });
      return errorResponse('Product not found or inactive', 'PRODUCT_NOT_FOUND', null, 404);
    }

    const productDoc = productSnapshot.docs[0];
    const product = { id: productDoc.id, ...productDoc.data() } as Product;

    logger.info('✅ [Orders/Create] Product found', { id: product.id, title: product.title });

    // 4. Validate product state
    if (product.flags?.isUpdating === true) {
      logger.error('❌ [Orders/Create] Product is updating');
      return errorResponse('Product is currently being updated. Please try again later.', 'PRODUCT_UPDATING', null, 400);
    }

    if (product.flags?.isPublic === false) {
      logger.error('❌ [Orders/Create] Product not public');
      return errorResponse('Product is not available for purchase', 'PRODUCT_NOT_PUBLIC', null, 400);
    }

    // 5. Get canonical selling price from product (server-side verification)
    let sellingPrice: number;
    let capitalCost: number | null = null;
    
    if (product.price && product.price[data.currency]) {
      // Use product-level price if available
      sellingPrice = product.price[data.currency];
      logger.info(`💰 [Orders/Create] Using product-level price: ${sellingPrice} ${data.currency}`);
    } else if (product.plans && product.plans.length > 0) {
      // Fall back to first plan's price for backward compatibility
      const plan = product.plans[0];
      if (plan.price && plan.price[data.currency]) {
        sellingPrice = plan.price[data.currency];
      } else if (data.currency === 'IDR' && plan.priceNumber) {
        sellingPrice = plan.priceNumber;
      } else {
        logger.error('❌ [Orders/Create] No price available for currency', { currency: data.currency });
        return errorResponse(`Price not available for ${data.currency}`, 'PRICE_NOT_FOUND', null, 400);
      }
      logger.info(`💰 [Orders/Create] Using plan price: ${sellingPrice} ${data.currency}`);
    } else {
      logger.error('❌ [Orders/Create] No pricing information found');
      return errorResponse('Product has no pricing information', 'PRICE_NOT_FOUND', null, 400);
    }

    // Extract capital cost if available (for profit calculation)
    if (product.price && typeof product.price === 'object') {
      // Check if capitalCost exists in the same structure as price
      const productData = productDoc.data();
      if (productData.capitalCost && productData.capitalCost[data.currency]) {
        capitalCost = productData.capitalCost[data.currency];
        logger.info(`📊 [Orders/Create] Capital cost: ${capitalCost} ${data.currency}`);
      }
    }

    logger.info('✅ [Orders/Create] Price validated', { sellingPrice, currency: data.currency });

    // 6. Generate custom order ID
    const customOrderId = generateOrderId();
    logger.info('🆔 [Orders/Create] Generated order ID', { customOrderId });

    // 7. Determine plan details if planId provided
    let planName = 'Standard';
    if (data.planId && product.plans) {
      const selectedPlan = product.plans.find(p => p.id === data.planId);
      if (selectedPlan) {
        planName = selectedPlan.name;
      }
    }

    // 8. Create order document in Firestore with custom ID
    logger.info('📝 [Orders/Create] Creating order in Firestore...', {
      orderId: customOrderId,
      userId,
      customerEmail,
    });
    
    const now = new Date();
    const ordersRef = db.collection('orders');
    
    const orderData = {
      // Order ID stored explicitly
      id: customOrderId,
      
      // Product reference
      productId: product.id,
      productSlug: data.productSlug,
      productName: product.title,
      productImage: product.heroImageUrl || `/img/${data.productSlug}-banner.png`,
      
      // Plan information (explicit)
      planId: data.planId || null,
      planName: planName,
      
      // User information
      userId: userId,
      customerEmail: customerEmail,
      email: customerEmail,
      // Customer info (authenticated user or guest)
      customer: data.customer || {
        name: authenticatedUser?.email?.split('@')[0] || 'Guest',
        email: customerEmail || '',
      },
      
      // Pricing (canonical from product)
      currency: data.currency,
      sellingPrice: sellingPrice,
      capitalCost: capitalCost,
      amount: sellingPrice * data.qty,
      total: sellingPrice * data.qty,
      totalAmount: sellingPrice * data.qty,
      quantity: data.qty,
      
      // Order status
      status: 'AWAITING_PAYMENT',
      locked: false,
      
      // Payment metadata (explicit method)
      paymentMethod: 'manual', // Root level for indexing
      paymentProofURL: null,   // Root level for indexing
      discordId: null,         // Root level for indexing
      
      payment: {
        status: 'AWAITING_PROOF',
        method: 'manual',
        provider: null,
        providerRef: null,
        checkoutUrl: null,
        amount: sellingPrice * data.qty,
        currency: data.currency,
        createdAt: null,
        paidAt: null,
      },
      
      // Delivery metadata
      delivery: {
        type: product.delivery?.type || 'manual',
        status: 'PENDING',
        method: null,
        deliveredAt: null,
        deliveredBy: null,
        instructions: null,
        productDetails: null,
      },
      
      // Timestamps
      createdAt: now,
      timestamp: now,
      updatedAt: now,
      
      // Metadata
      metadata: data.metadata || {},
      idempotencyKey: data.idempotencyKey || null,
    };

    // Store order with custom ID as document ID
    await ordersRef.doc(customOrderId).set(orderData);
    const orderId = customOrderId;
    
    logger.info('✅ [Orders/Create] Order created', { orderId });

    // 7. Save audit log entry
    try {
      await db.collection('orders').doc(orderId).collection('auditLog').add({
        event: 'ORDER_CREATED',
        actor: {
          userId: userId,
          email: customerEmail,
        },
        payload: {
          productSlug: data.productSlug,
          currency: data.currency,
          sellingPrice: sellingPrice,
          quantity: data.qty,
          totalAmount: sellingPrice * data.qty,
        },
        timestamp: now,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      
      logger.info('✅ [Orders/Create] Audit log saved');
    } catch (auditError) {
      logger.error('⚠️  [Orders/Create] Failed to save audit log', { error: auditError });
      // Don't fail the request if audit log fails
    }

    // 8. Sync transaction to user profile (if authenticated)
    if (authenticatedUser && authenticatedUser.uid !== 'guest') {
      try {
        await db.collection('users').doc(authenticatedUser.uid).collection('transactions').doc(orderId).set({
          orderId: orderId,
          productId: product.id,
          productSlug: data.productSlug,
          productName: product.title,
          planId: data.planId || null,
          planName: planName,
          amount: sellingPrice * data.qty,
          currency: data.currency,
          status: 'PENDING',
          paymentStatus: 'AWAITING_PROOF',
          paymentMethod: 'manual',
          paymentProofURL: null,
          deliveryStatus: 'PENDING',
          createdAt: now,
          updatedAt: now,
        });
        logger.info('✅ [Orders/Create] Transaction synced to user profile', { uid: authenticatedUser.uid });
      } catch (syncError) {
        logger.error('⚠️  [Orders/Create] Failed to sync transaction to user', { error: syncError });
        // Non-blocking; order still created successfully
      }
    }

    // 9. Queue "Order Created" email
    if (customerEmail) {
      try {
        await queueEmail(customerEmail, 'order_created', {
          orderId: orderId,
          productName: product.title,
          customerName: data.customer?.name || 'Customer',
          amount: sellingPrice * data.qty,
          paymentMethod: 'QRIS', // Defaulting to QRIS as per requirement or dynamic if available
        });
        logger.info('✅ [Orders/Create] Order created email queued');
      } catch (emailError) {
        logger.error('⚠️ [Orders/Create] Failed to queue email', { error: emailError });
      }
    }

    // 10. Return success response
    logger.info('✅ [Orders/Create] Order creation complete');
    
    return successResponse({
      orderId: orderId,
      order: {
        id: orderId,
        productSlug: data.productSlug,
        currency: data.currency,
        sellingPrice: sellingPrice,
        totalAmount: sellingPrice * data.qty,
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
