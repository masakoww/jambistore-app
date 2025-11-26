"use client";

import { useState } from "react";
import { Package, Key, UserPlus, XCircle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Image as ImageIcon, Mail, Phone, User, CreditCard } from "lucide-react";

interface Order {
  id: string;
  email: string;
  product: string;
  plan: string;
  amount: number;
  status: string;
  date: Date;
  paymentMethod?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  payment?: {
    proofUrl?: string;
    status?: string;
    method?: string;
  };
  delivery?: {
    status?: string;
    type?: string;
    username?: string;
    code?: string;
    deliveredAt?: string;
    productDetails?: string;
  };
  productName?: string;
  planName?: string;
  total?: number;
}

interface EnhancedOrderRowProps {
  order: Order;
  searchQuery: string;
  onOpenAccountModal: (order: Order) => void;
  onOpenCodeModal: (order: Order) => void;
  onOpenRejectModal: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

export default function EnhancedOrderRow({
  order,
  searchQuery,
  onOpenAccountModal,
  onOpenCodeModal,
  onOpenRejectModal,
  onDelete,
}: EnhancedOrderRowProps) {
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter by email or product
  const matches =
    order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase());

  if (!matches) return null;

  const deliveryStatus = order.delivery?.status || "PENDING";
  const isDelivered = order.status === 'COMPLETED' || deliveryStatus === "DELIVERED";
  const isRejected = order.status === "REJECTED";

  // Status badge
  const getStatusBadge = () => {
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    }

    if (isDelivered) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          COMPLETED
        </span>
      );
    }

    if (deliveryStatus === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
          <AlertCircle className="w-3 h-3" />
          PENDING
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
          <Package className="w-3 h-3" />
          {deliveryStatus}
        </span>
    );
  };

  return (
    <>
      <tr className="border-t border-white/10 hover:bg-white/5">
        <td className="px-4 py-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-4 text-white font-mono text-xs">
          {order.id.slice(0, 8)}...
        </td>
        <td className="px-4 py-4">
          <div className="text-white text-sm">
            {order.date.toLocaleDateString()}
          </div>
          <div className="text-gray-500 text-xs">
            {order.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="text-white text-sm">{order.email}</div>
          {order.customer?.name && (
            <div className="text-gray-500 text-xs">{order.customer.name}</div>
          )}
        </td>
        <td className="px-4 py-4">
          <div className="text-white font-medium text-sm">{order.product}</div>
          <div className="text-gray-400 text-xs">{order.plan}</div>
        </td>
        <td className="px-4 py-4 text-green-400 font-bold">
          Rp.{Number(order.amount).toLocaleString('en-US')}
        </td>
        <td className="px-4 py-4">{getStatusBadge()}</td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            {!isDelivered && !isRejected && (
              <>
                <button
                  onClick={() => onOpenAccountModal(order)}
                  title="Send Account (Username + Password)"
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Account
                </button>
                <button
                  onClick={() => onOpenCodeModal(order)}
                  title="Send Code/Key"
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  Code
                </button>
                <button
                  onClick={() => onOpenRejectModal(order)}
                  title="Reject Order"
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
              </>
            )}
            {(isDelivered || isRejected) && (
              <span className="text-gray-500 text-xs italic">
                {isDelivered ? "Completed" : "Rejected"}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable Details Row */}
      {isExpanded && (
        <tr className="border-t border-white/10 bg-white/5">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-4 text-sm">
              
              {/* Customer Information */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Name:</p>
                    <p className="text-white">{order.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Email:</p>
                    <p className="text-white flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {order.customer?.email || order.email}
                    </p>
                  </div>
                  {order.customer?.phone && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Phone:</p>
                      <p className="text-white flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {order.customer.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Order ID:</p>
                  <p className="text-white font-mono text-xs break-all">{order.id}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Payment Method:</p>
                  <p className="text-white uppercase flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-gray-400" />
                    {order.payment?.method || order.paymentMethod || "N/A"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Product:</p>
                  <p className="text-white font-medium">{order.productName || order.product}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Plan:</p>
                  <p className="text-white">{order.planName || order.plan}</p>
                </div>
              </div>

              {/* Payment Proof */}
              {order.payment?.proofUrl && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Payment Proof
                  </h4>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsProofModalOpen(true)}
                      className="block"
                    >
                      <img
                        src={order.payment.proofUrl}
                        alt="Payment Proof"
                        className="w-48 h-48 object-cover rounded-lg border border-white/20 hover:border-purple-400 transition-all cursor-pointer"
                      />
                    </button>
                    <div className="flex-1">
                      <p className="text-gray-400 text-xs mb-2">Payment Status:</p>
                      <p className="text-white font-semibold mb-3">{order.payment.status || 'Pending'}</p>
                      <button
                        type="button"
                        onClick={() => setIsProofModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-all"
                      >
                        <ImageIcon className="w-3 h-3" />
                        View Full Image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Status */}
              {isDelivered && order.delivery && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 font-bold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Delivered Successfully
                  </p>
                  
                  {order.delivery.type === "account" && order.delivery.username && (
                    <div className="space-y-2 text-xs bg-black/30 p-3 rounded">
                      <p className="text-gray-300">
                        <strong className="text-green-400">Username:</strong> {order.delivery.username}
                      </p>
                      <p className="text-gray-300">
                        <strong className="text-green-400">Password:</strong> ••••••••
                      </p>
                    </div>
                  )}

                  {order.delivery.type === "code" && order.delivery.code && (
                    <div className="text-xs bg-black/30 p-3 rounded">
                      <p className="text-gray-300">
                        <strong className="text-green-400">Code:</strong> {order.delivery.code}
                      </p>
                    </div>
                  )}

                  {order.delivery.productDetails && (
                    <div className="mt-3 text-xs bg-black/30 p-3 rounded">
                      <p className="text-green-400 font-semibold mb-2">Product Details:</p>
                      <pre className="text-gray-300 whitespace-pre-wrap">{order.delivery.productDetails}</pre>
                    </div>
                  )}

                  {order.delivery.deliveredAt && (
                    <p className="text-gray-400 text-xs mt-3">
                      📅 Delivered: {new Date(order.delivery.deliveredAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              )}

              {isRejected && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Order Rejected
                  </p>
                  <p className="text-gray-300 text-xs">
                    This order was rejected by admin.
                  </p>
                </div>
              )}

              {!isDelivered && !isRejected && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Awaiting Delivery
                  </p>
                  <p className="text-gray-300 text-xs">
                    Use the action buttons above to deliver or reject this order.
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {isProofModalOpen && order.payment?.proofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setIsProofModalOpen(false)}
        >
          <div
            className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold text-sm">
                Bukti Pembayaran / Payment Proof
              </h3>
              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex justify-center">
              <img
                src={order.payment.proofUrl}
                alt="Payment Proof"
                className="max-w-full max-h-[70vh] rounded-lg border border-white/20"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
