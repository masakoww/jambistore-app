'use client';

import { useWebsite } from '@/lib/websiteContext';
import { formatCurrency } from '@/lib/translations';

/**
 * Test component to verify WebsiteProvider is working globally
 * This demonstrates that useWebsite() hook is accessible from any client component
 */
export default function WebsiteContextTest() {
  const { language, currency, settings, switchLanguage, switchCurrency } = useWebsite();

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 border border-pink-500/50 rounded-lg p-4 text-white text-xs max-w-xs z-50">
      <h3 className="font-bold text-pink-500 mb-2">🧪 Context Test</h3>
      
      <div className="space-y-1 text-gray-300">
        <p>✅ <strong>Language:</strong> {language.toUpperCase()}</p>
        <p>✅ <strong>Currency:</strong> {currency}</p>
        <p>✅ <strong>Site Name:</strong> {settings.siteName}</p>
        <p>✅ <strong>Price Test:</strong> {formatCurrency(150000, currency)}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
        <button
          onClick={() => switchLanguage(language === 'id' ? 'en' : 'id')}
          className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 px-2 py-1 rounded text-[10px] transition-colors"
        >
          Toggle Lang
        </button>
        <button
          onClick={() => switchCurrency(currency === 'IDR' ? 'USD' : 'IDR')}
          className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 px-2 py-1 rounded text-[10px] transition-colors"
        >
          Toggle Curr
        </button>
      </div>
      
      <p className="mt-2 text-[10px] text-gray-500">
        WebsiteProvider working ✓
      </p>
    </div>
  );
}
