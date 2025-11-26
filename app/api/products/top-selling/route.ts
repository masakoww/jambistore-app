import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products/top-selling
 * Returns top-selling products based on completed orders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');

    // Fetch all active products
    const productsSnapshot = await adminDb
      .collection('products')
      .where('status', '==', 'ACTIVE')
      .get();

    // Fetch all completed orders
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('status', '==', 'COMPLETED')
      .get();

    // Count sales by product slug
    const salesBySlug: Record<string, number> = {};
    ordersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.productSlug) {
        salesBySlug[data.productSlug] = (salesBySlug[data.productSlug] || 0) + 1;
      }
    });

    // Map products with sales data
    const productsWithSales = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        slug: data.slug,
        title: data.title,
        heroImageUrl: data.heroImageUrl,
        heroGifUrl: data.heroGifUrl,
        sales: salesBySlug[data.slug] || 0,
        meta: data.meta ? {
          createdAt: data.meta.createdAt?.toDate?.()?.toISOString() || data.meta.createdAt,
          updatedAt: data.meta.updatedAt?.toDate?.()?.toISOString() || data.meta.updatedAt,
          version: data.meta.version
        } : undefined
      };
    });

    // Sort by sales (descending) and limit
    const topProducts = productsWithSales
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      data: topProducts
    });
  } catch (error: any) {
    console.error('Error fetching top-selling products:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to fetch top-selling products' 
      },
      { status: 500 }
    );
  }
}
