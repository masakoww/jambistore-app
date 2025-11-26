'use client';

import { useWebsite } from '@/lib/websiteContext';
import { t, formatCurrency } from '@/lib/translations';

/**
 * Example: Using WebsiteContext in a product slug page
 * This demonstrates that useWebsite() is accessible from any page
 */
export default function ProductPageExample() {
  const { language, currency } = useWebsite();

  // Example product data
  const product = {
    name: { id: 'Cheat Premium', en: 'Premium Cheat' },
    description: {
      id: 'Paket lengkap dengan fitur terbaik',
      en: 'Complete package with best features'
    },
    priceIDR: 150000,
  };

  return (
    <div className="p-8 bg-black text-white">
      <h1 className="text-3xl font-bold mb-4">
        {product.name[language]}
      </h1>
      
      <p className="text-gray-400 mb-6">
        {product.description[language]}
      </p>
      
      <div className="text-2xl font-bold text-pink-500">
        {formatCurrency(product.priceIDR, currency)}
      </div>
      
      <button className="mt-6 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-lg">
        {t('products.buyNow', language)}
      </button>
    </div>
  );
}
