import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'
import { sendStaffLog, StaffLogTemplates } from '@/lib/staffLogger'
import { successResponse, errorResponse } from '@/lib/apiResponse'
import { logger } from '@/lib/logger'

/**
 * POST /api/orders/manual
 * 
 * Create a manual order from admin dashboard
 * - Validates sellingPrice >= 0 and capitalCost >= 0
 * - Computes profit = sellingPrice - capitalCost
 * - Sets order.status = "PENDING"
 * - Logs audit event "MANUAL_ORDER_CREATED"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      productSlug,
      productName,
      customerEmail,
      capitalCost,
      sellingPrice,
      currency,
      notes,
    } = body

    // Validation
    if (!productSlug || !customerEmail) {
      return errorResponse('Produk dan email pembeli harus diisi', 'VALIDATION_ERROR', null, 400)
    }

    if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
      return errorResponse('Harga jual tidak valid', 'VALIDATION_ERROR', null, 400)
    }

    if (typeof capitalCost !== 'number' || capitalCost < 0) {
      return errorResponse('Modal (COGS) tidak valid', 'VALIDATION_ERROR', null, 400)
    }

    // Calculate profit and margin
    const profit = sellingPrice - capitalCost
    const marginPercent = capitalCost > 0 ? (profit / capitalCost) * 100 : 0

    // Load product to get details
    const productsSnapshot = await adminDb
      .collection('products')
      .where('slug', '==', productSlug)
      .limit(1)
      .get()

    if (productsSnapshot.empty) {
      return errorResponse('Produk tidak ditemukan', 'PRODUCT_NOT_FOUND', null, 404)
    }

    const productData = productsSnapshot.docs[0].data()

    // Create manual order
    const orderData = {
      // Customer info
      customer: {
        email: customerEmail,
      },
      email: customerEmail,

      // Product info
      productSlug,
      productName: productName || productData.title,
      productId: productsSnapshot.docs[0].id,

      // Pricing
      capitalCost,
      totalAmount: sellingPrice,
      amount: sellingPrice,
      currency: currency || 'IDR',

      // Profit tracking
      profit: {
        amount: profit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      },

      // Status
      status: 'PENDING', // Enforce PENDING

      // Payment info
      paymentMethod: 'manual',
      paymentProofURL: null,
      discordId: null,
      plan: 'manual',

      payment: {
        provider: 'manual',
        status: 'pending',
        method: 'manual_entry',
      },

      // Delivery info
      delivery: {
        type: productData.delivery?.type || 'manual',
        status: 'PENDING',
      },

      // Metadata
      notes: notes || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'admin',
      isManual: true,
    }

    const orderRef = await adminDb.collection('orders').add(orderData)

    // Create audit log
    await adminDb.collection('auditLogs').add({
      event: 'MANUAL_ORDER_CREATED',
      orderId: orderRef.id,
      productSlug,
      customerEmail,
      amount: sellingPrice,
      capitalCost,
      profit,
      currency,
      timestamp: FieldValue.serverTimestamp(),
      createdBy: 'admin',
    })

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.manualOrderCreated(
        orderRef.id,
        productName || productData.title,
        'Admin'
      ),
      {
        orderId: orderRef.id,
        action: 'Manual Order Created',
        adminName: 'Admin',
        details: `Product: ${productName || productData.title} | Customer: ${customerEmail} | Amount: ${currency} ${sellingPrice.toLocaleString()}`,
        color: 'info'
      }
    )

    logger.info('✅ Manual order created', { orderId: orderRef.id })

    return successResponse({
      orderId: orderRef.id,
      profit: {
        amount: profit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      },
    }, 'Order manual berhasil dibuat')
  } catch (error) {
    logger.error('❌ Error creating manual order', { error })
    return errorResponse(
      error instanceof Error ? error.message : 'Terjadi kesalahan dalam membuat order manual',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? String(error) : undefined,
      500
    )
  }
}
