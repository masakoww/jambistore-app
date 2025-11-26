import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stock/upload
 * Upload individual stock item to Firestore
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productSlug, content } = body;

    if (!productSlug || !content) {
      return NextResponse.json(
        { ok: false, message: 'productSlug and content required' },
        { status: 400 }
      );
    }

    // Add to /stock/{slug}/items collection
    const stockRef = adminDb
      .collection('stock')
      .doc(productSlug)
      .collection('items');

    await stockRef.add({
      content: content.trim(),
      used: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Stock upload error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
