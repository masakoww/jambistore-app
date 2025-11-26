import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/admin/fix-products
 * Check products with empty plans (read-only)
 */
export async function GET(request: NextRequest) {
  try {
    const productsSnapshot = await adminDb.collection('products').get();
    const productsNeedingFix = [];
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      
      if (!product.plans || product.plans.length === 0) {
        productsNeedingFix.push({
          id: doc.id,
          title: product.title,
          slug: product.slug,
          hasPrice: !!(product.price?.IDR || product.price?.USD)
        });
      }
    }
    
    return NextResponse.json({
      ok: true,
      needsFix: productsNeedingFix.length,
      products: productsNeedingFix
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/fix-products
 * Fix products with empty plans by adding default plans based on price
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting product fix...');
    
    const productsSnapshot = await adminDb.collection('products').get();
    let fixedCount = 0;
    const fixedProducts = [];
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productId = doc.id;
      
      // Check if plans is empty or missing
      if (!product.plans || product.plans.length === 0) {
        console.log(`❌ Found product without plans: ${product.title} (${product.slug})`);
        
        const defaultPlans = [];
        
        // Create plan from IDR price
        if (product.price?.IDR && product.price.IDR > 0) {
          defaultPlans.push({
            name: 'Standard',
            priceNumber: product.price.IDR,
            priceString: `Rp ${Math.round(product.price.IDR).toLocaleString('id-ID')}`,
            period: '',
            currency: 'IDR'
          });
        }
        
        // Create plan from USD price
        if (product.price?.USD && product.price.USD > 0) {
          defaultPlans.push({
            name: 'Standard',
            priceNumber: product.price.USD,
            priceString: `$${product.price.USD.toFixed(2)}`,
            period: '',
            currency: 'USD'
          });
        }
        
        if (defaultPlans.length > 0) {
          await adminDb.collection('products').doc(productId).update({
            plans: defaultPlans,
            'meta.updatedAt': new Date().toISOString()
          });
          
          console.log(`✅ Fixed: ${product.title} - Added ${defaultPlans.length} plan(s)`);
          fixedCount++;
          fixedProducts.push({
            id: productId,
            title: product.title,
            plansAdded: defaultPlans.length
          });
        }
      }
    }
    
    return NextResponse.json({
      ok: true,
      message: `Fixed ${fixedCount} products`,
      fixed: fixedProducts
    });
    
  } catch (error: any) {
    console.error('❌ Error fixing products:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to fix products' 
      },
      { status: 500 }
    );
  }
}
