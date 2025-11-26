'use client';

import { useWebsite } from '@/lib/websiteContext';

export default function NavbarSwitcher() {
  const { language, currency, switchLanguage, switchCurrency } = useWebsite();

  return (
    <div className="flex items-center gap-2">
      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => switchLanguage(e.target.value as 'id' | 'en')}
        className="border border-white/10 rounded-md px-2 py-1 text-sm bg-transparent hover:bg-gray-800 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
      >
        <option value="id" className="bg-gray-900">🇮🇩 Bahasa</option>
        <option value="en" className="bg-gray-900">🇬🇧 English</option>
      </select>

      {/* Currency Selector */}
      <select
        value={currency}
        onChange={(e) => switchCurrency(e.target.value as 'IDR' | 'USD')}
        className="border border-white/10 rounded-md px-2 py-1 text-sm bg-transparent hover:bg-gray-800 text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
      >
        <option value="IDR" className="bg-gray-900">IDR (Rp)</option>
        <option value="USD" className="bg-gray-900">USD ($)</option>
      </select>
    </div>
  );
}
