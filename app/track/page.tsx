'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Search, Clock, CheckCircle2, AlertCircle, Loader2, Mail, ShoppingBag, Star, Image as ImageIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ConnectDiscordPrompt from '@/components/ConnectDiscordPrompt';

interface Order {
  id: string;
  productName: string;
  planName: string;
  status: string;
  amount: number;
  createdAt: Date;
  customer: {
    name: string;
    email: string;
  };
  payment: {
    status: string;
    provider: string;
    proofUrl?: string;
  };
  delivery: {
    status: string;
    method?: string;
    deliveredAt?: Date;
    productDetails?: string;
    instructions?: string;
  };
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  // Review state
  const [hasReview, setHasReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Auto-load if orderId in URL
  useEffect(() => {
    const orderParam = searchParams.get('order');
    const from = searchParams.get('from');

    if (from === 'payment-locked') {
      setInfoMessage('Pembayaran sudah diselesaikan.');
    }

    if (orderParam) {
      setOrderId(orderParam);
      handleTrackOrder(orderParam);
    }
  }, [searchParams]);

  const handleTrackOrder = async (id?: string) => {
    const trackId = id || orderId;
    if (!trackId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setOrder(null);

    try {
      // Use public API endpoint instead of direct Firestore access
      const response = await fetch(`/api/orders/${trackId}/public`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Order not found. Please check your order ID.');
        return;
      }

      const { order: data } = await response.json();
      
      setOrder({
        id: data.id,
        productName: data.productName || 'Unknown Product',
        planName: data.planName || 'Unknown Plan',
        status: data.status || 'PENDING',
        amount: data.amount || 0,
        createdAt: data.createdAt ? new Date(data.createdAt._seconds * 1000) : new Date(),
        customer: data.customer || { name: 'Customer', email: 'N/A' },
        payment: {
          status: data.payment?.status || 'PENDING',
          provider: data.payment?.provider || 'Manual QRIS',
          proofUrl: data.payment?.proofUrl,
        },
        delivery: {
          status: data.delivery?.status || 'PENDING',
          method: data.delivery?.method || null,
          deliveredAt: data.delivery?.deliveredAt ? new Date(data.delivery.deliveredAt._seconds * 1000) : undefined,
          productDetails: data.delivery?.productDetails || null,
          instructions: data.delivery?.instructions || null,
        },
      });

      // Check if order already has a review
      if (data.status === 'COMPLETED') {
        checkExistingReview(trackId);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to fetch order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingReview = async (orderId: string) => {
    try {
      const response = await fetch(`/api/reviews?limit=1`);
      const data = await response.json();
      if (data.success) {
        const existingReview = data.reviews.find((r: any) => r.orderId === orderId);
        setHasReview(!!existingReview);
      }
    } catch (err) {
      console.error('Error checking review:', err);
    }
  };

  const handleSubmitReview = async () => {
    if (!order || rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length === 0) {
      setError('Please write a comment');
      return;
    }

    setIsSubmittingReview(true);
    setError('');

    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReviewSuccess(true);
        setHasReview(true);
        setShowReviewForm(false);
        setTimeout(() => setReviewSuccess(false), 5000);
      } else {
        setError(data.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const normalized = status.toUpperCase();
    
    // Map legacy statuses to normalized vocabulary
    switch (normalized) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'DELIVERED':
        return {
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          icon: CheckCircle2,
          text: 'Completed',
        };
      case 'PROCESSING':
      case 'AWAITING_PROOF':
      case 'AWAITING_ADMIN':
      case 'PENDING_ADMIN':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          icon: Clock,
          text: 'Pending',
        };
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return {
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          icon: AlertCircle,
          text: 'Rejected',
        };
      case 'PENDING':
      default:
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          icon: Package,
          text: 'Pending',
        };
    }
  };

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Track Your Order
            </h1>
            <p className="text-gray-400 text-lg">
              Enter your order ID to check the status
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()}
                    placeholder="Enter your order ID (e.g., 2kw68wCU1PJ01w9uRM0T)"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleTrackOrder()}
                  disabled={isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Tracking...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Track Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400">{infoMessage}</p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Order Details */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Status Card */}
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Order Status</h2>
                    <p className="text-gray-400 text-sm font-mono">ID: {order.id}</p>
                  </div>
                  {(() => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`px-6 py-3 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center gap-2`}>
                        <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        <span className={`font-bold ${statusConfig.color}`}>{statusConfig.text}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Order Timeline */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Order Created</h3>
                      <p className="text-gray-400 text-sm">
                        {order.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${
                      ['PROCESSING', 'COMPLETED', 'SUCCESS'].includes(order.status.toUpperCase())
                        ? 'bg-green-500/20 border-green-500/30'
                        : 'bg-gray-500/20 border-gray-500/30'
                    } border flex items-center justify-center flex-shrink-0`}>
                      <CheckCircle2 className={`w-5 h-5 ${
                        ['PROCESSING', 'COMPLETED', 'SUCCESS'].includes(order.status.toUpperCase())
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Payment Confirmed</h3>
                      <p className="text-gray-400 text-sm">
                        {order.payment.status === 'COMPLETED' 
                          ? 'Payment verified and confirmed'
                          : 'Waiting for payment confirmation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full ${
                      order.delivery.status === 'DELIVERED'
                        ? 'bg-green-500/20 border-green-500/30'
                        : 'bg-gray-500/20 border-gray-500/30'
                    } border flex items-center justify-center flex-shrink-0`}>
                      <Package className={`w-5 h-5 ${
                        order.delivery.status === 'DELIVERED'
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Product Delivered</h3>
                      <p className="text-gray-400 text-sm">
                        {order.delivery.status === 'DELIVERED'
                          ? `Delivered ${order.delivery.deliveredAt ? 'on ' + new Date(order.delivery.deliveredAt).toLocaleString() : ''}`
                          : 'Your product will be delivered after payment confirmation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  Order Details
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400">Product</span>
                    <span className="text-white font-semibold">{order.productName}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-semibold">{order.planName}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400">Amount</span>
                    <span className="text-green-400 font-bold text-lg">Rp.{Number(order.amount).toLocaleString('en-US')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-gray-400">Payment Method</span>
                    <span className="text-white font-semibold">{order.payment.provider || 'Manual QRIS'}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              {order.delivery.status === 'DELIVERED' && order.delivery.productDetails && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl border border-green-500/20 p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    Your Product
                  </h2>
                  <div className="bg-black/50 rounded-xl p-4 mb-4">
                    <pre className="text-white font-mono text-sm whitespace-pre-wrap break-all">
                      {order.delivery.productDetails}
                    </pre>
                  </div>
                  {order.delivery.instructions && (
                    <div className="bg-black/50 rounded-xl p-4">
                      <h3 className="text-gray-400 text-sm font-semibold mb-2">Instructions:</h3>
                      <p className="text-white text-sm">{order.delivery.instructions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Review Section - Show for Completed Orders */}
              {order.status.toUpperCase() === 'COMPLETED' && (
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    Review Your Order
                  </h2>

                  {reviewSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <p className="text-green-400">Ulasan berhasil disimpan. Terima kasih atas feedback Anda!</p>
                    </motion.div>
                  )}

                  {hasReview ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">Terima kasih! Anda sudah memberikan ulasan untuk pesanan ini.</p>
                    </div>
                  ) : !showReviewForm ? (
                    <div className="text-center py-8">
                      <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4 fill-yellow-400" />
                      <p className="text-gray-400 mb-6">
                        Bagaimana pengalaman Anda dengan produk ini? Ulasan Anda membantu pelanggan lain!
                      </p>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2"
                      >
                        <Star className="w-5 h-5" />
                        Tulis Ulasan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Star Rating */}
                      <div>
                        <label className="block text-white font-semibold mb-3">
                          Rating <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-10 h-10 transition-colors ${
                                  star <= (hoverRating || rating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <p className="text-gray-400 text-sm mt-2">
                            {rating === 5 && '⭐ Luar biasa!'}
                            {rating === 4 && '⭐ Bagus!'}
                            {rating === 3 && '⭐ Cukup baik'}
                            {rating === 2 && '⭐ Kurang memuaskan'}
                            {rating === 1 && '⭐ Sangat mengecewakan'}
                          </p>
                        )}
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-white font-semibold mb-3">
                          Ulasan Anda <span className="text-red-400">*</span>
                          <span className="text-gray-400 text-sm font-normal ml-2">
                            (Maksimal 500 karakter)
                          </span>
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          maxLength={500}
                          rows={5}
                          placeholder="Ceritakan pengalaman Anda dengan produk ini..."
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-gray-500 text-sm">
                            {comment.length}/500 karakter
                          </p>
                        </div>
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowReviewForm(false);
                            setRating(0);
                            setComment('');
                            setError('');
                          }}
                          disabled={isSubmittingReview}
                          className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleSubmitReview}
                          disabled={isSubmittingReview || rating === 0 || comment.trim().length === 0}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmittingReview ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Mengirim...
                            </>
                          ) : (
                            <>
                              <Star className="w-5 h-5" />
                              Kirim Ulasan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Info or Discord Ticket Helper */}
              {order.delivery.status !== 'DELIVERED' && (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-white/10 p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-400" />
                    Need Help?
                  </h2>
                  <p className="text-gray-400 mb-4">
                    Have questions about your order? Connect with our support team via Discord.
                  </p>
                  
                  {/* Discord Ticket Helper */}
                  <button
                    onClick={() => {
                      const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg/KrWnqnbW6f';
                      window.open(discordInvite, '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Open Discord Support</span>
                  </button>
                  
                  <p className="text-gray-500 text-xs mt-3 text-center">
                    Order ID: {order.id}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
