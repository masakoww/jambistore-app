import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Product } from '@/types/product';

/**
 * GET /api/products/slug/[slug]
 * Get single product by slug (public endpoint)
 * Only returns ACTIVE products where flags.isPublic !== false
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // Query for product with matching slug
    const snapshot = await adminDb
      .collection('products')
      .where('slug', '==', slug)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const product = {
      id: doc.id,
      ...doc.data()
    } as Product;

    // Check if product is public (flags.isPublic should not be explicitly false)
    if (product.flags?.isPublic === false) {
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: product
    });
  } catch (error: any) {
    console.error('Error fetching product by slug:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to fetch product' 
      },
      { status: 500 }
    );
  }
}
