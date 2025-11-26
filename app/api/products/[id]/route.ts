import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/authAdmin';
import { Product } from '@/types/product';
import { sendStaffLog, StaffLogTemplates } from '@/lib/staffLogger';

/**
 * GET /api/products/[id]
 * Get single product by ID (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const docRef = adminDb.collection('products').doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    const product = {
      id: doc.id,
      ...doc.data()
    } as Product;

    return NextResponse.json({
      ok: true,
      data: product
    });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to fetch product' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Update product (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authCheck = verifyAdmin(request);
    if (!authCheck) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Admin authentication required. Provide valid x-admin-key header.'
        },
        { status: 403 }
      );
    }

    const productId = params.id;
    const docRef = adminDb.collection('products').doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const updates: Partial<Product> = await request.json();

    // Validate gateway fields if provided
    const validIDRGateways = ['ipaymu', 'pakasir', 'tokopay'];
    const validUSDGateways = ['paypal', 'stripe'];
    
    if (updates.gateway !== undefined) {
      if (updates.gateway !== null) {

        if (typeof updates.gateway === 'object') {
          if (updates.gateway.IDR && !validIDRGateways.includes(updates.gateway.IDR)) {
            return NextResponse.json(
              { 
                ok: false, 
                message: `gateway.IDR must be one of: ${validIDRGateways.join(', ')}` 
              },
              { status: 400 }
            );
          }
          if (updates.gateway.USD && !validUSDGateways.includes(updates.gateway.USD)) {
            return NextResponse.json(
              { 
                ok: false, 
                message: `gateway.USD must be one of: ${validUSDGateways.join(', ')}` 
              },
              { status: 400 }
            );
          }
        }

        else if (typeof updates.gateway === 'string' && !validIDRGateways.includes(updates.gateway)) {
          return NextResponse.json(
            { 
              ok: false, 
              message: `gateway must be one of: ${validIDRGateways.join(', ')} or an object with IDR/USD keys` 
            },
            { status: 400 }
          );
        }
      }
    }

    if (updates.backupGateway !== undefined) {
      if (updates.backupGateway !== null && !validIDRGateways.includes(updates.backupGateway)) {
        return NextResponse.json(
          { 
            ok: false, 
            message: `backupGateway must be one of: ${validIDRGateways.join(', ')} or null` 
          },
          { status: 400 }
        );
      }
    }

    // Validate slug pattern if provided
    if (updates.slug) {
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(updates.slug)) {
        return NextResponse.json(
          { 
            ok: false, 
            message: 'slug must match pattern ^[a-z0-9-]+$ (lowercase letters, numbers, and hyphens only)' 
          },
          { status: 400 }
        );
      }

      // Check slug uniqueness if changing slug
      const currentData = doc.data() as Product;
      if (updates.slug !== currentData.slug) {
        const existingProduct = await adminDb
          .collection('products')
          .where('slug', '==', updates.slug)
          .limit(1)
          .get();

        if (!existingProduct.empty) {
          return NextResponse.json(
            { 
              ok: false, 
              message: `Product with slug "${updates.slug}" already exists` 
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate plan prices if provided
    if (updates.plans && Array.isArray(updates.plans)) {
      for (const plan of updates.plans) {
        if (typeof plan.priceNumber !== 'number' || plan.priceNumber < 0) {
          return NextResponse.json(
            { 
              ok: false, 
              message: `Plan "${plan.name}" has invalid priceNumber. Must be a non-negative number.` 
            },
            { status: 400 }
          );
        }
      }
    }

    // Update product with merge
    const updateData = {
      ...updates,
      'meta.updatedAt': new Date().toISOString()
    };

    await docRef.update(updateData);

    // Get updated product
    const updatedDoc = await docRef.get();
    const updatedProduct = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Product;

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.productUpdated(
        updatedProduct.slug,
        'Admin'
      ),
      {
        orderId: productId,
        action: 'Product Updated',
        adminName: 'Admin',
        details: `Product: ${updatedProduct.title} (${updatedProduct.slug}) | Updated fields: ${Object.keys(updates).join(', ')}`,
        color: 'info'
      }
    );

    return NextResponse.json({
      ok: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to update product' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete product (admin only)
 * Sets status to INACTIVE and flags.isPublic to false
 */
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
          ok: false,
          message: 'Admin authentication required. Provide valid x-admin-key header.'
        },
        { status: 403 }
      );
    }

    const productId = params.id;
    const docRef = adminDb.collection('products').doc(productId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { ok: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    // Get product data before deletion
    const productData = doc.data() as Product;

    // Soft delete: set status to INACTIVE and isPublic to false
    await docRef.update({
      status: 'INACTIVE',
      'flags.isPublic': false,
      'meta.updatedAt': new Date().toISOString()
    });

    // Send staff log notification
    await sendStaffLog(
      StaffLogTemplates.productDeleted(productData.slug, 'Admin'),
      {
        orderId: productId,
        action: 'Product Deleted',
        adminName: 'Admin',
        details: `Product: ${productData.title} (${productData.slug}) | Soft deleted`,
        color: 'warning'
      }
    );

    return NextResponse.json({
      ok: true,
      message: 'Product deleted successfully (soft delete)'
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to delete product' 
      },
      { status: 500 }
    );
  }
}
