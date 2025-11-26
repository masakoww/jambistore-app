'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db, useAuth } from '@/lib/firebase';
import { useWebsite } from '@/lib/websiteContext';
import * as XLSX from 'xlsx';

interface Order {
  id: string;
  productName?: string;
  product?: string;
  plan?: string;
  amount?: number;
  total?: number;
  totalAmount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  timestamp: any;
  createdAt?: any;
}

interface ProfileTransactionsProps {
  userId: string;
  userEmail: string;
}

export default function ProfileTransactions({ userId, userEmail }: ProfileTransactionsProps) {
  const { currency } = useWebsite();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const formatPrice = (amount: number) => {
    if (currency === 'IDR') {
      return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    
    // Map legacy statuses to PENDING | COMPLETED | REJECTED
    if (normalized === 'COMPLETED' || normalized === 'SUCCESS' || normalized === 'DELIVERED') {
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    } else if (normalized === 'REJECTED' || normalized === 'CANCELLED' || normalized === 'FAILED') {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    } else {
      // PENDING, PROCESSING, AWAITING_PROOF, AWAITING_ADMIN, etc.
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      setError('Please log in to view transactions');
      return;
    }

    let unsubscribePrimary: (() => void) | undefined;
    let unsubscribeSecondary: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        console.log('[ProfileTransactions] Subscribing to orders for userId:', user.uid);

        // Primary listener: by userId (Subcollection)
        const primaryQuery = query(
          collection(db, 'users', user.uid, 'transactions'),
          orderBy('createdAt', 'desc')
        );

        unsubscribePrimary = onSnapshot(
          primaryQuery,
          (snapshot) => {
            const ordersList: Order[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              ordersList.push({
                id: doc.id,
                productName: data.productName || data.product,
                product: data.product,
                plan: data.plan || data.selectedPlan,
                amount: data.amount || data.total || data.totalAmount || 0,
                total: data.total,
                totalAmount: data.totalAmount,
                status: data.status || 'PENDING',
                paymentStatus: data.paymentStatus,
                paymentMethod: data.paymentMethod || 'N/A',
                timestamp: data.timestamp || data.createdAt,
                createdAt: data.createdAt,
              });
            });

            console.log('[ProfileTransactions] Loaded orders by userId:', ordersList.length);
            setOrders(ordersList);
            setLoading(false);
            setError(null);
          },
          async (err) => {
            console.error('Error loading transactions by userId:', err);
            setError('Failed to load transactions. Please check your permissions.');
            setLoading(false);
          }
        );

        // Secondary listener: fallback by email (Legacy/Guest orders)
        if (user.email) {
          const secondaryQuery = query(
            collection(db, 'orders'),
            where('email', '==', user.email),
            orderBy('createdAt', 'desc')
          );

          unsubscribeSecondary = onSnapshot(
            secondaryQuery,
            (snapshot) => {
              const emailOrders: Order[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                emailOrders.push({
                  id: doc.id,
                  productName: data.productName || data.product,
                  product: data.product,
                  plan: data.plan || data.selectedPlan,
                  amount: data.amount || data.total || data.totalAmount || 0,
                  total: data.total,
                  totalAmount: data.totalAmount,
                  status: data.status || 'PENDING',
                  paymentStatus: data.paymentStatus,
                  paymentMethod: data.paymentMethod || 'N/A',
                  timestamp: data.timestamp || data.createdAt,
                  createdAt: data.createdAt,
                });
              });

              if (emailOrders.length > 0) {
                console.log('[ProfileTransactions] Loaded additional orders by email:', emailOrders.length);
                setOrders((prev) => {
                  const existingIds = new Set(prev.map((o) => o.id));
                  const merged = [...prev];
                  emailOrders.forEach((o) => {
                    if (!existingIds.has(o.id)) merged.push(o);
                  });
                  return merged;
                });
              }
            },
            (err) => {
              console.error('Error loading transactions by email:', err);
            }
          );
        }
      } catch (err) {
        console.error('Error setting up transactions listener:', err);
        setError('Failed to initialize transactions. Please try again.');
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribePrimary) unsubscribePrimary();
      if (unsubscribeSecondary) unsubscribeSecondary();
    };
  }, [user]);

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const productName = (order.productName || order.product || '').toLowerCase();
        const orderId = order.id.toLowerCase();
        
        if (!productName.includes(searchLower) && !orderId.includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const orderStatus = order.status.toLowerCase();
        if (statusFilter === 'success' && !orderStatus.includes('success') && orderStatus !== 'completed') {
          return false;
        }
        if (statusFilter === 'pending' && !orderStatus.includes('pending') && !orderStatus.includes('processing')) {
          return false;
        }
        if (statusFilter === 'failed' && !orderStatus.includes('failed') && !orderStatus.includes('rejected') && orderStatus !== 'cancelled') {
          return false;
        }
      }

      // Payment filter
      if (paymentFilter !== 'all') {
        const paymentStatus = (order.paymentStatus || '').toLowerCase();
        if (paymentFilter !== paymentStatus && !paymentStatus.includes(paymentFilter)) {
          return false;
        }
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp);
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (orderDate < fromDate) return false;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (orderDate > toDate) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / entriesPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csvData = filteredOrders.map((order) => ({
      'Order ID': order.id,
      'Product': order.productName || order.product || 'N/A',
      'Plan': order.plan || 'N/A',
      'Amount': order.amount || 0,
      'Status': order.status,
      'Payment Method': order.paymentMethod || 'N/A',
      'Date': order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString() : 'N/A',
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const excelData = filteredOrders.map((order) => ({
      'Order ID': order.id,
      'Product': order.productName || order.product || 'N/A',
      'Plan': order.plan || 'N/A',
      'Amount': order.amount || 0,
      'Status': order.status,
      'Payment Method': order.paymentMethod || 'N/A',
      'Date': order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-white/60">
            If this persists, please contact support or check your Firestore security rules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by Order ID or Product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
              showFilters
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-left text-white hover:bg-white/5 rounded-t-xl transition-all"
              >
                Export as CSV
              </button>
              <button
                onClick={exportToExcel}
                className="w-full px-4 py-2 text-left text-white hover:bg-white/5 rounded-b-xl transition-all"
              >
                Export as XLSX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Filter Transactions</h3>
            <button
              onClick={handleClearFilters}
              className="text-sm text-white/60 hover:text-white transition-all"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm text-white/60 mb-2">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm text-white/60 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm text-white/60 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>
          Showing {paginatedOrders.length} of {filteredOrders.length} transaction{filteredOrders.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">No transactions found</p>
                    {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo) && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 text-sm text-white/80 hover:text-white underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-all">
                    <td className="px-6 py-4 text-sm text-white/80 font-mono">
                      {order.id.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white font-medium">
                        {order.productName || order.product || 'N/A'}
                      </div>
                      {order.plan && (
                        <div className="text-xs text-white/60">{order.plan}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">
                      {formatPrice(order.amount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {order.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {order.timestamp?.toDate
                        ? order.timestamp.toDate().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  currentPage === pageNum
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
