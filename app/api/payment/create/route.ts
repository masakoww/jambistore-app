import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { PaymentFactory } from '@/lib/PaymentFactory';
import { Product } from '@/types/product';
import { getProductGateway, getProductBackupGateway } from '@/lib/productHelpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Currency = 'IDR' | 'USD';

// Zod validation schema
const PaymentCreateSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  preferredCurrency: z.enum(['IDR', 'USD']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 [Payment/Create] Starting payment creation');

    // Validate input
    const validation = PaymentCreateSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('❌ [Payment/Create] Validation failed:', validation.error.issues);
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Invalid request data',
          errors: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { orderId, preferredCurrency } = validation.data;

    // 1. Load order from Firestore
    console.log('📚 [Payment/Create] Loading order:', orderId);
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('❌ [Payment/Create] Order not found:', orderId);
      return NextResponse.json(
        { ok: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data()!;
    
    console.log('✅ [Payment/Create] Order loaded');

    // 1b. Prevent creating new payment sessions for non-pending or locked orders
    if (orderData.locked === true || (orderData.status && orderData.status !== 'PENDING')) {
      console.warn('⚠️  [Payment/Create] Order is not eligible for new payment session:', {
        status: orderData.status,
        locked: orderData.locked,
      });

      return NextResponse.json(
        {
          ok: false,
          message: 'Order is not eligible for payment. Pembayaran sudah diselesaikan atau tidak dalam status PENDING.',
          orderId,
          status: orderData.status,
          locked: !!orderData.locked,
        },
        { status: 400 }
      );
    }

    // 2. Check idempotency - if payment already exists, return existing
    if (orderData.payment?.providerRef) {
      console.log('⚠️  [Payment/Create] Payment already exists, returning existing');
      return NextResponse.json({
        ok: true,
        provider: orderData.payment.provider,
        currency: orderData.payment.currency || orderData.currency,
        checkoutUrl: orderData.payment.checkoutUrl,
        qrString: orderData.payment.qrString,
        qrUrl: orderData.payment.qrUrl,
        reference: orderData.payment.providerRef,
        amount: orderData.payment.amount || orderData.amount,
        expiryTime: orderData.payment.expiryTime,
        message: 'Payment already created',
      });
    }

    // 3. Fetch product from Firestore (server-side)
    console.log('📚 [Payment/Create] Fetching product:', orderData.productSlug);
    const productSnapshot = await adminDb
      .collection('products')
      .where('slug', '==', orderData.productSlug)
      .limit(1)
      .get();

    if (productSnapshot.empty) {
      console.error('❌ [Payment/Create] Product not found:', orderData.productSlug);
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const productDoc = productSnapshot.docs[0];
    const product = { id: productDoc.id, ...productDoc.data() } as Product;

    console.log('✅ [Payment/Create] Product found:', product.id);

    // 4. Determine active currency
    const activeCurrency: Currency = preferredCurrency || orderData.currency || 'IDR';
    console.log('💰 [Payment/Create] Active Currency:', activeCurrency);

    // 5. Re-validate sellingPrice and capitalCost from product (canonical source)
    let sellingPrice: number;
    let capitalCost: number | null = null;
    
    // Get price from product
    if (product.price && product.price[activeCurrency]) {
      sellingPrice = product.price[activeCurrency];
    } else if (product.plans && product.plans.length > 0) {
      const plan = product.plans[0];
      if (plan.price && plan.price[activeCurrency]) {
        sellingPrice = plan.price[activeCurrency];
      } else if (activeCurrency === 'IDR' && plan.priceNumber) {
        sellingPrice = plan.priceNumber;
      } else {
        console.error('❌ [Payment/Create] No price available for currency:', activeCurrency);
        return NextResponse.json(
          { ok: false, message: `Price not available for ${activeCurrency}` },
          { status: 400 }
        );
      }
    } else {
      console.error('❌ [Payment/Create] No pricing information found');
      return NextResponse.json(
        { ok: false, message: 'Product has no pricing information' },
        { status: 400 }
      );
    }

    // Get capital cost if available
    const productData = productDoc.data();
    if (productData.capitalCost && productData.capitalCost[activeCurrency]) {
      capitalCost = productData.capitalCost[activeCurrency];
      console.log(`📊 [Payment/Create] Capital cost: ${capitalCost} ${activeCurrency}`);
    }

    console.log('💰 [Payment/Create] Validated selling price:', sellingPrice, activeCurrency);

    // Update order with validated prices if not present
    const updateData: any = {};
    if (!orderData.sellingPrice) {
      updateData.sellingPrice = sellingPrice;
    }
    if (!orderData.capitalCost && capitalCost !== null) {
      updateData.capitalCost = capitalCost;
    }
    if (Object.keys(updateData).length > 0) {
      await orderRef.update({
        ...updateData,
        updatedAt: new Date(),
      });
      console.log('✅ [Payment/Create] Updated order with validated prices');
    }

    // 6. Fetch global settings for gateway configuration
    console.log('⚙️  [Payment/Create] Fetching global payment settings...');
    const globalSettingsDoc = await adminDb.collection('settings').doc('global').get();
    const globalSettings = globalSettingsDoc.exists ? globalSettingsDoc.data() : {};

    // 7. Determine gateway based on currency
    const globalGateway = globalSettings?.paymentGateway || 'pakasir';
    const selectedGateway = getProductGateway(product, activeCurrency, globalGateway);
    const backupGateway = getProductBackupGateway(product, activeCurrency) || globalSettings?.backupGateway;

    console.log('🎯 [Payment/Create] Selected gateway:', selectedGateway);
    console.log('🔄 [Payment/Create] Backup gateway:', backupGateway || 'none');

    // 8. Prepare payment request
    const quantity = orderData.quantity || 1;
    const totalAmount = sellingPrice * quantity;
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const customerName = orderData.customer?.name || orderData.customerEmail?.split('@')[0] || 'Customer';
    const customerEmail = orderData.customerEmail || orderData.customer?.email;
    const customerPhone = orderData.customer?.phone;
    
    const paymentRequest = {
      orderId,
      amount: totalAmount,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl: `${baseUrl}/dashboard`,
      cancelUrl: `${baseUrl}/payment?orderId=${orderId}`,
      notifyUrl: `${baseUrl}/api/webhook/${selectedGateway}`,
    };

    console.log('💳 [Payment/Create] Payment request prepared');

    let paymentResult;
    let usedGateway = selectedGateway;

    // 9. Try creating payment with selected gateway
    try {
      console.log(`💳 [Payment/Create] Creating payment with ${selectedGateway}...`);
      const provider = PaymentFactory.create(selectedGateway);
      paymentResult = await provider.createPayment(paymentRequest);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || 'Payment creation failed');
      }

      console.log('✅ [Payment/Create] Payment created successfully');
    } catch (error: any) {
      console.error(`❌ [Payment/Create] Failed with ${selectedGateway}:`, error.message);

      // 10. Retry with backup gateway if available
      if (backupGateway) {
        console.log(`🔄 [Payment/Create] Retrying with backup gateway: ${backupGateway}`);
        
        try {
          const backupProvider = PaymentFactory.create(backupGateway);
          paymentRequest.notifyUrl = `${baseUrl}/api/webhook/${backupGateway}`;
          paymentResult = await backupProvider.createPayment(paymentRequest);

          if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Backup payment creation failed');
          }

          usedGateway = backupGateway;
          console.log('✅ [Payment/Create] Payment created with backup gateway');
        } catch (backupError: any) {
          console.error(`❌ [Payment/Create] Backup gateway also failed:`, backupError.message);
          
          return NextResponse.json(
            {
              ok: false,
              message: `Both ${selectedGateway} and ${backupGateway} failed to create payment`,
              error: {
                primary: error.message,
                backup: backupError.message,
              },
            },
            { status: 500 }
          );
        }
      } else {
        console.error('❌ [Payment/Create] No backup gateway configured');
        return NextResponse.json(
          {
            ok: false,
            message: `Failed to create payment with ${selectedGateway}`,
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    // 11. Update Firestore order with payment details
    console.log('💾 [Payment/Create] Updating order in Firestore...');
    
    const now = new Date();
    
    try {
      await orderRef.update({
        'payment.provider': usedGateway,
        'payment.providerRef': paymentResult.reference,
        'payment.status': 'PENDING',
        'payment.currency': activeCurrency,
        'payment.amount': totalAmount,
        'payment.checkoutUrl': paymentResult.checkoutUrl || paymentResult.qrUrl,
        'payment.qrString': paymentResult.qrString,
        'payment.qrUrl': paymentResult.qrUrl,
        'payment.reference': paymentResult.reference,
        'payment.fee': paymentResult.fee,
        'payment.totalPayment': paymentResult.totalPayment,
        'payment.expiryTime': paymentResult.expiryTime,
        'payment.sessionId': paymentResult.sessionId,
        'payment.transactionId': paymentResult.transactionId,
        'payment.createdAt': now,
        updatedAt: now,
      });

      console.log('✅ [Payment/Create] Order updated successfully');
    } catch (updateError: any) {
      console.error('⚠️  [Payment/Create] Failed to update order:', updateError.message);
      // Continue anyway since payment was created
    }

    // 12. Save audit log entry
    try {
      await orderRef.collection('auditLog').add({
        event: 'PAYMENT_CREATED',
        actor: {
          userId: orderData.userId,
          email: orderData.customerEmail,
        },
        payload: {
          provider: usedGateway,
          reference: paymentResult.reference,
          amount: totalAmount,
          currency: activeCurrency,
        },
        timestamp: now,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      
      console.log('✅ [Payment/Create] Audit log saved');
    } catch (auditError) {
      console.error('⚠️  [Payment/Create] Failed to save audit log:', auditError);
    }

    // 13. Return success response
    console.log('🎉 [Payment/Create] Payment creation complete');
    
    return NextResponse.json({
      ok: true,
      provider: usedGateway,
      currency: activeCurrency,
      checkoutUrl: paymentResult.checkoutUrl || paymentResult.qrUrl,
      qrString: paymentResult.qrString,
      qrUrl: paymentResult.qrUrl,
      reference: paymentResult.reference,
      amount: totalAmount,
      expiryTime: paymentResult.expiryTime,
    });

  } catch (error: any) {
    console.error('❌ [Payment/Create] Unexpected error:', error);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        ok: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
