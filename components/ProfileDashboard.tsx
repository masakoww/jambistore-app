'use client';

import { useState, useEffect } from 'react';
import { useAuth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Shield,
  Settings,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  FileText,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { useWebsite } from '@/lib/websiteContext';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  discordUserId?: string;
  discordUsername?: string;
}

interface Transaction {
  id: string;
  productName: string;
  planName?: string;
  total: number;
  status: string;
  createdAt: any;
}

interface TodayStats {
  total: number;
  waiting: number;
  processing: number;
  success: number;
  failed: number;
  totalAmount: number;
}

interface ProfileDashboardProps {
  initialUserData: UserData;
  onOpenSettings: () => void;
  onLogout: () => void;
  onViewMoreTransactions?: () => void;
}

export default function ProfileDashboard({ initialUserData, onOpenSettings, onLogout, onViewMoreTransactions }: ProfileDashboardProps) {
  const { user, isAdmin } = useAuth();
  const { currency } = useWebsite();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    success: 0,
    failed: 0,
    totalAmount: 0,
  });

  const formatPrice = (amount: number) => {
    if (currency === 'IDR') {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Load transactions
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribePrimary: (() => void) | undefined;
    let unsubscribeSecondary: (() => void) | undefined;

    const calculateStats = (txns: Transaction[]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      const todayTxns = txns.filter((t) => {
        if (!t.createdAt) return false;
        const txnTimestamp = t.createdAt.seconds || (t.createdAt.toDate ? t.createdAt.toDate().getTime() / 1000 : 0);
        return txnTimestamp >= todayTimestamp.seconds;
      });

      const stats: TodayStats = {
        total: todayTxns.length,
        waiting: todayTxns.filter((t) => t.status === 'PENDING' || t.status.toLowerCase().includes('waiting')).length,
        processing: todayTxns.filter((t) => t.status === 'PROCESSING' || t.status.toLowerCase().includes('processing')).length,
        success: todayTxns.filter((t) => t.status === 'SUCCESS' || t.status === 'completed' || t.status.toLowerCase().includes('success')).length,
        failed: todayTxns.filter((t) => t.status === 'FAILED' || t.status === 'cancelled' || t.status.toLowerCase().includes('failed')).length,
        totalAmount: todayTxns.reduce((sum, t) => sum + t.total, 0),
      };

      setTodayStats(stats);
    };

    const setupListeners = async () => {
      try {
        const baseCollection = collection(db, 'orders');

        // Primary listener: by userId
        const primaryQuery = query(
          baseCollection,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        unsubscribePrimary = onSnapshot(
          primaryQuery,
          (snapshot) => {
            const txns: Transaction[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              txns.push({
                id: doc.id,
                productName: data.productName || data.product || data.items?.[0]?.name || 'Unknown',
                planName: data.planName || data.plan || data.items?.[0]?.variantId || '',
                total: data.total || data.totalAmount || data.amount || 0,
                status: data.status || 'PENDING',
                createdAt: data.createdAt || data.timestamp,
              });
            });
            console.log('[ProfileDashboard] Loaded transactions for userId', user.uid, ':', txns.length);
            setTransactions(txns);
            calculateStats(txns);
          },
          (error) => {
            console.error('Error loading transactions by userId:', error);
          }
        );

        // Secondary listener: legacy orders by email
        if (user.email) {
          const secondaryQuery = query(
            baseCollection,
            where('email', '==', user.email),
            orderBy('createdAt', 'desc')
          );

          unsubscribeSecondary = onSnapshot(
            secondaryQuery,
            (snapshot) => {
              const emailTxns: Transaction[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                emailTxns.push({
                  id: doc.id,
                  productName: data.productName || data.product || data.items?.[0]?.name || 'Unknown',
                  planName: data.planName || data.plan || data.items?.[0]?.variantId || '',
                  total: data.total || data.totalAmount || data.amount || 0,
                  status: data.status || 'PENDING',
                  createdAt: data.createdAt || data.timestamp,
                });
              });

              if (emailTxns.length > 0) {
                console.log('[ProfileDashboard] Loaded additional email-based transactions:', emailTxns.length);
                setTransactions((prev) => {
                  const existingIds = new Set(prev.map((t) => t.id));
                  const merged = [...prev];
                  emailTxns.forEach((t) => {
                    if (!existingIds.has(t.id)) merged.push(t);
                  });
                  calculateStats(merged);
                  return merged;
                });
              }
            },
            (error) => {
              console.error('Error loading transactions by email:', error);
            }
          );
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribePrimary) unsubscribePrimary();
      if (unsubscribeSecondary) unsubscribeSecondary();
    };
  }, [user?.email]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'success' || s === 'completed') {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Success</span>;
    } else if (s === 'processing') {
      return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">Processing</span>;
    } else if (s === 'pending') {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">Pending</span>;
    } else {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">Failed</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6"
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">Profile Information</h2>
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-purple-400" />
              <p className="text-gray-400 text-sm">Name</p>
            </div>
            <p className="text-white font-medium">{initialUserData.displayName || 'Not set'}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-purple-400" />
              <p className="text-gray-400 text-sm">Email</p>
            </div>
            <p className="text-white font-medium">{initialUserData.email}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-purple-400" />
              <p className="text-gray-400 text-sm">Phone Number</p>
            </div>
            <p className="text-white font-medium">{initialUserData.phoneNumber || 'Not set'}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <p className="text-gray-400 text-sm">Discord</p>
            </div>
            <p className="text-white font-medium">
              {initialUserData.discordUserId ? initialUserData.discordUsername : 'Not connected'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-semibold">Administrator Account</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Today's Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Today's Transactions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <p className="text-gray-400 text-sm">Total</p>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.total}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <p className="text-gray-400 text-sm">Waiting</p>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.waiting}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-5 h-5 text-blue-400" />
              <p className="text-gray-400 text-sm">Processing</p>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.processing}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-gray-400 text-sm">Success</p>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.success}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-gray-400 text-sm">Failed</p>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.failed}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <p className="text-gray-400 text-sm">Amount</p>
            </div>
            <p className="text-xl font-bold text-white">{formatPrice(todayStats.totalAmount)}</p>
          </div>
        </div>
      </motion.div>

      {/* Recent Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Today's Transactions</h2>
          <button
            type="button"
            onClick={onViewMoreTransactions}
            className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            View More →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 font-medium py-3 px-4">ID</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Product</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Price</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Status</th>
                <th className="text-left text-gray-400 font-medium py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .filter((t) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const txnDate = t.createdAt?.toDate();
                  return txnDate && txnDate >= today;
                })
                .slice(0, 5)
                .map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white font-mono text-sm">{t.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-white">{t.productName}</td>
                    <td className="py-3 px-4 text-white">{formatPrice(t.total)}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {t.createdAt?.toDate().toLocaleString()}
                    </td>
                  </tr>
                ))}
              {transactions.filter((t) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const txnDate = t.createdAt?.toDate();
                return txnDate && txnDate >= today;
              }).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No transactions today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <button
          onClick={onOpenSettings}
          className="p-4 bg-[#0a0a0a] border border-white/10 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-3"
        >
          <Settings className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">Edit Profile</span>
        </button>

        <button
          onClick={onLogout}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-3"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-medium">Sign Out</span>
        </button>
      </motion.div>
    </div>
  );
}
