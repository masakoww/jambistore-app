'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Cpu, 
  Monitor, 
  CheckCircle2, 
  Globe, 
  HardDrive,
  Wifi,
  Shield,
  Zap,
  Loader2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductReviews from '@/components/ProductReviews';
import { Product, Plan } from '@/types/product';
import { useWebsite } from '@/lib/websiteContext';
import { useAuth } from '@/lib/firebase';
import { 
  getProductDescription, 
  getProductPrice, 
  getPlanPrice,
  getProductGateway,
  hasMultiCurrencySupport 
} from '@/lib/productHelpers';

// Icon mapping for system requirements
const ICON_MAP: Record<string, any> = {
  'cpu': Cpu,
  'monitor': Monitor,
  'check': CheckCircle2,
  'globe': Globe,
  'harddrive': HardDrive,
  'wifi': Wifi,
  'shield': Shield,
  'zap': Zap,
  // Add more as needed
};

interface ProductClientProps {
  product: Product;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function ProductClient({ product }: ProductClientProps) {
  const router = useRouter();
  const { language, currency, settings } = useWebsite();
  const { isAdmin, user } = useAuth();
  // No plan selected on initial load; user must explicitly choose a plan
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive selected plan from id (with fallback ID matching)
  const selectedPlan = selectedPlanId
    ? product.plans.find((plan, index) => (plan.id || `plan-${index}`) === selectedPlanId) || null
    : null;

  // Get localized/currency-specific data
  const description = getProductDescription(product, language);
  const isMultiCurrency = hasMultiCurrencySupport(product);
  
  // Format price based on currency
  const formatPrice = (amount: number) => {
    console.log('formatPrice called:', { amount, currency });
    if (currency === 'IDR') {
      return 'Rp ' + amount.toLocaleString('id-ID');
    } else {
      // USD amounts are stored in cents, convert to dollars
      return '$' + (amount / 100).toFixed(2);
    }
  };

  // Check if product is updating
  const isUpdating = product.flags?.isUpdating === true;

  const handleBuy = async () => {
    if (isUpdating) {
      setError('Product is currently being updated. Please try again later.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (!selectedPlan) {
        setError(language === 'id'
          ? 'Silakan pilih paket terlebih dahulu.'
          : 'Please select a plan first.');
        return;
      }
      console.log('Creating order with:', {
        productSlug: product.slug,
        planId: selectedPlan.id,
        amount: getPlanPrice(selectedPlan, currency),
      });

      // Create order without customer info - will be collected on payment page
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Attempt to get Firebase ID token for authenticated users
      let authHeaders: Record<string, string> = {};
      if (user) {
        try {
          const idToken = await user.getIdToken();
          authHeaders['Authorization'] = `Bearer ${idToken}`;
        } catch (e) {
          console.error('Failed to retrieve ID token:', e);
        }
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          productSlug: product.slug,
          planId: selectedPlan.id,
          customer: {
            name: '', // Empty - will be filled on payment page
            email: '', // Empty - MUST be filled on payment page
          },
          amount: getPlanPrice(selectedPlan, currency),
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('Order response data:', data);
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error (${response.status}). Please try again.`);
      }

      if (data.ok) {
        // Redirect to payment page with order ID
        router.push(`/payment?orderId=${data.orderId}`);
      } else {
        setError(data.message || 'Failed to create order. Please try again.');
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      
      // Check if error is due to network/blocking
      if (err.name === 'AbortError') {
        setError('Request timeout. Please check your connection and try again.');
      } else if (err.message.includes('fetch') || err.message.includes('network')) {
        setError('Network error. Please disable ad blocker or try a different browser.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-video rounded-2xl overflow-hidden bg-white/5"
            >
              {product.heroGifUrl ? (
                <img
                  src={product.heroGifUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : product.heroImageUrl ? (
                <Image
                  src={product.heroImageUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No image available
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Title */}
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                  {product.title}
                </h1>
                {product.subtitle && (
                  <p className="text-gray-400 text-lg">{product.subtitle}</p>
                )}
                {product.estimation && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    <span className="text-green-400 text-sm font-medium">
                      Estimation: {product.estimation}
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing Plans */}
              {product.plans && product.plans.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white">
                    {language === 'id' ? 'Pilih Paket' : 'Choose a Plan'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.plans.map((plan, index) => {
                      // Ensure plan always has a valid ID
                      const planId = plan.id || `plan-${index}`;
                      const isSelected = selectedPlanId === planId;
                      const displayPrice = plan.price
                        ? formatPrice(getPlanPrice(plan, currency))
                        : plan.priceString;

                      return (
                        <button
                          key={planId}
                          type="button"
                          onClick={() => setSelectedPlanId(planId)}
                          className={`text-left p-4 rounded-xl border transition-all bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                            isSelected
                              ? 'border-pink-400 shadow-[0_0_30px_rgba(244,114,182,0.35)]'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-white font-semibold">{plan.name}</span>
                            {plan.popular && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-pink-500/20 text-pink-300 font-medium">
                                {language === 'id' ? 'Terpopuler' : 'Most Popular'}
                              </span>
                            )}
                          </div>
                          <p className="text-xl font-bold text-white">{displayPrice}</p>
                          {plan.period && (
                            <p className="text-xs text-gray-400 mt-1">{plan.period}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* System Requirements */}
              {product.systemRequirements && product.systemRequirements.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {product.systemRequirements.map((req, index) => {
                    const IconComponent = ICON_MAP[req.icon.toLowerCase()] || Monitor;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
                      >
                        <IconComponent className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-white text-sm font-semibold">
                            {req.label}
                          </p>
                          {req.description && (
                            <p className="text-gray-500 text-xs">{req.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Updating Notice */}
              {isUpdating && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ This product is currently being updated. Purchases are temporarily disabled.
                  </p>
                </div>
              )}

              {/* Admin-Only Cost Preview */}
              {isAdmin && product.capitalCost && selectedPlan && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <p className="text-blue-400 text-sm font-semibold">Admin Preview</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Capital Cost:</p>
                      <p className="text-white font-semibold">
                        {formatPrice(product.capitalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Sell Price:</p>
                      <p className="text-white font-semibold">
                        {formatPrice(getPlanPrice(selectedPlan, currency))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={isUpdating || isProcessing || !selectedPlan}
                className={`w-full py-4 bg-gradient-to-r from-pink-400 to-pink-300 text-black font-bold rounded-xl transition-all duration-200 ease-in-out text-lg shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 ${
                  isUpdating || isProcessing || !selectedPlan
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-pink-500 hover:to-pink-400'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{language === 'id' ? 'Memproses...' : 'Processing...'}</span>
                  </>
                ) : (
                  <span>
                  {selectedPlan
                    ? language === 'id'
                      ? `Beli ${selectedPlan.name}`
                      : `Buy ${selectedPlan.name}`
                    : language === 'id'
                      ? 'Beli'
                      : 'Buy'}
                  </span>
                )}
              </button>
            </motion.div>
          </div>

          {/* Description */}
          {description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 p-8 rounded-2xl bg-[#0a0a0a] border border-white/5"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                {language === 'id' ? 'Tentang Produk' : 'About Product'}
              </h2>
              <div 
                className="text-gray-400 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </motion.div>
          )}

          {/* Product Reviews */}
          <ProductReviews productSlug={product.slug} />
        </div>
      </section>

      {/* Features Section */}
      {product.features && product.features.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <p className="text-gray-500 uppercase text-sm font-semibold mb-2 tracking-wider">
                FEATURES
              </p>
              <h2 className="text-5xl md:text-6xl font-bold text-white">
                what you get
              </h2>
            </div>

            {/* Features Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {product.features.map((feature) => {
                const FeatureIcon = ICON_MAP[feature.id.toLowerCase()] || Globe;
                return (
                  <motion.div
                    key={feature.id}
                    variants={itemVariants}
                    className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all"
                  >
                    {/* Feature Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <FeatureIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {feature.title}
                      </h3>
                    </div>

                    {/* Feature Description */}
                    {feature.description && (
                      <p className="text-gray-500 text-sm mb-4">
                        {feature.description}
                      </p>
                    )}

                    {/* Feature Items */}
                    <ul className="space-y-2">
                      {feature.items.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-gray-400 text-sm"
                        >
                          <span className="text-gray-600 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
