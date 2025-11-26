'use client';

import { useWebsite } from '@/lib/websiteContext';
import { t, formatCurrency, convertCurrency } from '@/lib/translations';
import { ShoppingCart, Star } from 'lucide-react';

/**
 * Example Product Card component demonstrating:
 * - Translation usage with t() function
 * - Currency formatting and conversion
 * - Language/currency context integration
 */

interface ProductCardProps {
  name: string;
  description: { id: string; en: string };
  priceIDR: number; // Base price in IDR
  rating: number;
  inStock: boolean;
}

export default function ProductCardWithTranslation({
  name,
  description,
  priceIDR,
  rating,
  inStock,
}: ProductCardProps) {
  const { language, currency } = useWebsite();

  // Convert price if needed
  const displayPrice = currency === 'IDR' 
    ? priceIDR 
    : convertCurrency(priceIDR, 'IDR', 'USD');

  return (
    <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10 hover:border-pink-500/50 transition-all duration-300">
      {/* Product Name */}
      <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
      
      {/* Product Description (Translated) */}
      <p className="text-gray-400 text-sm mb-4">
        {description[language]}
      </p>
      
      {/* Price */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          {formatCurrency(displayPrice, currency)}
        </span>
        <span className="text-xs text-gray-500">
          {t('products.price', language)}
        </span>
      </div>
      
      {/* Rating */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 ml-2">({rating}/5)</span>
      </div>
      
      {/* Stock Status */}
      <div className="mb-4">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            inStock
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {inStock
            ? t('products.available', language)
            : t('products.outOfStock', language)}
        </span>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          disabled={!inStock}
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {t('products.buyNow', language)}
        </button>
        
        <button className="px-4 py-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/30 transition-colors text-sm">
          {t('products.learnMore', language)}
        </button>
      </div>
    </div>
  );
}

/**
 * Usage Example:
 * 
 * import ProductCardWithTranslation from '@/components/examples/ProductCardWithTranslation';
 * 
 * <ProductCardWithTranslation
 *   name="Premium Cheat Package"
 *   description={{
 *     id: "Paket cheat premium dengan fitur lengkap",
 *     en: "Premium cheat package with full features"
 *   }}
 *   priceIDR={150000}
 *   rating={5}
 *   inStock={true}
 * />
 */
