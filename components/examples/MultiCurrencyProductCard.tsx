'use client';

import { useWebsite } from '@/lib/websiteContext';
import { formatCurrency } from '@/lib/translations';
import {
  getProductDescription,
  getProductPrice,
  getProductGateway,
  getPlanPrice,
  hasMultiCurrencySupport,
  getAvailableCurrencies,
} from '@/lib/productHelpers';
import { Product } from '@/types/product';
import { ShoppingCart, Globe, CreditCard } from 'lucide-react';

interface MultiCurrencyProductCardProps {
  product: Product;
}

/**
 * Example component demonstrating multi-language and dual-currency product display
 * Shows how to use product helpers with backward compatibility
 */
export default function MultiCurrencyProductCard({ product }: MultiCurrencyProductCardProps) {
  const { language, currency, settings } = useWebsite();

  // Get localized/currency-specific data
  const description = getProductDescription(product, language);
  const price = getProductPrice(product, currency);
  const globalGateway = settings.paymentMethods?.[0]; // First payment method as default
  const gateway = getProductGateway(product, currency, globalGateway);
  const availableCurrencies = getAvailableCurrencies(product);
  const isMultiCurrency = hasMultiCurrencySupport(product);

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-white/10">
      {/* Product Title */}
      <h3 className="text-2xl font-bold text-white mb-2">{product.title}</h3>
      
      {/* Product Description (Localized) */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {description}
      </p>

      {/* Multi-Currency Badge */}
      {isMultiCurrency && (
        <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium mb-3">
          <Globe className="w-3 h-3" />
          Multi-Currency Support
        </div>
      )}

      {/* Price Display */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          {formatCurrency(price, currency)}
        </div>
        
        {/* Show available currencies */}
        <div className="text-xs text-gray-500 mt-1">
          Available in: {availableCurrencies.join(', ')}
        </div>
      </div>

      {/* Plans Display */}
      {product.plans && product.plans.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-400">Available Plans:</p>
          {product.plans.map((plan) => {
            const planPrice = getPlanPrice(plan, currency);
            return (
              <div 
                key={plan.id}
                className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-white">{plan.name}</span>
                <span className="text-sm font-medium text-pink-400">
                  {formatCurrency(planPrice, currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Gateway Info */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <CreditCard className="w-3 h-3" />
        Payment via: <span className="text-gray-400 uppercase">{gateway}</span>
      </div>

      {/* Buy Button */}
      <button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <ShoppingCart className="w-4 h-4" />
        {language === 'id' ? 'Beli Sekarang' : 'Buy Now'}
      </button>

      {/* Debug Info (optional, for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-600">
          <div>Lang: {language} | Currency: {currency}</div>
          <div>Gateway: {gateway}</div>
          <div>Has Multi-Currency: {isMultiCurrency ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Example Usage:
 * 
 * // Legacy product (backward compatible)
 * const legacyProduct: Product = {
 *   slug: 'fivem-basic',
 *   title: 'FiveM Basic',
 *   description: 'Basic cheat for FiveM',
 *   gateway: 'pakasir',
 *   plans: [{
 *     id: '1',
 *     name: '1 Day',
 *     priceString: 'Rp 50.000',
 *     priceNumber: 50000
 *   }]
 * };
 * 
 * // New product with multi-language and dual-currency
 * const newProduct: Product = {
 *   slug: 'fivem-premium',
 *   title: 'FiveM Premium',
 *   descriptionLocalized: {
 *     id: 'Cheat premium dengan fitur lengkap',
 *     en: 'Premium cheat with full features'
 *   },
 *   price: {
 *     IDR: 150000,
 *     USD: 1000 // $10.00 in cents
 *   },
 *   gateway: {
 *     IDR: 'pakasir',
 *     USD: 'paypal'
 *   },
 *   plans: [{
 *     id: '1',
 *     name: '1 Day',
 *     priceString: 'Rp 150.000',
 *     priceNumber: 150000,
 *     price: {
 *       IDR: 150000,
 *       USD: 1000
 *     }
 *   }]
 * };
 * 
 * <MultiCurrencyProductCard product={legacyProduct} />
 * <MultiCurrencyProductCard product={newProduct} />
 */
