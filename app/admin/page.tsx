"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, ShoppingCart, LogOut, Search, Settings, Package,
  RefreshCw, Download, Star, Shield, Plus, MessageSquare
} from "lucide-react";
import { useAuth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { useWebsite } from "@/lib/websiteContext";
import { useModal } from "@/contexts/ModalContext";
import { 
  collection, query, onSnapshot, orderBy, doc, updateDoc, 
  deleteDoc, Timestamp, getDocs
} from "firebase/firestore";
import AdminSettings from "@/components/AdminSettings";
import SendAccountModal from "@/components/admin/SendAccountModal";
import SendCodeModal from "@/components/admin/SendCodeModal";
import RejectOrderModal from "@/components/admin/RejectOrderModal";
import EnhancedOrderRow from "@/components/admin/EnhancedOrderRow";
import OverviewDashboard from "@/components/admin/OverviewDashboard";
import ProductsTab from "@/components/admin/ProductsTab";
import ManualOrderModal from "@/components/admin/ManualOrderModal";
import CategoriesTab from "@/components/admin/CategoriesTab";
import AdminManagementTab from "@/components/admin/AdminManagementTab";
import CustomerManagementTab from "@/components/admin/CustomerManagementTab";
import ReviewsTab from "@/components/admin/ReviewsTab";

// TypeScript Interfaces
interface Order {
  id: string;
  userId?: string;
  email: string;
  productId?: string;
  productName?: string;
  product: string;
  plan: string;
  price?: number;
  amount: number;
  status: string;
  date: Date;
  timestamp?: any;
  paymentMethod?: string;
  instructions?: string;
  quantity?: number;
  payment?: {
    proofUrl?: string;
    status?: string;
    method?: string;
    provider?: string;
  };
  delivery?: {
    status?: string;
    deliveredBy?: string;
    deliveredAt?: any;
    productKey?: string;
    instructions?: string;
  };
}

interface CustomerData {
  email: string;
  orders: Order[];
  totalSpent: number;
  totalOrders: number;
  joinDate: Date;
}

// Utility: Format Price
const formatPrice = (amount: number, currency: 'IDR' | 'USD'): string => {
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  return `$${amount.toFixed(2)}`;
};

// Utility: Export Orders to CSV
const exportOrdersCSV = (orders: Order[], currency: string, showAlert: any) => {
  if (orders.length === 0) {
    showAlert('No orders to export', 'warning');
    return;
  }

  const headers = [
    'Order ID', 'Date', 'Customer Email', 'Product', 'Plan', 
    'Amount', 'Status', 'Payment Method', 'Payment Status', 
    'Delivery Status', 'Delivered By', 'Delivered At'
  ];

  const rows = orders.map(order => [
    order.id,
    order.date?.toLocaleDateString?.() || 'N/A',
    order.email || 'N/A',
    order.product || 'N/A',
    order.plan || 'N/A',
    `${order.amount}`,
    order.status || 'N/A',
    order.payment?.method || order.paymentMethod || 'N/A',
    order.payment?.status || 'N/A',
    order.delivery?.status || 'N/A',
    order.delivery?.deliveredBy || 'N/A',
    order.delivery?.deliveredAt?.toDate?.()?.toLocaleString?.() || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { currency } = useWebsite();
  const { showAlert } = useModal();
  
  // State Management
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "products" | "categories" | "customers" | 
    "admins" | "reviews" | "settings"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "processing" | "completed" | "rejected">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal States
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/login");
    }
  }, [user, isAdmin, authLoading, router]);

  // Load Orders and Customers
  useEffect(() => {
    if (!user || !isAdmin) return;


    
    const loadingTimeout = setTimeout(() => {
      console.warn("⚠️ Loading timeout - forcing dashboard display");
      setIsLoading(false);
    }, 5000);

    // Real-time Orders Listener
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {

        clearTimeout(loadingTimeout);
        
        const ordersList: Order[] = [];
        const customersMap = new Map<string, CustomerData>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const order: Order = {
            id: docSnap.id,
            email: data.customer?.email || data.email || "Unknown",
            product: data.productName || data.items?.[0]?.name || "Unknown",
            plan: data.planName || data.items?.[0]?.variantId || "",
            amount: data.totalAmount || data.total || data.amount || 0,
            status: data.status || "pending",
            date: data.createdAt?.toDate() || new Date(),
            timestamp: data.createdAt,
            paymentMethod: data.payment?.provider || data.payment?.method || "unknown",
            payment: data.payment,
            delivery: data.delivery,
            instructions: data.instructions,
          };

          ordersList.push(order);

          // Build Customer Map
          if (order.email && order.email !== "Unknown") {
            if (!customersMap.has(order.email)) {
              customersMap.set(order.email, {
                email: order.email,
                orders: [],
                totalSpent: 0,
                totalOrders: 0,
                joinDate: order.date,
              });
            }
            const customer = customersMap.get(order.email)!;
            customer.orders.push(order);
            customer.totalSpent += order.amount;
            customer.totalOrders += 1;
            if (order.date < customer.joinDate) {
              customer.joinDate = order.date;
            }
          }
        });

        setOrders(ordersList);

        // Load users for customer data enhancement
        getDocs(query(collection(db, "users")))
          .then((usersSnapshot) => {
            usersSnapshot.forEach((userDoc) => {
              const userData = userDoc.data();
              const userEmail = userData.email || userDoc.id;
              
              if (!customersMap.has(userEmail)) {
                customersMap.set(userEmail, {
                  email: userEmail,
                  orders: [],
                  totalSpent: 0,
                  totalOrders: 0,
                  joinDate: userData.createdAt?.toDate() || new Date(),
                });
              }
            });
            setCustomers(Array.from(customersMap.values()));
          })
          .catch((error) => {
            console.error("❌ Error loading users:", error);
            setCustomers(Array.from(customersMap.values()));
          });
        
        setIsLoading(false);
      },
      (error) => {
        console.error("❌ Error loading orders:", error);
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribeOrders();
    };
  }, [user, isAdmin]);


  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "orders", orderId));
      console.log("✅ Order deleted:", orderId);
      showAlert("Order deleted successfully", 'success');
    } catch (error) {
      console.error("❌ Error deleting order:", error);
      showAlert("Failed to delete order. Please try again.", 'error');
    }
  };

  const handleModalSuccess = () => {
    showAlert("Action completed successfully!", 'success');
    handleRefreshOrders();
  };

  const handleDeliverAction = (order: Order, type: 'account' | 'code') => {
    setSelectedOrderForModal(order);
    if (type === 'account') {
      setShowAccountModal(true);
    } else {
      setShowCodeModal(true);
    }
  };

  // Loading States
  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  // Computed Values
  const totalOrders = orders.length;
  const totalCustomers = customers.length;

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-64 bg-[#0a0a0a] border-r border-white/10 p-6 fixed h-full z-10 overflow-y-auto"
      >
        <Link href="/" className="block mb-8">
          <h1 className="text-2xl font-bold text-white">
            JAMBI<span className="text-purple-500">.admin</span>
          </h1>
        </Link>

        <nav className="space-y-2">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "orders", icon: ShoppingCart, label: "Orders", badge: totalOrders },
            { id: "products", icon: Package, label: "Products" },
            { id: "categories", icon: Package, label: "Categories" },
            { id: "customers", icon: Users, label: "Customers", badge: totalCustomers },
            { id: "admins", icon: Shield, label: "Admins" },
            { id: "reviews", icon: Star, label: "Reviews" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-6 space-y-2">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Back to Store</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="ml-64 p-8 w-full">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <OverviewDashboard
            orders={orders}
            customers={customers}
            onTabChange={(tab: string) => setActiveTab(tab as typeof activeTab)}
            currency={currency}
          />
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Order Management</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Total: {totalOrders} orders
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualOrderModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Order
                </button>
                <button
                  onClick={() => exportOrdersCSV(orders, currency, showAlert)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0a0a] p-4 rounded-lg border border-white/10">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "processing", "completed", "rejected"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter as typeof orderFilter)}
                    className={`px-3 py-1 rounded-lg capitalize text-sm font-medium transition-all ${
                      orderFilter === filter
                        ? "bg-purple-500 text-white"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <button
                  onClick={handleRefreshOrders}
                  disabled={isRefreshing}
                  className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
              {(() => {
                const filteredOrders = orders.filter((order) => {
                  const matchesSearch = 
                    order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    order.product.toLowerCase().includes(searchQuery.toLowerCase());

                  if (!matchesSearch) return false;

                  const rawStatus = (order.status || "PENDING").toUpperCase();
                  const deliveryStatus = order.delivery?.status || "PENDING";

                  if (orderFilter === "all") return rawStatus !== "REJECTED";
                  if (orderFilter === "pending") return rawStatus === "PENDING";
                  if (orderFilter === "processing") return rawStatus === "PROCESSING";
                  if (orderFilter === "completed") {
                    return rawStatus === "COMPLETED" || rawStatus === "SUCCESS" || deliveryStatus === "DELIVERED";
                  }
                  if (orderFilter === "rejected") return rawStatus === "REJECTED";

                  return true;
                });

                if (orders.length === 0) {
                  return (
                    <div className="p-12 text-center">
                      <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No orders yet</p>
                      <p className="text-gray-600 text-sm mt-2">
                        Orders will appear here when customers make purchases
                      </p>
                    </div>
                  );
                }

                if (filteredOrders.length === 0) {
                  return (
                    <div className="p-12 text-center">
                      <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">
                        No {orderFilter !== 'all' ? orderFilter : ''} orders found
                      </p>
                      <p className="text-gray-600 text-sm mt-2">
                        Try adjusting your filters or search query
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="w-8"></th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Order ID</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Date</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Customer</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Product</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Amount</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <EnhancedOrderRow
                            key={order.id}
                            order={order}
                            searchQuery={searchQuery}
                            onOpenAccountModal={(o) => handleDeliverAction(o, 'account')}
                            onOpenCodeModal={(o) => handleDeliverAction(o, 'code')}
                            onOpenRejectModal={(o) => {
                              setSelectedOrderForModal(o);
                              setShowRejectModal(true);
                            }}
                            onDelete={handleDeleteOrder}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "products" && <ProductsTab currency={currency} />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "customers" && <CustomerManagementTab />}
        {activeTab === "admins" && <AdminManagementTab />}
        {activeTab === "reviews" && <ReviewsTab />}
        {activeTab === "settings" && <AdminSettings user={user} />}
      </main>

      {/* Modals */}
      {selectedOrderForModal && (
        <>
          <SendAccountModal
            isOpen={showAccountModal}
            onClose={() => {
              setShowAccountModal(false);
              setSelectedOrderForModal(null);
            }}
            orderId={selectedOrderForModal.id}
            productName={selectedOrderForModal.product}
            customerEmail={selectedOrderForModal.email}
            onSuccess={handleModalSuccess}
          />

          <SendCodeModal
            isOpen={showCodeModal}
            onClose={() => {
              setShowCodeModal(false);
              setSelectedOrderForModal(null);
            }}
            orderId={selectedOrderForModal.id}
            productName={selectedOrderForModal.product}
            customerEmail={selectedOrderForModal.email}
            onSuccess={handleModalSuccess}
          />

          <RejectOrderModal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setSelectedOrderForModal(null);
            }}
            orderId={selectedOrderForModal.id}
            productName={selectedOrderForModal.product}
            customerEmail={selectedOrderForModal.email}
            onSuccess={handleModalSuccess}
          />
        </>
      )}

      <ManualOrderModal
        isOpen={showManualOrderModal}
        onClose={() => setShowManualOrderModal(false)}
        onSuccess={handleRefreshOrders}
        currency={currency}
      />
    </div>
  );
}
