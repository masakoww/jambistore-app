'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { OrderData } from '@/types/order';


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};


const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface DashboardOrderStatusProps {
  orderId: string;
}

export default function DashboardOrderStatus({ orderId }: DashboardOrderStatusProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    // Set up real-time listener
    const orderRef = doc(db, 'orders', orderId);
    
    const unsubscribe = onSnapshot(
      orderRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as DocumentData;
          
          // Convert Firestore timestamps to Date objects
          const orderData: OrderData = {
            id: docSnapshot.id,
            userId: data.userId,
            productSlug: data.productSlug || data.productId || '', // Use productSlug or fall back to legacy productId
            items: data.items || [],
            total: data.total,
            customer: data.customer,
            status: data.status,
            payment: data.payment ? {
              ...data.payment,
              updatedAt: data.payment.updatedAt?.toDate?.() || data.payment.updatedAt,
            } : undefined,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            error: data.error,
          };
          
          setOrder(orderData);
          setError(null);
        } else {
          setError('Order not found');
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to order:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No order data available</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS': // Legacy
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS': // Legacy
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'PENDING':
        return (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'REJECTED':
      case 'EXPIRED':
      case 'CANCELLED':
      case 'FAILED':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Order Status</h2>
        <p className="text-blue-100">Order ID: {order.id}</p>
      </div>

      {/* Status Badge */}
      <div className="p-6 border-b border-gray-200">
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)}
          <span className="font-semibold text-lg">{order.status}</span>
        </div>
      </div>

      {/* Order Details */}
      <div className="p-6 space-y-6">
        {/* Customer Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Customer Information</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-gray-800">{order.customer.name}</span>
            </div>
            {order.customer.email && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-800">{order.customer.email}</span>
              </div>
            )}
            {order.customer.phone && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-800">{order.customer.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        {order.payment && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Provider</span>
                <span className="font-semibold text-gray-800 uppercase">{order.payment.provider}</span>
              </div>
              {order.payment.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-mono text-sm text-gray-800">{order.payment.transactionId}</span>
                </div>
              )}
              {order.payment.merchantRef && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference</span>
                  <span className="font-mono text-sm text-gray-800">{order.payment.merchantRef}</span>
                </div>
              )}
              {order.payment.paymentUrl && order.status === 'PENDING' && (
                <div className="pt-2">
                  <a
                    href={order.payment.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Complete Payment
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Order Total</h3>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-green-700">
                Rp {order.total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Order Items</h3>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{item.name || item.productId}</p>
                    {item.variantId && <p className="text-sm text-gray-500">Variant: {item.variantId}</p>}
                    {item.quantity && <p className="text-sm text-gray-500">Qty: {item.quantity}</p>}
                  </div>
                  <span className="font-semibold text-gray-800">
                    Rp {item.price.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 space-y-1">
          <p>Created: {order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : 'N/A'}</p>
          {order.updatedAt && (
            <p>Last Updated: {new Date(order.updatedAt).toLocaleString('id-ID')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
