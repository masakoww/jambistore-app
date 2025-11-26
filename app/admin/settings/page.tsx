'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PaymentGateway, 
  PaymentGatewaySettings, 
  PAYMENT_GATEWAYS 
} from '@/types/settings';

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeGateway, setActiveGateway] = useState<PaymentGateway>('pakasir');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'payment');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as PaymentGatewaySettings;
        setActiveGateway(data.activeGateway);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const settingsRef = doc(db, 'settings', 'payment');
      const settings: PaymentGatewaySettings = {
        activeGateway,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || 'unknown',
      };

      await setDoc(settingsRef, settings);

      setMessage({
        type: 'success',
        text: `Payment gateway successfully changed to ${PAYMENT_GATEWAYS.find(g => g.id === activeGateway)?.name}`,
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Payment Gateway Settings</h1>
          <p className="text-gray-400">Configure which payment gateway to use for transactions</p>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push('/admin')}
          className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          ← Back to Admin Dashboard
        </button>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-500/50 text-green-300' 
              : 'bg-red-900/30 border border-red-500/50 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-semibold mb-6">Active Payment Gateway</h2>
          
          <div className="space-y-4">
            {PAYMENT_GATEWAYS.map((gateway) => (
              <div
                key={gateway.id}
                className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
                  activeGateway === gateway.id
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
                onClick={() => setActiveGateway(gateway.id)}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="payment-gateway"
                    value={gateway.id}
                    checked={activeGateway === gateway.id}
                    onChange={(e) => setActiveGateway(e.target.value as PaymentGateway)}
                    className="mt-1 w-5 h-5 accent-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{gateway.name}</h3>
                      {gateway.enabled ? (
                        <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full border border-green-500/30">
                          Available
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-red-900/30 text-red-400 rounded-full border border-red-500/30">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mt-1">{gateway.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                saving
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="text-blue-400">ℹ️</span>
            Important Information
          </h3>
          <ul className="text-gray-300 space-y-2 ml-6 list-disc">
            <li>Changing the payment gateway will affect all new transactions</li>
            <li>Existing pending transactions will continue using their original gateway</li>
            <li>Make sure the selected gateway is properly configured in environment variables</li>
            <li>Test the gateway thoroughly before switching in production</li>
          </ul>
        </div>

        {/* Gateway Status */}
        <div className="mt-6 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Gateway Configuration Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <span className="font-medium">Pakasir API Key:</span>
              <span className={process.env.NEXT_PUBLIC_PAKASIR_API_KEY ? 'text-green-400' : 'text-red-400'}>
                {process.env.NEXT_PUBLIC_PAKASIR_API_KEY ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <span className="font-medium">iPaymu API Key:</span>
              <span className={process.env.NEXT_PUBLIC_IPAYMU_API_KEY ? 'text-green-400' : 'text-red-400'}>
                {process.env.NEXT_PUBLIC_IPAYMU_API_KEY ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <span className="font-medium">Tokopay Merchant ID:</span>
              <span className={process.env.NEXT_PUBLIC_TOKOPAY_MERCHANT_ID ? 'text-green-400' : 'text-red-400'}>
                {process.env.NEXT_PUBLIC_TOKOPAY_MERCHANT_ID ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
