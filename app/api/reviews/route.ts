import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Collections } from '@/types/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get('productSlug');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = adminDb.collection(Collections.PRODUCT_REVIEWS).orderBy('createdAt', 'desc');

    // Filter by product slug if provided
    if (productSlug) {
      query = query.where('productSlug', '==', productSlug) as any;
    }

    // Apply limit
    query = query.limit(limit) as any;

    const snapshot = await query.get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        productSlug: data.productSlug,
        orderId: data.orderId,
        rating: data.rating,
        comment: data.comment,
        customerEmail: data.customerEmail,
        // Mask email - show first 4 characters
        maskedEmail: data.customerEmail 
          ? data.customerEmail.substring(0, 4) + '****'
          : 'guest****',
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      reviews,
      total: reviews.length
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch reviews'
      },
      { status: 500 }
    );
  }
}
