"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  User,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useAuth, db } from "@/lib/firebase";
import DashboardOrderStatus from "@/components/DashboardOrderStatus";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  or,
} from "firebase/firestore";

interface Order {
  id: string;
  product: string;
  plan: string;
  status: string;
  amount: number;
  date: Date;
  paymentMethod?: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const emailFromParams = searchParams.get("email");
    const userEmail = user?.email || emailFromParams;
    
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!email) return;

    let ordersQuery;
    
    if (user) {
      // If user is logged in, fetch from transactions subcollection
      ordersQuery = query(
        collection(db, "users", user.uid, "transactions"),
        orderBy("timestamp", "desc")
      );
    } else {
      // Guest user, fetch by email only
      ordersQuery = query(
        collection(db, "orders"),
        where("email", "==", email),
        orderBy("timestamp", "desc")
      );
    }

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ordersList.push({
          id: doc.id,
          product: data.product || data.productName || "Unknown Product",
          plan: data.plan || data.selectedPlan || "N/A",
          status: data.status || "pending",
          amount: data.amount || data.total || data.totalAmount || 0,
          date: data.timestamp?.toDate() || new Date(),
          paymentMethod: data.paymentMethod,
        });
      });
      setOrders(ordersList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [email]);

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes("success") || statusLower === "completed") {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: "bg-green-500/20 text-green-400 border-green-500/30",
        label: "Completed"
      };
    } else if (statusLower.includes("processing")) {
      return {
        icon: <Clock className="w-4 h-4 animate-spin" />,
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        label: "Processing"
      };
    } else if (statusLower.includes("pending") || statusLower.includes("waiting")) {
      return {
        icon: <Clock className="w-4 h-4" />,
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        label: "Pending"
      };
    } else if (statusLower.includes("failed") || statusLower.includes("rejected")) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        className: "bg-red-500/20 text-red-400 border-red-500/30",
        label: "Failed"
      };
    }
    return {
      icon: <FileText className="w-4 h-4" />,
      className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      label: status
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/10 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your orders...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Order Dashboard
            </h1>
            <p className="text-gray-400">
              Track and manage your orders
            </p>
          </motion.div>

          {/* User Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{email || "Guest User"}</p>
                <p className="text-gray-500 text-sm">Customer Account</p>
              </div>
              {user && (
                <Link
                  href="/profile"
                  className="ml-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all"
                >
                  View Profile
                </Link>
              )}
            </div>
          </motion.div>

          {/* Orders Section */}
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-12 text-center"
            >
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-2">No Orders Yet</h3>
              <p className="text-gray-400 mb-6">
                You haven't placed any orders yet. Browse our products to get started!
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all"
              >
                Browse Products
                <ExternalLink className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-bold text-white">
                  Your Orders ({orders.length})
                </h2>
                <Link
                  href="/profile?tab=transactions"
                  className="text-sm text-pink-400 hover:text-pink-300 transition-all"
                >
                  View All Transactions →
                </Link>
              </motion.div>

              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <Package className="w-5 h-5 text-pink-400 mt-1" />
                        <div>
                          <h3 className="text-white font-bold text-lg mb-1">
                            {order.product}
                          </h3>
                          <p className="text-gray-400 text-sm">{order.plan}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <FileText className="w-4 h-4" />
                          <span className="font-mono">{order.id.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {order.date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {order.paymentMethod && (
                          <div className="text-gray-400">
                            <span className="opacity-60">via</span> {order.paymentMethod}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-3">
                      <div className="text-white font-bold text-xl">
                        ${order.amount.toFixed(2)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${
                          getStatusBadge(order.status).className
                        }`}
                      >
                        {getStatusBadge(order.status).icon}
                        {getStatusBadge(order.status).label}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Component */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <DashboardOrderStatus orderId={order.id} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
