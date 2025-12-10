'use client';

import { Plan } from '@/types/product';
import { useWebsite } from '@/lib/websiteContext';
import { getPlanPrice } from '@/lib/productHelpers';

interface PlanSelectorProps {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  formatPrice: (amount: number) => string;
}

export default function PlanSelector({
  plans,
  selectedPlanId,
  onSelectPlan,
  formatPrice,
}: PlanSelectorProps) {
  const { language, currency } = useWebsite();

  if (!plans || plans.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">
        {language === 'id' ? 'Pilih Paket' : 'Choose a Plan'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plans.map((plan, index) => {
          const planId = plan.id || `plan-${index}`;
          const isSelected = selectedPlanId === planId;
          const displayPrice = plan.price
            ? formatPrice(getPlanPrice(plan, currency))
            : plan.priceString;

          return (
            <button
              key={planId}
              type="button"
              onClick={() => onSelectPlan(planId)}
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
  );
}

