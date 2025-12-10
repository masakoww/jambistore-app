'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useWebsite } from '@/lib/websiteContext';
import { Plan } from '@/types/product';
import { getPlanPrice } from '@/lib/productHelpers';

interface BuyButtonProps {
  productSlug: string;
  selectedPlan: Plan | null;
  selectedPlanId: string | null;
  isUpdating: boolean;
  onError: (message: string) => void;
}

export default function BuyButton({
  productSlug,
  selectedPlan,
  selectedPlanId,
  isUpdating,
  onError,
}: BuyButtonProps) {
  const router = useRouter();
  const { language, currency } = useWebsite();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const handleClick = async () => {
    if (isUpdating) {
      onError(
        language === 'id'
          ? 'Produk sedang diperbarui. Silakan coba lagi nanti.'
          : 'Product is currently being updated. Please try again later.'
      );
      return;
    }

    if (!selectedPlanId || !selectedPlan) {
      onError(
        language === 'id'
          ? 'Silakan pilih paket terlebih dahulu.'
          : 'Please select a plan first.'
      );
      return;
    }

    setIsCreatingOrder(true);

    try {
      // Calculate amount based on selected plan
      const amount = getPlanPrice(selectedPlan, currency);

      // Create PENDING order
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: productSlug,
          planId: selectedPlanId,
          amount: amount,
          currency: currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order');
      }

      // Extract orderId from response
      const orderId = data?.data?.orderId || data?.orderId || data?.data?.order?.id || null;

      if (!orderId) {
        throw new Error('Failed to get order ID from response');
      }

      // Redirect to payment page with orderId
      router.push(`/payment?orderId=${orderId}`);
    } catch (err: any) {
      console.error('Error creating order:', err);
      onError(err.message || (language === 'id' 
        ? 'Gagal membuat pesanan. Silakan coba lagi.' 
        : 'Failed to create order. Please try again.'));
      setIsCreatingOrder(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isUpdating || !selectedPlan || isCreatingOrder}
      className={`w-full py-4 bg-gradient-to-r from-pink-400 to-pink-300 text-black font-bold rounded-xl transition-all duration-200 ease-in-out text-lg shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 ${
        isUpdating || !selectedPlan || isCreatingOrder
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:from-pink-500 hover:to-pink-400'
      }`}
    >
      {isCreatingOrder ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{language === 'id' ? 'Memproses...' : 'Processing...'}</span>
        </>
      ) : selectedPlan ? (
        language === 'id' ? `Beli ${selectedPlan.name}` : `Buy ${selectedPlan.name}`
      ) : (
        language === 'id' ? 'Pilih Paket' : 'Select Plan'
      )}
    </button>
  );
}
