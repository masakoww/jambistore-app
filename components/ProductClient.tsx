'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductReviews from '@/components/ProductReviews';
import PlanSelector from '@/components/PlanSelector';
import BuyButton from '@/components/BuyButton';
import { Product, Plan } from '@/types/product';
import { useWebsite } from '@/lib/websiteContext';
import { useAuth } from '@/lib/firebase';
import { 
  getProductDescription, 
  getPlanPrice,
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
};

// Memoized system requirements component to prevent re-renders
const SystemRequirements = memo(({ requirements }: { requirements: any[] }) => (
  <div className="grid grid-cols-2 gap-4">
    {requirements.map((req, index) => {
      const IconComponent = ICON_MAP[req.icon.toLowerCase()] || Monitor;
      return (
        <div
          key={index}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
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
));

SystemRequirements.displayName = 'SystemRequirements';

// Memoized feature card component
const FeatureCard = memo(({ feature, idx }: { feature: any; idx: number }) => {
  const FeatureIcon = ICON_MAP[feature.id.toLowerCase()] || Globe;
  return (
    <div
      className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]"
      style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
          <FeatureIcon className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-white">
          {feature.title}
        </h3>
      </div>

      {feature.description && (
        <p className="text-gray-500 text-sm mb-4">
          {feature.description}
        </p>
      )}

      <ul className="space-y-2">
        {feature.items.map((item: string, index: number) => (
          <li
            key={index}
            className="flex items-start gap-2 text-gray-400 text-sm"
          >
            <span className="text-gray-600 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

interface Review {
  id: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  createdAt: string;
}

interface ProductClientProps {
  product: Product;
  reviews: Review[];
}

export default function ProductClient({ product, reviews }: ProductClientProps) {
  const { language, currency } = useWebsite();
  const { isAdmin } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ensure plan selection works even if plan.id is missing
  const selectedPlan = selectedPlanId
    ? product.plans.find((plan, index) => {
        // Match by id if present, else fallback to index
        if (plan.id) return plan.id === selectedPlanId;
        return `plan-${index}` === selectedPlanId;
      }) || null
    : null;

  const description = getProductDescription(product, language);
  
  const formatPrice = (amount: number) => {
    if (currency === 'IDR') {
      return 'Rp ' + amount.toLocaleString('id-ID');
    } else {
      return '$' + (amount / 100).toFixed(2);
    }
  };

  const isUpdating = product.flags?.isUpdating === true;

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <section className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]" style={{ minHeight: '300px' }}>
            {product.heroGifUrl ? (
              <img
                src={product.heroGifUrl}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={450}
              />
            ) : product.heroImageUrl ? (
              <Image
                src={product.heroImageUrl}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                No image available
              </div>
            )}
          </div>            <div
              className="space-y-6 opacity-0 animate-[fadeInUp_0.4s_ease-out_0.15s_forwards]"
            >
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                  {product.title}
                </h1>
                {product.subtitle && (
                  <p className="text-gray-400 text-lg">{product.subtitle}</p>
                )}
                {product.estimation && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-green-400 text-sm font-medium">
                      Estimation: {product.estimation}
                    </span>
                  </div>
                )}
              </div>

              {product.plans && product.plans.length > 0 && (
                <PlanSelector
                  plans={product.plans}
                  selectedPlanId={selectedPlanId}
                  onSelectPlan={handlePlanSelect}
                  formatPrice={formatPrice}
                />
              )}

              {product.systemRequirements && product.systemRequirements.length > 0 && (
                <SystemRequirements requirements={product.systemRequirements} />
              )}

              {isUpdating && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ This product is currently being updated. Purchases are temporarily disabled.
                  </p>
                </div>
              )}

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

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <BuyButton
                productSlug={product.slug}
                selectedPlan={selectedPlan}
                selectedPlanId={selectedPlanId}
                isUpdating={isUpdating}
                onError={handleError}
              />
            </div>
          </div>

          {description && (
            <div
              className="mt-12 p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 opacity-0 animate-[fadeInUp_0.4s_ease-out_0.3s_forwards]"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                {language === 'id' ? 'Tentang Produk' : 'About Product'}
              </h2>
              <div 
                className="text-gray-400 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}

          <ProductReviews reviews={reviews} />
        </div>
      </section>

      {product.features && product.features.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-gray-500 uppercase text-sm font-semibold mb-2 tracking-wider">
                FEATURES
              </p>
              <h2 className="text-5xl md:text-6xl font-bold text-white">
                what you get
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {product.features.map((feature, idx) => (
                <FeatureCard key={feature.id} feature={feature} idx={idx} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
