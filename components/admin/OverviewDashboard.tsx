'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Settings,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Filter,
  X,
} from 'lucide-react';

interface Order {
  id: string;
  email: string;
  product: string;
  amount: number;
  status: string;
  date: Date;
  timestamp?: any;
}

interface CustomerData {
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
}

interface OverviewDashboardProps {
  orders: Order[];
  customers: CustomerData[];
  onTabChange: (tab: string) => void;
  currency: 'IDR' | 'USD';
}

// Currency formatter utility
const formatPrice = (amount: number, currency: 'IDR' | 'USD'): string => {
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  return `$${amount.toFixed(2)}`;
};

export default function OverviewDashboard({
  orders,
  customers,
  onTabChange,
  currency,
}: OverviewDashboardProps) {
  // Date range filter state
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return orders;
    }

    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      const orderDate = order.date || order.timestamp?.toDate?.() || new Date(0);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, dateRange]);

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = filteredOrders.length;
    const totalCustomers = customers.length;

    // Calculate revenue trend (last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = filteredOrders.filter(
      (o) => {
        const orderDate = o.date || o.timestamp?.toDate?.() || new Date(0);
        return (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      }
    );
    const prev7Days = filteredOrders.filter(
      (o) => {
        const orderDate = o.date || o.timestamp?.toDate?.() || new Date(0);
        const daysAgo = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo > 7 && daysAgo <= 14;
      }
    );

    const last7DaysRevenue = last7Days.reduce((sum, o) => sum + o.amount, 0);
    const prev7DaysRevenue = prev7Days.reduce((sum, o) => sum + o.amount, 0);
    const revenueTrend =
      prev7DaysRevenue > 0
        ? ((last7DaysRevenue - prev7DaysRevenue) / prev7DaysRevenue) * 100
        : 0;

    // Orders by status
    const pendingOrders = filteredOrders.filter((o) => o.status === 'PENDING').length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;
    const processingOrders = filteredOrders.filter((o) => o.status === 'PROCESSING').length;

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      revenueTrend,
      pendingOrders,
      completedOrders,
      processingOrders,
    };
  }, [filteredOrders, customers]);

  // Revenue chart data (last 7 days)
  const revenueChartData = useMemo(() => {
    const last7Days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayOrders = filteredOrders.filter((o) => {
        const orderDate = o.date || o.timestamp?.toDate?.() || new Date(0);
        const orderDay = new Date(orderDate);
        orderDay.setHours(0, 0, 0, 0);
        return orderDay.getTime() === date.getTime();
      });

      const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);

      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: parseFloat(revenue.toFixed(2)),
        orders: dayOrders.length,
      });
    }

    return last7Days;
  }, [filteredOrders]);

  // Orders by status chart data
  const orderStatusData = useMemo(() => {
    return [
      { name: 'Completed', value: stats.completedOrders, color: '#10B981' },
      { name: 'Processing', value: stats.processingOrders, color: '#F59E0B' },
      { name: 'Pending', value: stats.pendingOrders, color: '#6366F1' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach((order) => {
      const existing = productMap.get(order.product) || { count: 0, revenue: 0 };
      productMap.set(order.product, {
        count: existing.count + 1,
        revenue: existing.revenue + order.amount,
      });
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            {stats.revenueTrend !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                stats.revenueTrend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {stats.revenueTrend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span className="text-xs font-bold">{Math.abs(stats.revenueTrend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Revenue</h3>
          <p className="text-white text-2xl font-bold">{formatPrice(stats.totalRevenue, currency)}</p>
          <p className="text-gray-500 text-xs mt-1">Last 7 days</p>
          
          {/* Date Range Filter - Moved Inside Revenue Card */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400 font-semibold">Date Filter</span>
              {(dateRange.startDate || dateRange.endDate) && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                placeholder="Start Date"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                placeholder="End Date"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:border-purple-500 focus:outline-none"
              />
              {(dateRange.startDate || dateRange.endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-xs"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-purple-400 text-xs">
                  📊 {filteredOrders.length} orders
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 cursor-pointer"
          onClick={() => onTabChange('orders')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Orders</h3>
          <p className="text-white text-2xl font-bold">{stats.totalOrders}</p>
          <p className="text-gray-500 text-xs mt-1">
            {stats.pendingOrders} pending • {stats.completedOrders} completed
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 cursor-pointer"
          onClick={() => onTabChange('users')}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Customers</h3>
          <p className="text-white text-2xl font-bold">{stats.totalCustomers}</p>
          <p className="text-gray-500 text-xs mt-1">Active users</p>
        </motion.div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Revenue Overview</h3>
              <p className="text-gray-400 text-sm">Last 7 days performance</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Status Chart */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Orders by Status</h3>
              <p className="text-gray-400 text-sm">Current order distribution</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/20">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const percent = entry.percent || 0;
                    return `${entry.name}: ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No orders yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Recent Orders</h3>
            <button
              onClick={() => onTabChange('orders')}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              orders.slice(0, 5).map((order) => {
                const orderDate = order.date || order.timestamp?.toDate?.() || new Date();
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{order.product}</p>
                      <p className="text-gray-400 text-sm truncate">{order.email}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white font-bold">{formatPrice(order.amount, currency)}</p>
                      <p className="text-gray-400 text-xs">
                        {orderDate instanceof Date ? orderDate.toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Top Products</h3>
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No products sold yet</p>
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.name}</p>
                    <p className="text-gray-400 text-sm">{product.count} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatPrice(product.revenue, currency)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
