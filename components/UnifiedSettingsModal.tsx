'use client';

import { useWebsite } from '@/lib/websiteContext';
import { Globe, DollarSign, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UnifiedSettingsModal({ isOpen, onClose }: UnifiedSettingsModalProps) {
  const { language, currency, switchLanguage, switchCurrency } = useWebsite();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3">
              <Globe className="w-4 h-4" />
              Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchLanguage('id')}
                className={`p-4 rounded-xl border transition-all ${
                  language === 'id'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2">🇮🇩</div>
                <div className="font-semibold">Bahasa Indonesia</div>
              </button>
              <button
                onClick={() => switchLanguage('en')}
                className={`p-4 rounded-xl border transition-all ${
                  language === 'en'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-2">🇬🇧</div>
                <div className="font-semibold">English</div>
              </button>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3">
              <DollarSign className="w-4 h-4" />
              Currency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchCurrency('IDR')}
                className={`p-4 rounded-xl border transition-all ${
                  currency === 'IDR'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="text-xl mb-1 font-bold">Rp</div>
                <div className="font-semibold">Indonesian Rupiah</div>
                <div className="text-xs text-gray-500 mt-1">IDR</div>
              </button>
              <button
                onClick={() => switchCurrency('USD')}
                className={`p-4 rounded-xl border transition-all ${
                  currency === 'USD'
                    ? 'border-purple-500 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="text-xl mb-1 font-bold">$</div>
                <div className="font-semibold">US Dollar</div>
                <div className="text-xs text-gray-500 mt-1">USD</div>
              </button>
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-xl transition-all"
          >
            Apply Settings
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
