'use client';

import { CreditCard, Bitcoin } from 'lucide-react';

export default function PaymentMethods() {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            We support different payment methods
          </h2>
          <p className="text-gray-400">
            If we don't support your preferred payment method, you can reach out to our Customer Service
          </p>
        </div>

        {/* Payment Icons */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {/* Visa */}
          <div className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all hover:scale-110">
            <svg viewBox="0 0 48 48" className="w-12 h-12 md:w-16 md:h-16">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#1434CB" fontSize="14" fontWeight="bold">VISA</text>
            </svg>
          </div>

          {/* Mastercard */}
          <div className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all hover:scale-110">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500 opacity-80"></div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-400 opacity-80"></div>
            </div>
          </div>

          {/* PayPal */}
          <div className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all hover:scale-110">
            <svg viewBox="0 0 48 48" className="w-12 h-12 md:w-16 md:h-16">
              <path d="M18 12h8c4 0 7 2 7 6s-3 6-7 6h-4l-1 6h-3l3-18z" fill="#169BD7"/>
              <path d="M22 18h8c4 0 7 2 7 6s-3 6-7 6h-4l-1 6h-3l3-18z" fill="#0070BA"/>
            </svg>
          </div>

          {/* QRIS */}
          <div className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-all hover:scale-110">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-lg p-1.5 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Top-left corner */}
                <rect x="5" y="5" width="25" height="25" fill="none" stroke="#DC2626" strokeWidth="4"/>
                <rect x="10" y="10" width="15" height="15" fill="#DC2626"/>
                {/* Top-right corner */}
                <rect x="70" y="5" width="25" height="25" fill="none" stroke="#DC2626" strokeWidth="4"/>
                <rect x="75" y="10" width="15" height="15" fill="#DC2626"/>
                {/* Bottom-left corner */}
                <rect x="5" y="70" width="25" height="25" fill="none" stroke="#DC2626" strokeWidth="4"/>
                <rect x="10" y="75" width="15" height="15" fill="#DC2626"/>
                {/* Center pattern */}
                <rect x="40" y="40" width="8" height="8" fill="#DC2626"/>
                <rect x="52" y="40" width="8" height="8" fill="#DC2626"/>
                <rect x="40" y="52" width="8" height="8" fill="#DC2626"/>
                <rect x="52" y="52" width="8" height="8" fill="#DC2626"/>
                {/* Additional dots */}
                <rect x="40" y="15" width="5" height="5" fill="#DC2626"/>
                <rect x="50" y="15" width="5" height="5" fill="#DC2626"/>
                <rect x="60" y="15" width="5" height="5" fill="#DC2626"/>
                <rect x="70" y="40" width="5" height="5" fill="#DC2626"/>
                <rect x="80" y="40" width="5" height="5" fill="#DC2626"/>
                <rect x="70" y="50" width="5" height="5" fill="#DC2626"/>
                <rect x="15" y="40" width="5" height="5" fill="#DC2626"/>
                <rect x="15" y="50" width="5" height="5" fill="#DC2626"/>
                <rect x="40" y="80" width="5" height="5" fill="#DC2626"/>
                <rect x="50" y="80" width="5" height="5" fill="#DC2626"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
