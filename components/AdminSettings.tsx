'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, CheckCircle2, XCircle, Palette, Globe, CreditCard } from 'lucide-react';
import { PaymentGateway, PAYMENT_GATEWAYS } from '@/types/settings';
import { WebsiteSettings, DEFAULT_WEBSITE_SETTINGS } from '@/types/website';

interface AdminSettingsProps {
  user: any;
}

export default function AdminSettings({ user }: AdminSettingsProps) {
  const [activeSection, setActiveSection] = useState<'website' | 'payment' | 'manual-qris' | 'email' | 'admins'>('website');
  
  // Payment Methods State (NEW - Multiple toggles)
  const [paymentMethods, setPaymentMethods] = useState({
    manualQRIS: true,
    autoQRIS: false,
    paypal: false,
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // User Role State (NEW)
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'owner'>('user');
  const [isOwner, setIsOwner] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  
  // Website Settings State
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [websiteMessage, setWebsiteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Manual QRIS Settings State
  const [manualQRISSettings, setManualQRISSettings] = useState<any>({
    qris1: { enabled: false, label: 'Manual QRIS 1', imageUrl: '', description: '' },
    qris2: { enabled: false, label: 'Manual QRIS 2', imageUrl: '', description: '' },
    discordWebhookUrl: ''
  });
  const [savingManualQRIS, setSavingManualQRIS] = useState(false);
  const [manualQRISMessage, setManualQRISMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Email Template Settings State
  const [emailSettings, setEmailSettings] = useState<any>({
    brevoApiKey: '',
    senderEmail: 'noreply@yourstore.com',
    senderName: 'Your Store',
    headerImageUrl: '',
    footerText: 'Thank you for your purchase!',
    primaryColor: '#FF006B'
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load payment gateway settings
  useEffect(() => {
    loadPaymentSettings();
    loadWebsiteSettings();
    loadManualQRISSettings();
    loadEmailSettings();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok) {
        setUserRole(data.role);
        setIsOwner(data.role === 'owner');
        

        if (!data.role || data.role === 'user') {
          await initializeOwner();
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const initializeOwner = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'initialize_owner' })
      });
      const data = await response.json();
      if (data.ok) {
        setUserRole('owner');
        setIsOwner(true);
        console.log('✅ Initialized as owner');
      }
    } catch (error) {
      console.error('Error initializing owner:', error);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch('/api/settings/payment');
      const data = await response.json();
      
      if (data.ok && data.methods) {
        setPaymentMethods(data.methods);
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
    }
  };

  const loadAdmins = async () => {
    if (!user || !isOwner) return;
    
    setLoadingAdmins(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/roles/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok) {
        setAdmins(data.admins);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadWebsiteSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.ok) {
        setWebsiteSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading website settings:', error);
    }
  };

  const loadManualQRISSettings = async () => {
    try {
      const response = await fetch('/api/settings/manual-qris');
      const data = await response.json();
      
      if (data.ok) {
        setManualQRISSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading manual QRIS settings:', error);
    }
  };

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/settings/email-template');
      const data = await response.json();
      
      if (data.ok) {
        setEmailSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const handleSavePaymentSettings = async () => {
    if (!user) return;

    setSavingPayment(true);
    setPaymentMessage(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/settings/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ methods: paymentMethods })
      });

      const data = await response.json();

      if (data.ok) {
        setPaymentMessage({
          type: 'success',
          text: 'Payment methods updated successfully',
        });
        setTimeout(() => setPaymentMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      setPaymentMessage({
        type: 'error',
        text: error.message || 'Failed to save payment settings',
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveWebsiteSettings = async () => {
    if (!user) return;

    setSavingWebsite(true);
    setWebsiteMessage(null);

    try {
      // Get Firebase auth token
      const token = await user.getIdToken();

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(websiteSettings)
      });

      const data = await response.json();

      if (data.ok) {
        setWebsiteMessage({
          type: 'success',
          text: 'Website settings saved successfully',
        });
        setTimeout(() => setWebsiteMessage(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      setWebsiteMessage({
        type: 'error',
        text: error.message || 'Failed to save website settings',
      });
    } finally {
      setSavingWebsite(false);
    }
  };

  const handleSaveManualQRISSettings = async () => {
    if (!user) return;

    setSavingManualQRIS(true);
    setManualQRISMessage(null);

    try {
      const response = await fetch('/api/settings/manual-qris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualQRISSettings)
      });

      const data = await response.json();

      if (data.ok) {
        setManualQRISMessage({
          type: 'success',
          text: 'Manual QRIS settings saved successfully',
        });
        setTimeout(() => setManualQRISMessage(null), 3000);
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error: any) {
      setManualQRISMessage({
        type: 'error',
        text: error.message || 'Failed to save manual QRIS settings',
      });
    } finally {
      setSavingManualQRIS(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!user) return;

    setSavingEmail(true);
    setEmailMessage(null);

    try {
      const response = await fetch('/api/settings/email-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailSettings)
      });

      const data = await response.json();

      if (data.ok) {
        setEmailMessage({
          type: 'success',
          text: 'Email template settings saved successfully',
        });
        setTimeout(() => setEmailMessage(null), 3000);
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error: any) {
      setEmailMessage({
        type: 'error',
        text: error.message || 'Failed to save email settings',
      });
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-4 border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveSection('website')}
          className={`pb-3 px-4 font-semibold transition-all whitespace-nowrap ${
            activeSection === 'website'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-2" />
          Website
        </button>
        <button
          onClick={() => setActiveSection('payment')}
          className={`pb-3 px-4 font-semibold transition-all whitespace-nowrap ${
            activeSection === 'payment'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-2" />
          Payment Gateway
        </button>
        <button
          onClick={() => setActiveSection('manual-qris')}
          className={`pb-3 px-4 font-semibold transition-all whitespace-nowrap ${
            activeSection === 'manual-qris'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 Manual QRIS
        </button>
        <button
          onClick={() => setActiveSection('email')}
          className={`pb-3 px-4 font-semibold transition-all whitespace-nowrap ${
            activeSection === 'email'
              ? 'text-purple-400 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📧 Email Template
        </button>
        {isOwner && (
          <button
            onClick={() => {
              setActiveSection('admins');
              loadAdmins();
            }}
            className={`pb-3 px-4 font-semibold transition-all whitespace-nowrap ${
              activeSection === 'admins'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👥 Admins
          </button>
        )}
      </div>

      {/* Website Settings Section */}
      {activeSection === 'website' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {websiteMessage && (
            <div className={`p-4 rounded-lg ${
              websiteMessage.type === 'success' 
                ? 'bg-green-900/30 border border-green-500/50 text-green-300' 
                : 'bg-red-900/30 border border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {websiteMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{websiteMessage.text}</span>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Site Name</label>
                <input
                  type="text"
                  value={websiteSettings.siteName}
                  onChange={(e) => setWebsiteSettings({ ...websiteSettings, siteName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Anonymous Store"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Tagline</label>
                <input
                  type="text"
                  value={websiteSettings.tagline}
                  onChange={(e) => setWebsiteSettings({ ...websiteSettings, tagline: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="The premium cheating experience"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Logo URL</label>
                <input
                  type="text"
                  value={websiteSettings.logoUrl}
                  onChange={(e) => setWebsiteSettings({ ...websiteSettings, logoUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Scheme
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white font-semibold mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={websiteSettings.primaryColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })}
                    className="w-16 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={websiteSettings.primaryColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono"
                    placeholder="#ec4899"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={websiteSettings.secondaryColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, secondaryColor: e.target.value })}
                    className="w-16 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={websiteSettings.secondaryColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, secondaryColor: e.target.value })}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono"
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={websiteSettings.accentColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, accentColor: e.target.value })}
                    className="w-16 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={websiteSettings.accentColor}
                    onChange={(e) => setWebsiteSettings({ ...websiteSettings, accentColor: e.target.value })}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 font-mono"
                    placeholder="#06b6d4"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Footer Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Footer Description</label>
                <textarea
                  value={websiteSettings.footer.description}
                  onChange={(e) => setWebsiteSettings({
                    ...websiteSettings,
                    footer: { ...websiteSettings.footer, description: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Premium game cheats and tools"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveWebsiteSettings}
            disabled={savingWebsite}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savingWebsite ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Website Settings</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Payment Methods Section */}
      {activeSection === 'payment' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {paymentMessage && (
            <div className={`p-4 rounded-lg ${
              paymentMessage.type === 'success' 
                ? 'bg-green-900/30 border border-green-500/50 text-green-300' 
                : 'bg-red-900/30 border border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {paymentMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{paymentMessage.text}</span>
              </div>
            </div>
          )}

          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Enable or disable payment methods for your customers. Multiple methods can be active at the same time.
            </p>
            
            <div className="space-y-4">
              {/* Manual QRIS Toggle */}
              <div className="p-6 rounded-lg border-2 border-white/10 bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">📱 Manual QRIS</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        paymentMethods.manualQRIS 
                          ? 'bg-green-900/30 text-green-400 border-green-500/30'
                          : 'bg-gray-900/30 text-gray-400 border-gray-500/30'
                      }`}>
                        {paymentMethods.manualQRIS ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Customers pay by scanning your static QR code and uploading payment proof
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={paymentMethods.manualQRIS}
                      onChange={(e) => setPaymentMethods({ ...paymentMethods, manualQRIS: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* Auto QRIS Toggle */}
              <div className="p-6 rounded-lg border-2 border-white/10 bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">⚡ Auto QRIS</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        paymentMethods.autoQRIS 
                          ? 'bg-green-900/30 text-green-400 border-green-500/30'
                          : 'bg-gray-900/30 text-gray-400 border-gray-500/30'
                      }`}>
                        {paymentMethods.autoQRIS ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Automatic payment processing via iPay mu or Tokopay (requires API setup)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={paymentMethods.autoQRIS}
                      onChange={(e) => setPaymentMethods({ ...paymentMethods, autoQRIS: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* PayPal Toggle */}
              <div className="p-6 rounded-lg border-2 border-white/10 bg-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">💳 PayPal</h4>
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        paymentMethods.paypal 
                          ? 'bg-green-900/30 text-green-400 border-green-500/30'
                          : 'bg-gray-900/30 text-gray-400 border-gray-500/30'
                      }`}>
                        {paymentMethods.paypal ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Accept international payments via PayPal (requires PayPal business account)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={paymentMethods.paypal}
                      onChange={(e) => setPaymentMethods({ ...paymentMethods, paypal: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {!isOwner && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                ⚠️ <strong>Note:</strong> Only the owner can modify payment settings. Contact the site owner if you need changes.
              </p>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm mb-2">
              ℹ️ <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside text-blue-300/80 text-sm space-y-1 ml-2">
              <li>Customers will see all enabled payment methods during checkout</li>
              <li>At least one payment method must be enabled</li>
              <li>Manual QRIS requires configuration in the "Manual QRIS" tab</li>
              <li>Auto QRIS and PayPal require API credentials in .env file</li>
            </ul>
          </div>

          <button
            onClick={handleSavePaymentSettings}
            disabled={savingPayment || !isOwner}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savingPayment ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isOwner ? 'Save Payment Methods' : 'Owner Access Required'}</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Manual QRIS Section */}
      {activeSection === 'manual-qris' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {manualQRISMessage && (
            <div className={`p-4 rounded-lg ${
              manualQRISMessage.type === 'success' 
                ? 'bg-green-900/30 border border-green-500/50 text-green-300' 
                : 'bg-red-900/30 border border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {manualQRISMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{manualQRISMessage.text}</span>
              </div>
            </div>
          )}

          {/* QRIS 1 Settings */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">QRIS Option 1</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-gray-400">Enable</span>
                <input
                  type="checkbox"
                  checked={manualQRISSettings.qris1.enabled}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris1: { ...manualQRISSettings.qris1, enabled: e.target.checked }
                  })}
                  className="w-5 h-5 accent-purple-500"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label/Provider Name
                </label>
                <input
                  type="text"
                  value={manualQRISSettings.qris1.label}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris1: { ...manualQRISSettings.qris1, label: e.target.value }
                  })}
                  placeholder="e.g., QRIS BCA, QRIS Mandiri"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  QR Code Image URL
                </label>
                <input
                  type="text"
                  value={manualQRISSettings.qris1.imageUrl}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris1: { ...manualQRISSettings.qris1, imageUrl: e.target.value }
                  })}
                  placeholder="https://example.com/qr-code.png"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {manualQRISSettings.qris1.imageUrl && (
                  <div className="mt-3 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Preview:</p>
                    <img 
                      src={manualQRISSettings.qris1.imageUrl} 
                      alt="QR Preview" 
                      className="w-48 h-48 object-contain bg-white rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description/Instructions
                </label>
                <textarea
                  value={manualQRISSettings.qris1.description}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris1: { ...manualQRISSettings.qris1, description: e.target.value }
                  })}
                  placeholder="e.g., Scan this QR code using your BCA Mobile app"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* QRIS 2 Settings */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">QRIS Option 2</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-gray-400">Enable</span>
                <input
                  type="checkbox"
                  checked={manualQRISSettings.qris2.enabled}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris2: { ...manualQRISSettings.qris2, enabled: e.target.checked }
                  })}
                  className="w-5 h-5 accent-purple-500"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label/Provider Name
                </label>
                <input
                  type="text"
                  value={manualQRISSettings.qris2.label}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris2: { ...manualQRISSettings.qris2, label: e.target.value }
                  })}
                  placeholder="e.g., QRIS GoPay, QRIS OVO"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  QR Code Image URL
                </label>
                <input
                  type="text"
                  value={manualQRISSettings.qris2.imageUrl}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris2: { ...manualQRISSettings.qris2, imageUrl: e.target.value }
                  })}
                  placeholder="https://example.com/qr-code-2.png"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {manualQRISSettings.qris2.imageUrl && (
                  <div className="mt-3 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Preview:</p>
                    <img 
                      src={manualQRISSettings.qris2.imageUrl} 
                      alt="QR Preview" 
                      className="w-48 h-48 object-contain bg-white rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description/Instructions
                </label>
                <textarea
                  value={manualQRISSettings.qris2.description}
                  onChange={(e) => setManualQRISSettings({
                    ...manualQRISSettings,
                    qris2: { ...manualQRISSettings.qris2, description: e.target.value }
                  })}
                  placeholder="e.g., Scan this QR code using your e-wallet app"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Discord Webhook Settings */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Discord Notification</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Discord Webhook URL
              </label>
              <input
                type="text"
                value={manualQRISSettings.discordWebhookUrl}
                onChange={(e) => setManualQRISSettings({
                  ...manualQRISSettings,
                  discordWebhookUrl: e.target.value
                })}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-sm text-gray-400 mt-2">
                Payment proof images will be sent to this Discord channel when buyers upload their payment evidence.
              </p>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              ℹ️ <strong>How to get Discord Webhook URL:</strong>
            </p>
            <ol className="list-decimal list-inside text-blue-300/80 text-sm mt-2 space-y-1 ml-2">
              <li>Go to your Discord server</li>
              <li>Right-click the channel where you want notifications</li>
              <li>Select "Edit Channel" → "Integrations" → "Webhooks"</li>
              <li>Click "New Webhook" and copy the URL</li>
            </ol>
          </div>

          <button
            onClick={handleSaveManualQRISSettings}
            disabled={savingManualQRIS}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savingManualQRIS ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Manual QRIS Settings</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Email Template Section */}
      {activeSection === 'email' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {emailMessage && (
            <div className={`p-4 rounded-lg ${
              emailMessage.type === 'success' 
                ? 'bg-green-900/30 border border-green-500/50 text-green-300' 
                : 'bg-red-900/30 border border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {emailMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{emailMessage.text}</span>
              </div>
            </div>
          )}

          {/* Brevo API Configuration */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Brevo (Sendinblue) Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brevo API Key
                </label>
                <input
                  type="password"
                  value={emailSettings.brevoApiKey}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    brevoApiKey: e.target.value
                  })}
                  placeholder="xkeysib-..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Get your API key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Brevo Dashboard</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sender Email
                </label>
                <input
                  type="email"
                  value={emailSettings.senderEmail}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    senderEmail: e.target.value
                  })}
                  placeholder="orders@yourdomain.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Must be verified in your Brevo account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={emailSettings.senderName}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    senderName: e.target.value
                  })}
                  placeholder="Your Store Name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Email Template Customization */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Email Template Design</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Header Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={emailSettings.headerImageUrl}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    headerImageUrl: e.target.value
                  })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {emailSettings.headerImageUrl && (
                  <div className="mt-3 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Preview:</p>
                    <img 
                      src={emailSettings.headerImageUrl} 
                      alt="Header Preview" 
                      className="max-w-xs h-auto rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={emailSettings.primaryColor}
                    onChange={(e) => setEmailSettings({
                      ...emailSettings,
                      primaryColor: e.target.value
                    })}
                    className="w-16 h-12 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={emailSettings.primaryColor}
                    onChange={(e) => setEmailSettings({
                      ...emailSettings,
                      primaryColor: e.target.value
                    })}
                    placeholder="#FF006B"
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Used for buttons and accents in the email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Footer Text
                </label>
                <textarea
                  value={emailSettings.footerText}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    footerText: e.target.value
                  })}
                  placeholder="Thank you for your purchase! Contact us at support@yourdomain.com"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              ⚠️ <strong>Important:</strong> Brevo free tier allows 300 emails/day. The email template includes:
            </p>
            <ul className="list-disc list-inside text-yellow-300/80 text-sm mt-2 space-y-1 ml-2">
              <li>Professional header with your logo (if provided)</li>
              <li>Order details and product information</li>
              <li>Product content in formatted, easy-to-read layout</li>
              <li>Custom footer with your branding</li>
            </ul>
          </div>

          <button
            onClick={handleSaveEmailSettings}
            disabled={savingEmail}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savingEmail ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Email Settings</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Admins Management Section (Owner Only) */}
      {activeSection === 'admins' && isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              👥 Admin Management
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Manage administrator roles and permissions. Only the owner can access this section.
            </p>

            {loadingAdmins ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No admins found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.uid} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-white font-semibold">{admin.displayName || admin.email}</p>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            admin.role === 'owner'
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                              : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                          }`}>
                            {admin.role?.toUpperCase() || 'ADMIN'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{admin.email}</p>
                        
                        {admin.permissions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {admin.permissions.viewOrders && (
                              <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded">
                                📦 View Orders
                              </span>
                            )}
                            {admin.permissions.deliverProducts && (
                              <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded">
                                ✅ Deliver
                              </span>
                            )}
                            {admin.permissions.deleteOrders && (
                              <span className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded">
                                🗑️ Delete
                              </span>
                            )}
                            {admin.permissions.accessSettings && (
                              <span className="px-2 py-1 bg-purple-900/20 text-purple-400 text-xs rounded">
                                ⚙️ Settings
                              </span>
                            )}
                            {admin.permissions.viewCustomers && (
                              <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded">
                                👥 Customers
                              </span>
                            )}
                            {admin.permissions.manageAdmins && (
                              <span className="px-2 py-1 bg-yellow-900/20 text-yellow-400 text-xs rounded">
                                🔐 Manage Admins
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm mb-2">
              ℹ️ <strong>Admin Permissions:</strong>
            </p>
            <ul className="list-disc list-inside text-blue-300/80 text-sm space-y-1 ml-2">
              <li><strong>Owner:</strong> Full access to everything, cannot be changed</li>
              <li><strong>Admin:</strong> Can view orders, deliver products, and manage customers</li>
              <li>The first admin user is automatically set as the owner</li>
              <li>Advanced permission management coming in future updates</li>
            </ul>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              🚧 <strong>Coming Soon:</strong> Add/remove admins, customize permissions per admin, invite codes
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
