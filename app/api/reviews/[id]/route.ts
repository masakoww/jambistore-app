import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/authAdmin';
import { Collections } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authCheck = verifyAdmin(request);
    if (!authCheck) {
      return NextResponse.json(
        {
          success: false,
          message: 'Admin authentication required.'
        },
        { status: 403 }
      );
    }

    const reviewId = params.id;

    // Fetch review from productReviews
    const reviewRef = adminDb.collection(Collections.PRODUCT_REVIEWS).doc(reviewId);
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ulasan tidak ditemukan.'
        },
        { status: 404 }
      );
    }

    const reviewData = reviewDoc.data();

    // 1. Delete review from order subcollection
    const orderReviewSnapshot = await adminDb
      .collection(Collections.ORDERS)
      .doc(reviewData!.orderId)
      .collection('review')
      .get();

    const batch = adminDb.batch();
    orderReviewSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // 2. Delete review from productReviews
    await reviewRef.delete();

    // 3. Recalculate product average rating
    const productSnapshot = await adminDb
      .collection(Collections.PRODUCTS)
      .where('slug', '==', reviewData!.productSlug)
      .limit(1)
      .get();

    if (!productSnapshot.empty) {
      const productDoc = productSnapshot.docs[0];
      const productData = productDoc.data();

      // Get all remaining reviews for this product
      const remainingReviews = await adminDb
        .collection(Collections.PRODUCT_REVIEWS)
        .where('productSlug', '==', reviewData!.productSlug)
        .get();

      if (remainingReviews.empty) {
        // No more reviews, reset to 0
        await productDoc.ref.update({
          averageRating: 0,
          totalReviews: 0,
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        // Recalculate average
        let totalRating = 0;
        remainingReviews.docs.forEach(doc => {
          totalRating += doc.data().rating || 0;
        });
        const newAverage = totalRating / remainingReviews.size;

        await productDoc.ref.update({
          averageRating: Math.round(newAverage * 10) / 10,
          totalReviews: remainingReviews.size,
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    console.log(`✅ Review ${reviewId} deleted by admin`);

    return NextResponse.json({
      success: true,
      message: 'Ulasan berhasil dihapus.'
    });
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan.'
      },
      { status: 500 }
    );
  }
}
