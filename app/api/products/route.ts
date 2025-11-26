import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/authAdmin';
import { Product } from '@/types/product';
import { sendStaffLog, StaffLogTemplates } from '@/lib/staffLogger';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

/**
 * GET /api/products
 * List products
 * Query params:
 * - admin=true: List all products (including INACTIVE), requires x-admin-key header
 * - (default): List only ACTIVE products (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdminMode = searchParams.get('admin') === 'true';

    // If admin mode, verify authentication
    if (isAdminMode) {
      const authCheck = verifyAdmin(request);
      if (!authCheck) {
        return errorResponse('Admin authentication required for admin mode', 'UNAUTHORIZED', null, 403);
      }
    }

    const productsRef = adminDb.collection('products');
    let query: FirebaseFirestore.Query = productsRef;

    // Filter by status only if NOT in admin mode
    if (!isAdminMode) {
      query = query.where('status', '==', 'ACTIVE');
    }

    const snapshot = await query.get();

    logger.info(`📦 Found ${snapshot.docs.length} products in Firestore`);

    const products: Product[] = snapshot.docs.map(doc => {
      const data = doc.data();
      logger.debug(`  - ${data.title}: plans=${data.plans?.length || 0}, status=${data.status}`);
      
      // Convert Firestore Timestamps to ISO strings for JSON serialization
      return {
        id: doc.id,
        ...data,
        meta: data.meta ? {
          createdAt: data.meta.createdAt?.toDate?.()?.toISOString() || data.meta.createdAt,
          updatedAt: data.meta.updatedAt?.toDate?.()?.toISOString() || data.meta.updatedAt,
          version: data.meta.version
        } : undefined
      } as Product;
    });

    // Sort in memory instead of using orderBy (to avoid index requirements)
    products.sort((a, b) => {
      const aTime = a.meta?.updatedAt ? new Date(a.meta.updatedAt).getTime() : 0;
      const bTime = b.meta?.updatedAt ? new Date(b.meta.updatedAt).getTime() : 0;
      return bTime - aTime;
    });

    logger.info(`✅ Returning ${products.length} products`);

    return successResponse(products, 'Products fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching products', { error });
    return errorResponse(
      error.message || 'Failed to fetch products',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? String(error) : undefined,
      500
    );
  }
}

/**
 * POST /api/products
 * Create new product (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authCheck = verifyAdmin(request);
    if (!authCheck) {
      return errorResponse('Admin authentication required. Provide valid x-admin-key header.', 'UNAUTHORIZED', null, 403);
    }

    // Parse request body
    const body: Product = await request.json();

    // Validate required fields
    if (!body.slug || typeof body.slug !== 'string') {
      return errorResponse('slug is required and must be a string', 'VALIDATION_ERROR', null, 400);
    }

    if (!body.title || typeof body.title !== 'string') {
      return errorResponse('title is required and must be a string', 'VALIDATION_ERROR', null, 400);
    }

    if (!body.plans || !Array.isArray(body.plans) || body.plans.length === 0) {
      return errorResponse('plans is required and must be a non-empty array', 'VALIDATION_ERROR', null, 400);
    }

    // Validate slug pattern
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(body.slug)) {
      return errorResponse('slug must match pattern ^[a-z0-9-]+$ (lowercase letters, numbers, and hyphens only)', 'VALIDATION_ERROR', null, 400);
    }

    // Validate plan prices
    for (const plan of body.plans) {
      if (typeof plan.priceNumber !== 'number' || plan.priceNumber < 0) {
        return errorResponse(`Plan "${plan.name}" has invalid priceNumber. Must be a non-negative number.`, 'VALIDATION_ERROR', null, 400);
      }
    }

    // Check slug uniqueness
    const existingProduct = await adminDb
      .collection('products')
      .where('slug', '==', body.slug)
      .limit(1)
      .get();

    if (!existingProduct.empty) {
      return errorResponse(`Product with slug "${body.slug}" already exists`, 'DUPLICATE_SLUG', null, 400);
    }

    // Prepare product data
    const now = new Date().toISOString();
    const productData: Product = {
      ...body,
      status: body.status || 'ACTIVE',
      meta: {
        createdAt: now,
        updatedAt: now,
        version: 1
      }
    };

    // Create product in Firestore
    const docRef = await adminDb.collection('products').add(productData);

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.productCreated(body.slug, 'Admin'),
      {
        orderId: docRef.id,
        action: 'Product Created',
        adminName: 'Admin',
        details: `Product: ${body.title} (${body.slug}) | Plans: ${body.plans.length}`,
        color: 'success'
      }
    );

    logger.info('✅ Product created', { id: docRef.id, slug: body.slug });

    return successResponse({
      id: docRef.id,
      ...productData
    }, 'Product created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating product', { error });
    return errorResponse(
      error.message || 'Failed to create product',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? String(error) : undefined,
      500
    );
  }
}
