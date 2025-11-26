'use client';

import { useWebsite } from '@/lib/websiteContext';
import { Globe, DollarSign } from 'lucide-react';

/**
 * Example component demonstrating language and currency switching
 * Can be integrated into Navbar or used as a standalone widget
 */
export default function LanguageCurrencySwitcher() {
  const { language, currency, switchLanguage, switchCurrency } = useWebsite();

  return (
    <div className="flex items-center gap-4">
      {/* Language Switcher */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-400" />
        <select
          value={language}
          onChange={(e) => switchLanguage(e.target.value as 'id' | 'en')}
          className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        >
          <option value="id">🇮🇩 ID</option>
          <option value="en">🇬🇧 EN</option>
        </select>
      </div>

      {/* Currency Switcher */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-gray-400" />
        <select
          value={currency}
          onChange={(e) => switchCurrency(e.target.value as 'IDR' | 'USD')}
          className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        >
          <option value="IDR">IDR (Rp)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
    </div>
  );
}
