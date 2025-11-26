import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { Collections } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

// Zod validation schema
const reviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(500, 'Comment must be maximum 500 characters').trim()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data tidak valid.',
          errors: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { orderId, rating, comment } = validation.data;

    // Fetch order from Firestore
    const orderRef = adminDb.collection(Collections.ORDERS).doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pesanan tidak ditemukan.'
        },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();

    // Validate order is completed
    if (orderData?.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          message: 'Anda tidak dapat mengulas pesanan ini.'
        },
        { status: 403 }
      );
    }

    // Check if review already exists
    const existingReviewDoc = await orderRef.collection('review').limit(1).get();
    if (!existingReviewDoc.empty) {
      return NextResponse.json(
        {
          success: false,
          message: 'Anda sudah memberikan ulasan untuk pesanan ini.'
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const customerEmail = orderData.customerEmail || orderData.customer?.email || '';

    // Create review data
    const reviewData = {
      rating,
      comment,
      createdAt: now
    };

    // 1. Store review in order subcollection
    await orderRef.collection('review').add(reviewData);

    // 2. Create denormalized review in productReviews collection
    const productReviewData = {
      productSlug: orderData.productSlug,
      orderId,
      userId: orderData.userId || 'guest',
      customerEmail,
      rating,
      comment,
      createdAt: FieldValue.serverTimestamp()
    };

    const productReviewRef = await adminDb
      .collection(Collections.PRODUCT_REVIEWS)
      .add(productReviewData);

    // 3. Update product aggregate rating
    const productSnapshot = await adminDb
      .collection(Collections.PRODUCTS)
      .where('slug', '==', orderData.productSlug)
      .limit(1)
      .get();

    if (!productSnapshot.empty) {
      const productDoc = productSnapshot.docs[0];
      const productData = productDoc.data();

      // Calculate new average rating
      const currentTotal = productData.totalReviews || 0;
      const currentAverage = productData.averageRating || 0;
      const newTotal = currentTotal + 1;
      const newAverage = ((currentAverage * currentTotal) + rating) / newTotal;

      await productDoc.ref.update({
        averageRating: Math.round(newAverage * 10) / 10, // Round to 1 decimal
        totalReviews: newTotal,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated product ${orderData.productSlug} rating: ${newAverage.toFixed(1)} (${newTotal} reviews)`);
    }

    console.log(`✅ Review submitted for order ${orderId} - Rating: ${rating}`);

    return NextResponse.json({
      success: true,
      message: 'Ulasan berhasil disimpan.',
      reviewId: productReviewRef.id
    });
  } catch (error) {
    console.error('❌ Error submitting review:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan.'
      },
      { status: 500 }
    );
  }
}
