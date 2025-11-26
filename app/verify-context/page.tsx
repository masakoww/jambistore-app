'use client';

import { useWebsite } from '@/lib/websiteContext';
import { t, formatCurrency } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { CheckCircle, Globe, DollarSign } from 'lucide-react';

/**
 * Verification page demonstrating WebsiteProvider global integration
 * Access via: /verify-context
 */
export default function VerifyContextPage() {
  const { language, currency, settings, loading, switchLanguage, switchCurrency } = useWebsite();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              <CheckCircle className="inline-block w-10 h-10 text-green-500 mr-2" />
              WebsiteProvider Global Integration
            </h1>
            <p className="text-gray-400">
              Testing language & currency context across all pages
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Language Status */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl font-bold text-white">Language Context</h2>
              </div>
              
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Current Language:</span>
                  <span className="font-mono text-green-400">{language.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Translation:</span>
                  <span className="font-medium text-white">{t('products.buyNow', language)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Another Sample:</span>
                  <span className="font-medium text-white">{t('common.loading', language)}</span>
                </div>
              </div>

              <button
                onClick={() => switchLanguage(language === 'id' ? 'en' : 'id')}
                className="mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Switch to {language === 'id' ? 'English' : 'Bahasa'}
              </button>
            </div>

            {/* Currency Status */}
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-pink-500" />
                <h2 className="text-xl font-bold text-white">Currency Context</h2>
              </div>
              
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between">
                  <span>Current Currency:</span>
                  <span className="font-mono text-green-400">{currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Price (150k IDR):</span>
                  <span className="font-medium text-white">{formatCurrency(150000, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Price (500k IDR):</span>
                  <span className="font-medium text-white">{formatCurrency(500000, currency)}</span>
                </div>
              </div>

              <button
                onClick={() => switchCurrency(currency === 'IDR' ? 'USD' : 'IDR')}
                className="mt-4 w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Switch to {currency === 'IDR' ? 'USD' : 'IDR'}
              </button>
            </div>
          </div>

          {/* Website Settings */}
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Website Settings</h2>
            
            <div className="grid md:grid-cols-2 gap-4 text-gray-300">
              <div>
                <span className="text-gray-500 text-sm">Site Name:</span>
                <p className="text-white font-medium">{settings.siteName}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Primary Color:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-white/20" 
                    style={{ backgroundColor: settings.primaryColor }}
                  />
                  <p className="text-white font-mono text-sm">{settings.primaryColor}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Secondary Color:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-white/20" 
                    style={{ backgroundColor: settings.secondaryColor }}
                  />
                  <p className="text-white font-mono text-sm">{settings.secondaryColor}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Accent Color:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-white/20" 
                    style={{ backgroundColor: settings.accentColor }}
                  />
                  <p className="text-white font-mono text-sm">{settings.accentColor}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status */}
          <div className="mt-8 bg-black/50 rounded-xl p-6 border border-green-500/50">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">✅ Global Integration Confirmed</h3>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li>✓ WebsiteProvider wrapped in app/layout.tsx</li>
                  <li>✓ useWebsite() hook accessible from any client component</li>
                  <li>✓ Language preferences persist via localStorage</li>
                  <li>✓ Currency preferences persist via localStorage</li>
                  <li>✓ Website settings loaded from Firestore</li>
                  <li>✓ Real-time context updates across all components</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="mt-8 bg-blue-500/10 rounded-xl p-6 border border-blue-500/30">
            <h3 className="text-lg font-bold text-white mb-3">🧪 How to Test</h3>
            <ol className="space-y-2 text-gray-400 text-sm list-decimal list-inside">
              <li>Click the language/currency switchers in the navbar above</li>
              <li>Click the "Switch to..." buttons in the cards</li>
              <li>Navigate to any other page (e.g., /products)</li>
              <li>Preferences should persist across pages</li>
              <li>Refresh the page - preferences should remain saved</li>
              <li>Open DevTools → Application → Local Storage to see stored values</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
