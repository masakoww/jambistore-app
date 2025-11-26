'use client';

import { useWebsite } from '@/lib/websiteContext';
import { Product } from '@/types/product';
import { 
  getProductDescription, 
  getProductPrice, 
  getPlanPrice 
} from '@/lib/productHelpers';

interface ProductDisplayProps {
  product: Product;
}

/**
 * Simple product display component demonstrating MVP requirements:
 * - Display product info based on language + currency
 * - Localized description
 * - Currency-specific price formatting
 */
export default function ProductDisplay({ product }: ProductDisplayProps) {
  // 1. Import useWebsite and get current language and currency
  const { language, currency } = useWebsite();

  // 2. Get localized description
  const description = getProductDescription(product, language);

  // 3. Get price in selected currency
  const price = getProductPrice(product, currency);

  // 4. Format price with currency symbol
  const formatPrice = (amount: number) => {
    if (currency === 'IDR') {
      // IDR: Use Rupiah symbol and Indonesian formatting
      return 'Rp ' + amount.toLocaleString('id-ID');
    } else {
      // USD: Convert cents to dollars and use $ symbol
      return '$' + (amount / 100).toFixed(2);
    }
  };

  return (
    <div className="bg-black text-white p-6 rounded-lg border border-white/10">
      {/* Product Title */}
      <h2 className="text-2xl font-bold mb-4">{product.title}</h2>

      {/* Localized Description */}
      <p className="text-gray-400 mb-4">{description}</p>

      {/* Price with Currency Formatting */}
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-1">
          {language === 'id' ? 'Harga' : 'Price'}:
        </div>
        <div className="text-3xl font-bold text-pink-500">
          {formatPrice(price)}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {language === 'id' 
            ? `Ditampilkan dalam ${currency}` 
            : `Displayed in ${currency}`}
        </div>
      </div>

      {/* Plans with Currency-Specific Pricing */}
      {product.plans && product.plans.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-400 mb-2">
            {language === 'id' ? 'Paket Tersedia' : 'Available Plans'}:
          </div>
          {product.plans.map((plan) => {
            const planPrice = getPlanPrice(plan, currency);
            return (
              <div 
                key={plan.id}
                className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
              >
                <span className="text-white">{plan.name}</span>
                <span className="font-bold text-pink-400">
                  {currency === 'IDR' 
                    ? 'Rp ' + planPrice.toLocaleString('id-ID')
                    : '$' + (planPrice / 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Current Settings Display */}
      <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-600">
        <div>🌐 {language === 'id' ? 'Bahasa: Indonesia' : 'Language: English'}</div>
        <div>💰 {language === 'id' ? 'Mata Uang' : 'Currency'}: {currency}</div>
      </div>
    </div>
  );
}

/**
 * USAGE EXAMPLE:
 * 
 * // In a Next.js page (server component)
 * import ProductDisplay from '@/components/ProductDisplay';
 * 
 * export default async function ProductPage({ params }) {
 *   // 3. Get product data (server side)
 *   const product = await getProduct(params.slug);
 *   
 *   // 4. Pass to client component
 *   return <ProductDisplay product={product} />;
 * }
 * 
 * // Product data examples:
 * 
 * // Legacy format (backward compatible)
 * const legacyProduct = {
 *   title: 'FiveM Basic',
 *   description: 'Basic cheat package',
 *   plans: [{ 
 *     id: '1', 
 *     name: '1 Day', 
 *     priceNumber: 50000 
 *   }]
 * };
 * 
 * // New format with multi-language and dual-currency
 * const newProduct = {
 *   title: 'FiveM Premium',
 *   descriptionLocalized: {
 *     id: 'Paket cheat premium dengan fitur lengkap',
 *     en: 'Premium cheat package with full features'
 *   },
 *   price: {
 *     IDR: 150000,
 *     USD: 1000  // $10.00 in cents
 *   },
 *   plans: [{
 *     id: '1',
 *     name: '1 Day',
 *     price: {
 *       IDR: 150000,
 *       USD: 1000
 *     }
 *   }]
 * };
 */
