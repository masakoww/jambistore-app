'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, LayoutDashboard, Receipt, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProfileDashboard from '@/components/ProfileDashboard';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import ProfileTransactions from '@/components/ProfileTransactions';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  discordUserId?: string;
  discordUsername?: string;
  discordEmail?: string;
  discordAvatar?: string;
  discordConnectedAt?: any;
  loginDevices?: Array<{
    deviceId: string;
    userAgent: string;
    lastLogin: any;
  }>;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setUserData(data.user || data);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoadingUser(false);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const status = searchParams.get('status');
    const message = searchParams.get('message');

    if (status && message) {
      showNotification(
        status as 'success' | 'error',
        decodeURIComponent(message)
      );
      router.replace('/profile');
    }
  }, [searchParams, router]);

  const handleSaveSettings = async (updates: {
    displayName?: string;
    phoneNumber?: string;
    oldPassword?: string;
    newPassword?: string;
  }) => {
    if (!user) return;

    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, ...updates }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data.user);
        showNotification('success', data.message);
        setIsSettingsModalOpen(false);
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    }
  };

  const handleConnectDiscord = () => {
    if (user) {
      window.location.href = `/api/auth/discord?uid=${user.uid}&redirect=/profile`;
    }
  };

  const handleDisconnectDiscord = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.uid}/disconnect-discord`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setUserData({ ...userData!, discordUserId: undefined, discordUsername: undefined, discordEmail: undefined, discordAvatar: undefined });
        showNotification('success', 'Discord account disconnected successfully');
      } else {
        throw new Error(data.message || 'Failed to disconnect Discord');
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to disconnect Discord');
      throw error;
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (loading || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Notification */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <div
                  className={`p-4 rounded-xl border ${
                    notification.type === 'success'
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {notification.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        notification.type === 'success'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {notification.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-6 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Transactions
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all ml-auto"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <ProfileDashboard
              initialUserData={userData}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onLogout={handleLogout}
              onViewMoreTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'transactions' && (
            <ProfileTransactions
              userId={user.uid}
              userEmail={userData.email}
            />
          )}
        </div>
      </div>
      <Footer />

      {/* Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userData={userData}
        onSave={handleSaveSettings}
        onConnectDiscord={handleConnectDiscord}
        onDisconnectDiscord={handleDisconnectDiscord}
      />
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
