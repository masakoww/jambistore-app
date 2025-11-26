import { Product, Plan } from '@/types/product';

/**
 * Utility functions for accessing multi-language and dual-currency product data
 * Provides backward compatibility with legacy product formats
 */

type Currency = 'IDR' | 'USD';
type Language = 'id' | 'en';

/**
 * Get product description in the specified language
 * Falls back to legacy description field if localized version not available
 * 
 * @param product Product object
 * @param language Target language ('id' or 'en')
 * @returns Description string
 */
export function getProductDescription(product: Product, language: Language): string {
  // New format: descriptionLocalized
  if (product.descriptionLocalized) {
    return product.descriptionLocalized[language] || product.descriptionLocalized.en || '';
  }
  
  // Legacy format: single description field
  return product.description || '';
}

/**
 * Get product price in the specified currency
 * Falls back to IDR price if USD not available, or returns 0
 * 
 * @param product Product object
 * @param currency Target currency ('IDR' or 'USD')
 * @returns Price number
 */
export function getProductPrice(product: Product, currency: Currency): number {
  // New format: price object
  if (product.price) {
    return product.price[currency] || product.price.IDR || 0;
  }
  
  // Legacy format: use first plan's price
  if (product.plans && product.plans.length > 0) {
    return getPlanPrice(product.plans[0], currency);
  }
  
  return 0;
}

/**
 * Get plan price in the specified currency
 * Falls back to priceNumber (assumed IDR) if price object not available
 * 
 * @param plan Plan object
 * @param currency Target currency ('IDR' or 'USD')
 * @returns Price number
 */
export function getPlanPrice(plan: Plan, currency: Currency): number {
  // New format: price object
  if (plan.price) {
    if (currency === 'USD' && plan.price.USD) {
      return plan.price.USD;
    }
    return plan.price.IDR || plan.priceNumber || 0;
  }
  
  // Legacy format: priceNumber (assume IDR, convert if USD requested)
  if (plan.priceNumber) {
    if (currency === 'USD') {
      // Simple conversion: 1 USD = 15,000 IDR
      return Math.round(plan.priceNumber / 15000 * 100); // Convert to cents
    }
    return plan.priceNumber;
  }
  
  return 0;
}

/**
 * Get payment gateway for the specified currency
 * Falls back to global payment gateway if product-specific not available
 * 
 * @param product Product object
 * @param currency Target currency ('IDR' or 'USD')
 * @param globalGateway Global fallback gateway from settings
 * @returns Gateway identifier
 */
export function getProductGateway(
  product: Product,
  currency: Currency,
  globalGateway?: string
): string {
  // Check if gateway is object format (new)
  if (product.gateway && typeof product.gateway === 'object') {
    const currencyGateway = product.gateway[currency];
    if (currencyGateway) return currencyGateway;
  }
  
  // Check if gateway is string format (legacy, applies to IDR only)
  if (product.gateway && typeof product.gateway === 'string') {
    if (currency === 'IDR') return product.gateway;
  }
  
  // Fallback to global gateway
  if (globalGateway) return globalGateway;
  
  // Ultimate fallback based on currency
  return currency === 'IDR' ? 'pakasir' : 'paypal';
}

/**
 * Get backup gateway for the product
 * Currently only supports IDR gateways
 * 
 * @param product Product object
 * @param currency Target currency ('IDR' or 'USD')
 * @returns Backup gateway identifier or undefined
 */
export function getProductBackupGateway(
  product: Product,
  currency: Currency
): string | undefined {
  // Only IDR has backup gateway support for now
  if (currency === 'IDR') {
    return product.backupGateway;
  }
  
  return undefined;
}

/**
 * Check if product has multi-currency support
 * 
 * @param product Product object
 * @returns True if product has USD pricing
 */
export function hasMultiCurrencySupport(product: Product): boolean {
  if (product.price?.USD) return true;
  if (product.plans?.some(plan => plan.price?.USD)) return true;
  return false;
}

/**
 * Check if product has multi-language support
 * 
 * @param product Product object
 * @returns True if product has localized descriptions
 */
export function hasMultiLanguageSupport(product: Product): boolean {
  return !!product.descriptionLocalized;
}

/**
 * Get all available currencies for a product
 * 
 * @param product Product object
 * @returns Array of available currency codes
 */
export function getAvailableCurrencies(product: Product): Currency[] {
  const currencies: Currency[] = ['IDR']; // IDR is always available
  
  if (hasMultiCurrencySupport(product)) {
    currencies.push('USD');
  }
  
  return currencies;
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { useWebsite } from '@/lib/websiteContext';
 * import { 
 *   getProductDescription, 
 *   getProductPrice, 
 *   getProductGateway 
 * } from '@/lib/productHelpers';
 * 
 * function ProductPage({ product }: { product: Product }) {
 *   const { language, currency, settings } = useWebsite();
 *   
 *   const description = getProductDescription(product, language);
 *   const price = getProductPrice(product, currency);
 *   const gateway = getProductGateway(product, currency, settings.paymentGateway);
 *   
 *   return (
 *     <div>
 *       <p>{description}</p>
 *       <p>{formatCurrency(price, currency)}</p>
 *       <p>Payment via: {gateway}</p>
 *     </div>
 *   );
 * }
 * ```
 */
