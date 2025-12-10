import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { Product } from '@/types/product';
import { Collections } from '@/types/schema';
import ProductClient from '@/components/ProductClient';

// Revalidate product page every 60 seconds
export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  createdAt: string;
}

/**
 * Fetch product data from Firestore
 */
async function getProduct(slug: string): Promise<Product | null> {
  try {
    console.log('🔍 Fetching product with slug:', slug);
    
    const snapshot = await adminDb
      .collection('products')
      .where('slug', '==', slug)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('❌ No product found with slug:', slug);
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Serialize product data to plain JSON objects
    const product = JSON.parse(JSON.stringify({
      id: doc.id,
      ...data,
      meta: data.meta ? {
        createdAt: data.meta.createdAt?.toDate?.()?.toISOString() || data.meta.createdAt,
        updatedAt: data.meta.updatedAt?.toDate?.()?.toISOString() || data.meta.updatedAt,
        version: data.meta.version
      } : undefined
    })) as Product;

    console.log('✅ Product found:', {
      id: product.id,
      slug: product.slug,
      title: product.title,
    });

    // Check if product is public
    if (product.flags?.isPublic === false) {
      console.log('❌ Product is not public:', product.id);
      return null;
    }

    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Fetch product reviews from Firestore
 */
async function getReviews(productSlug: string): Promise<Review[]> {
  try {
    const snapshot = await adminDb
      .collection(Collections.PRODUCT_REVIEWS)
      .where('productSlug', '==', productSlug)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      return {
        id: doc.id,
        rating: data.rating,
        comment: data.comment,
        maskedEmail: data.customerEmail 
          ? data.customerEmail.substring(0, 4) + '****'
          : 'guest****',
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
      };
    });

    return reviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.title} - ${product.subtitle || 'Premium Cheat'}`,
    description: product.description?.substring(0, 160) || `Get ${product.title} - Premium game enhancement tool`,
    openGraph: {
      title: product.title,
      description: product.subtitle || product.description?.substring(0, 160),
      images: product.heroImageUrl ? [product.heroImageUrl] : [],
    },
  };
}

/**
 * Dynamic product page
 */
export default async function ProductPage({ params }: PageProps) {
  const [product, reviews] = await Promise.all([
    getProduct(params.slug),
    getReviews(params.slug),
  ]);

  // If product not found or not public, show 404
  if (!product) {
    notFound();
  }

  // Pass product and reviews to client component (JSON serializable)
  return <ProductClient product={product} reviews={reviews} />;
}
